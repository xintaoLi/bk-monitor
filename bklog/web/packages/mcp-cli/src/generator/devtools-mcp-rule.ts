import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import {
  RouterAnalysisResult,
  PageComponent,
  FlatRoute,
  InteractiveElementInfo,
} from '../analyzer/router-analyzer.js';
import { RouterInjectionReport, TestIdMappingEntry } from '../codebuddy/router-testid-injector.js';

/**
 * Chrome DevTools MCP Rule 生成器
 *
 * 输出格式：
 * 1. 精确的 MCP 工具调用指令（减少模型差异）
 * 2. test-id 选择器优先的元素定位
 * 3. 结构化的测试步骤
 */

/**
 * DevTools MCP Rule 定义
 * 核心设计：自然语言 Prompt + 结构化元数据
 */
export interface DevToolsMCPRule {
  /** 规则 ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 创建时间 */
  createdAt: string;

  /** 项目上下文 - 帮助 AI 理解项目结构 */
  projectContext: {
    framework: string;
    baseUrl: string;
    description: string;
    routes: RouteDescription[];
    testIdMapping: TestIdMapping[];
  };

  /** 测试场景列表 */
  scenarios: TestScenario[];

  /** MCP 执行配置 */
  mcpConfig: {
    browserUrl?: string;
    headless: boolean;
    viewport: string;
    timeout: number;
    screenshotOnFailure: boolean;
  };

  /** 元数据 */
  metadata: {
    generatedBy: string;
    sourceRouter: string;
    totalRoutes: number;
    totalScenarios: number;
    coverage: {
      routes: number;
      components: number;
      interactiveElements: number;
    };
  };
}

/**
 * 路由描述 - 自然语言格式
 */
export interface RouteDescription {
  path: string;
  name: string;
  description: string;
  component: string;
  testIds: string[];
}

/**
 * Test-ID 映射 - 帮助 AI 定位元素
 */
export interface TestIdMapping {
  testId: string;
  component: string;
  elementType: string;
  description: string;
  selector: string;
}

/**
 * 测试场景 - 自然语言 Prompt 风格
 */
export interface TestScenario {
  /** 场景 ID */
  id: string;
  /** 场景名称 */
  name: string;
  /** 场景类型 */
  type: 'smoke' | 'functional' | 'regression' | 'e2e';
  /** 优先级 */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** 关联路由 */
  route: string;
  /** 关联组件 */
  components: string[];

  /**
   * 自然语言测试 Prompt
   * 这是给 AI Agent 执行的核心指令
   */
  prompt: string;

  /**
   * 结构化步骤 - 作为 Prompt 的补充
   * AI 可以参考这些步骤，但主要依赖 prompt
   */
  steps: StructuredStep[];

  /**
   * 预期结果描述
   */
  expectedOutcome: string;

  /**
   * 可用的 test-id 列表
   * 帮助 AI 定位页面元素
   */
  availableTestIds: string[];

  /**
   * 前置条件
   */
  preconditions?: string[];

  /**
   * 标签
   */
  tags: string[];
}

/**
 * 结构化步骤 - 精确的 MCP 工具调用
 */
export interface StructuredStep {
  order: number;
  action: string;
  target: string;
  selector?: string;
  value?: string;
  description: string;
  /** MCP 工具调用指令 */
  mcpCommand?: MCPCommand;
}

/**
 * MCP 工具调用指令
 */
export interface MCPCommand {
  tool: string;
  args: Record<string, any>;
}

/**
 * DevTools MCP Rule 生成器
 */
export class DevToolsMCPRuleGenerator {
  private projectRoot: string;
  private baseUrl: string;
  private outputDir: string;
  private injectionReport: RouterInjectionReport | null = null;
  private hasTestIds: boolean = false;
  private testIdMap: Map<string, TestIdMappingEntry> = new Map();

  constructor(
    projectRoot: string,
    baseUrl = 'http://localhost:8080',
    outputDir?: string,
    options?: {
      injectionReport?: RouterInjectionReport | null;
      hasTestIds?: boolean;
    }
  ) {
    this.projectRoot = projectRoot;
    this.baseUrl = baseUrl;
    // 默认输出到 .codebuddy/rules（CodeBuddy 可识别）
    this.outputDir = outputDir || '.codebuddy/rules';
    this.injectionReport = options?.injectionReport || null;
    this.hasTestIds = options?.hasTestIds || false;

    // 构建 test-id 映射表
    if (this.injectionReport) {
      for (const entry of this.injectionReport.testIdMapping) {
        this.testIdMap.set(`${entry.route}:${entry.elementType}`, entry);
      }
    }
  }

