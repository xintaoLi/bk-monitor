import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';

export interface CodeBuddyRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  action: string;
  enabled: boolean;
  priority?: number;
  conditions?: RuleCondition[];
  parameters?: Record<string, any>;
}

export interface RuleCondition {
  type: 'file_size' | 'file_age' | 'git_status' | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'matches';
  value: string | number;
}

export class CodeBuddyRuleManager {
  private projectRoot: string;
  private rulesPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.rulesPath = path.join(projectRoot, '.codebuddy', 'rules.json');
  }

  async loadRules(): Promise<CodeBuddyRule[]> {
    if (!await fs.pathExists(this.rulesPath)) {
      return [];
    }

    try {
      const config = await fs.readJson(this.rulesPath);
      return config.rules || [];
    } catch (error) {
      Logger.warn('Failed to load CodeBuddy rules:', error);
      return [];
    }
  }

  async saveRules(rules: CodeBuddyRule[]): Promise<void> {
    await fs.ensureDir(path.dirname(this.rulesPath));
    
    const config = {
      rules: rules.sort((a, b) => (a.priority || 100) - (b.priority || 100)),
      updated_at: new Date().toISOString()
    };

    await fs.writeJson(this.rulesPath, config, { spaces: 2 });
  }

  async addRule(rule: CodeBuddyRule): Promise<void> {
    const rules = await this.loadRules();
    
    // 检查是否已存在相同 ID 的规则
    const existingIndex = rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      rules[existingIndex] = rule;
      Logger.info(`Updated existing rule: ${rule.name}`);
    } else {
      rules.push(rule);
      Logger.info(`Added new rule: ${rule.name}`);
    }

    await this.saveRules(rules);
  }

  async removeRule(ruleId: string): Promise<void> {
    const rules = await this.loadRules();
    const filteredRules = rules.filter(r => r.id !== ruleId);
    
    if (filteredRules.length < rules.length) {
      await this.saveRules(filteredRules);
      Logger.info(`Removed rule: ${ruleId}`);
    } else {
      Logger.warn(`Rule not found: ${ruleId}`);
    }
  }

  // 预定义的 MCP E2E 规则
  static getDefaultMcpRules(): CodeBuddyRule[] {
    return [
      {
        id: 'auto-analyze-components',
        name: 'Auto Analyze Component Changes',
        description: 'Automatically analyze component dependencies when React/Vue files change',
        pattern: 'src/**/*.{ts,tsx,js,jsx,vue}',
        action: 'run_mcp_analyze',
        enabled: true,
        priority: 10,
        parameters: {
          debounce: 2000, // 2秒防抖
          batch: true
        }
      },
      {
        id: 'auto-generate-tests',
        name: 'Auto Generate MCP Tests',
        description: 'Automatically generate test flows when analysis completes',
        pattern: '.mcp/analysis.json',
        action: 'run_mcp_generate',
        enabled: true,
        priority: 20,
        conditions: [
          {
            type: 'file_age',
            operator: 'lt',
            value: 300 // 5分钟内的分析结果
          }
        ]
      },
      {
        id: 'validate-test-selectors',
        name: 'Validate Test Selectors',
        description: 'Ensure components have proper data-testid attributes',
        pattern: 'src/**/*.{tsx,jsx,vue}',
        action: 'validate_selectors',
        enabled: true,
        priority: 5,
        parameters: {
          required_attributes: ['data-testid'],
          warn_missing: true
        }
      },
      {
        id: 'cleanup-stale-tests',
        name: 'Cleanup Stale Generated Tests',
        description: 'Remove generated tests for deleted components',
        pattern: 'tests/mcp/generated/**/*.flow.js',
        action: 'cleanup_stale_tests',
        enabled: true,
        priority: 30,
        conditions: [
          {
            type: 'git_status',
            operator: 'contains',
            value: 'deleted'
          }
        ]
      },
      {
        id: 'promote-stable-tests',
        name: 'Auto Promote Stable Tests',
        description: 'Automatically promote tests that pass consistently',
        pattern: '.mcp/test-report.json',
        action: 'auto_promote_stable',
        enabled: false, // 默认禁用，需要手动启用
        priority: 40,
        parameters: {
          min_success_rate: 0.95,
          min_runs: 5
        }
      }
    ];
  }

  async setupDefaultRules(): Promise<void> {
    const defaultRules = CodeBuddyRuleManager.getDefaultMcpRules();
    
    for (const rule of defaultRules) {
      await this.addRule(rule);
    }
    
    Logger.success('Default MCP E2E rules configured');
  }

  // 规则动作处理器
  async executeRuleAction(rule: CodeBuddyRule, triggerFile: string): Promise<void> {
    Logger.debug(`Executing rule action: ${rule.action} for file: ${triggerFile}`);
    
    switch (rule.action) {
      case 'run_mcp_analyze':
        await this.runMcpAnalyze(rule, triggerFile);
        break;
      case 'run_mcp_generate':
        await this.runMcpGenerate(rule, triggerFile);
        break;
      case 'validate_selectors':
        await this.validateSelectors(rule, triggerFile);
        break;
      case 'cleanup_stale_tests':
        await this.cleanupStaleTests(rule, triggerFile);
        break;
      case 'auto_promote_stable':
        await this.autoPromoteStable(rule, triggerFile);
        break;
      default:
        Logger.warn(`Unknown rule action: ${rule.action}`);
    }
  }

  private async runMcpAnalyze(rule: CodeBuddyRule, triggerFile: string): Promise<void> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const child = spawn('npx', ['mcp-e2e', 'analyze'], {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          Logger.success('MCP analysis completed via rule');
        } else {
          Logger.error('MCP analysis failed via rule');
        }
        resolve();
      });
    });
  }

  private async runMcpGenerate(rule: CodeBuddyRule, triggerFile: string): Promise<void> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const child = spawn('npx', ['mcp-e2e', 'generate'], {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          Logger.success('MCP test generation completed via rule');
        } else {
          Logger.error('MCP test generation failed via rule');
        }
        resolve();
      });
    });
  }

  private async validateSelectors(rule: CodeBuddyRule, triggerFile: string): Promise<void> {
    // 实现 selector 验证逻辑
    Logger.info(`Validating selectors in: ${triggerFile}`);
    // TODO: 实现具体的验证逻辑
  }

  private async cleanupStaleTests(rule: CodeBuddyRule, triggerFile: string): Promise<void> {
    // 实现清理过期测试的逻辑
    Logger.info(`Cleaning up stale tests related to: ${triggerFile}`);
    // TODO: 实现具体的清理逻辑
  }

  private async autoPromoteStable(rule: CodeBuddyRule, triggerFile: string): Promise<void> {
    // 实现自动提升稳定测试的逻辑
    Logger.info('Checking for stable tests to promote');
    // TODO: 实现具体的自动提升逻辑
  }
}