import { Logger } from '../utils/log.js';
import { ChromeDevToolsMCP } from '../mcp/chrome-devtools-mcp.js';
import { PuppeteerClient } from '../mcp/puppeteer-client.js';
import { SmartSelectorExecutor, createSmartSelectorExecutor, ElementInfo } from '../mcp/smart-selector.js';

/**
 * 自然语言测试执行器
 *
 * 将自然语言测试指令转换为浏览器操作
 * 参考文章中的 MCP Agent 工作流设计
 *
 * 示例指令：
 * "找到名为 '极简人体工学椅' 的商品，将其加入购物车。
 *  然后打开购物车，点击去结算。
 *  在支付弹窗中输入测试卡号 4242...，点击确认支付，
 *  并验证是否出现了'支付成功'的提示。"
 */

export interface NLTestStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'assert' | 'hover' | 'select' | 'screenshot';
  target?: string;
  value?: string;
  description: string;
  optional?: boolean;
}

export interface NLTestCase {
  name: string;
  description: string;
  steps: NLTestStep[];
  expectedOutcome?: string;
}

export interface NLExecutionResult {
  success: boolean;
  testCase: string;
  steps: NLStepResult[];
  duration: number;
  screenshot?: string;
  error?: string;
}

export interface NLStepResult {
  step: NLTestStep;
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * 自然语言解析器
 * 将自然语言指令解析为结构化测试步骤
 */
export class NaturalLanguageParser {
  private actionPatterns: Map<string, RegExp[]>;

  constructor() {
    this.actionPatterns = new Map([
      ['navigate', [
        /打开\s*[""']?(.+?)[""']?\s*(页面|网页|网站)?/i,
        /导航到\s*[""']?(.+?)[""']?/i,
        /访问\s*[""']?(.+?)[""']?/i,
        /go to\s+[""']?(.+?)[""']?/i,
        /navigate to\s+[""']?(.+?)[""']?/i,
        /open\s+[""']?(.+?)[""']?/i,
      ]],
      ['click', [
        /点击\s*[""']?(.+?)[""']?\s*(按钮|链接|元素)?/i,
        /单击\s*[""']?(.+?)[""']?/i,
        /按\s*[""']?(.+?)[""']?\s*按钮/i,
        /click\s+(?:on\s+)?[""']?(.+?)[""']?/i,
        /press\s+[""']?(.+?)[""']?/i,
        /tap\s+[""']?(.+?)[""']?/i,
      ]],
      ['type', [
        /输入\s*[""']?(.+?)[""']?\s*(?:到|在)\s*[""']?(.+?)[""']?/i,
        /填写\s*[""']?(.+?)[""']?\s*(?:为|:)\s*[""']?(.+?)[""']?/i,
        /在\s*[""']?(.+?)[""']?\s*(?:中|里)?输入\s*[""']?(.+?)[""']?/i,
        /type\s+[""']?(.+?)[""']?\s+(?:in|into)\s+[""']?(.+?)[""']?/i,
        /enter\s+[""']?(.+?)[""']?\s+(?:in|into)\s+[""']?(.+?)[""']?/i,
        /fill\s+[""']?(.+?)[""']?\s+with\s+[""']?(.+?)[""']?/i,
      ]],
      ['wait', [
        /等待\s*[""']?(.+?)[""']?\s*(出现|显示|加载)?/i,
        /等\s*(\d+)\s*秒/i,
        /wait for\s+[""']?(.+?)[""']?/i,
        /wait\s+(\d+)\s*(?:seconds?|s)/i,
      ]],
      ['assert', [
        /验证\s*[""']?(.+?)[""']?\s*(存在|显示|出现|可见)?/i,
        /检查\s*[""']?(.+?)[""']?\s*(是否)?(存在|显示)?/i,
        /确认\s*[""']?(.+?)[""']?\s*(出现|显示)?/i,
        /verify\s+[""']?(.+?)[""']?\s*(exists?|visible|shown)?/i,
        /assert\s+[""']?(.+?)[""']?/i,
        /check\s+[""']?(.+?)[""']?/i,
      ]],
      ['hover', [
        /悬停(?:在)?\s*[""']?(.+?)[""']?\s*(上)?/i,
        /鼠标移到\s*[""']?(.+?)[""']?/i,
        /hover\s+(?:on|over)?\s*[""']?(.+?)[""']?/i,
      ]],
      ['select', [
        /选择\s*[""']?(.+?)[""']?\s*(?:选项|值)?/i,
        /从\s*[""']?(.+?)[""']?\s*选择\s*[""']?(.+?)[""']?/i,
        /select\s+[""']?(.+?)[""']?\s*(?:from\s+[""']?(.+?)[""']?)?/i,
      ]],
      ['screenshot', [
        /截图/i,
        /截取屏幕/i,
        /take\s+(?:a\s+)?screenshot/i,
        /capture\s+(?:the\s+)?screen/i,
      ]],
    ]);
  }

