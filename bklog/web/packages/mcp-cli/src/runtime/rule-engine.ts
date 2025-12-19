import fs from 'fs-extra';
import path from 'path';
import { RuntimeTask, Outcome } from './types.js';
import { Logger } from '../utils/log.js';

/**
 * Rule 类型定义
 */
export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  scope: 'global' | 'route' | 'component' | 'signal';
  onFailure?: Outcome['reason'];
  learn?: LearningAction;
  weight: number;
  confidence: number;
  metadata?: RuleMetadata;
}

export interface LearningAction {
  action: string;
  strategy: string;
  maxAlternatives?: number;
  maxTimeout?: number;
  threshold?: number;
  persist: boolean;
}

export interface RuleMetadata {
  description?: string;
  successCount?: number;
  failureCount?: number;
  lastUpdated?: string;
}

/**
 * 组件记忆
 */
export interface ComponentMemory {
  component: string;
  selectorStrategy: string[];
  confidence: number;
  rules?: Rule[];
}

/**
 * Rule 学习引擎
 * 失败反馈 → 规则自进化
 */
export class RuleEngine {
  private rulesPath: string;
  private memoryPath: string;
  private rules: Rule[] = [];
  private memory: Record<string, ComponentMemory> = {};
  
  constructor(projectRoot: string) {
    this.rulesPath = path.join(projectRoot, '.codebuddy', 'rules.json');
    this.memoryPath = path.join(projectRoot, '.codebuddy', 'memory.json');
  }

  /**
   * 加载规则和记忆
   */
  async load(): Promise<void> {
    try {
      const rulesData = await fs.readJson(this.rulesPath);
      this.rules = rulesData.rules || [];
      
      if (await fs.pathExists(this.memoryPath)) {
        const memoryData = await fs.readJson(this.memoryPath);
        this.memory = memoryData.components || {};
      }
      
      Logger.info(`Loaded ${this.rules.length} rules`);
    } catch (error) {
      Logger.warn('Failed to load rules, using defaults');
      this.rules = [];
    }
  }

  /**
   * 处理失败 → 触发学习
   */
  async handleFailure(
    task: RuntimeTask,
    outcome: Outcome
  ): Promise<RuntimeTask | null> {
    if (!outcome.reason) {
      return null;
    }

    Logger.info(`Handling failure: ${outcome.reason}`);
    
    // 找到匹配的 Rule
    const applicableRules = this.findApplicableRules(outcome.reason, task);
    
    if (applicableRules.length === 0) {
      Logger.warn('No applicable rules found');
      return null;
    }

    // 冲突解决：选择得分最高的 Rule
    const selectedRule = this.resolveConflict(applicableRules, task);
    
    Logger.info(`Selected rule: ${selectedRule.name} (weight: ${selectedRule.weight})`);
    
    // 执行学习动作
    const newTask = await this.executeLearningAction(selectedRule, task, outcome);
    
    // 更新规则权重（乐观更新，实际成功后再确认）
    await this.updateRuleWeight(selectedRule.id, 'pending');
    
    return newTask;
  }

  /**
   * 处理成功 → 更新权重
   */
  async handleSuccess(task: RuntimeTask, ruleId?: string): Promise<void> {
    if (!ruleId) {
      return;
    }

    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) {
      return;
    }

    // 成功：权重上升
    rule.weight = rule.weight + (1 - rule.weight) * 0.15;
    rule.confidence = Math.min(1.0, rule.confidence + 0.1);
    
    if (rule.metadata) {
      rule.metadata.successCount = (rule.metadata.successCount || 0) + 1;
      rule.metadata.lastUpdated = new Date().toISOString();
    }

    Logger.info(`Rule ${rule.name} weight updated: ${rule.weight.toFixed(3)}`);
    