  /**
   * 从 Router 分析结果生成 MCP Rule
   */
  async generateFromRouterAnalysis(
    analysis: RouterAnalysisResult,
    options?: {
      includeSmoke?: boolean;
      includeFunctional?: boolean;
      includeE2E?: boolean;
      customScenarios?: Partial<TestScenario>[];
    }
  ): Promise<DevToolsMCPRule> {
    Logger.header('生成 Chrome DevTools MCP Rule');

    const opts = {
      includeSmoke: true,
      includeFunctional: true,
      includeE2E: true,
      ...options,
    };

    // 1. 生成路由描述
    Logger.step(1, 5, '生成路由描述...');
    const routeDescriptions = this.generateRouteDescriptions(analysis.flatRoutes);

    // 2. 生成 test-id 映射
    Logger.step(2, 5, '生成 test-id 映射...');
    const testIdMapping = this.generateTestIdMapping(analysis.pageComponents);

    // 3. 生成测试场景
    Logger.step(3, 5, '生成测试场景...');
    const scenarios: TestScenario[] = [];

    if (opts.includeSmoke) {
      scenarios.push(...this.generateSmokeScenarios(analysis));
    }

    if (opts.includeFunctional) {
      scenarios.push(...this.generateFunctionalScenarios(analysis));
    }

    if (opts.includeE2E) {
      scenarios.push(...this.generateE2EScenarios(analysis));
    }

    if (opts.customScenarios) {
      scenarios.push(...opts.customScenarios.map(s => this.completeScenario(s, analysis)));
    }

    // 4. 创建 Rule
    Logger.step(4, 5, '创建 Rule...');
    const rule = this.createRule(analysis, routeDescriptions, testIdMapping, scenarios);

    // 5. 保存 Rule
    Logger.step(5, 5, '保存 Rule...');
    await this.saveRule(rule);

    Logger.success(`生成了 ${scenarios.length} 个测试场景`);
    return rule;
  }

  /**
   * 生成路由描述
   */
  private generateRouteDescriptions(flatRoutes: FlatRoute[]): RouteDescription[] {
    return flatRoutes.map(route => ({
      path: route.fullPath,
      name: route.name || route.component,
      description: this.generateRouteNLDescription(route),
      component: route.component,
      testIds: [],
    }));
  }

  /**
   * 生成路由的自然语言描述
   */
  private generateRouteNLDescription(route: FlatRoute): string {
    const name = route.name || route.component;
    const pathParts = route.fullPath.split('/').filter(Boolean);

    // 根据路径推断页面用途
    const purposeMap: Record<string, string> = {
      login: '用户登录页面',
      register: '用户注册页面',
      dashboard: '仪表盘/概览页面',
      home: '首页',
      list: '列表页面',
      detail: '详情页面',
      edit: '编辑页面',
      create: '创建/新建页面',
      settings: '设置页面',
      profile: '个人资料页面',
      search: '搜索页面',
      retrieve: '日志检索页面',
      trace: '调用链追踪页面',
      monitor: '监控页面',
      alert: '告警页面',
    };

    for (const [key, desc] of Object.entries(purposeMap)) {
      if (route.fullPath.toLowerCase().includes(key) || name.toLowerCase().includes(key)) {
        return desc;
      }
    }

    return `${name} 页面 (${route.fullPath})`;
  }

  /**
   * 生成 test-id 映射
   */
  private generateTestIdMapping(pageComponents: PageComponent[]): TestIdMapping[] {
    const mappings: TestIdMapping[] = [];

    for (const component of pageComponents) {
      // 已存在的 test-id
      for (const testId of component.existingTestIds) {
        mappings.push({
          testId,
          component: component.name,
          elementType: 'unknown',
          description: `${component.name} 组件中的元素`,
          selector: `[data-testid="${testId}"]`,
        });
      }

      // 建议的 test-id
      for (const suggestion of component.suggestedTestIds) {
        mappings.push({
          testId: suggestion.suggestedId,
          component: component.name,
          elementType: suggestion.element,
          description: suggestion.reason,
          selector: `[data-testid="${suggestion.suggestedId}"]`,
        });
      }
    }

    return mappings;
  }

  /**
   * 生成冒烟测试场景
   */
  private generateSmokeScenarios(analysis: RouterAnalysisResult): TestScenario[] {
    const scenarios: TestScenario[] = [];

    for (const route of analysis.flatRoutes) {
      const component = analysis.pageComponents.find(c => c.route === route.fullPath);
      const testIds = component?.existingTestIds || [];

      const prompt = this.generateSmokePrompt(route, component);

      scenarios.push({
        id: `smoke-${this.toKebabCase(route.component)}-${Date.now()}`,
        name: `${route.component} 页面冒烟测试`,
        type: 'smoke',
        priority: 'high',
        route: route.fullPath,
        components: [route.component],
        prompt,
        steps: this.generateSmokeSteps(route, component),
        expectedOutcome: `${route.component} 页面能够正常加载，无控制台错误，关键元素可见`,
        availableTestIds: testIds,
        tags: ['smoke', 'auto-generated', route.component.toLowerCase()],
      });
    }

    return scenarios;
  }

