import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { createTsProject, createTsProjectWithoutConfig } from '../analyzer/project.js';
import { buildDependencyGraph } from '../analyzer/dependencyGraph.js';
import { detectFramework, findProjectFiles } from '../utils/fs.js';

/**
 * 项目结构分析器 - 生成 CodeBuddy Rule
 * 
 * 功能：
 * 1. 分析项目目录结构，识别页面、组件、路由
 * 2. 构建组件依赖图
 * 3. 识别主要业务流程
 * 4. 输出标准 CodeBuddy Rule 用于测试
 */

export interface ProjectStructure {
  framework: string;
  pages: PageInfo[];
  components: ComponentInfo[];
  routes: RouteInfo[];
  businessFlows: BusinessFlow[];
}

export interface PageInfo {
  name: string;
  path: string;
  route: string;
  components: string[];
  testIds: string[];
}

export interface ComponentInfo {
  name: string;
  path: string;
  type: 'page' | 'component' | 'layout' | 'widget';
  dependencies: string[];
  dependents: string[];
  testIds: string[];
  interactiveElements: InteractiveElement[];
}

export interface InteractiveElement {
  type: 'button' | 'input' | 'link' | 'select' | 'form';
  testId?: string;
  selector: string;
  action: string;
}

export interface RouteInfo {
  path: string;
  component: string;
  name?: string;
  meta?: Record<string, any>;
}

export interface BusinessFlow {
  id: string;
  name: string;
  description: string;
  priority: number;
  steps: FlowStep[];
  expectedOutcome: string;
}

export interface FlowStep {
  order: number;
  action: string;
  target: string;
  selector: string;
  value?: string;
  waitFor?: string;
}

/**
 * CodeBuddy Test Rule 定义
 */
export interface CodeBuddyTestRule {
  id: string;
  name: string;
  version: string;
  description: string;
  scope: 'project' | 'module' | 'component';
  trigger: 'manual' | 'on_change' | 'on_commit' | 'scheduled';
  enabled: boolean;
  priority: number;
  
  // 项目上下文
  context: {
    framework: string;
    baseUrl: string;
    routes: string[];
    components: string[];
  };
  
  // 测试流程
  flows: TestFlow[];
  
  // 执行配置
  config: {
    timeout: number;
    retries: number;
    parallel: boolean;
    headless: boolean;
    screenshot: boolean;
  };
  
  // 元数据
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    tags: string[];
  };
}

export interface TestFlow {
  id: string;
  name: string;
  description: string;
  route: string;
  preconditions: string[];
  steps: TestStep[];
  signals: TestSignal[];
}

export interface TestStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'hover' | 'select' | 'assert';
  target: string;
  selector: string;
  value?: string;
  timeout?: number;
  optional?: boolean;
}

export interface TestSignal {
  type: 'dom-visible' | 'dom-hidden' | 'route-match' | 'network-idle' | 'no-error';
  selector?: string;
  value?: string;
  timeout?: number;
}

/**
 * 项目结构分析器
 */
export class ProjectAnalyzer {
  private projectRoot: string;
  private framework: string = 'unknown';
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 分析项目结构并生成 CodeBuddy Rule
   */
  async analyzeAndGenerateRule(): Promise<CodeBuddyTestRule> {
    Logger.header('项目结构分析 - 生成 CodeBuddy Test Rule');
    
    // 1. 检测框架
    Logger.step(1, 6, '检测项目框架...');
    this.framework = await detectFramework(this.projectRoot);
    Logger.info(`检测到框架: ${this.framework}`);
    
    // 2. 分析项目结构
    Logger.step(2, 6, '分析项目结构...');
    const structure = await this.analyzeProjectStructure();
    
    // 3. 识别业务流程
    Logger.step(3, 6, '识别业务流程...');
    const businessFlows = await this.identifyBusinessFlows(structure);
    
    // 4. 提取测试点
    Logger.step(4, 6, '提取测试点...');
    const testFlows = this.generateTestFlows(structure, businessFlows);
    
    // 5. 生成 CodeBuddy Rule
    Logger.step(5, 6, '生成 CodeBuddy Test Rule...');
    const rule = this.createCodeBuddyRule(structure, testFlows);
    
    // 6. 保存 Rule
    Logger.step(6, 6, '保存 Rule 文件...');
    await this.saveRule(rule);
    
    Logger.success('项目分析完成！');
    return rule;
  }