    await this.save();
  }

  /**
   * 查找适用的规则
   */
  private findApplicableRules(reason: Outcome['reason'], task: RuntimeTask): Rule[] {
    return this.rules.filter(rule => {
      if (!rule.enabled) return false;
      if (!rule.onFailure) return false;
      if (rule.onFailure !== reason) return false;
      if (rule.weight < 0.25) return false; // 权重过低的规则被禁用
      
      return true;
    });
  }

  /**
   * 冲突解决：选择得分最高的规则
   */
  private resolveConflict(rules: Rule[], task: RuntimeTask): Rule {
    if (rules.length === 1) {
      return rules[0];
    }

    // 计算得分：weight * confidence * contextMatch
    const scored = rules.map(rule => {
      const contextMatch = this.calculateContextMatch(rule, task);
      const score = rule.weight * rule.confidence * contextMatch;
      
      return { rule, score };
    });

    // 按得分降序排序
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0].rule;
  }

  /**
   * 计算上下文匹配度
   */
  private calculateContextMatch(rule: Rule, task: RuntimeTask): number {
    // 简化版：根据 scope 计算
    if (rule.scope === 'global') {
      return 1.0;
    }
    if (rule.scope === 'component' && task.context.affectedComponents) {
      return 0.9;
    }
    if (rule.scope === 'route' && task.context.affectedRoutes) {
      return 0.8;
    }
    
    return 0.7;
  }

  /**
   * 执行学习动作
   */
  private async executeLearningAction(
    rule: Rule,
    task: RuntimeTask,
    outcome: Outcome
  ): Promise<RuntimeTask> {
    if (!rule.learn) {
      return task;
    }

    const { action, strategy } = rule.learn;
    
    switch (action) {
      case 'infer-alternative-selector':
        return await this.inferAlternativeSelector(task, outcome, rule);
        
      case 'extend-timeout':
        return this.extendTimeout(task, outcome, rule);
        
      case 'try-alternative-route':
        return this.tryAlternativeRoute(task, outcome, rule);
        
      default:
        Logger.warn(`Unknown learning action: ${action}`);
        return task;
    }
  }

  /**
   * 推断备选 Selector
   */
  private async inferAlternativeSelector(
    task: RuntimeTask,
    outcome: Outcome,
    rule: Rule
  ): Promise<RuntimeTask> {
    if (outcome.failedStep === undefined) {
      return task;
    }

    const failedStep = task.steps[outcome.failedStep];
    if (!('selector' in failedStep)) {
      return task;
    }

    const component = task.context.affectedComponents?.[0];
    if (!component) {
      return task;
    }

    // 从记忆中获取或生成备选 selector
    let alternatives: string[] = [];
    
    if (this.memory[component]) {
      alternatives = this.memory[component].selectorStrategy;
    } else {
      // AI / AST 推断（这里简化为固定策略）
      const originalSelector = failedStep.selector;
      alternatives = [
        originalSelector,
        originalSelector.replace('[data-testid=', '[data-test='),
        originalSelector.replace(/\[data-testid="([^"]+)"\]/, '[aria-label="$1"]'),
        originalSelector.replace(/\[data-testid="([^"]+)"\]/, '.$1')
      ];
      
      // 保存到记忆
      this.memory[component] = {
        component,
        selectorStrategy: alternatives,
        confidence: 0.5
      };
      
      await this.saveMemory();
    }

    // 创建新的 Task，使用备选 selector
    const newTask = JSON.parse(JSON.stringify(task));
    newTask.id = task.id.replace(/(\d+)$/, (m) => String(Number(m) + 1));
    newTask.steps[outcome.failedStep].selector = alternatives[1] || alternatives[0];
    newTask.metadata = {
      ...newTask.metadata,
      createdBy: 'rule',
      retryCount: (newTask.metadata?.retryCount || 0) + 1
    };

    Logger.info(`Generated alternative selector: ${newTask.steps[outcome.failedStep].selector}`);
    
    return newTask;
  }

  /**
   * 延长超时时间
   */
  private extendTimeout(task: RuntimeTask, outcome: Outcome, rule: Rule): RuntimeTask {
    if (outcome.failedStep === undefined) {
      return task;
    }

    const newTask = JSON.parse(JSON.stringify(task));
    const step = newTask.steps[outcome.failedStep];
    
    if ('timeout' in step) {
      const currentTimeout = step.timeout || 30000;
      const newTimeout = Math.min(currentTimeout * 1.5, rule.learn?.maxTimeout || 60000);
      step.timeout = newTimeout;
      
      Logger.info(`Extended timeout: ${currentTimeout}ms → ${newTimeout}ms`);
    }

    newTask.id = task.id.replace(/(\d+)$/, (m) => String(Number(m) + 1));
    newTask.metadata = {
      ...newTask.metadata,
      createdBy: 'rule',
      retryCount: (newTask.metadata?.retryCount || 0) + 1
    };

    return newTask;
  }

  /**
   * 尝试备选路由
   */
  private tryAlternativeRoute(task: RuntimeTask, outcome: Outcome, rule: Rule): RuntimeTask {
    // 简化实现：暂时返回原 task
    Logger.warn('Alternative route not implemented yet');
    return task;
  }

  /**
   * 更新规则权重
   */
  private async updateRuleWeight(ruleId: string, status: 'pending' | 'success' | 'failure'): Promise<void> {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) {
      return;
    }

    if (status === 'failure') {
      rule.weight = rule.weight * 0.7;
      rule.confidence = Math.max(0, rule.confidence - 0.2);
      
      if (rule.metadata) {
        rule.metadata.failureCount = (rule.metadata.failureCount || 0) + 1;
      }

      Logger.warn(`Rule ${rule.name} weight decreased: ${rule.weight.toFixed(3)}`);
    }

    // 检查是否需要禁用
    if (rule.weight < 0.25) {
      rule.enabled = false;
      Logger.warn(`Rule ${rule.name} disabled due to low weight`);
    }

    await this.save();
  }

  /**
   * 保存规则
   */
  private async save(): Promise<void> {
    try {
      const rulesData = await fs.readJson(this.rulesPath);
      rulesData.rules = this.rules;
      await fs.writeJson(this.rulesPath, rulesData, { spaces: 2 });
    } catch (error) {
      Logger.error('Failed to save rules:', error);
    }
  }

  /**
   * 保存记忆
   */
  private async saveMemory(): Promise<void> {
    try {
      const memoryData = await fs.readJson(this.memoryPath);
      memoryData.components = this.memory;
      memoryData.metadata.lastUpdated = new Date().toISOString();
      await fs.writeJson(this.memoryPath, memoryData, { spaces: 2 });
    } catch (error) {
      Logger.error('Failed to save memory:', error);
    }
  }
}