  /**
   * 生成冒烟测试 Prompt
   */
  private generateSmokePrompt(route: FlatRoute, component?: PageComponent): string {
    const testIds = component?.existingTestIds || [];
    const fullUrl = `${this.baseUrl}${route.fullPath}`;

    // 如果有 test-id，生成精确的 MCP 指令
    if (this.hasTestIds && testIds.length > 0) {
      const testIdSelectors = testIds.slice(0, 5).map(id => `[data-testid="${id}"]`);

      return `作为测试工程师，请对 ${route.component} 页面执行冒烟测试。

## 测试步骤（请严格按顺序执行以下 MCP 工具调用）

### 1. 导航到页面
\`\`\`
工具: navigate_page
参数: { "type": "url", "url": "${fullUrl}" }
\`\`\`

### 2. 等待页面加载完成
\`\`\`
工具: take_snapshot
参数: {}
\`\`\`
验证页面快照中包含预期元素。

### 3. 检查控制台错误
\`\`\`
工具: list_console_messages
参数: { "types": ["error"] }
\`\`\`
验证返回结果中无 error 类型消息。

### 4. 验证关键元素可见
使用 take_snapshot 获取的页面快照，检查以下元素是否存在：
${testIdSelectors.map((sel, i) => `- 元素 ${i + 1}: ${sel}`).join('\n')}

### 5. 截图保存
\`\`\`
工具: take_screenshot
参数: { "filePath": ".codebuddy/screenshots/smoke-${this.toKebabCase(route.component)}.png" }
\`\`\`

## 测试通过标准
- 页面在 10 秒内加载完成
- 无 JavaScript 控制台错误
- 上述关键元素在页面快照中可见

## 可用的 test-id 选择器
${testIds.map(id => `- \`[data-testid="${id}"]\``).join('\n')}`;
    }

    // 没有 test-id 时的通用 Prompt
    return `作为测试工程师，请对 ${route.component} 页面执行冒烟测试。

## 测试步骤（请严格按顺序执行以下 MCP 工具调用）

### 1. 导航到页面
\`\`\`
工具: navigate_page
参数: { "type": "url", "url": "${fullUrl}" }
\`\`\`

### 2. 等待页面加载完成
\`\`\`
工具: take_snapshot
参数: {}
\`\`\`
验证页面快照中包含预期元素。

### 3. 检查控制台错误
\`\`\`
工具: list_console_messages
参数: { "types": ["error"] }
\`\`\`
验证返回结果中无 error 类型消息。

### 4. 验证页面内容
检查页面快照中是否包含：
- 页面标题或主要标识
- 主要内容区域
- 导航元素

### 5. 截图保存
\`\`\`
工具: take_screenshot
参数: { "filePath": ".codebuddy/screenshots/smoke-${this.toKebabCase(route.component)}.png" }
\`\`\`

## 测试通过标准
- 页面在 10 秒内加载完成
- 无 JavaScript 控制台错误
- 主要内容区域正确显示`;
  }

  /**
   * 生成冒烟测试步骤
   */
  private generateSmokeSteps(route: FlatRoute, component?: PageComponent): StructuredStep[] {
    const fullUrl = `${this.baseUrl}${route.fullPath}`;
    const steps: StructuredStep[] = [
      {
        order: 1,
        action: 'navigate',
        target: route.fullPath,
        description: `导航到 ${route.component} 页面`,
        mcpCommand: {
          tool: 'navigate_page',
          args: { type: 'url', url: fullUrl },
        },
      },
      {
        order: 2,
        action: 'snapshot',
        target: 'page',
        description: '获取页面快照，等待加载完成',
        mcpCommand: {
          tool: 'take_snapshot',
          args: {},
        },
      },
      {
        order: 3,
        action: 'assert',
        target: 'no-console-error',
        description: '检查无控制台错误',
        mcpCommand: {
          tool: 'list_console_messages',
          args: { types: ['error'] },
        },
      },
    ];

    // 添加元素可见性检查
    if (component && component.existingTestIds.length > 0) {
      const testId = component.existingTestIds[0];
      steps.push({
        order: 4,
        action: 'assert',
        target: testId,
        selector: `[data-testid="${testId}"]`,
        description: '验证关键元素可见（通过快照检查）',
        mcpCommand: {
          tool: 'take_snapshot',
          args: {},
        },
      });
    }

    steps.push({
      order: steps.length + 1,
      action: 'screenshot',
      target: `smoke-${this.toKebabCase(route.component)}`,
      description: '截图保存',
      mcpCommand: {
        tool: 'take_screenshot',
        args: {
          filePath: `.codebuddy/screenshots/smoke-${this.toKebabCase(route.component)}.png`,
        },
      },
    });

    return steps;
  }

  /**
   * 生成功能测试场景
   */
  private generateFunctionalScenarios(analysis: RouterAnalysisResult): TestScenario[] {
    const scenarios: TestScenario[] = [];

    for (const component of analysis.pageComponents) {
      const interactiveElements = component.interactiveElements;

      // 按元素类型分组生成测试
      const buttonElements = interactiveElements.filter(e => e.type === 'button');
      const inputElements = interactiveElements.filter(e => e.type === 'input');
      const formElements = interactiveElements.filter(e => e.type === 'form');

      // 生成按钮交互测试
      if (buttonElements.length > 0) {
        scenarios.push(this.generateButtonInteractionScenario(component, buttonElements));
      }

      // 生成表单测试
      if (inputElements.length > 0 || formElements.length > 0) {
        scenarios.push(this.generateFormScenario(component, inputElements, formElements));
      }
    }

    return scenarios;
  }

  /**
   * 生成按钮交互测试场景
   */
  private generateButtonInteractionScenario(
    component: PageComponent,
    buttons: InteractiveElementInfo[]
  ): TestScenario {
    const testIds = buttons
      .filter(b => b.existingTestId)
      .map(b => b.existingTestId!);

    const fullUrl = `${this.baseUrl}${component.route}`;

    // 生成精确的按钮点击指令
    const buttonCommands = buttons.slice(0, 5).map((button, index) => {
      const selector = button.existingTestId
        ? `[data-testid="${button.existingTestId}"]`
        : button.context
          ? `text="${button.context}"`
          : `button >> nth=${index}`;

      return {
        name: button.context || button.existingTestId || `按钮${index + 1}`,
        selector,
        testId: button.existingTestId,
      };
    });

    const prompt = this.hasTestIds && testIds.length > 0
      ? `作为测试工程师，请测试 ${component.name} 页面的按钮交互功能。

## 测试步骤（请严格按顺序执行以下 MCP 工具调用）

### 1. 导航到页面
\`\`\`
工具: navigate_page
参数: { "type": "url", "url": "${fullUrl}" }
\`\`\`

### 2. 等待页面加载
\`\`\`
工具: take_snapshot
参数: {}
\`\`\`

### 3. 测试按钮点击
${buttonCommands.map((btn, i) => `
#### 3.${i + 1} 点击「${btn.name}」
\`\`\`
工具: click
参数: { "uid": "<从快照中找到 ${btn.selector} 对应的 uid>" }
\`\`\`
或使用选择器：
\`\`\`
工具: click
参数: { "selector": "${btn.selector}" }
\`\`\`
等待响应后获取新快照验证结果。
`).join('')}

