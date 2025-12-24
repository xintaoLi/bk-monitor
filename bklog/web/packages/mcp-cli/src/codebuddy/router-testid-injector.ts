import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { createTsProject, createTsProjectWithoutConfig } from '../analyzer/project.js';
import { Node, SourceFile, Project } from 'ts-morph';
import {
  RouterAnalysisResult,
  PageComponent,
  TestIdSuggestion,
} from '../analyzer/router-analyzer.js';

/**
 * 基于 Router 的 Test-ID 注入器
 *
 * 功能：
 * 1. 基于 Router 分析结果，定位需要注入 test-id 的组件
 * 2. 为业务组件和容器自动添加语义化的 test-id
 * 3. 生成 test-id 映射表，便于 AI 模型理解页面结构
 * 4. 支持增量注入，不覆盖已有的 test-id
 */

export interface RouterTestIdConfig {
  /** test-id 前缀 */
  prefix: string;
  /** 分隔符 */
  separator: string;
  /** 是否包含路由路径 */
  includeRoutePath: boolean;
  /** 是否包含组件名 */
  includeComponentName: boolean;
  /** 是否包含元素类型 */
  includeElementType: boolean;
  /** 是否包含上下文信息 */
  includeContext: boolean;
  /** 需要注入的元素类型 */
  targetElements: string[];
  /** 排除的文件模式 */
  excludePatterns: RegExp[];
}

export interface RouterInjectionResult {
  route: string;
  componentName: string;
  componentPath: string;
  injectedCount: number;
  skippedCount: number;
  injections: InjectionDetail[];
}

export interface InjectionDetail {
  testId: string;
  elementType: string;
  lineNumber: number;
  context?: string;
  status: 'injected' | 'skipped' | 'existing';
  reason?: string;
}

export interface RouterInjectionReport {
  timestamp: string;
  mode: 'preview' | 'inject';
  routerFramework: string;
  totalRoutes: number;
  totalComponents: number;
  totalInjected: number;
  totalSkipped: number;
  totalExisting: number;
  results: RouterInjectionResult[];
  testIdMapping: TestIdMappingEntry[];
}

export interface TestIdMappingEntry {
  testId: string;
  route: string;
  component: string;
  elementType: string;
  selector: string;
  description: string;
}

/**
 * 基于 Router 的 Test-ID 注入器
 */
export class RouterTestIdInjector {
  private projectRoot: string;
  private config: RouterTestIdConfig;
  private project: Project | null = null;

  constructor(projectRoot: string, config?: Partial<RouterTestIdConfig>) {
    this.projectRoot = projectRoot;
    this.config = {
      prefix: 'test',
      separator: '-',
      includeRoutePath: true,
      includeComponentName: true,
      includeElementType: true,
      includeContext: true,
      targetElements: [
        // HTML 原生元素
        'button', 'input', 'select', 'textarea', 'a', 'form',
        // 通用组件
        'Button', 'Input', 'Select', 'Checkbox', 'Radio', 'Switch',
        'Slider', 'DatePicker', 'TimePicker', 'Upload', 'Dropdown',
        'Menu', 'Tabs', 'Tab', 'Modal', 'Drawer', 'Popover', 'Tooltip',
        'Table', 'Pagination', 'Tree', 'Transfer',
        // BK 组件
        'BkButton', 'BkInput', 'BkSelect', 'BkTable', 'BkDialog',
        'BkSideslider', 'BkDropdown', 'BkDatePicker', 'BkSearchSelect',
        'BkForm', 'BkFormItem', 'BkCheckbox', 'BkRadio', 'BkSwitch',
      ],
      excludePatterns: [
        /node_modules/,
        /\.test\./,
        /\.spec\./,
        /\.stories\./,
        /__tests__/,
      ],
      ...config,
    };
  }

