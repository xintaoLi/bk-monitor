/**
 * MCP 自动执行器
 *
 * 直接调用 Chrome DevTools MCP 执行测试，无需 AI 介入
 * 通过解析 Prompt 中的操作指令，转换为 MCP 工具调用
 */

import { Logger } from '../utils/log.js';
import { ChromeDevToolsMCP, ChromeMCPConfig } from '../mcp/chrome-devtools-mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============ 类型定义 ============

export interface TestStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'screenshot' | 'assert' | 'hover' | 'select' | 'scroll' | 'delay';
  target?: string;
  value?: string;
  timeout?: number;
  description?: string;
}

export interface ParsedScenario {
  id: string;
  name: string;
  type: string;
  priority: string;
  route: string;
  steps: TestStep[];
  expectedOutcome?: string;
}

export interface AutoExecutionResult {
  scenarioId: string;
  scenarioName: string;
  success: boolean;
  duration: number;
  steps: StepExecutionResult[];
  screenshot?: string;
  error?: string;
}

export interface StepExecutionResult {
  step: TestStep;
  success: boolean;
  duration: number;
  error?: string;
}

export interface AutoExecutorConfig {
  baseUrl: string;
  headless?: boolean;
  viewport?: string;
  timeout?: number;
  screenshotDir?: string;
  continueOnError?: boolean;
  delayBetweenSteps?: number;
}

// ============ Prompt 解析器 ============

/**
 * 解析 Prompt 文本，提取测试步骤
 */
export function parsePromptToSteps(prompt: string, baseUrl: string): TestStep[] {
  const steps: TestStep[] = [];
  const lines = prompt.split('\n').map(l => l.trim()).filter(l => l);

  for (const line of lines) {
    const step = parseStepLine(line, baseUrl);
    if (step) {
      steps.push(step);
    }
  }

  return steps;
}

/**
 * 解析单行指令
 */
function parseStepLine(line: string, baseUrl: string): TestStep | null {
  // 跳过注释和标题
  if (line.startsWith('#') || line.startsWith('//') || line.startsWith('*')) {
    return null;
  }

  // 移除列表标记
  const cleanLine = line.replace(/^[-\d.)\]]+\s*/, '').trim();
  const lowerLine = cleanLine.toLowerCase();

  // 导航指令
  if (lowerLine.includes('导航') || lowerLine.includes('navigate') || lowerLine.includes('打开') || lowerLine.includes('访问')) {
    const urlMatch = cleanLine.match(/(?:到|to|url[:：]?\s*)?[`"]?([^`"\s]+)[`"]?/i);
    let url = urlMatch?.[1] || '';

    // 处理相对路径
    if (url.startsWith('/')) {
      url = baseUrl + url;
    } else if (!url.startsWith('http')) {
      url = baseUrl + '/' + url;
    }

    // 替换变量
    url = url.replace(/\{\{baseUrl\}\}/g, baseUrl);

    if (url) {
      return { action: 'navigate', target: url, description: cleanLine };
    }
  }

  // 点击指令
  if (lowerLine.includes('点击') || lowerLine.includes('click')) {
    const selector = extractSelector(cleanLine);
    if (selector) {
      return { action: 'click', target: selector, description: cleanLine };
    }
  }

  // 输入指令
  if (lowerLine.includes('输入') || lowerLine.includes('type') || lowerLine.includes('填写') || lowerLine.includes('fill')) {
    const { selector, value } = extractInputParams(cleanLine);
    if (selector || value) {
      return { action: 'type', target: selector, value, description: cleanLine };
    }
  }

  // 等待指令
  if (lowerLine.includes('等待') || lowerLine.includes('wait')) {
    const selector = extractSelector(cleanLine);
    const timeMatch = cleanLine.match(/(\d+)\s*(?:秒|s|ms|毫秒)/i);
    const timeout = timeMatch ? parseInt(timeMatch[1], 10) * (lowerLine.includes('ms') || lowerLine.includes('毫秒') ? 1 : 1000) : 5000;

    if (selector) {
      return { action: 'wait', target: selector, timeout, description: cleanLine };
    } else if (timeMatch) {
      return { action: 'delay', timeout, description: cleanLine };
    }
  }

  // 截图指令
  if (lowerLine.includes('截图') || lowerLine.includes('screenshot')) {
    return { action: 'screenshot', description: cleanLine };
  }

  // 悬停指令
  if (lowerLine.includes('悬停') || lowerLine.includes('hover') || lowerLine.includes('鼠标移到')) {
    const selector = extractSelector(cleanLine);
    if (selector) {
      return { action: 'hover', target: selector, description: cleanLine };
    }
  }

  // 选择指令
  if (lowerLine.includes('选择') || lowerLine.includes('select')) {
    const { selector, value } = extractInputParams(cleanLine);
    if (selector) {
      return { action: 'select', target: selector, value, description: cleanLine };
    }
  }

  // 滚动指令
  if (lowerLine.includes('滚动') || lowerLine.includes('scroll')) {
    const selector = extractSelector(cleanLine);
    return { action: 'scroll', target: selector, description: cleanLine };
  }

  // 断言指令
  if (lowerLine.includes('验证') || lowerLine.includes('assert') || lowerLine.includes('检查') || lowerLine.includes('确认')) {
    const selector = extractSelector(cleanLine);
    const value = extractAssertValue(cleanLine);
    if (selector || value) {
      return { action: 'assert', target: selector, value, description: cleanLine };
    }
  }

  return null;
}

