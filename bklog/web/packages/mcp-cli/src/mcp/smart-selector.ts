import { Logger } from '../utils/log.js';

/**
 * 智能选择器策略
 *
 * 当主选择器失败时，自动尝试备选策略：
 * 1. data-testid 优先
 * 2. 语义化选择器（role, aria-label）
 * 3. 文本内容匹配
 * 4. 结构化路径
 *
 * 参考文章中的"抗脆性"设计理念
 */

export interface SelectorStrategy {
  type: 'testid' | 'role' | 'text' | 'css' | 'xpath';
  selector: string;
  confidence: number;
  description: string;
}

export interface SmartSelectorConfig {
  /** 启用 test-id 优先 */
  preferTestId: boolean;
  /** 启用文本匹配 */
  enableTextMatch: boolean;
  /** 启用语义选择器 */
  enableSemanticSelectors: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryDelay: number;
}

/**
 * 智能选择器生成器
 */
export class SmartSelector {
  private config: SmartSelectorConfig;

  constructor(config?: Partial<SmartSelectorConfig>) {
    this.config = {
      preferTestId: true,
      enableTextMatch: true,
      enableSemanticSelectors: true,
      maxRetries: 3,
      retryDelay: 500,
      ...config,
    };
  }

  /**
   * 生成选择器策略列表
   * 按优先级排序，用于失败时自动降级
   */
  generateStrategies(element: ElementInfo): SelectorStrategy[] {
    const strategies: SelectorStrategy[] = [];

    // 1. data-testid（最高优先级）
    if (element.testId) {
      strategies.push({
        type: 'testid',
        selector: `[data-testid="${element.testId}"]`,
        confidence: 1.0,
        description: `Test ID: ${element.testId}`,
      });
    }

    // 2. data-test 备选
    if (element.dataTest) {
      strategies.push({
        type: 'testid',
        selector: `[data-test="${element.dataTest}"]`,
        confidence: 0.95,
        description: `Data Test: ${element.dataTest}`,
      });
    }

    // 3. ARIA 角色 + 名称
    if (element.role && element.ariaLabel) {
      strategies.push({
        type: 'role',
        selector: `[role="${element.role}"][aria-label="${element.ariaLabel}"]`,
        confidence: 0.9,
        description: `Role: ${element.role}, Label: ${element.ariaLabel}`,
      });
    }

    // 4. 按钮/链接的文本内容
    if (element.text && this.config.enableTextMatch) {
      if (element.tagName === 'button' || element.tagName === 'a') {
        strategies.push({
          type: 'text',
          selector: `//${element.tagName}[contains(text(), "${element.text}")]`,
          confidence: 0.85,
          description: `Text: "${element.text}"`,
        });

        // CSS 备选（使用 :has 伪类）
        strategies.push({
          type: 'css',
          selector: `${element.tagName}:has(:scope > :contains("${element.text}"))`,
          confidence: 0.8,
          description: `CSS Text Match: "${element.text}"`,
        });
      }
    }

    // 5. ID 选择器
    if (element.id) {
      strategies.push({
        type: 'css',
        selector: `#${element.id}`,
        confidence: 0.75,
        description: `ID: ${element.id}`,
      });
    }

    // 6. 类名组合
    if (element.className && element.className.length > 0) {
      const meaningfulClasses = element.className.filter(c =>
        !c.startsWith('css-') && // 排除 CSS-in-JS 生成的类
        !c.match(/^[a-z]{6,}$/) && // 排除随机类名
        c.length > 2
      );

      if (meaningfulClasses.length > 0) {
        strategies.push({
          type: 'css',
          selector: `.${meaningfulClasses.join('.')}`,
          confidence: 0.6,
          description: `Classes: ${meaningfulClasses.join(', ')}`,
        });
      }
    }

    // 7. 结构化路径（最低优先级）
    if (element.path) {
      strategies.push({
        type: 'css',
        selector: element.path,
        confidence: 0.4,
        description: `Path: ${element.path}`,
      });
    }

    return strategies.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 解析选择器，提取元素信息
   */
  parseSelector(selector: string): Partial<ElementInfo> {
    const info: Partial<ElementInfo> = {};

    // 解析 data-testid
    const testIdMatch = selector.match(/\[data-testid=["']([^"']+)["']\]/);
    if (testIdMatch) {
      info.testId = testIdMatch[1];
    }

    // 解析 ID
    const idMatch = selector.match(/#([a-zA-Z][\w-]*)/);
    if (idMatch) {
      info.id = idMatch[1];
    }

    // 解析类名
    const classMatches = selector.match(/\.([a-zA-Z][\w-]*)/g);
    if (classMatches) {
      info.className = classMatches.map(c => c.substring(1));
    }

    // 解析标签名
    const tagMatch = selector.match(/^([a-zA-Z]+)/);
    if (tagMatch) {
      info.tagName = tagMatch[1].toLowerCase();
    }

    return info;
  }

  /**
   * 合并多个选择器（用于多选择器支持）
   */
  combineSelectors(selectors: string[]): string {
    return selectors.join(', ');
  }

  /**
   * 从 test-id 映射生成选择器
   */
  fromTestIdMapping(mapping: TestIdMappingEntry): SelectorStrategy[] {
    return this.generateStrategies({
      testId: mapping.testId,
      tagName: mapping.elementType.toLowerCase(),
      text: mapping.description,
    });
  }

  /**
   * 生成智能等待选择器
   * 返回多个可能的选择器，用于并行等待
   */
  generateWaitSelectors(element: ElementInfo): string[] {
    const strategies = this.generateStrategies(element);
    return strategies
      .filter(s => s.confidence >= 0.6)
      .map(s => s.selector);
  }

  /**
   * 根据元素类型推断最佳选择器策略
   */
  inferBestStrategy(elementType: string, context?: string): SelectorStrategy {
    const type = elementType.toLowerCase();

    // 按钮类
    if (type.includes('button') || type.includes('btn')) {
      return {
        type: 'role',
        selector: `button${context ? `[aria-label*="${context}"]` : ''}`,
        confidence: 0.8,
        description: `Button${context ? ` with context: ${context}` : ''}`,
      };
    }

    // 输入框类
    if (type.includes('input') || type.includes('field')) {
      return {
        type: 'role',
        selector: `input${context ? `[placeholder*="${context}"]` : ''}`,
        confidence: 0.75,
        description: `Input${context ? ` with placeholder: ${context}` : ''}`,
      };
    }

    // 链接类
    if (type.includes('link') || type.includes('a')) {
      return {
        type: 'text',
        selector: context ? `//a[contains(text(), "${context}")]` : 'a',
        confidence: 0.7,
        description: `Link${context ? ` with text: ${context}` : ''}`,
      };
    }

    // 默认
    return {
      type: 'css',
      selector: type,
      confidence: 0.5,
      description: `Element type: ${type}`,
    };
  }
}

/**
 * 元素信息接口
 */
export interface ElementInfo {
  testId?: string;
  dataTest?: string;
  id?: string;
  className?: string[];
  tagName?: string;
  role?: string;
  ariaLabel?: string;
  text?: string;
  path?: string;
}

/**
 * Test-ID 映射条目
 */
export interface TestIdMappingEntry {
  testId: string;
  filePath: string;
  componentName: string;
  elementType: string;
  lineNumber: number;
  selector: string;
  description?: string;
}

/**
 * 智能选择器执行器
 * 配合浏览器客户端使用，自动尝试多种选择器策略
 */
export class SmartSelectorExecutor {
  private smartSelector: SmartSelector;
  private config: SmartSelectorConfig;

  constructor(config?: Partial<SmartSelectorConfig>) {
    this.config = {
      preferTestId: true,
      enableTextMatch: true,
      enableSemanticSelectors: true,
      maxRetries: 3,
      retryDelay: 500,
      ...config,
    };
    this.smartSelector = new SmartSelector(this.config);
  }

  /**
   * 智能点击
   * 自动尝试多种选择器策略
   */
  async smartClick(
    client: BrowserClient,
    element: ElementInfo | string,
    options?: { timeout?: number }
  ): Promise<boolean> {
    const strategies = typeof element === 'string'
      ? this.smartSelector.generateStrategies(this.smartSelector.parseSelector(element) as ElementInfo)
      : this.smartSelector.generateStrategies(element);

    for (let retry = 0; retry < this.config.maxRetries; retry++) {
      for (const strategy of strategies) {
        try {
          Logger.debug(`尝试选择器 [${strategy.type}]: ${strategy.selector} (置信度: ${strategy.confidence})`);

          await client.click(strategy.selector, options);
          Logger.success(`✅ 点击成功: ${strategy.description}`);
          return true;

        } catch (error) {
          Logger.debug(`选择器失败: ${strategy.selector}`);
        }
      }

      if (retry < this.config.maxRetries - 1) {
        Logger.info(`重试 ${retry + 1}/${this.config.maxRetries}...`);
        await this.delay(this.config.retryDelay);
      }
    }

    Logger.error(`所有选择器策略都失败了`);
    return false;
  }

  /**
   * 智能输入
   */
  async smartType(
    client: BrowserClient,
    element: ElementInfo | string,
    value: string,
    options?: { delay?: number }
  ): Promise<boolean> {
    const strategies = typeof element === 'string'
      ? this.smartSelector.generateStrategies(this.smartSelector.parseSelector(element) as ElementInfo)
      : this.smartSelector.generateStrategies(element);

    for (const strategy of strategies) {
      try {
        await client.type(strategy.selector, value, options);
        Logger.success(`✅ 输入成功: ${strategy.description}`);
        return true;
      } catch {
        Logger.debug(`选择器失败: ${strategy.selector}`);
      }
    }

    return false;
  }

  /**
   * 智能等待
   */
  async smartWait(
    client: BrowserClient,
    element: ElementInfo | string,
    options?: { timeout?: number; state?: string }
  ): Promise<boolean> {
    const strategies = typeof element === 'string'
      ? this.smartSelector.generateStrategies(this.smartSelector.parseSelector(element) as ElementInfo)
      : this.smartSelector.generateStrategies(element);

    // 只尝试高置信度的选择器
    const highConfidenceStrategies = strategies.filter(s => s.confidence >= 0.6);

    for (const strategy of highConfidenceStrategies) {
      try {
        await client.waitForSelector(strategy.selector, options);
        return true;
      } catch {
        // 继续尝试下一个
      }
    }

    return false;
  }

  /**
   * 延迟工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 浏览器客户端接口
 */
export interface BrowserClient {
  click(selector: string, options?: { timeout?: number }): Promise<void>;
  type(selector: string, value: string, options?: { delay?: number }): Promise<void>;
  waitForSelector(selector: string, options?: { timeout?: number; state?: string }): Promise<void>;
  isVisible(selector: string, timeout?: number): Promise<boolean>;
  evaluate(script: string): Promise<any>;
}

/**
 * 创建智能选择器
 */
export function createSmartSelector(config?: Partial<SmartSelectorConfig>): SmartSelector {
  return new SmartSelector(config);
}

/**
 * 创建智能选择器执行器
 */
export function createSmartSelectorExecutor(config?: Partial<SmartSelectorConfig>): SmartSelectorExecutor {
  return new SmartSelectorExecutor(config);
}