### 4. 截图保存
\`\`\`
工具: take_screenshot
参数: { "filePath": ".codebuddy/screenshots/buttons-${this.toKebabCase(component.name)}.png" }
\`\`\`

## 可用的 test-id 选择器
${testIds.map(id => `- \`[data-testid="${id}"]\``).join('\n')}

## 注意事项
- 某些按钮可能需要先填写表单才能点击
- 注意观察按钮的 loading 状态
- 记录每个按钮的实际响应行为`
      : `作为测试工程师，请测试 ${component.name} 页面的按钮交互功能。

## 测试步骤

### 1. 导航到页面
\`\`\`
工具: navigate_page
参数: { "type": "url", "url": "${fullUrl}" }
\`\`\`

### 2. 获取页面快照
\`\`\`
工具: take_snapshot
参数: {}
\`\`\`
从快照中找到按钮元素的 uid。

### 3. 依次测试按钮点击
使用 click 工具点击各个按钮，观察响应。

### 4. 截图保存
\`\`\`
工具: take_screenshot
参数: {}
\`\`\`

## 注意事项
- 从快照中获取元素 uid 进行点击
- 某些按钮可能需要先填写表单
- 记录每个按钮的响应行为`;

    return {
      id: `functional-buttons-${this.toKebabCase(component.name)}-${Date.now()}`,
      name: `${component.name} 按钮交互测试`,
      type: 'functional',
      priority: 'medium',
      route: component.route,
      components: [component.name],
      prompt,
      steps: this.generateButtonSteps(component, buttons),
      expectedOutcome: '所有按钮能够正常响应点击，无异常错误',
      availableTestIds: testIds,
      tags: ['functional', 'button', 'interaction', component.name.toLowerCase()],
    };
  }

  /**
   * 生成按钮测试步骤
   */
  private generateButtonSteps(
    component: PageComponent,
    buttons: InteractiveElementInfo[]
  ): StructuredStep[] {
    const fullUrl = `${this.baseUrl}${component.route}`;
    const steps: StructuredStep[] = [
      {
        order: 1,
        action: 'navigate',
        target: component.route,
        description: `导航到 ${component.name} 页面`,
        mcpCommand: {
          tool: 'navigate_page',
          args: { type: 'url', url: fullUrl },
        },
      },
      {
        order: 2,
        action: 'snapshot',
        target: 'page',
        description: '获取页面快照',
        mcpCommand: {
          tool: 'take_snapshot',
          args: {},
        },
      },
    ];

    let order = 3;
    for (const button of buttons.slice(0, 5)) {
      const selector = button.existingTestId
        ? `[data-testid="${button.existingTestId}"]`
        : button.context
          ? `text="${button.context}"`
          : `button >> nth=${buttons.indexOf(button)}`;

      steps.push({
        order: order++,
        action: 'click',
        target: button.context || button.existingTestId || 'button',
        selector,
        description: `点击 ${button.context || '按钮'}`,
        mcpCommand: {
          tool: 'click',
          args: { selector },
        },
      });

      steps.push({
        order: order++,
        action: 'snapshot',
        target: 'page',
        description: '等待响应，获取新快照',
        mcpCommand: {
          tool: 'take_snapshot',
          args: {},
        },
      });
    }

    return steps;
  }

  /**
   * 生成表单测试场景
   */
  private generateFormScenario(
    component: PageComponent,
    inputs: InteractiveElementInfo[],
    forms: InteractiveElementInfo[]
  ): TestScenario {
    const testIds = [
      ...inputs.filter(i => i.existingTestId).map(i => i.existingTestId!),
      ...forms.filter(f => f.existingTestId).map(f => f.existingTestId!),
    ];

    const fullUrl = `${this.baseUrl}${component.route}`;

    // 生成精确的输入框填写指令
    const inputCommands = inputs.slice(0, 5).map((input, index) => {
      const selector = input.existingTestId
        ? `[data-testid="${input.existingTestId}"]`
        : input.context
          ? `[placeholder*="${input.context}"]`
          : `input >> nth=${index}`;

      return {
        name: input.context || input.existingTestId || `输入框${index + 1}`,
        selector,
        testId: input.existingTestId,
        testValue: this.generateTestValue(input),
      };
    });

    const prompt = this.hasTestIds && testIds.length > 0
      ? `作为测试工程师，请测试 ${component.name} 页面的表单功能。

## 测试步骤（请严格按顺序执行以下 MCP 工具调用）

### 1. 导航到页面
\`\`\`
工具: navigate_page
参数: { "type": "url", "url": "${fullUrl}" }
\`\`\`

### 2. 等待页面加载
\`\`\`
工具: take_snapshot
参数: {}
\`\`\`

### 3. 填写表单
${inputCommands.map((input, i) => `
#### 3.${i + 1} 填写「${input.name}」
\`\`\`
工具: fill
参数: { "uid": "<从快照中找到 ${input.selector} 对应的 uid>", "value": "${input.testValue}" }
\`\`\`
`).join('')}