  /**
   * 分析项目结构
   */
  private async analyzeProjectStructure(): Promise<ProjectStructure> {
    const pages: PageInfo[] = [];
    const components: ComponentInfo[] = [];
    const routes: RouteInfo[] = [];
    
    // 创建 TypeScript 项目
    let project;
    try {
      project = createTsProject(this.projectRoot);
    } catch {
      project = createTsProjectWithoutConfig(this.projectRoot);
    }
    
    const sourceFiles = project.getSourceFiles();
    const dependencyGraph = buildDependencyGraph(sourceFiles);
    
    // 分析每个源文件
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      const relativePath = path.relative(this.projectRoot, filePath);
      
      // 跳过 node_modules 和测试文件
      if (relativePath.includes('node_modules') || relativePath.includes('.test.') || relativePath.includes('.spec.')) {
        continue;
      }
      
      // 判断文件类型
      const componentType = this.classifyComponent(relativePath);
      if (!componentType) continue;
      
      // 提取组件信息
      const componentInfo = await this.extractComponentInfo(sourceFile, componentType, dependencyGraph);
      if (componentInfo) {
        components.push(componentInfo);
        
        // 如果是页面组件，添加到 pages
        if (componentType === 'page') {
          const route = this.inferRouteFromPath(relativePath);
          pages.push({
            name: componentInfo.name,
            path: relativePath,
            route,
            components: componentInfo.dependencies,
            testIds: componentInfo.testIds,
          });
          
          routes.push({
            path: route,
            component: componentInfo.name,
          });
        }
      }
    }
    
