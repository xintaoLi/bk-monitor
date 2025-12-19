import fs from 'fs-extra';
import path from 'path';
import { RuntimeTask, Outcome } from './types.js';
import { Logger } from '../utils/log.js';

/**
 * Promoted Asset（不是测试文件，是决策快照）
 */
export interface PromotedAsset {
  id: string;
  intent: string;
  steps: RuntimeTask['steps'];
  scope: 'regression' | 'smoke' | 'critical';
  derivedFrom: {
    taskId: string;
    confidence: number;
    successCount: number;
  };
  metadata: {
    createdAt: string;
    lastExecuted?: string;
    totalRuns: number;
    successRuns: number;
    failureRuns: number;
  };
}

/**
 * Promote 配置
 */
export interface PromoteConfig {
  auto: boolean;
  criteria: {
    taskSuccess: boolean;
    taskConfidence: { min: number };
    ruleConfidence: { min: number };
    consecutiveSuccess: { min: number };
  };
  output: {
    directory: string;
    format: string;
    versionControl: boolean;
  };
}

/**
 * Promote 引擎
 * Promote ≠ 保存测试文件
 * Promote = 采纳"这次测试决策是正确的"
 */
export class PromoteEngine {
  private projectRoot: string;
  private assetsPath: string;
  private historyPath: string;
  private config: PromoteConfig;
  private taskHistory: Map<string, Array<{ success: boolean; timestamp: string }>> = new Map();

  constructor(projectRoot: string, config: PromoteConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.assetsPath = path.join(projectRoot, config.output.directory);
    this.historyPath = path.join(projectRoot, '.mcp', 'promote-history.json');
  }

  /**
   * 加载历史记录
   */
  async load(): Promise<void> {
    try {
      if (await fs.pathExists(this.historyPath)) {
        const history = await fs.readJson(this.historyPath);
        this.taskHistory = new Map(Object.entries(history));
      }
      
      await fs.ensureDir(this.assetsPath);
      Logger.info('Promote engine initialized');
    } catch (error) {
      Logger.warn('Failed to load promote history');
    }
  }

  /**
   * 评估是否应该 promote
   */
  shouldPromote(task: RuntimeTask, outcome: Outcome, ruleConfidence?: number): boolean {
    const criteria = this.config.criteria;
    
    // 1. 任务必须成功
    if (!criteria.taskSuccess || outcome.status !== 'success') {
      return false;
    }

    // 2. 任务置信度要求
    if (task.confidence < criteria.taskConfidence.min) {
      Logger.info(`Task confidence too low: ${task.confidence} < ${criteria.taskConfidence.min}`);
      return false;
    }

    // 3. 规则置信度要求（如果有）
    if (ruleConfidence !== undefined && ruleConfidence < criteria.ruleConfidence.min) {
      Logger.info(`Rule confidence too low: ${ruleConfidence} < ${criteria.ruleConfidence.min}`);
      return false;
    }

    // 4. 连续成功次数要求
    const history = this.taskHistory.get(task.intent) || [];
    const recentSuccess = history.slice(-criteria.consecutiveSuccess.min);
    const allSuccess = recentSuccess.every(h => h.success);
    
    if (recentSuccess.length < criteria.consecutiveSuccess.min) {
      Logger.info(`Not enough runs: ${recentSuccess.length} < ${criteria.consecutiveSuccess.min}`);
      return false;
    }
    
    if (!allSuccess) {
      Logger.info('Not all recent runs succeeded');
      return false;
    }

    return true;
  }