  /**
   * 基于 Router 分析结果注入 test-id
   */
  async injectFromRouterAnalysis(
    routerAnalysis: RouterAnalysisResult,
    options?: {
      dryRun?: boolean;
      onlyPages?: boolean;
      routes?: string[];
    }
  ): Promise<RouterInjectionReport> {
    const dryRun = options?.dryRun ?? true;
    const onlyPages = options?.onlyPages ?? false;

    Logger.header('基于 Router 的 Test-ID 注入');
    Logger.info(`模式: ${dryRun ? '预览模式（不修改文件）' : '注入模式'}`);
    Logger.info(`框架: ${routerAnalysis.framework}`);

    // 1. 初始化项目
    Logger.step(1, 4, '初始化 TypeScript 项目...');
    this.initProject();

    // 2. 筛选目标组件
    Logger.step(2, 4, '筛选目标组件...');
    let targetComponents = routerAnalysis.pageComponents;

    if (options?.routes && options.routes.length > 0) {
      const routeSet = new Set(options.routes);
      targetComponents = targetComponents.filter(c => routeSet.has(c.route));
    }

    if (onlyPages) {
      targetComponents = targetComponents.filter(c => c.type === 'page');
    }

    Logger.info(`目标组件: ${targetComponents.length} 个`);

    // 3. 执行注入
    Logger.step(3, 4, '分析并注入 test-id...');
    const results: RouterInjectionResult[] = [];
    const testIdMapping: TestIdMappingEntry[] = [];

    for (const component of targetComponents) {
      const result = await this.processComponent(component, dryRun);
      results.push(result);

      // 收集映射
      for (const injection of result.injections) {
        if (injection.status !== 'skipped') {
          testIdMapping.push({
            testId: injection.testId,
            route: component.route,
            component: component.name,
            elementType: injection.elementType,
            selector: `[data-testid="${injection.testId}"]`,
            description: injection.context || `${component.name} 中的 ${injection.elementType}`,
          });
        }
      }
    }

    // 4. 生成报告
    Logger.step(4, 4, '生成报告...');
    const report = this.generateReport(routerAnalysis, results, testIdMapping, dryRun);
    await this.saveReport(report);

    // 显示摘要
    this.displaySummary(report);

    return report;
  }

  /**
   * 初始化 TypeScript 项目
   */
  private initProject(): void {
    try {
      this.project = createTsProject(this.projectRoot);
    } catch {
      this.project = createTsProjectWithoutConfig(this.projectRoot);
    }
  }

  /**
   * 处理单个组件
   */
  private async processComponent(
    component: PageComponent,
    dryRun: boolean
  ): Promise<RouterInjectionResult> {
    const componentPath = path.resolve(this.projectRoot, component.path);
    const injections: InjectionDetail[] = [];
    let injectedCount = 0;
    let skippedCount = 0;

    // 检查文件是否存在
    if (!await fs.pathExists(componentPath)) {
      Logger.warn(`组件文件不存在: ${component.path}`);
      return {
        route: component.route,
        componentName: component.name,
        componentPath: component.path,
        injectedCount: 0,
        skippedCount: 0,
        injections: [],
      };
    }

    // 检查是否应该排除
    if (this.shouldExclude(componentPath)) {
      return {
        route: component.route,
        componentName: component.name,
        componentPath: component.path,
        injectedCount: 0,
        skippedCount: 0,
        injections: [],
      };
    }

    try {
      // 添加源文件
      this.project!.addSourceFileAtPath(componentPath);
      const sourceFile = this.project!.getSourceFileOrThrow(componentPath);

      // 收集需要注入的元素
      const elementsToInject = this.collectElementsToInject(sourceFile, component);

      // 按行号倒序排列（从后往前注入，避免位置偏移）
      elementsToInject.sort((a, b) => b.lineNumber - a.lineNumber);

      // 执行注入
      for (const element of elementsToInject) {
        const testId = this.generateTestId(component, element);

        if (element.hasTestId) {
          injections.push({
            testId: element.existingTestId || testId,
            elementType: element.tagName,
            lineNumber: element.lineNumber,
            context: element.context,
            status: 'existing',
            reason: '已存在 test-id',
          });
          skippedCount++;
        } else {
          if (!dryRun) {
            this.injectTestIdToElement(element.node, testId);
          }

          injections.push({
            testId,
            elementType: element.tagName,
            lineNumber: element.lineNumber,
            context: element.context,
            status: dryRun ? 'skipped' : 'injected',
            reason: dryRun ? '预览模式' : undefined,
          });

          if (!dryRun) {
            injectedCount++;
          }
        }
      }

      // 保存文件
      if (!dryRun && injectedCount > 0) {
        await sourceFile.save();
        Logger.info(`已注入 ${injectedCount} 个 test-id 到 ${component.path}`);
      }

    } catch (error: any) {
      Logger.warn(`处理组件失败: ${component.path} - ${error.message}`);
    }

    return {
      route: component.route,
      componentName: component.name,
      componentPath: component.path,
      injectedCount,
      skippedCount,
      injections,
    };
  }