    return {
      framework: this.framework,
      pages,
      components,
      routes,
      businessFlows: [],
    };
  }

  /**
   * 分类组件类型
   */
  private classifyComponent(relativePath: string): ComponentInfo['type'] | null {
    const lowerPath = relativePath.toLowerCase();
    
    if (lowerPath.includes('/pages/') || lowerPath.includes('/views/')) {
      return 'page';
    }
    if (lowerPath.includes('/layouts/') || lowerPath.includes('/layout/')) {
      return 'layout';
    }
    if (lowerPath.includes('/components/')) {
      return 'component';
    }
    if (lowerPath.includes('/widgets/') || lowerPath.includes('/common/')) {
      return 'widget';
    }
    
    // 根据文件名判断
    const fileName = path.basename(relativePath);
    if (fileName.includes('Page') || fileName.includes('View')) {
      return 'page';
    }
    if (fileName.includes('Layout')) {
      return 'layout';
    }
    
    return null;
  }

  /**
   * 提取组件信息
   */
  private async extractComponentInfo(
    sourceFile: any,
    type: ComponentInfo['type'],
    dependencyGraph: any
  ): Promise<ComponentInfo | null> {
    const filePath = sourceFile.getFilePath();
    const fileName = path.basename(filePath, path.extname(filePath));
    const componentName = this.toPascalCase(fileName);
    
    // 提取 test-id
    const testIds: string[] = [];
    const interactiveElements: InteractiveElement[] = [];
    
    sourceFile.forEachDescendant((node: any) => {
      // 查找 data-testid 属性
      if (node.getKind?.() === 285) { // JsxAttribute
        const attrName = node.getNameNode?.()?.getText?.();
        if (attrName === 'data-testid' || attrName === 'data-test') {
          const initializer = node.getInitializer?.();
          if (initializer) {
            const value = initializer.getText?.()?.replace(/['"]/g, '');
            if (value) {
              testIds.push(value);
            }
          }
        }
      }
      
      // 查找交互元素
      if (node.getKind?.() === 283) { // JsxElement
        const tagName = node.getOpeningElement?.()?.getTagNameNode?.()?.getText?.();
        if (this.isInteractiveTag(tagName)) {
          const testId = this.findTestIdInElement(node);
          interactiveElements.push({
            type: this.mapTagToType(tagName),
            testId,
            selector: testId ? `[data-testid="${testId}"]` : tagName,
            action: this.inferAction(tagName),
          });
        }
      }
    });
    
    // 获取依赖关系
    const deps = dependencyGraph.dependencies.get(filePath) || new Set();
    const reverseDeps = dependencyGraph.reverseDependencies.get(filePath) || new Set();
    
    return {
      name: componentName,
      path: path.relative(this.projectRoot, filePath),
      type,
      dependencies: Array.from(deps).map((d: string) => path.basename(d, path.extname(d))),
      dependents: Array.from(reverseDeps).map((d: string) => path.basename(d, path.extname(d))),
      testIds,
      interactiveElements,
    };
  }

  /**
   * 识别业务流程
   */
  private async identifyBusinessFlows(structure: ProjectStructure): Promise<BusinessFlow[]> {
    const flows: BusinessFlow[] = [];
    
    // 基于页面和路由识别常见业务流程
    const commonFlows = [
      { pattern: /login|signin|auth/i, name: '用户登录', priority: 1 },
      { pattern: /register|signup/i, name: '用户注册', priority: 2 },
      { pattern: /dashboard|home|index/i, name: '首页访问', priority: 3 },
      { pattern: /list|table|query/i, name: '列表查询', priority: 4 },
      { pattern: /detail|view|show/i, name: '详情查看', priority: 5 },
      { pattern: /create|add|new/i, name: '新建记录', priority: 6 },
      { pattern: /edit|update|modify/i, name: '编辑记录', priority: 7 },
      { pattern: /delete|remove/i, name: '删除记录', priority: 8 },
      { pattern: /search|filter/i, name: '搜索筛选', priority: 9 },
      { pattern: /setting|config|preference/i, name: '设置配置', priority: 10 },
    ];
    
    for (const page of structure.pages) {
      for (const flowDef of commonFlows) {
        if (flowDef.pattern.test(page.name) || flowDef.pattern.test(page.route)) {
          const steps = this.generateFlowSteps(page, flowDef.name);
          
          flows.push({
            id: `flow-${page.name.toLowerCase()}-${flowDef.name.replace(/\s/g, '-')}`,
            name: `${page.name} - ${flowDef.name}`,
            description: `${flowDef.name}业务流程测试`,
            priority: flowDef.priority,
            steps,
            expectedOutcome: `${flowDef.name}操作成功完成`,
          });
        }
      }
    }
    
    // 按优先级排序
    return flows.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 生成流程步骤
   */
  private generateFlowSteps(page: PageInfo, flowType: string): FlowStep[] {
    const steps: FlowStep[] = [];
    let order = 1;
    
    // 导航步骤
    steps.push({
      order: order++,
      action: 'navigate',
      target: page.route,
      selector: '',
      waitFor: 'networkidle',
    });
    
    // 等待页面加载
    if (page.testIds.length > 0) {
      steps.push({
        order: order++,
        action: 'wait',
        target: page.testIds[0],
        selector: `[data-testid="${page.testIds[0]}"]`,
        waitFor: 'visible',
      });
    }
    
    // 根据流程类型添加特定步骤
    switch (flowType) {
      case '用户登录':
        steps.push(
          { order: order++, action: 'type', target: 'username', selector: '[data-testid="username"], input[name="username"], #username', value: '{{username}}' },
          { order: order++, action: 'type', target: 'password', selector: '[data-testid="password"], input[name="password"], #password', value: '{{password}}' },
          { order: order++, action: 'click', target: 'submit', selector: '[data-testid="login-btn"], button[type="submit"], .login-btn' }
        );
        break;
        
      case '列表查询':
        steps.push(
          { order: order++, action: 'wait', target: 'table', selector: '[data-testid="data-table"], .bk-table, table', waitFor: 'visible' },
          { order: order++, action: 'click', target: 'search', selector: '[data-testid="search-btn"], .search-btn, button.search' }
        );
        break;
        
      case '新建记录':
        steps.push(
          { order: order++, action: 'click', target: 'create', selector: '[data-testid="create-btn"], .create-btn, button.add' },
          { order: order++, action: 'wait', target: 'form', selector: '[data-testid="form"], form, .form-container', waitFor: 'visible' }
        );
        break;
    }
    
    return steps;
  }

  /**
   * 生成测试流程
   */
  private generateTestFlows(structure: ProjectStructure, businessFlows: BusinessFlow[]): TestFlow[] {
    const testFlows: TestFlow[] = [];
    
    for (const flow of businessFlows) {
      const steps: TestStep[] = flow.steps.map(step => ({
        type: step.action as TestStep['type'],
        target: step.target,
        selector: step.selector,
        value: step.value,
        timeout: 5000,
        optional: false,
      }));
      
      const signals: TestSignal[] = [
        { type: 'network-idle', timeout: 10000 },
        { type: 'no-error', timeout: 3000 },
      ];
      
      testFlows.push({
        id: flow.id,
        name: flow.name,
        description: flow.description,
        route: flow.steps[0]?.target || '/',
        preconditions: [],
        steps,
        signals,
      });
    }
    
    return testFlows;
  }

  /**
   * 创建 CodeBuddy Rule
   */
  private createCodeBuddyRule(structure: ProjectStructure, testFlows: TestFlow[]): CodeBuddyTestRule {
    const now = new Date().toISOString();
    
    return {
      id: `project-test-rule-${Date.now()}`,
      name: `${path.basename(this.projectRoot)} 项目测试规则`,
      version: '1.0.0',
      description: '基于项目结构自动生成的 E2E 测试规则',
      scope: 'project',
      trigger: 'manual',
      enabled: true,
      priority: 1,
      
      context: {
        framework: structure.framework,
        baseUrl: '{{baseUrl}}',
        routes: structure.routes.map(r => r.path),
        components: structure.components.map(c => c.name),
      },
      
      flows: testFlows,
      
      config: {
        timeout: 30000,
        retries: 2,
        parallel: false,
        headless: false,
        screenshot: true,
      },
      
      metadata: {
        createdAt: now,
        updatedAt: now,
        author: 'MCP-CLI',
        tags: ['e2e', 'auto-generated', structure.framework],
      },
    };
  }

  /**
   * 保存 Rule 文件
   */
  private async saveRule(rule: CodeBuddyTestRule): Promise<void> {
    const rulesDir = path.join(this.projectRoot, '.codebuddy', 'rules');
    await fs.ensureDir(rulesDir);
    
    const rulePath = path.join(rulesDir, `${rule.id}.json`);
    await fs.writeJson(rulePath, rule, { spaces: 2 });
    
    Logger.success(`Rule 已保存: ${path.relative(this.projectRoot, rulePath)}`);
  }

  // 辅助方法
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, c => c.toUpperCase());
  }

  private inferRouteFromPath(relativePath: string): string {
    let route = relativePath
      .replace(/^src\//, '')
      .replace(/\/(pages|views)\//, '/')
      .replace(/\.(tsx?|jsx?|vue)$/, '')
      .replace(/\/index$/, '')
      .replace(/\\/g, '/');
    
    if (!route.startsWith('/')) {
      route = '/' + route;
    }
    
    return route;
  }

  private isInteractiveTag(tagName: string): boolean {
    const interactive = ['button', 'input', 'a', 'select', 'textarea', 'form'];
    return interactive.includes(tagName?.toLowerCase());
  }

  private mapTagToType(tagName: string): InteractiveElement['type'] {
    const map: Record<string, InteractiveElement['type']> = {
      button: 'button',
      input: 'input',
      a: 'link',
      select: 'select',
      textarea: 'input',
      form: 'form',
    };
    return map[tagName?.toLowerCase()] || 'button';
  }

  private inferAction(tagName: string): string {
    const map: Record<string, string> = {
      button: 'click',
      input: 'type',
      a: 'click',
      select: 'select',
      textarea: 'type',
      form: 'submit',
    };
    return map[tagName?.toLowerCase()] || 'click';
  }

  private findTestIdInElement(node: any): string | undefined {
    const attributes = node.getOpeningElement?.()?.getAttributes?.() || [];
    for (const attr of attributes) {
      const name = attr.getNameNode?.()?.getText?.();
      if (name === 'data-testid' || name === 'data-test') {
        const initializer = attr.getInitializer?.();
        return initializer?.getText?.()?.replace(/['"{}]/g, '');
      }
    }
    return undefined;
  }
}

/**
 * 导出分析命令
 */
export async function analyzeProjectAndGenerateRule(projectRoot?: string): Promise<CodeBuddyTestRule> {
  const root = projectRoot || process.cwd();
  const analyzer = new ProjectAnalyzer(root);
  return await analyzer.analyzeAndGenerateRule();
}