/**
 * 提取选择器
 */
function extractSelector(line: string): string | undefined {
  // 优先匹配 test-id
  const testIdMatch = line.match(/\[data-test-id=["']([^"']+)["']\]/);
  if (testIdMatch) {
    return `[data-test-id="${testIdMatch[1]}"]`;
  }

  // 匹配 test-id 简写
  const testIdShortMatch = line.match(/test-id[:：]?\s*["'`]?([a-zA-Z0-9_-]+)["'`]?/i);
  if (testIdShortMatch) {
    return `[data-test-id="${testIdShortMatch[1]}"]`;
  }

  // 匹配 CSS 选择器
  const cssMatch = line.match(/选择器[:：]?\s*["'`]?([.#\[\]a-zA-Z0-9_="-]+)["'`]?/i);
  if (cssMatch) {
    return cssMatch[1];
  }

  // 匹配反引号中的选择器
  const backtickMatch = line.match(/`([.#\[\]a-zA-Z0-9_="-]+)`/);
  if (backtickMatch) {
    return backtickMatch[1];
  }

  // 匹配引号中的选择器
  const quoteMatch = line.match(/["']([.#\[\]a-zA-Z0-9_="-]+)["']/);
  if (quoteMatch && (quoteMatch[1].startsWith('.') || quoteMatch[1].startsWith('#') || quoteMatch[1].startsWith('['))) {
    return quoteMatch[1];
  }

  // 匹配元素描述（转换为可能的选择器）
  const elementMatch = line.match(/(?:元素|按钮|输入框|链接|菜单)[:：]?\s*["'`]?([^"'`\s]+)["'`]?/);
  if (elementMatch) {
    // 尝试作为类名或ID
    const name = elementMatch[1];
    if (name.startsWith('.') || name.startsWith('#') || name.startsWith('[')) {
      return name;
    }
  }

  return undefined;
}

/**
 * 提取输入参数
 */
function extractInputParams(line: string): { selector?: string; value?: string } {
  const selector = extractSelector(line);

  // 提取输入值
  let value: string | undefined;

  // 匹配 "输入 xxx" 或 "value: xxx"
  const valueMatch = line.match(/(?:输入|填写|type|fill|value[:：]?)\s*["'`]?([^"'`]+)["'`]?/i);
  if (valueMatch) {
    value = valueMatch[1].trim();
  }

  // 匹配 "到 xxx" 后的内容
  const toMatch = line.match(/(?:到|到|into)\s*["'`]?([^"'`]+)["'`]?/i);
  if (!value && toMatch) {
    value = toMatch[1].trim();
  }

  return { selector, value };
}

/**
 * 提取断言值
 */
function extractAssertValue(line: string): string | undefined {
  // 匹配期望值
  const expectMatch = line.match(/(?:应该|should|expect|包含|contains|显示|shows?)\s*["'`]?([^"'`]+)["'`]?/i);
  if (expectMatch) {
    return expectMatch[1].trim();
  }
  return undefined;
}

// ============ MCP 自动执行器 ============

export class MCPAutoExecutor {
  private config: AutoExecutorConfig;
  private client: ChromeDevToolsMCP | null = null;
  private screenshotIndex = 0;

  constructor(config: Partial<AutoExecutorConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8080',
      headless: config.headless ?? false,
      viewport: config.viewport || '1920x1080',
      timeout: config.timeout || 30000,
      screenshotDir: config.screenshotDir || '.codebuddy/screenshots',
      continueOnError: config.continueOnError ?? true,
      delayBetweenSteps: config.delayBetweenSteps ?? 500,
    };
  }

  /**
   * 连接 MCP 客户端
   */
  async connect(): Promise<void> {
    Logger.info('正在连接 Chrome DevTools MCP...');

    const mcpConfig: ChromeMCPConfig = {
      headless: this.config.headless,
      viewport: this.config.viewport,
      timeout: this.config.timeout,
    };

    this.client = new ChromeDevToolsMCP(mcpConfig);
    await this.client.connect();

    Logger.success('Chrome DevTools MCP 已连接');
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * 执行单个测试场景
   */
  async executeScenario(scenario: ParsedScenario): Promise<AutoExecutionResult> {
    Logger.header(`执行场景: ${scenario.name}`);
    Logger.info(`类型: ${scenario.type} | 优先级: ${scenario.priority}`);
    Logger.info(`路由: ${scenario.route}`);
    Logger.info(`步骤数: ${scenario.steps.length}`);

    const startTime = Date.now();
    const stepResults: StepExecutionResult[] = [];
    let hasError = false;

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      Logger.info(`\n[${i + 1}/${scenario.steps.length}] ${step.description || step.action}`);

      const stepResult = await this.executeStep(step);
      stepResults.push(stepResult);

      if (!stepResult.success) {
        hasError = true;
        Logger.error(`  ❌ 步骤失败: ${stepResult.error}`);

        if (!this.config.continueOnError) {
          break;
        }
      } else {
        Logger.success(`  ✅ 步骤完成 (${stepResult.duration}ms)`);
      }

      // 步骤间延迟
      if (this.config.delayBetweenSteps && i < scenario.steps.length - 1) {
        await this.delay(this.config.delayBetweenSteps);
      }
    }

    // 最终截图
    let screenshot: string | undefined;
    try {
      screenshot = await this.takeScreenshot(`${scenario.id}-final`);
    } catch (e) {
      Logger.warn('最终截图失败');
    }

    const duration = Date.now() - startTime;

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      success: !hasError,
      duration,
      steps: stepResults,
      screenshot,
      error: hasError ? stepResults.find(s => !s.success)?.error : undefined,
    };
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: TestStep): Promise<StepExecutionResult> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        throw new Error('MCP 客户端未连接');
      }

      switch (step.action) {
        case 'navigate':
          await this.client.navigate(step.target!);
          await this.client.waitForNetworkIdle(5000);
          break;

        case 'click':
          await this.client.click(step.target!, { timeout: step.timeout || 5000 });
          break;

        case 'type':
          if (step.target && step.value) {
            await this.client.type(step.target, step.value);
          }
          break;

        case 'wait':
          if (step.target) {
            await this.client.waitForSelector(step.target, { timeout: step.timeout || 5000 });
          }
          break;

        case 'delay':
          await this.delay(step.timeout || 1000);
          break;

        case 'screenshot':
          await this.takeScreenshot();
          break;

        case 'hover':
          await this.client.hover(step.target!);
          break;

        case 'select':
          await this.client.select(step.target!, step.value!);
          break;

        case 'scroll':
          if (step.target) {
            await this.client.evaluate(`document.querySelector('${step.target}')?.scrollIntoView({ behavior: 'smooth' })`);
          } else {
            await this.client.evaluate('window.scrollBy(0, 300)');
          }
          break;

        case 'assert':
          await this.executeAssert(step);
          break;

        default:
          Logger.warn(`未知操作: ${step.action}`);
      }

      return {
        step,
        success: true,
        duration: Date.now() - startTime,
      };

    } catch (error: any) {
      return {
        step,
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * 执行断言
   */
  private async executeAssert(step: TestStep): Promise<void> {
    if (!this.client) {
      throw new Error('MCP 客户端未连接');
    }

    if (step.target) {
      // 检查元素是否存在
      const exists = await this.client.isVisible(step.target, 3000);
      if (!exists) {
        throw new Error(`断言失败: 元素 ${step.target} 不存在或不可见`);
      }
    }

    if (step.value) {
      // 检查页面是否包含文本
      const pageText = await this.client.evaluate('document.body.innerText');
      if (!pageText.includes(step.value)) {
        throw new Error(`断言失败: 页面不包含文本 "${step.value}"`);
      }
    }
  }

  /**
   * 截图
   */
  private async takeScreenshot(name?: string): Promise<string> {
    if (!this.client) {
      throw new Error('MCP 客户端未连接');
    }

    await fs.mkdir(this.config.screenshotDir!, { recursive: true });

    this.screenshotIndex++;
    const filename = name || `screenshot-${this.screenshotIndex}`;
    const filepath = path.join(this.config.screenshotDir!, `${filename}-${Date.now()}.png`);

    await this.client.screenshot(filepath);
    Logger.info(`  📸 截图: ${filepath}`);

    return filepath;
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 从 Rule 文件执行测试
   */
  async executeFromRule(
    rulePath: string,
    options: {
      route?: string;
      type?: string;
      priority?: string;
      scenarioId?: string;
    } = {}
  ): Promise<AutoExecutionResult[]> {
    // 加载 Rule
    const ruleContent = await fs.readFile(rulePath, 'utf-8');
    const rule = JSON.parse(ruleContent);

    Logger.header(`执行测试规则: ${rule.name}`);
    Logger.info(`Rule ID: ${rule.id}`);
    Logger.info(`基础 URL: ${this.config.baseUrl}`);

    // 筛选场景
    let scenarios = rule.scenarios || [];

    if (options.route) {
      scenarios = scenarios.filter((s: any) => s.route === options.route || s.route?.includes(options.route));
    }
    if (options.type) {
      scenarios = scenarios.filter((s: any) => s.type === options.type);
    }
    if (options.priority) {
      scenarios = scenarios.filter((s: any) => s.priority === options.priority);
    }
    if (options.scenarioId) {
      scenarios = scenarios.filter((s: any) => s.id === options.scenarioId);
    }

    Logger.info(`匹配场景: ${scenarios.length} 个`);

    if (scenarios.length === 0) {
      Logger.warn('没有匹配的测试场景');
      return [];
    }

    // 连接 MCP
    await this.connect();

    const results: AutoExecutionResult[] = [];

    try {
      for (const scenario of scenarios) {
        // 解析 Prompt 为步骤
        const steps = parsePromptToSteps(scenario.prompt, this.config.baseUrl);

        if (steps.length === 0) {
          Logger.warn(`场景 ${scenario.name} 没有可执行的步骤，跳过`);
          continue;
        }

        const parsedScenario: ParsedScenario = {
          id: scenario.id,
          name: scenario.name,
          type: scenario.type || 'functional',
          priority: scenario.priority || 'medium',
          route: scenario.route || '/',
          steps,
          expectedOutcome: scenario.expectedOutcome,
        };

        const result = await this.executeScenario(parsedScenario);
        results.push(result);

        Logger.divider();
      }

    } finally {
      await this.disconnect();
    }

    // 输出汇总
    this.printSummary(results);

    // 保存报告
    await this.saveReport(rule, results);

    return results;
  }

  /**
   * 输出测试汇总
   */
  private printSummary(results: AutoExecutionResult[]): void {
    Logger.header('测试结果汇总');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    Logger.info(`总计: ${total} 个场景`);
    Logger.success(`通过: ${passed}`);
    if (failed > 0) {
      Logger.error(`失败: ${failed}`);
    }
    Logger.info(`通过率: ${((passed / total) * 100).toFixed(1)}%`);
    Logger.info(`总耗时: ${(totalDuration / 1000).toFixed(2)}s`);

    Logger.divider();

    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      const stepInfo = `${result.steps.filter(s => s.success).length}/${result.steps.length} 步骤`;
      Logger.info(`${status} ${result.scenarioName} (${stepInfo}, ${result.duration}ms)`);

      if (result.error) {
        Logger.error(`   错误: ${result.error}`);
      }
    }
  }

  /**
   * 保存测试报告
   */
  private async saveReport(rule: any, results: AutoExecutionResult[]): Promise<void> {
    const reportDir = path.join('.codebuddy', 'reports');
    await fs.mkdir(reportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `auto-test-${timestamp}.json`);

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const report = {
      ruleId: rule.id,
      ruleName: rule.name,
      executedAt: new Date().toISOString(),
      baseUrl: this.config.baseUrl,
      config: this.config,
      summary: {
        total: results.length,
        passed,
        failed,
        passRate: `${((passed / results.length) * 100).toFixed(1)}%`,
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      },
      results,
    };

    await fs.writeFile(reportFile, JSON.stringify(report, null, 2), 'utf-8');
    Logger.success(`\n📊 报告已保存: ${reportFile}`);
  }
}

/**
 * 创建 MCP 自动执行器
 */
export function createMCPAutoExecutor(config?: Partial<AutoExecutorConfig>): MCPAutoExecutor {
  return new MCPAutoExecutor(config);
}

/**
 * 快速执行测试
 */
export async function autoExecuteTests(
  rulePath: string,
  options?: {
    baseUrl?: string;
    headless?: boolean;
    route?: string;
    type?: string;
    priority?: string;
    scenarioId?: string;
  }
): Promise<AutoExecutionResult[]> {
  const executor = createMCPAutoExecutor({
    baseUrl: options?.baseUrl,
    headless: options?.headless,
  });

  return executor.executeFromRule(rulePath, options);
}
