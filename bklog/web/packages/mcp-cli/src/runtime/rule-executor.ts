import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { PuppeteerClient } from '../mcp/puppeteer-client.js';
import { MCPClient } from '../mcp/client.js';
import { RuntimeTask, Outcome, Step, Signal } from './types.js';
import { RuleEngine } from './rule-engine.js';

/**
 * CodeBuddy Rule 执行器
 * 
 * 功能：
 * 1. 加载并解析 CodeBuddy Rule
 * 2. 通过 Chrome DevTools MCP 或 Puppeteer 执行测试
 * 3. 生成测试结果报告
 * 4. 支持 Rule 学习和自进化
 */

export interface RuleExecutionConfig {
  baseUrl: string;
  headless: boolean;
  timeout: number;
  retries: number;
  screenshot: boolean;
  parallel: boolean;
  stopOnFirstFailure: boolean;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  status: 'passed' | 'failed' | 'partial' | 'skipped';
  startTime: string;
  endTime: string;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  testResults: TestResult[];
  screenshots: string[];
  errors: string[];
}

export interface TestResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  steps: StepResult[];
  signals: SignalResult[];
  error?: string;
  screenshot?: string;
}

export interface StepResult {
  stepIndex: number;
  type: string;
  target: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface SignalResult {
  type: string;
  status: 'met' | 'not-met' | 'timeout';
  duration: number;
}

/**
 * Rule 执行器
 */
export class RuleExecutor {
  private projectRoot: string;
  private config: RuleExecutionConfig;
  private client: PuppeteerClient | MCPClient | null = null;
  private ruleEngine: RuleEngine;
  
  constructor(projectRoot: string, config?: Partial<RuleExecutionConfig>) {
    this.projectRoot = projectRoot;
    this.config = {
      baseUrl: 'http://localhost:8081',
      headless: false,
      timeout: 30000,
      retries: 2,
      screenshot: true,
      parallel: false,
      stopOnFirstFailure: false,
      ...config,
    };
    this.ruleEngine = new RuleEngine(projectRoot);
  }

  /**
   * 执行 CodeBuddy Rule
   */
  async executeRule(ruleIdOrPath: string): Promise<RuleExecutionResult> {
    Logger.header('CodeBuddy Rule 执行器');
    
    // 1. 加载 Rule
    Logger.step(1, 5, '加载 Rule...');
    const rule = await this.loadRule(ruleIdOrPath);
    Logger.info(`Rule: ${rule.name}`);
    Logger.info(`测试数量: ${rule.tests?.length || rule.flows?.length || 0}`);
    
    // 2. 初始化浏览器
    Logger.step(2, 5, '初始化浏览器...');
    await this.initializeClient(rule.config || this.config);
    
    // 3. 加载 Rule Engine
    Logger.step(3, 5, '加载 Rule Engine...');
    await this.ruleEngine.load();
    
    // 4. 执行测试
    Logger.step(4, 5, '执行测试...');
    const result = await this.runTests(rule);
    
    // 5. 生成报告
    Logger.step(5, 5, '生成报告...');
    await this.generateReport(result);
    
    // 清理
    await this.cleanup();
    
    return result;
  }

  /**
   * 加载 Rule
   */
  private async loadRule(ruleIdOrPath: string): Promise<any> {
    let rulePath: string;
    
    // 判断是路径还是 ID
    if (ruleIdOrPath.endsWith('.json')) {
      rulePath = path.resolve(this.projectRoot, ruleIdOrPath);
    } else {
      // 在 .codebuddy/rules 目录查找
      rulePath = path.join(this.projectRoot, '.codebuddy', 'rules', `${ruleIdOrPath}.json`);
      
      if (!await fs.pathExists(rulePath)) {
        // 在 .mcp/impact-analysis 目录查找
        rulePath = path.join(this.projectRoot, '.mcp', 'impact-analysis', `${ruleIdOrPath}.json`);
      }
    }
    
    if (!await fs.pathExists(rulePath)) {
      throw new Error(`Rule not found: ${ruleIdOrPath}`);
    }
    
    return await fs.readJson(rulePath);
  }

  /**
   * 初始化浏览器客户端
   */
  private async initializeClient(config: any): Promise<void> {
    const usePuppeteer = process.env.USE_PUPPETEER !== 'false';
    
    if (usePuppeteer) {
      Logger.info('使用 Puppeteer 可视化模式');
      this.client = new PuppeteerClient({
        config: {
          headless: config.headless ?? this.config.headless,
        },
      });
    } else {
      Logger.info('使用 MCP 模式');
      const mcpConfig = await this.loadMCPConfig();
      this.client = new MCPClient(mcpConfig);
    }
    
    await this.client.connect();
    Logger.success('浏览器已连接');
  }

