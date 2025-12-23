import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { createTsProject, createTsProjectWithoutConfig } from '../analyzer/project.js';
import { Node, SourceFile, JsxElement, JsxSelfClosingElement, SyntaxKind } from 'ts-morph';

/**
 * Test-ID 注入器
 * 
 * 功能：
 * 1. 分析组件中的交互元素
 * 2. 自动为缺少 data-testid 的元素添加 test-id
 * 3. 生成 test-id 映射表
 * 4. 支持精准测试定位
 */

export interface TestIdConfig {
  prefix: string;
  separator: string;
  includeComponentName: boolean;
  includeElementType: boolean;
  includeIndex: boolean;
}

export interface TestIdMapping {
  testId: string;
  filePath: string;
  componentName: string;
  elementType: string;
  lineNumber: number;
  selector: string;
  description?: string;
}

export interface InjectionResult {
  filePath: string;
  componentName: string;
  injectedCount: number;
  skippedCount: number;
  testIds: TestIdMapping[];
}

export interface InjectionReport {
  timestamp: string;
  totalFiles: number;
  totalInjected: number;
  totalSkipped: number;
  results: InjectionResult[];
  mappings: TestIdMapping[];
}

/**
 * Test-ID 注入器
 */
export class TestIdInjector {
  private projectRoot: string;
  private config: TestIdConfig;
  private mappings: TestIdMapping[] = [];
  
  constructor(projectRoot: string, config?: Partial<TestIdConfig>) {
    this.projectRoot = projectRoot;
    this.config = {
      prefix: 'test',
      separator: '-',
      includeComponentName: true,
      includeElementType: true,
      includeIndex: true,
      ...config,
    };
  }

  /**
   * 分析并注入 test-id
   */
  async analyzeAndInject(options?: {
    dryRun?: boolean;
    targetFiles?: string[];
    interactive?: boolean;
  }): Promise<InjectionReport> {
    const dryRun = options?.dryRun ?? true;
    const targetFiles = options?.targetFiles;
    
    Logger.header('Test-ID 注入分析');
    Logger.info(`模式: ${dryRun ? '预览模式（不修改文件）' : '注入模式'}`);
    
    // 1. 加载项目
    Logger.step(1, 4, '加载项目文件...');
    let project;
    try {
      project = createTsProject(this.projectRoot);
    } catch {
      project = createTsProjectWithoutConfig(this.projectRoot);
    }
    
    // 2. 筛选目标文件
    Logger.step(2, 4, '筛选目标文件...');
    let sourceFiles = project.getSourceFiles();
    
    if (targetFiles && targetFiles.length > 0) {
      const targetSet = new Set(targetFiles.map(f => path.resolve(this.projectRoot, f)));
      sourceFiles = sourceFiles.filter(sf => targetSet.has(sf.getFilePath()));
    }
    
    // 过滤出组件文件
    sourceFiles = sourceFiles.filter(sf => {
      const filePath = sf.getFilePath();
      return (
        (filePath.endsWith('.tsx') || filePath.endsWith('.jsx') || filePath.endsWith('.vue')) &&
        !filePath.includes('node_modules') &&
        !filePath.includes('.test.') &&
        !filePath.includes('.spec.')
      );
    });
    
    Logger.info(`找到 ${sourceFiles.length} 个组件文件`);
    
    // 3. 分析并注入
    Logger.step(3, 4, '分析交互元素...');
    const results: InjectionResult[] = [];
    
    for (const sourceFile of sourceFiles) {
      const result = await this.processFile(sourceFile, dryRun);
      if (result.injectedCount > 0 || result.skippedCount > 0) {
        results.push(result);
      }
    }
    
    // 4. 生成报告
    Logger.step(4, 4, '生成报告...');
    const report = this.generateReport(results);
    await this.saveReport(report);
    
    // 显示摘要
    this.displaySummary(report);
    
    return report;
  }

  /**
   * 处理单个文件
   */
  private async processFile(sourceFile: SourceFile, dryRun: boolean): Promise<InjectionResult> {
    const filePath = sourceFile.getFilePath();
    const relativePath = path.relative(this.projectRoot, filePath);
    const componentName = this.extractComponentName(filePath);
    
    const testIds: TestIdMapping[] = [];
    let injectedCount = 0;
    let skippedCount = 0;
    
    // 收集需要注入的元素
    const elementsToInject: Array<{
      element: JsxElement | JsxSelfClosingElement;
      tagName: string;
      lineNumber: number;
    }> = [];
    
    sourceFile.forEachDescendant(node => {
      // 处理 JSX 元素
      if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
        const tagName = this.getTagName(node);
        
        // 检查是否是交互元素
        if (this.isInteractiveElement(tagName)) {
          // 检查是否已有 test-id
          if (!this.hasTestId(node)) {
            elementsToInject.push({
              element: node,
              tagName,
              lineNumber: node.getStartLineNumber(),
            });
          } else {
            // 记录已有的 test-id
            const existingTestId = this.getExistingTestId(node);
            if (existingTestId) {
              testIds.push({
                testId: existingTestId,
                filePath: relativePath,
                componentName,
                elementType: tagName,
                lineNumber: node.getStartLineNumber(),
                selector: `[data-testid="${existingTestId}"]`,
                description: '已存在',
              });
              skippedCount++;
            }
          }
        }
      }
    });
    