### 4. 提交表单
\`\`\`
工具: click
参数: { "uid": "<从快照中找到提交按钮的 uid>" }
\`\`\`
提交按钮选择器参考：\`[data-testid*="submit"]\` 或 \`button[type="submit"]\`

### 5. 验证结果
\`\`\`
工具: take_snapshot
参数: {}
\`\`\`
检查是否有成功提示或错误信息。

### 6. 截图保存
\`\`\`
工具: take_screenshot
参数: { "filePath": ".codebuddy/screenshots/form-${this.toKebabCase(component.name)}.png" }
\`\`\`

## 可用的 test-id 选择器
${testIds.map(id => `- \`[data-testid="${id}"]\``).join('\n')}

## 测试数据
${inputCommands.map(input => `- ${input.name}: \`${input.testValue}\``).join('\n')}`
      : `作为测试工程师，请测试 ${component.name} 页面的表单功能。

## 测试步骤

### 1. 导航到页面
\`\`\`
工具: navigate_page
参数: { "type": "url", "url": "${fullUrl}" }
\`\`\`

### 2. 获取页面快照
\`\`\`
工具: take_snapshot
参数: {}
\`\`\`
从快照中找到输入框和按钮的 uid。

### 3. 填写表单
使用 fill 工具填写各个输入框。

### 4. 提交表单
使用 click 工具点击提交按钮。

### 5. 验证结果
获取新快照，检查提交结果。`;

    return {
      id: `functional-form-${this.toKebabCase(component.name)}-${Date.now()}`,
      name: `${component.name} 表单功能测试`,
      type: 'functional',
      priority: 'high',
      route: component.route,
      components: [component.name],
      prompt,
      steps: this.generateFormSteps(component, inputs),
      expectedOutcome: '表单能够正确验证输入，提交成功后有正确反馈',
      availableTestIds: testIds,
      tags: ['functional', 'form', 'input', component.name.toLowerCase()],
    };
  }

  /**
   * 生成测试数据
   */
  private generateTestValue(input: InteractiveElementInfo): string {
    const context = (input.context || '').toLowerCase();

    if (context.includes('email') || context.includes('邮箱')) {
      return 'test@example.com';
    }
    if (context.includes('password') || context.includes('密码')) {
      return 'Test123456!';
    }
    if (context.includes('phone') || context.includes('手机') || context.includes('电话')) {
      return '13800138000';
    }
    if (context.includes('name') || context.includes('姓名') || context.includes('名称')) {
      return 'TestUser';
    }
    if (context.includes('url') || context.includes('链接')) {
      return 'https://example.com';
    }
    if (context.includes('number') || context.includes('数字') || context.includes('数量')) {
      return '100';
    }

    return `test_value_${Date.now()}`;
  }

  /**
   * 生成表单测试步骤
   */
  private generateFormSteps(
    component: PageComponent,
    inputs: InteractiveElementInfo[]
  ): StructuredStep[] {
    const fullUrl = `${this.baseUrl}${component.route}`;
    const steps: StructuredStep[] = [
      {
        order: 1,
        action: 'navigate',
        target: component.route,
        description: `导航到 ${component.name} 页面`,
        mcpCommand: {
          tool: 'navigate_page',
          args: { type: 'url', url: fullUrl },
        },
      },
      {
        order: 2,
        action: 'snapshot',
        target: 'page',
        description: '获取页面快照',
        mcpCommand: {
          tool: 'take_snapshot',
          args: {},
        },
      },
    ];

    let order = 3;
    for (const input of inputs.slice(0, 5)) {
      const selector = input.existingTestId
        ? `[data-testid="${input.existingTestId}"]`
        : input.context
          ? `[placeholder*="${input.context}"]`
          : `input >> nth=${inputs.indexOf(input)}`;

      const testValue = this.generateTestValue(input);

      steps.push({
        order: order++,
        action: 'fill',
        target: input.context || input.existingTestId || 'input',
        selector,
        value: testValue,
        description: `填写 ${input.context || '输入框'}`,
        mcpCommand: {
          tool: 'fill',
          args: { selector, value: testValue },
        },
      });
    }

    steps.push({
      order: order++,
      action: 'click',
      target: 'submit',
      selector: '[data-testid*="submit"], button[type="submit"], .submit-btn',
      description: '点击提交按钮',
      mcpCommand: {
        tool: 'click',
        args: { selector: '[data-testid*="submit"], button[type="submit"]' },
      },
    });

    steps.push({
      order: order++,
      action: 'snapshot',
      target: 'page',
      description: '验证提交结果',
      mcpCommand: {
        tool: 'take_snapshot',
        args: {},
      },
    });

    return steps;
  }

  /**
   * 生成 E2E 测试场景
   */
  private generateE2EScenarios(analysis: RouterAnalysisResult): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // 识别常见的 E2E 流程
    const e2eFlows = this.identifyE2EFlows(analysis);

    for (const flow of e2eFlows) {
      scenarios.push(this.generateE2EScenario(flow, analysis));
    }

    return scenarios;
  }

  /**
   * 识别 E2E 流程
   */
  private identifyE2EFlows(analysis: RouterAnalysisResult): E2EFlow[] {
    const flows: E2EFlow[] = [];
    const routes = analysis.flatRoutes;

    // 登录流程
    const loginRoute = routes.find(r =>
      r.fullPath.includes('login') || r.component.toLowerCase().includes('login')
    );
    if (loginRoute) {
      flows.push({
        name: '用户登录流程',
        type: 'auth',
        routes: [loginRoute.fullPath],
        description: '验证用户能够成功登录系统',
      });
    }

    // 查询流程
    const listRoutes = routes.filter(r =>
      r.fullPath.includes('list') ||
      r.fullPath.includes('search') ||
      r.fullPath.includes('retrieve')
    );
    if (listRoutes.length > 0) {
      flows.push({
        name: '数据查询流程',
        type: 'query',
        routes: listRoutes.map(r => r.fullPath),
        description: '验证数据查询和筛选功能',
      });
    }

    // CRUD 流程
    const crudRoutes = {
      list: routes.find(r => r.fullPath.includes('list')),
      create: routes.find(r => r.fullPath.includes('create') || r.fullPath.includes('add')),
      detail: routes.find(r => r.fullPath.includes('detail') || r.fullPath.includes(':id')),
      edit: routes.find(r => r.fullPath.includes('edit')),
    };

    if (crudRoutes.list && (crudRoutes.create || crudRoutes.detail)) {
      flows.push({
        name: 'CRUD 完整流程',
        type: 'crud',
        routes: Object.values(crudRoutes).filter(Boolean).map(r => r!.fullPath),
        description: '验证创建、读取、更新、删除的完整流程',
      });
    }

    return flows;
  }

  /**
   * 生成 E2E 测试场景
   */
  private generateE2EScenario(flow: E2EFlow, analysis: RouterAnalysisResult): TestScenario {
    const allTestIds = analysis.pageComponents
      .filter(c => flow.routes.includes(c.route))
      .flatMap(c => c.existingTestIds);

    const prompt = this.generateE2EPrompt(flow, analysis);

    return {
      id: `e2e-${this.toKebabCase(flow.name)}-${Date.now()}`,
      name: flow.name,
      type: 'e2e',
      priority: 'critical',
      route: flow.routes[0],
      components: flow.routes.map(r => {
        const component = analysis.pageComponents.find(c => c.route === r);
        return component?.name || r;
      }),
      prompt,
      steps: this.generateE2ESteps(flow, analysis),
      expectedOutcome: flow.description,
      availableTestIds: allTestIds,
      preconditions: this.getE2EPreconditions(flow),
      tags: ['e2e', flow.type, 'critical'],
    };
  }

  /**
   * 生成 E2E Prompt
   */
  private generateE2EPrompt(flow: E2EFlow, analysis: RouterAnalysisResult): string {
    switch (flow.type) {
      case 'auth':
        return `作为测试工程师，请执行完整的用户登录流程测试：

1. 打开登录页面
2. 验证登录表单元素存在（用户名输入框、密码输入框、登录按钮）
3. 测试空表单提交（应显示验证错误）
4. 输入错误的用户名密码（应显示登录失败提示）
5. 输入正确的测试账号：
   - 用户名：admin
   - 密码：admin123
6. 点击登录按钮
7. 验证登录成功：
   - 页面跳转到首页/仪表盘
   - 显示用户信息
   - 无错误提示

测试通过标准：
- 表单验证正常工作
- 错误提示清晰准确
- 登录成功后正确跳转`;

      case 'query':
        return `作为测试工程师，请执行数据查询流程测试：

1. 打开列表/查询页面
2. 等待数据加载完成
3. 验证列表/表格正确显示
4. 测试搜索功能：
   - 输入搜索关键词
   - 点击搜索按钮
   - 验证结果更新
5. 测试筛选功能（如有）：
   - 选择筛选条件
   - 验证结果变化
6. 测试分页功能（如有）：
   - 点击下一页
   - 验证数据更新
7. 测试排序功能（如有）

测试通过标准：
- 数据正确加载显示
- 搜索结果符合预期
- 分页和排序正常工作`;

      case 'crud':
        return `作为测试工程师，请执行 CRUD 完整流程测试：

1. 【列表页】打开数据列表页面，验证列表正常显示
2. 【创建】点击新建按钮，填写表单，提交创建
3. 【验证创建】返回列表，验证新数据出现
4. 【查看详情】点击数据项，进入详情页
5. 【编辑】点击编辑按钮，修改数据，保存
6. 【验证编辑】返回详情，验证数据已更新
7. 【删除】执行删除操作，确认删除
8. 【验证删除】返回列表，验证数据已删除

测试通过标准：
- 创建操作成功，数据正确保存
- 编辑操作成功，数据正确更新
- 删除操作成功，数据正确移除
- 全程无异常错误`;

      default:
        return `作为测试工程师，请执行 ${flow.name} 测试：\n\n${flow.description}`;
    }
  }

  /**
   * 生成 E2E 测试步骤
   */
  private generateE2ESteps(flow: E2EFlow, analysis: RouterAnalysisResult): StructuredStep[] {
    const steps: StructuredStep[] = [];
    let order = 1;

    for (const route of flow.routes) {
      steps.push({
        order: order++,
        action: 'navigate',
        target: route,
        description: `导航到 ${route}`,
      });

      steps.push({
        order: order++,
        action: 'wait',
        target: 'networkidle',
        description: '等待页面加载',
      });

      steps.push({
        order: order++,
        action: 'screenshot',
        target: `e2e-${this.toKebabCase(flow.name)}-step-${order}`,
        description: '截图记录',
      });
    }

    return steps;
  }

  /**
   * 获取 E2E 前置条件
   */
  private getE2EPreconditions(flow: E2EFlow): string[] {
    switch (flow.type) {
      case 'auth':
        return ['测试账号已创建', '登录页面可访问'];
      case 'query':
        return ['用户已登录', '测试数据已准备'];
      case 'crud':
        return ['用户已登录', '具有相应权限', '测试环境数据可重置'];
      default:
        return [];
    }
  }

  /**
   * 补全场景信息
   */
  private completeScenario(
    partial: Partial<TestScenario>,
    analysis: RouterAnalysisResult
  ): TestScenario {
    return {
      id: partial.id || `custom-${Date.now()}`,
      name: partial.name || '自定义测试场景',
      type: partial.type || 'functional',
      priority: partial.priority || 'medium',
      route: partial.route || '/',
      components: partial.components || [],
      prompt: partial.prompt || '',
      steps: partial.steps || [],
      expectedOutcome: partial.expectedOutcome || '',
      availableTestIds: partial.availableTestIds || [],
      tags: partial.tags || ['custom'],
    };
  }

  /**
   * 创建 Rule
   */
  private createRule(
    analysis: RouterAnalysisResult,
    routeDescriptions: RouteDescription[],
    testIdMapping: TestIdMapping[],
    scenarios: TestScenario[]
  ): DevToolsMCPRule {
    const now = new Date().toISOString();

    return {
      id: `devtools-mcp-rule-${Date.now()}`,
      name: `${path.basename(this.projectRoot)} DevTools MCP 测试规则`,
      version: '1.0.0',
      createdAt: now,

      projectContext: {
        framework: analysis.framework,
        baseUrl: this.baseUrl,
        description: `基于 ${analysis.framework} 路由自动生成的测试规则`,
        routes: routeDescriptions,
        testIdMapping,
      },

      scenarios,

      mcpConfig: {
        headless: false,
        viewport: '1920x1080',
        timeout: 30000,
        screenshotOnFailure: true,
      },

      metadata: {
        generatedBy: 'mcp-e2e-cli',
        sourceRouter: path.relative(this.projectRoot, analysis.routerFilePath),
        totalRoutes: analysis.flatRoutes.length,
        totalScenarios: scenarios.length,
        coverage: {
          routes: analysis.flatRoutes.length,
          components: analysis.pageComponents.length,
          interactiveElements: analysis.pageComponents.reduce(
            (sum, c) => sum + c.interactiveElements.length,
            0
          ),
        },
      },
    };
  }

  /**
   * 保存 Rule
   */
  private async saveRule(rule: DevToolsMCPRule): Promise<void> {
    const outputDir = path.join(this.projectRoot, this.outputDir);
    const routesDir = path.join(outputDir, 'routes');
    await fs.ensureDir(outputDir);
    await fs.ensureDir(routesDir);

    // 保存完整 Rule（使用 rule.id 作为文件名）
    const rulePath = path.join(outputDir, `${rule.id}.json`);
    await fs.writeJson(rulePath, rule, { spaces: 2 });
    Logger.info(`Rule 已保存: ${path.relative(this.projectRoot, rulePath)}`);

    // 按路由分组保存独立的测试文件
    const scenariosByRoute = this.groupScenariosByRoute(rule.scenarios);
    const routeIndex: RouteTestIndex[] = [];

    for (const [routePath, scenarios] of Object.entries(scenariosByRoute)) {
      const routeFileName = this.routeToFileName(routePath);
      const routePromptPath = path.join(routesDir, `${routeFileName}.md`);
      const routePromptContent = this.generateRoutePromptMarkdown(rule, routePath, scenarios);
      await fs.writeFile(routePromptPath, routePromptContent);

      routeIndex.push({
        route: routePath,
        fileName: `${routeFileName}.md`,
        scenarioCount: scenarios.length,
        types: [...new Set(scenarios.map(s => s.type))],
      });
    }

    Logger.info(`路由测试文件已保存: ${path.relative(this.projectRoot, routesDir)}/ (${routeIndex.length} 个文件)`);

    // 保存路由索引
    const indexPath = path.join(outputDir, 'route-index.json');
    await fs.writeJson(indexPath, {
      generatedAt: rule.createdAt,
      baseUrl: rule.projectContext.baseUrl,
      totalRoutes: routeIndex.length,
      totalScenarios: rule.scenarios.length,
      routes: routeIndex,
    }, { spaces: 2 });
    Logger.info(`路由索引已保存: ${path.relative(this.projectRoot, indexPath)}`);

    // 保存全量 Prompt 汇总（用于全量测试）
    const promptsPath = path.join(outputDir, `${rule.id}-prompts.md`);
    const promptsContent = this.generatePromptsMarkdown(rule);
    await fs.writeFile(promptsPath, promptsContent);
    Logger.info(`全量 Prompts 已保存: ${path.relative(this.projectRoot, promptsPath)}`);

    // 保存 test-id 映射
    const mappingPath = path.join(outputDir, 'testid-mapping.json');
    await fs.writeJson(mappingPath, rule.projectContext.testIdMapping, { spaces: 2 });
    Logger.info(`Test-ID 映射已保存: ${path.relative(this.projectRoot, mappingPath)}`);
  }

  /**
   * 按路由分组场景
   */
  private groupScenariosByRoute(scenarios: TestScenario[]): Record<string, TestScenario[]> {
    const grouped: Record<string, TestScenario[]> = {};
    for (const scenario of scenarios) {
      const route = scenario.route || '/';
      if (!grouped[route]) {
        grouped[route] = [];
      }
      grouped[route].push(scenario);
    }
    return grouped;
  }

  /**
   * 路由路径转文件名
   */
  private routeToFileName(routePath: string): string {
    if (routePath === '/' || routePath === '') {
      return 'root';
    }
    return routePath
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/:/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase() || 'root';
  }

  /**
   * 生成单个路由的 Prompt Markdown
   */
  private generateRoutePromptMarkdown(
    rule: DevToolsMCPRule,
    routePath: string,
    scenarios: TestScenario[]
  ): string {
    const routeDesc = rule.projectContext.routes.find(r => r.path === routePath);
    const routeTestIds = rule.projectContext.testIdMapping.filter(
      m => scenarios.some(s => s.availableTestIds.includes(m.testId))
    );

    let content = `# 路由测试: ${routePath}\n\n`;
    content += `**描述**: ${routeDesc?.description || '无描述'}\n`;
    content += `**组件**: ${routeDesc?.component || '未知'}\n`;
    content += `**基础 URL**: ${rule.projectContext.baseUrl}\n`;
    content += `**场景数量**: ${scenarios.length}\n\n`;

    // 添加 test-id 速查表
    if (routeTestIds.length > 0) {
      content += `## Test-ID 速查表\n\n`;
      content += `| Test-ID | 元素类型 | 选择器 | 说明 |\n`;
      content += `|---------|----------|--------|------|\n`;
      for (const mapping of routeTestIds.slice(0, 10)) {
        content += `| \`${mapping.testId}\` | ${mapping.elementType} | \`${mapping.selector}\` | ${mapping.description} |\n`;
      }
      if (routeTestIds.length > 10) {
        content += `\n*还有 ${routeTestIds.length - 10} 个 test-id，详见 testid-mapping.json*\n`;
      }
      content += `\n`;
    }

    content += `---\n\n`;

    for (const scenario of scenarios) {
      content += `## ${scenario.name}\n\n`;
      content += `- **类型**: ${scenario.type}\n`;
      content += `- **优先级**: ${scenario.priority}\n`;
      content += `- **标签**: ${scenario.tags.join(', ')}\n\n`;

      content += `### Prompt\n\n`;
      content += `\`\`\`\n${scenario.prompt}\n\`\`\`\n\n`;

      content += `**预期结果**: ${scenario.expectedOutcome}\n\n`;

      // 添加结构化步骤的 MCP 命令
      if (scenario.steps.length > 0) {
        content += `### MCP 执行步骤\n\n`;
        for (const step of scenario.steps) {
          content += `${step.order}. **${step.description}**\n`;
          if (step.mcpCommand) {
            content += `   \`\`\`json\n`;
            content += `   { "tool": "${step.mcpCommand.tool}", "args": ${JSON.stringify(step.mcpCommand.args)} }\n`;
            content += `   \`\`\`\n`;
          }
        }
        content += `\n`;
      }

      if (scenario.availableTestIds.length > 0) {
        content += `### 可用 test-id\n\n`;
        for (const testId of scenario.availableTestIds) {
          content += `- \`[data-testid="${testId}"]\`\n`;
        }
        content += '\n';
      }

      if (scenario.preconditions && scenario.preconditions.length > 0) {
        content += `### 前置条件\n\n`;
        for (const pre of scenario.preconditions) {
          content += `- ${pre}\n`;
        }
        content += '\n';
      }

      content += `---\n\n`;
    }

    return content;
  }

  /**
   * 生成 Prompts Markdown
   */
  private generatePromptsMarkdown(rule: DevToolsMCPRule): string {
    let content = `# ${rule.name} - 测试 Prompts\n\n`;
    content += `生成时间: ${rule.createdAt}\n`;
    content += `基础 URL: ${rule.projectContext.baseUrl}\n\n`;

    content += `## 路由概览\n\n`;
    for (const route of rule.projectContext.routes) {
      content += `- \`${route.path}\` - ${route.description}\n`;
    }

    content += `\n## 测试场景\n\n`;

    for (const scenario of rule.scenarios) {
      content += `### ${scenario.name}\n\n`;
      content += `**类型**: ${scenario.type} | **优先级**: ${scenario.priority}\n`;
      content += `**路由**: ${scenario.route}\n\n`;
      content += `#### Prompt\n\n`;
      content += `\`\`\`\n${scenario.prompt}\n\`\`\`\n\n`;
      content += `**预期结果**: ${scenario.expectedOutcome}\n\n`;

      if (scenario.availableTestIds.length > 0) {
        content += `**可用 test-id**: ${scenario.availableTestIds.join(', ')}\n\n`;
      }

      content += `---\n\n`;
    }

    return content;
  }

  /**
   * 转换为 kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
  }
}

/**
 * 路由测试索引
 */
export interface RouteTestIndex {
  route: string;
  fileName: string;
  scenarioCount: number;
  types: string[];
}

/**
 * E2E 流程定义
 */
interface E2EFlow {
  name: string;
  type: 'auth' | 'query' | 'crud' | 'custom';
  routes: string[];
  description: string;
}

/**
 * 导出生成函数
 */
export async function generateDevToolsMCPRule(
  analysis: RouterAnalysisResult,
  projectRoot?: string,
  baseUrl?: string,
  options?: {
    outputDir?: string;
    injectionReport?: RouterInjectionReport | null;
    hasTestIds?: boolean;
  }
): Promise<DevToolsMCPRule> {
  const root = projectRoot || process.cwd();
  const generator = new DevToolsMCPRuleGenerator(root, baseUrl, options?.outputDir, {
    injectionReport: options?.injectionReport,
    hasTestIds: options?.hasTestIds,
  });
  return await generator.generateFromRouterAnalysis(analysis);
}