  /**
   * 加载 MCP 配置
   */
  private async loadMCPConfig(): Promise<any> {
    const configPath = path.join(this.projectRoot, '.mcp', 'servers.json');
    
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
    
    return {
      mcpServers: {
        'chrome-devtools': {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-server-puppeteer'],
          env: {},
        },
      },
    };
  }

  /**
   * 运行测试
   */
  private async runTests(rule: any): Promise<RuleExecutionResult> {
    const startTime = new Date();
    const testResults: TestResult[] = [];
    const screenshots: string[] = [];
    const errors: string[] = [];
    
    // 获取测试列表
    const tests = rule.tests || rule.flows || [];
    
    // 替换 baseUrl
    const baseUrl = process.env.MCP_BASE_URL || rule.context?.baseUrl?.replace('{{baseUrl}}', this.config.baseUrl) || this.config.baseUrl;
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      Logger.divider();
      Logger.info(`[${i + 1}/${tests.length}] 执行测试: ${test.name}`);
      
      try {
        const testResult = await this.runSingleTest(test, baseUrl);
        testResults.push(testResult);
        
        if (testResult.screenshot) {
          screenshots.push(testResult.screenshot);
        }
        
        if (testResult.status === 'passed') {
          Logger.success(`✅ ${test.name} - 通过`);
        } else {
          Logger.error(`❌ ${test.name} - 失败`);
          if (testResult.error) {
            errors.push(`${test.name}: ${testResult.error}`);
          }
          
          if (this.config.stopOnFirstFailure) {
            Logger.warn('stopOnFirstFailure 已启用，停止执行');
            break;
          }
        }
        
      } catch (error: any) {
        Logger.error(`测试执行异常: ${error.message}`);
        errors.push(`${test.name}: ${error.message}`);
        
        testResults.push({
          testId: test.id,
          testName: test.name,
          status: 'failed',
          duration: 0,
          steps: [],
          signals: [],
          error: error.message,
        });
        
        if (this.config.stopOnFirstFailure) {
          break;
        }
      }
    }
    
    const endTime = new Date();
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const failedTests = testResults.filter(r => r.status === 'failed').length;
    const skippedTests = testResults.filter(r => r.status === 'skipped').length;
    