    // 注入 test-id（从后往前，避免位置偏移）
    const sortedElements = elementsToInject.sort((a, b) => b.lineNumber - a.lineNumber);
    
    for (let i = 0; i < sortedElements.length; i++) {
      const { element, tagName, lineNumber } = sortedElements[i];
      const index = sortedElements.length - i; // 反向索引
      
      const testId = this.generateTestId(componentName, tagName, index);
      
      if (!dryRun) {
        this.injectTestId(element, testId);
      }
      
      testIds.push({
        testId,
        filePath: relativePath,
        componentName,
        elementType: tagName,
        lineNumber,
        selector: `[data-testid="${testId}"]`,
        description: dryRun ? '待注入' : '已注入',
      });
      
      injectedCount++;
    }
    
    // 保存文件
    if (!dryRun && injectedCount > 0) {
      await sourceFile.save();
    }
    
    // 添加到全局映射
    this.mappings.push(...testIds);
    
    return {
      filePath: relativePath,
      componentName,
      injectedCount,
      skippedCount,
      testIds,
    };
  }

  /**
   * 获取标签名
   */
  private getTagName(node: JsxElement | JsxSelfClosingElement): string {
    if (Node.isJsxElement(node)) {
      return node.getOpeningElement().getTagNameNode().getText();
    } else {
      return node.getTagNameNode().getText();
    }
  }

  /**
   * 检查是否是交互元素
   */
  private isInteractiveElement(tagName: string): boolean {
    const interactiveElements = [
      // HTML 原生元素
      'button', 'input', 'select', 'textarea', 'a', 'form',
      'details', 'dialog', 'menu', 'menuitem',
      // 常见组件库组件
      'Button', 'Input', 'Select', 'Checkbox', 'Radio',
      'Switch', 'Slider', 'DatePicker', 'TimePicker',
      'Upload', 'Dropdown', 'Menu', 'Tabs', 'Tab',
      'Modal', 'Drawer', 'Popover', 'Tooltip',
      'Table', 'Pagination', 'Tree', 'Transfer',
      // BK 组件
      'BkButton', 'BkInput', 'BkSelect', 'BkTable',
      'BkDialog', 'BkSideslider', 'BkDropdown',
    ];
    
    return interactiveElements.some(el => 
      tagName === el || tagName.toLowerCase() === el.toLowerCase()
    );
  }

  /**
   * 检查是否已有 test-id
   */
  private hasTestId(node: JsxElement | JsxSelfClosingElement): boolean {
    const attributes = Node.isJsxElement(node) 
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();
    
    return attributes.some(attr => {
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
  private getExistingTestId(node: JsxElement | JsxSelfClosingElement): string | null {
    const attributes = Node.isJsxElement(node)
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();
    
    for (const attr of attributes) {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        if (name === 'data-testid' || name === 'data-test') {
          const initializer = attr.getInitializer();
          if (initializer && Node.isStringLiteral(initializer)) {
            return initializer.getLiteralValue();
          }
          if (initializer && Node.isJsxExpression(initializer)) {
            const expression = initializer.getExpression();
            if (expression && Node.isStringLiteral(expression)) {
              return expression.getLiteralValue();
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * 生成 test-id
   */
  private generateTestId(componentName: string, elementType: string, index: number): string {
    const parts: string[] = [];
    
    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }
    
    if (this.config.includeComponentName) {
      parts.push(this.toKebabCase(componentName));
    }
    
    if (this.config.includeElementType) {
      parts.push(this.toKebabCase(elementType));
    }
    
    if (this.config.includeIndex) {
      parts.push(String(index));
    }
    
    return parts.join(this.config.separator);
  }

  /**
   * 注入 test-id
   */
  private injectTestId(node: JsxElement | JsxSelfClosingElement, testId: string): void {
    if (Node.isJsxElement(node)) {
      const openingElement = node.getOpeningElement();
      const attributes = openingElement.getAttributes();
      
      // 在第一个属性之前插入
      if (attributes.length > 0) {
        const firstAttr = attributes[0];
        firstAttr.replaceWithText(`data-testid="${testId}" ${firstAttr.getText()}`);
      } else {
        // 没有属性，直接添加
        const tagName = openingElement.getTagNameNode().getText();
        openingElement.replaceWithText(`<${tagName} data-testid="${testId}">`);
      }
    } else {
      // JsxSelfClosingElement
      const attributes = node.getAttributes();
      
      if (attributes.length > 0) {
        const firstAttr = attributes[0];
        firstAttr.replaceWithText(`data-testid="${testId}" ${firstAttr.getText()}`);
      } else {
        const tagName = node.getTagNameNode().getText();
        node.replaceWithText(`<${tagName} data-testid="${testId}" />`);
      }
    }
  }

  /**
   * 生成报告
   */
  private generateReport(results: InjectionResult[]): InjectionReport {
    const totalInjected = results.reduce((sum, r) => sum + r.injectedCount, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skippedCount, 0);
    
    return {
      timestamp: new Date().toISOString(),
      totalFiles: results.length,
      totalInjected,
      totalSkipped,
      results,
      mappings: this.mappings,
    };
  }

  /**
   * 保存报告
   */
  private async saveReport(report: InjectionReport): Promise<void> {
    const outputDir = path.join(this.projectRoot, '.mcp', 'testid');
    await fs.ensureDir(outputDir);
    
    // 保存完整报告
    const reportPath = path.join(outputDir, 'injection-report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });
    
    // 保存映射表（用于测试时快速查找）
    const mappingPath = path.join(outputDir, 'testid-mapping.json');
    await fs.writeJson(mappingPath, {
      timestamp: report.timestamp,
      mappings: report.mappings,
    }, { spaces: 2 });
    
    Logger.info(`报告已保存: ${path.relative(this.projectRoot, reportPath)}`);
    Logger.info(`映射表已保存: ${path.relative(this.projectRoot, mappingPath)}`);
  }

  /**
   * 显示摘要
   */
  private displaySummary(report: InjectionReport): void {
    Logger.divider();
    Logger.header('Test-ID 注入摘要');
    Logger.info(`📁 处理文件: ${report.totalFiles}`);
    Logger.info(`✅ 注入数量: ${report.totalInjected}`);
    Logger.info(`⏭️  跳过数量: ${report.totalSkipped}`);
    Logger.info(`📊 总计 Test-ID: ${report.mappings.length}`);
    
    if (report.results.length > 0) {
      Logger.divider();
      Logger.info('详细结果:');
      Logger.table(report.results.map(r => ({
        文件: r.filePath,
        组件: r.componentName,
        注入: r.injectedCount,
        跳过: r.skippedCount,
      })));
    }
  }

  /**
   * 获取 test-id 映射表
   */
  async getTestIdMapping(): Promise<TestIdMapping[]> {
    const mappingPath = path.join(this.projectRoot, '.mcp', 'testid', 'testid-mapping.json');
    
    if (await fs.pathExists(mappingPath)) {
      const data = await fs.readJson(mappingPath);
      return data.mappings || [];
    }
    
    return [];
  }

  /**
   * 根据 test-id 查找元素信息
   */
  async findByTestId(testId: string): Promise<TestIdMapping | undefined> {
    const mappings = await this.getTestIdMapping();
    return mappings.find(m => m.testId === testId);
  }

  /**
   * 根据组件名查找所有 test-id
   */
  async findByComponent(componentName: string): Promise<TestIdMapping[]> {
    const mappings = await this.getTestIdMapping();
    return mappings.filter(m => 
      m.componentName.toLowerCase() === componentName.toLowerCase()
    );
  }

  // 辅助方法
  private extractComponentName(filePath: string): string {
    const basename = path.basename(filePath, path.extname(filePath));
    return basename
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, c => c.toUpperCase())
      .replace(/\.(component|page|view|container)$/i, '');
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}

/**
 * 导出注入命令
 */
export async function injectTestIds(
  projectRoot?: string,
  options?: {
    dryRun?: boolean;
    targetFiles?: string[];
    config?: Partial<TestIdConfig>;
  }
): Promise<InjectionReport> {
  const root = projectRoot || process.cwd();
  const injector = new TestIdInjector(root, options?.config);
  return await injector.analyzeAndInject({
    dryRun: options?.dryRun,
    targetFiles: options?.targetFiles,
  });
}

/**
 * 获取 test-id 映射
 */
export async function getTestIdMapping(projectRoot?: string): Promise<TestIdMapping[]> {
  const root = projectRoot || process.cwd();
  const injector = new TestIdInjector(root);
  return await injector.getTestIdMapping();
}