  /**
   * 执行 Promote
   */
  async promote(task: RuntimeTask, scope: PromotedAsset['scope'] = 'regression'): Promise<PromotedAsset> {
    Logger.header('Promoting Runtime Task to Asset');
    
    const history = this.taskHistory.get(task.intent) || [];
    const successCount = history.filter(h => h.success).length;

    const asset: PromotedAsset = {
      id: `asset-${Date.now()}`,
      intent: task.intent,
      steps: task.steps,
      scope,
      derivedFrom: {
        taskId: task.id,
        confidence: task.confidence,
        successCount
      },
      metadata: {
        createdAt: new Date().toISOString(),
        totalRuns: 0,
        successRuns: 0,
        failureRuns: 0
      }
    };

    // 保存 Asset
    const assetPath = path.join(
      this.assetsPath,
      `${this.sanitizeIntent(task.intent)}.asset.json`
    );
    
    await fs.writeJson(assetPath, asset, { spaces: 2 });
    
    Logger.success(`Asset promoted: ${assetPath}`);
    Logger.info(`Intent: ${task.intent}`);
    Logger.info(`Success count: ${successCount}`);
    Logger.info(`Confidence: ${task.confidence}`);

    // 如果启用了版本控制，记录到 git
    if (this.config.output.versionControl) {
      await this.addToVersionControl(assetPath);
    }

    return asset;
  }

  /**
   * 记录执行历史
   */
  async recordExecution(task: RuntimeTask, outcome: Outcome): Promise<void> {
    const history = this.taskHistory.get(task.intent) || [];
    
    history.push({
      success: outcome.status === 'success',
      timestamp: new Date().toISOString()
    });

    // 只保留最近 100 条记录
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.taskHistory.set(task.intent, history);
    
    await this.saveHistory();
  }

  /**
   * 更新 Asset 统计
   */
  async updateAssetStats(assetId: string, success: boolean): Promise<void> {
    try {
      const assets = await this.loadAssets();
      const asset = assets.find(a => a.id === assetId);
      
      if (!asset) {
        return;
      }

      asset.metadata.totalRuns++;
      asset.metadata.lastExecuted = new Date().toISOString();
      
      if (success) {
        asset.metadata.successRuns++;
      } else {
        asset.metadata.failureRuns++;
      }

      await this.saveAsset(asset);
      
      Logger.info(`Asset stats updated: ${asset.id} (${asset.metadata.successRuns}/${asset.metadata.totalRuns})`);
    } catch (error) {
      Logger.warn('Failed to update asset stats:', error);
    }
  }

  /**
   * 加载所有 Assets
   */
  async loadAssets(): Promise<PromotedAsset[]> {
    try {
      const files = await fs.readdir(this.assetsPath);
      const assetFiles = files.filter(f => f.endsWith('.asset.json'));
      
      const assets = await Promise.all(
        assetFiles.map(f => fs.readJson(path.join(this.assetsPath, f)))
      );
      
      return assets;
    } catch (error) {
      Logger.warn('Failed to load assets');
      return [];
    }
  }

  /**
   * 保存单个 Asset
   */
  private async saveAsset(asset: PromotedAsset): Promise<void> {
    const assetPath = path.join(
      this.assetsPath,
      `${this.sanitizeIntent(asset.intent)}.asset.json`
    );
    
    await fs.writeJson(assetPath, asset, { spaces: 2 });
  }

  /**
   * 保存历史记录
   */
  private async saveHistory(): Promise<void> {
    try {
      const history = Object.fromEntries(this.taskHistory.entries());
      await fs.writeJson(this.historyPath, history, { spaces: 2 });
    } catch (error) {
      Logger.error('Failed to save promote history:', error);
    }
  }

  /**
   * 添加到版本控制
   */
  private async addToVersionControl(assetPath: string): Promise<void> {
    try {
      const { execSync } = require('child_process');
      execSync(`git add ${assetPath}`, { cwd: this.projectRoot });
      Logger.info('Asset added to git');
    } catch (error) {
      Logger.warn('Failed to add asset to git (maybe not a git repo)');
    }
  }

  /**
   * 清理 intent 为合法文件名
   */
  private sanitizeIntent(intent: string): string {
    return intent
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }

  /**
   * 获取 Asset 健康度评分
   */
  getAssetHealthScore(asset: PromotedAsset): number {
    const { totalRuns, successRuns } = asset.metadata;
    
    if (totalRuns === 0) {
      return 0;
    }

    const successRate = successRuns / totalRuns;
    const confidenceBonus = asset.derivedFrom.confidence * 0.2;
    
    return Math.min(1.0, successRate + confidenceBonus);
  }
}