  /**
   * 解析自然语言指令为测试步骤
   */
  parse(instruction: string): NLTestStep[] {
    const steps: NLTestStep[] = [];

    // 按句号、换行或数字序号分割
    const sentences = instruction
      .split(/[。\n]|\d+[.、)]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sentence of sentences) {
      const step = this.parseSentence(sentence);
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  /**
   * 解析单个句子
   */
  private parseSentence(sentence: string): NLTestStep | null {
    for (const [action, patterns] of this.actionPatterns) {
      for (const pattern of patterns) {
        const match = sentence.match(pattern);
        if (match) {
          return this.createStep(action as NLTestStep['action'], match, sentence);
        }
      }
    }

    // 尝试智能推断
    return this.inferStep(sentence);
  }

  /**
   * 创建测试步骤
   */
  private createStep(
    action: NLTestStep['action'],
    match: RegExpMatchArray,
    description: string
  ): NLTestStep {
    const step: NLTestStep = {
      action,
      description,
    };

    switch (action) {
      case 'navigate':
        step.target = match[1];
        break;

      case 'click':
        step.target = match[1];
        break;

      case 'type':
        // 根据匹配模式确定 target 和 value
        if (match[2]) {
          step.target = match[2];
          step.value = match[1];
        } else {
          step.value = match[1];
        }
        break;

      case 'wait':
        if (/\d+/.test(match[1])) {
          step.value = match[1];
        } else {
          step.target = match[1];
        }
        break;

      case 'assert':
        step.target = match[1];
        break;

      case 'hover':
        step.target = match[1];
        break;

      case 'select':
        step.value = match[1];
        if (match[2]) {
          step.target = match[2];
        }
        break;

      case 'screenshot':
        // 无需额外参数
        break;
    }

    return step;
  }

  /**
   * 智能推断步骤类型
   */
  private inferStep(sentence: string): NLTestStep | null {
    // 包含 URL 的可能是导航
    if (sentence.match(/https?:\/\/|www\.|\.com|\.cn/)) {
      const urlMatch = sentence.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
      if (urlMatch) {
        return {
          action: 'navigate',
          target: urlMatch[1],
          description: sentence,
        };
      }
    }

    // 包含"加入购物车"等电商操作
    if (sentence.match(/加入购物车|添加到购物车|add to cart/i)) {
      return {
        action: 'click',
        target: '加入购物车',
        description: sentence,
      };
    }

    // 包含"登录"、"注册"等操作
    if (sentence.match(/登录|登陆|sign in|log in/i)) {
      return {
        action: 'click',
        target: '登录',
        description: sentence,
      };
    }

    // 包含"提交"、"确认"等操作
    if (sentence.match(/提交|确认|确定|submit|confirm/i)) {
      return {
        action: 'click',
        target: sentence.match(/提交|确认|确定|submit|confirm/i)?.[0] || '提交',
        description: sentence,
      };
    }

    return null;
  }

  /**
   * 将目标描述转换为选择器
   */
  targetToSelector(target: string): string {
    // 如果已经是选择器格式，直接返回
    if (target.startsWith('[') || target.startsWith('#') || target.startsWith('.')) {
      return target;
    }

    // 尝试匹配 test-id 模式
    if (target.match(/^[\w-]+$/)) {
      return `[data-testid="${target}"], [data-test="${target}"]`;
    }

    // 尝试按钮/链接文本匹配
    const escapedTarget = target.replace(/"/g, '\\"');
    return [
      `[data-testid*="${target}"]`,
      `button:contains("${escapedTarget}")`,
      `a:contains("${escapedTarget}")`,
      `[aria-label*="${escapedTarget}"]`,
      `[title*="${escapedTarget}"]`,
      `[placeholder*="${escapedTarget}"]`,
    ].join(', ');
  }
}

/**
 * 自然语言测试执行器
 */
export class NaturalLanguageExecutor {
  private client: ChromeDevToolsMCP | PuppeteerClient;
  private parser: NaturalLanguageParser;
  private smartSelector: SmartSelectorExecutor;
  private baseUrl: string;

  constructor(
    client: ChromeDevToolsMCP | PuppeteerClient,
    options?: {
      baseUrl?: string;
    }
  ) {
    this.client = client;
    this.parser = new NaturalLanguageParser();
    this.smartSelector = createSmartSelectorExecutor();
    this.baseUrl = options?.baseUrl || 'http://localhost:8081';
  }

  /**
   * 执行自然语言测试指令
   */
  async execute(instruction: string): Promise<NLExecutionResult> {
    const startTime = Date.now();
    const steps = this.parser.parse(instruction);
    const stepResults: NLStepResult[] = [];
    let error: string | undefined;

    Logger.header('自然语言测试执行');
    Logger.info(`指令: ${instruction.substring(0, 100)}...`);
    Logger.info(`解析出 ${steps.length} 个步骤`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStartTime = Date.now();

      Logger.divider();
      Logger.info(`[${i + 1}/${steps.length}] ${step.action}: ${step.description}`);

      try {
        await this.executeStep(step);

        stepResults.push({
          step,
          success: true,
          duration: Date.now() - stepStartTime,
        });

        Logger.success(`✅ 步骤完成`);

      } catch (stepError: any) {
        const stepResult: NLStepResult = {
          step,
          success: false,
          duration: Date.now() - stepStartTime,
          error: stepError.message,
        };

        stepResults.push(stepResult);

        if (!step.optional) {
          error = `步骤 ${i + 1} 失败: ${stepError.message}`;
          Logger.error(`❌ ${error}`);
          break;
        } else {
          Logger.warn(`⚠️ 可选步骤失败，继续执行`);
        }
      }
    }

    // 截图
    let screenshot: string | undefined;
    try {
      screenshot = await this.client.screenshot();
    } catch {
      // 截图失败不影响结果
    }

    return {
      success: !error,
      testCase: instruction.substring(0, 50),
      steps: stepResults,
      duration: Date.now() - startTime,
      screenshot,
      error,
    };
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: NLTestStep): Promise<void> {
    switch (step.action) {
      case 'navigate':
        await this.executeNavigate(step);
        break;

      case 'click':
        await this.executeClick(step);
        break;

      case 'type':
        await this.executeType(step);
        break;

      case 'wait':
        await this.executeWait(step);
        break;

      case 'assert':
        await this.executeAssert(step);
        break;

      case 'hover':
        await this.executeHover(step);
        break;

      case 'select':
        await this.executeSelect(step);
        break;

      case 'screenshot':
        await this.client.screenshot();
        break;

      default:
        throw new Error(`未知操作类型: ${step.action}`);
    }
  }

  /**
   * 执行导航
   */
  private async executeNavigate(step: NLTestStep): Promise<void> {
    let url = step.target || '';

    // 处理相对路径
    if (!url.startsWith('http')) {
      if (!url.startsWith('/')) {
        url = '/' + url;
      }
      url = this.baseUrl + url;
    }

    await this.client.navigate(url);
  }

  /**
   * 执行点击
   */
  private async executeClick(step: NLTestStep): Promise<void> {
    if (!step.target) {
      throw new Error('点击操作需要目标元素');
    }

    const selector = this.parser.targetToSelector(step.target);
    Logger.debug(`选择器: ${selector}`);

    // 使用智能选择器执行
    const success = await this.smartSelector.smartClick(
      this.client as any,
      { text: step.target } as ElementInfo,
      { timeout: 10000 }
    );

    if (!success) {
      // 降级到直接选择器
      await this.client.click(selector, { timeout: 10000 });
    }
  }

  /**
   * 执行输入
   */
  private async executeType(step: NLTestStep): Promise<void> {
    if (!step.value) {
      throw new Error('输入操作需要输入值');
    }

    if (step.target) {
      const selector = this.parser.targetToSelector(step.target);
      await this.client.type(selector, step.value);
    } else {
      // 尝试找到当前聚焦的输入框
      await this.client.evaluate(`
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          activeElement.value = '${step.value.replace(/'/g, "\\'")}';
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
      `);
    }
  }

  /**
   * 执行等待
   */
  private async executeWait(step: NLTestStep): Promise<void> {
    if (step.value && /^\d+$/.test(step.value)) {
      // 等待指定秒数
      const seconds = parseInt(step.value, 10);
      await this.delay(seconds * 1000);
    } else if (step.target) {
      // 等待元素出现
      const selector = this.parser.targetToSelector(step.target);
      await this.client.waitForSelector(selector, { timeout: 10000 });
    } else {
      // 默认等待 1 秒
      await this.delay(1000);
    }
  }

  /**
   * 执行断言
   */
  private async executeAssert(step: NLTestStep): Promise<void> {
    if (!step.target) {
      throw new Error('断言操作需要目标元素');
    }

    const selector = this.parser.targetToSelector(step.target);
    const isVisible = await this.client.isVisible(selector, 5000);

    if (!isVisible) {
      throw new Error(`断言失败: 元素 "${step.target}" 不可见`);
    }
  }

  /**
   * 执行悬停
   */
  private async executeHover(step: NLTestStep): Promise<void> {
    if (!step.target) {
      throw new Error('悬停操作需要目标元素');
    }

    const selector = this.parser.targetToSelector(step.target);
    await this.client.hover(selector);
  }

  /**
   * 执行选择
   */
  private async executeSelect(step: NLTestStep): Promise<void> {
    if (!step.value) {
      throw new Error('选择操作需要选择值');
    }

    if (step.target) {
      const selector = this.parser.targetToSelector(step.target);
      await this.client.select(selector, step.value);
    } else {
      throw new Error('选择操作需要目标元素');
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
 * 创建自然语言解析器
 */
export function createNLParser(): NaturalLanguageParser {
  return new NaturalLanguageParser();
}

/**
 * 创建自然语言执行器
 */
export function createNLExecutor(
  client: ChromeDevToolsMCP | PuppeteerClient,
  options?: { baseUrl?: string }
): NaturalLanguageExecutor {
  return new NaturalLanguageExecutor(client, options);
}

/**
 * 快速执行自然语言测试
 */
export async function executeNLTest(
  instruction: string,
  options?: {
    baseUrl?: string;
    headless?: boolean;
    useMCP?: boolean;
  }
): Promise<NLExecutionResult> {
  const { PuppeteerClient } = await import('../mcp/puppeteer-client.js');

  // 默认使用 Puppeteer（更稳定）
  const client = new PuppeteerClient({
    config: {
      headless: options?.headless ?? false,
    },
  });

  await client.connect();

  try {
    const executor = createNLExecutor(client, { baseUrl: options?.baseUrl });
    return await executor.execute(instruction);
  } finally {
    await client.disconnect();
  }
}