  /**
   * 检查是否应该排除
   */
  private shouldExclude(filePath: string): boolean {
    return this.config.excludePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 收集需要注入的元素
   */
  private collectElementsToInject(
    sourceFile: SourceFile,
    component: PageComponent
  ): ElementToInject[] {
    const elements: ElementToInject[] = [];
    const targetSet = new Set(this.config.targetElements.map(t => t.toLowerCase()));

    sourceFile.forEachDescendant(node => {
      if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
        const tagName = Node.isJsxElement(node)
          ? node.getOpeningElement().getTagNameNode().getText()
          : node.getTagNameNode().getText();

        // 检查是否是目标元素
        if (targetSet.has(tagName.toLowerCase()) || this.config.targetElements.includes(tagName)) {
          const hasTestId = this.hasTestId(node);
          const existingTestId = hasTestId ? this.getExistingTestId(node) : undefined;
          const context = this.extractContext(node);

          elements.push({
            node,
            tagName,
            lineNumber: node.getStartLineNumber(),
            hasTestId,
            existingTestId,
            context,
          });
        }
      }
    });

    return elements;
  }

  /**
   * 检查元素是否已有 test-id
   */
  private hasTestId(node: any): boolean {
    const attributes = Node.isJsxElement(node)
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();

    return attributes.some((attr: any) => {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        return name === 'data-testid' || name === 'data-test';
      }
      return false;
    });
  }

  /**
   * 获取已有的 test-id
   */
  private getExistingTestId(node: any): string | undefined {
    const attributes = Node.isJsxElement(node)
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();

    for (const attr of attributes) {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        if (name === 'data-testid' || name === 'data-test') {
          const init = attr.getInitializer();
          if (init && Node.isStringLiteral(init)) {
            return init.getLiteralValue();
          }
          if (init && Node.isJsxExpression(init)) {
            const expr = init.getExpression();
            if (expr && Node.isStringLiteral(expr)) {
              return expr.getLiteralValue();
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * 提取元素上下文
   */
  private extractContext(node: any): string | undefined {
    const attributes = Node.isJsxElement(node)
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();

    // 优先级：aria-label > title > placeholder > name > children text
    const contextAttrs = ['aria-label', 'title', 'placeholder', 'name', 'label'];

    for (const attrName of contextAttrs) {
      for (const attr of attributes) {
        if (Node.isJsxAttribute(attr)) {
          const name = attr.getNameNode().getText();
          if (name === attrName) {
            const init = attr.getInitializer();
            if (init) {
              if (Node.isStringLiteral(init)) {
                return init.getLiteralValue();
              }
              // 处理 JSX 表达式
              if (Node.isJsxExpression(init)) {
                const expr = init.getExpression();
                if (expr && Node.isStringLiteral(expr)) {
                  return expr.getLiteralValue();
                }
              }
            }
          }
        }
      }
    }

    // 尝试获取文本内容
    if (Node.isJsxElement(node)) {
      const children = node.getJsxChildren();
      for (const child of children) {
        if (Node.isJsxText(child)) {
          const text = child.getText().trim();
          if (text && text.length < 30) {
            return text;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * 生成 test-id
   */
  private generateTestId(component: PageComponent, element: ElementToInject): string {
    const parts: string[] = [];

    // 前缀
    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }

    // 路由路径（简化）
    if (this.config.includeRoutePath && component.route) {
      const routePart = component.route
        .replace(/^\//, '')
        .replace(/\//g, '-')
        .replace(/:/g, '')
        .slice(0, 20);
      if (routePart) {
        parts.push(routePart);
      }
    }

    // 组件名
    if (this.config.includeComponentName) {
      parts.push(this.toKebabCase(component.name));
    }

    // 元素类型
    if (this.config.includeElementType) {
      parts.push(this.toKebabCase(element.tagName));
    }

    // 上下文
    if (this.config.includeContext && element.context) {
      const contextPart = this.toKebabCase(element.context).slice(0, 20);
      if (contextPart) {
        parts.push(contextPart);
      }
    }

    // 如果没有上下文，添加行号作为唯一标识
    if (!element.context) {
      parts.push(String(element.lineNumber));
    }

    return parts.join(this.config.separator);
  }

  /**
   * 注入 test-id 到元素
   */
  private injectTestIdToElement(node: any, testId: string): void {
    const attributes = Node.isJsxElement(node)
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();

    if (attributes.length > 0) {
      // 在第一个属性前插入
      const firstAttr = attributes[0];
      const originalText = firstAttr.getText();
      firstAttr.replaceWithText(`data-testid='${testId}' ${originalText}`);
    } else {
      // 没有属性，需要修改标签
      if (Node.isJsxElement(node)) {
        const openingElement = node.getOpeningElement();
        const tagName = openingElement.getTagNameNode().getText();
        const originalText = openingElement.getText();
        // 在标签名后插入属性
        const newText = originalText.replace(
          new RegExp(`^<${tagName}`),
          `<${tagName} data-testid='${testId}'`
        );
        openingElement.replaceWithText(newText);
      } else {
        // JsxSelfClosingElement
        const tagName = node.getTagNameNode().getText();
        node.replaceWithText(`<${tagName} data-testid='${testId}' />`);
      }
    }
  }

  /**
   * 生成报告
   */
  private generateReport(
    routerAnalysis: RouterAnalysisResult,
    results: RouterInjectionResult[],
    testIdMapping: TestIdMappingEntry[],
    dryRun: boolean
  ): RouterInjectionReport {
    const totalInjected = results.reduce((sum, r) => sum + r.injectedCount, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skippedCount, 0);
    const totalExisting = results.reduce(
      (sum, r) => sum + r.injections.filter(i => i.status === 'existing').length,
      0
    );

    return {
      timestamp: new Date().toISOString(),
      mode: dryRun ? 'preview' : 'inject',
      routerFramework: routerAnalysis.framework,
      totalRoutes: routerAnalysis.flatRoutes.length,
      totalComponents: results.length,
      totalInjected,
      totalSkipped,
      totalExisting,
      results,
      testIdMapping,
    };
  }

  /**
   * 保存报告
   */
  private async saveReport(report: RouterInjectionReport): Promise<void> {
    const outputDir = path.join(this.projectRoot, '.mcp', 'testid');
    await fs.ensureDir(outputDir);

    // 保存完整报告
    const reportPath = path.join(outputDir, 'router-injection-report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });
    Logger.info(`报告已保存: ${path.relative(this.projectRoot, reportPath)}`);

    // 保存 test-id 映射（用于 MCP Rule）
    const mappingPath = path.join(outputDir, 'router-testid-mapping.json');
    await fs.writeJson(mappingPath, {
      timestamp: report.timestamp,
      framework: report.routerFramework,
      mappings: report.testIdMapping,
    }, { spaces: 2 });
    Logger.info(`映射表已保存: ${path.relative(this.projectRoot, mappingPath)}`);
  }

  /**
   * 显示摘要
   */
  private displaySummary(report: RouterInjectionReport): void {
    Logger.divider();
    Logger.header('Test-ID 注入摘要');
    Logger.info(`模式: ${report.mode === 'preview' ? '预览模式' : '注入模式'}`);
    Logger.info(`路由框架: ${report.routerFramework}`);
    Logger.info(`处理路由: ${report.totalRoutes}`);
    Logger.info(`处理组件: ${report.totalComponents}`);
    Logger.info(`已存在: ${report.totalExisting}`);
    Logger.info(`${report.mode === 'preview' ? '待注入' : '已注入'}: ${report.testIdMapping.length - report.totalExisting}`);

    if (report.results.length > 0 && report.results.some(r => r.injections.length > 0)) {
      Logger.divider();
      Logger.info('详细结果:');

      for (const result of report.results) {
        if (result.injections.length === 0) continue;

        Logger.info(`\n📄 ${result.componentName} (${result.route})`);
        for (const injection of result.injections.slice(0, 5)) {
          const statusIcon = injection.status === 'existing' ? '✓' :
            injection.status === 'injected' ? '✅' : '○';
          Logger.info(`   ${statusIcon} [${injection.elementType}] ${injection.testId}`);
        }
        if (result.injections.length > 5) {
          Logger.info(`   ... 还有 ${result.injections.length - 5} 个`);
        }
      }
    }

    if (report.mode === 'preview') {
      Logger.divider();
      Logger.info('💡 运行以下命令执行实际注入:');
      Logger.info('   npx mcp-e2e router:inject');
    }
  }

  /**
   * 转换为 kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 30);
  }
}

/**
 * 需要注入的元素信息
 */
interface ElementToInject {
  node: any;
  tagName: string;
  lineNumber: number;
  hasTestId: boolean;
  existingTestId?: string;
  context?: string;
}

/**
 * 导出注入函数
 */
export async function injectTestIdsFromRouter(
  routerAnalysis: RouterAnalysisResult,
  projectRoot?: string,
  options?: {
    dryRun?: boolean;
    onlyPages?: boolean;
    routes?: string[];
    config?: Partial<RouterTestIdConfig>;
  }
): Promise<RouterInjectionReport> {
  const root = projectRoot || process.cwd();
  const injector = new RouterTestIdInjector(root, options?.config);
  return await injector.injectFromRouterAnalysis(routerAnalysis, {
    dryRun: options?.dryRun,
    onlyPages: options?.onlyPages,
    routes: options?.routes,
  });
}