    let status: RuleExecutionResult['status'];
    if (failedTests === 0 && passedTests > 0) {
      status = 'passed';
    } else if (passedTests === 0 && failedTests > 0) {
      status = 'failed';
    } else if (passedTests > 0 && failedTests > 0) {
      status = 'partial';
    } else {
      status = 'skipped';
    }
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: endTime.getTime() - startTime.getTime(),
      totalTests: tests.length,
      passedTests,
      failedTests,
      skippedTests,
      testResults,
      screenshots,
      errors,
    };
  }

  /**
   * 运行单个测试
   */
  private async runSingleTest(test: any, baseUrl: string): Promise<TestResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    const signalResults: SignalResult[] = [];
    let error: string | undefined;
    let screenshot: string | undefined;
    
    try {
      // 执行步骤
      for (let i = 0; i < test.steps.length; i++) {
        const step = test.steps[i];
        const stepStartTime = Date.now();
        
        try {
          await this.executeStep(step, baseUrl);
          
          stepResults.push({
            stepIndex: i,
            type: step.type,
            target: step.target || step.selector,
            status: 'passed',
            duration: Date.now() - stepStartTime,
          });
          
        } catch (stepError: any) {
          stepResults.push({
            stepIndex: i,
            type: step.type,
            target: step.target || step.selector,
            status: step.optional ? 'skipped' : 'failed',
            duration: Date.now() - stepStartTime,
            error: stepError.message,
          });
          
          if (!step.optional) {
            error = `Step ${i + 1} failed: ${stepError.message}`;
            break;
          }
        }
      }
      
      // 检查信号
      if (!error && test.signals) {
        for (const signal of test.signals) {
          const signalStartTime = Date.now();
          
          try {
            const met = await this.checkSignal(signal);
            
            signalResults.push({
              type: signal.type,
              status: met ? 'met' : 'not-met',
              duration: Date.now() - signalStartTime,
            });
            
            if (!met) {
              error = `Signal not met: ${signal.type}`;
            }
            
          } catch (signalError: any) {
            signalResults.push({
              type: signal.type,
              status: 'timeout',
              duration: Date.now() - signalStartTime,
            });
          }
        }
      }
      
      // 截图
      if (this.config.screenshot && this.client) {
        try {
          const screenshotDir = path.join(this.projectRoot, '.mcp', 'screenshots');
          await fs.ensureDir(screenshotDir);
          
          const screenshotPath = path.join(screenshotDir, `${test.id}-${Date.now()}.png`);
          await this.client.screenshot(screenshotPath);
          screenshot = path.relative(this.projectRoot, screenshotPath);
        } catch {
          // 截图失败不影响测试结果
        }
      }
      
    } catch (testError: any) {
      error = testError.message;
    }
    
    return {
      testId: test.id,
      testName: test.name,
      status: error ? 'failed' : 'passed',
      duration: Date.now() - startTime,
      steps: stepResults,
      signals: signalResults,
      error,
      screenshot,
    };
  }

  /**
   * 执行步骤
   */
  private async executeStep(step: any, baseUrl: string): Promise<void> {
    if (!this.client) {
      throw new Error('Browser client not initialized');
    }
    
    const timeout = step.timeout || this.config.timeout;
    
    switch (step.type) {
      case 'navigate':
        let url = step.target || step.url;
        if (url && !url.startsWith('http')) {
          url = baseUrl + url;
        }
        await this.client.navigate(url, step.waitUntil);
        break;
        
      case 'click':
        await this.client.click(step.selector, { timeout });
        break;
        
      case 'type':
        await this.client.type(step.selector, step.value || '', { delay: step.delay });
        break;
        
      case 'wait':
        if (step.selector) {
          await this.client.waitForSelector(step.selector, { timeout, state: step.state || step.waitFor });
        } else {
          await this.delay(step.timeout || 1000);
        }
        break;
        
      case 'hover':
        await this.client.hover(step.selector);
        break;
        
      case 'select':
        await this.client.select(step.selector, step.value);
        break;
        
      case 'assert':
        const isVisible = await this.client.isVisible(step.selector, timeout);
        if (!isVisible) {
          throw new Error(`Element not visible: ${step.selector}`);
        }
        break;
        
      default:
        Logger.warn(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * 检查信号
   */
  private async checkSignal(signal: any): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    
    const timeout = signal.timeout || 5000;
    
    switch (signal.type) {
      case 'dom-visible':
        return await this.client.isVisible(signal.selector, timeout);
        
      case 'dom-hidden':
        return !(await this.client.isVisible(signal.selector, timeout));
        
      case 'route-match':
        const currentRoute = await this.client.evaluate('window.location.pathname');
        return currentRoute === signal.value;
        
      case 'network-idle':
        try {
          await this.client.waitForNetworkIdle(timeout);
          return true;
        } catch {
          return false;
        }
        
      case 'no-error':
        const hasError = await this.client.querySelector('.error-toast, .bk-message-error, .ant-message-error');
        return !hasError;
        
      default:
        return true;
    }
  }

  /**
   * 生成报告
   */
  private async generateReport(result: RuleExecutionResult): Promise<void> {
    const reportDir = path.join(this.projectRoot, '.mcp', 'reports');
    await fs.ensureDir(reportDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `rule-execution-${timestamp}.json`);
    
    await fs.writeJson(reportPath, result, { spaces: 2 });
    
    Logger.divider();
    Logger.header('测试执行报告');
    Logger.info(`📋 Rule: ${result.ruleName}`);
    Logger.info(`📊 状态: ${result.status}`);
    Logger.info(`⏱️  耗时: ${result.duration}ms`);
    Logger.info(`✅ 通过: ${result.passedTests}`);
    Logger.info(`❌ 失败: ${result.failedTests}`);
    Logger.info(`⏭️  跳过: ${result.skippedTests}`);
    Logger.info(`📄 报告: ${path.relative(this.projectRoot, reportPath)}`);
    
    if (result.errors.length > 0) {
      Logger.divider();
      Logger.error('错误列表:');
      result.errors.forEach((err, i) => {
        Logger.error(`  ${i + 1}. ${err}`);
      });
    }
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 导出执行命令
 */
export async function executeRule(
  ruleIdOrPath: string,
  projectRoot?: string,
  config?: Partial<RuleExecutionConfig>
): Promise<RuleExecutionResult> {
  const root = projectRoot || process.cwd();
  const executor = new RuleExecutor(root, config);
  return await executor.executeRule(ruleIdOrPath);
}

/**
 * 批量执行 Rules
 */
export async function executeRules(
  ruleIds: string[],
  projectRoot?: string,
  config?: Partial<RuleExecutionConfig>
): Promise<RuleExecutionResult[]> {
  const results: RuleExecutionResult[] = [];
  
  for (const ruleId of ruleIds) {
    const result = await executeRule(ruleId, projectRoot, config);
    results.push(result);
  }
  
  return results;
}
