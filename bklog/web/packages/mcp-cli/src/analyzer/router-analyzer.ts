import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { createTsProject, createTsProjectWithoutConfig } from './project.js';
import { Node, SourceFile, SyntaxKind } from 'ts-morph';

/**
 * Router 分析器
 *
 * 功能：
 * 1. 解析 Vue Router / React Router 配置
 * 2. 提取路由路径、组件映射、元数据
 * 3. 识别页面组件和业务容器
 * 4. 为 DevTools MCP 生成测试入口
 */

export interface RouteConfig {
  path: string;
  name?: string;
  component: string;
  componentPath: string;
  meta?: Record<string, any>;
  children?: RouteConfig[];
  redirect?: string;
  props?: boolean | Record<string, any>;
  guards?: string[];
}

export interface RouterAnalysisResult {
  framework: 'vue-router' | 'react-router' | 'unknown';
  routerFilePath: string;
  routes: RouteConfig[];
  flatRoutes: FlatRoute[];
  pageComponents: PageComponent[];
  layoutComponents: string[];
  guards: GuardInfo[];
}

export interface FlatRoute {
  fullPath: string;
  name?: string;
  component: string;
  componentPath: string;
  depth: number;
  parent?: string;
  meta?: Record<string, any>;
}

export interface PageComponent {
  name: string;
  path: string;
  route: string;
  type: 'page' | 'layout' | 'container' | 'widget';
  interactiveElements: InteractiveElementInfo[];
  existingTestIds: string[];
  suggestedTestIds: TestIdSuggestion[];
}

export interface InteractiveElementInfo {
  tagName: string;
  type: 'button' | 'input' | 'link' | 'select' | 'form' | 'table' | 'modal' | 'other';
  lineNumber: number;
  hasTestId: boolean;
  existingTestId?: string;
  suggestedTestId?: string;
  context?: string;
}

export interface TestIdSuggestion {
  element: string;
  lineNumber: number;
  suggestedId: string;
  reason: string;
}

export interface GuardInfo {
  name: string;
  type: 'beforeEach' | 'beforeEnter' | 'beforeRouteEnter' | 'beforeRouteLeave';
  filePath?: string;
}

/**
 * Router 分析器
 */
export class RouterAnalyzer {
  private projectRoot: string;
  private framework: 'vue-router' | 'react-router' | 'unknown' = 'unknown';

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 分析路由配置
   */
  async analyze(): Promise<RouterAnalysisResult> {
    Logger.header('Router 配置分析');

    // 1. 查找路由文件
    Logger.step(1, 5, '查找路由配置文件...');
    const routerFiles = await this.findRouterFiles();

    if (routerFiles.length === 0) {
      Logger.warn('未找到路由配置文件');
      return this.createEmptyResult();
    }

    const mainRouterFile = routerFiles[0];
    Logger.info(`找到 ${routerFiles.length} 个路由文件`);
    routerFiles.forEach(f => Logger.info(`  - ${path.relative(this.projectRoot, f)}`));

    // 2. 检测框架类型
    Logger.step(2, 5, '检测路由框架...');
    this.framework = await this.detectFramework(mainRouterFile);
    Logger.info(`检测到框架: ${this.framework}`);

    // 3. 解析所有路由配置文件
    Logger.step(3, 5, '解析路由配置...');
    const routes: RouteConfig[] = [];
    for (const routerFile of routerFiles) {
      const fileRoutes = await this.parseRouterConfig(routerFile);
      routes.push(...fileRoutes);
    }
    Logger.info(`解析到 ${routes.length} 个顶级路由`);

    // 4. 扁平化路由
    Logger.step(4, 5, '扁平化路由树...');
    const flatRoutes = this.flattenRoutes(routes);
    Logger.info(`共 ${flatRoutes.length} 个路由路径`);

    // 5. 分析页面组件
    Logger.step(5, 5, '分析页面组件...');
    const pageComponents = await this.analyzePageComponents(flatRoutes);
    Logger.info(`分析了 ${pageComponents.length} 个页面组件`);

    // 提取 layout 组件
    const layoutComponents = this.extractLayoutComponents(routes);

    // 提取路由守卫
    const guards = await this.extractGuards(mainRouterFile);

    return {
      framework: this.framework,
      routerFilePath: mainRouterFile,
      routes,
      flatRoutes,
      pageComponents,
      layoutComponents,
      guards,
    };
  }

  /**
   * 查找所有路由配置文件
   */
  private async findRouterFiles(): Promise<string[]> {
    const routerFiles: string[] = [];

    // 首先检查 src/router 目录
    const routerDir = path.join(this.projectRoot, 'src', 'router');
    if (await fs.pathExists(routerDir)) {
      const files = await fs.readdir(routerDir);
      for (const file of files) {
        if (/\.(js|ts|jsx|tsx)$/.test(file)) {
          routerFiles.push(path.join(routerDir, file));
        }
      }
    }

    // 如果找到了文件，返回（index.js 放在第一个）
    if (routerFiles.length > 0) {
      routerFiles.sort((a, b) => {
        const aIsIndex = path.basename(a).startsWith('index');
        const bIsIndex = path.basename(b).startsWith('index');
        if (aIsIndex && !bIsIndex) return -1;
        if (!aIsIndex && bIsIndex) return 1;
        return 0;
      });
      return routerFiles;
    }

    // 否则尝试其他常见路径
    const possiblePaths = [
      'src/router/index.ts',
      'src/router/index.js',
      'src/router.ts',
      'src/router.js',
      'src/routes/index.ts',
      'src/routes/index.js',
      'src/routes.tsx',
      'src/routes.ts',
    ];

    for (const relativePath of possiblePaths) {
      const fullPath = path.join(this.projectRoot, relativePath);
      if (await fs.pathExists(fullPath)) {
        return [fullPath];
      }
    }

    return [];
  }

  /**
   * 递归查找文件
   */
  private async findFilesRecursive(dir: string, pattern: RegExp): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        const subResults = await this.findFilesRecursive(fullPath, pattern);
        results.push(...subResults);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * 检测路由框架
   */
  private async detectFramework(routerFile: string): Promise<'vue-router' | 'react-router' | 'unknown'> {
    const content = await fs.readFile(routerFile, 'utf-8');

    if (content.includes('vue-router') || content.includes('createRouter') || content.includes('VueRouter')) {
      return 'vue-router';
    }

    if (content.includes('react-router') || content.includes('BrowserRouter') || content.includes('Routes')) {
      return 'react-router';
    }

    // 检查 package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['vue-router']) return 'vue-router';
      if (deps['react-router'] || deps['react-router-dom']) return 'react-router';
    }

    return 'unknown';
  }

  /**
   * 解析路由配置
   */
  private async parseRouterConfig(routerFile: string): Promise<RouteConfig[]> {
    let project;
    try {
      project = createTsProject(this.projectRoot);
    } catch {
      project = createTsProjectWithoutConfig(this.projectRoot);
    }

    project.addSourceFileAtPath(routerFile);
    const sourceFile = project.getSourceFileOrThrow(routerFile);

    if (this.framework === 'vue-router') {
      return this.parseVueRouterConfig(sourceFile);
    } else if (this.framework === 'react-router') {
      return this.parseReactRouterConfig(sourceFile);
    }

    return [];
  }

  /**
   * 解析 Vue Router 配置
   */
  private parseVueRouterConfig(sourceFile: SourceFile): RouteConfig[] {
    const routes: RouteConfig[] = [];

    // 1. 查找直接的 routes 数组变量
    sourceFile.forEachDescendant(node => {
      if (Node.isVariableDeclaration(node)) {
        const name = node.getName();
        if (name === 'routes' || name === 'routerConfig') {
          const initializer = node.getInitializer();
          if (Node.isArrayLiteralExpression(initializer)) {
            for (const element of initializer.getElements()) {
              const route = this.parseRouteObject(element);
              if (route) {
                routes.push(route);
              }
            }
          }
        }
      }

      // 2. 查找 createRouter 中的 routes
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();
        if (Node.isIdentifier(expression) && expression.getText() === 'createRouter') {
          const args = node.getArguments();
          if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
            const routesProp = args[0].getProperty('routes');
            if (routesProp && Node.isPropertyAssignment(routesProp)) {
              const initializer = routesProp.getInitializer();
              if (Node.isArrayLiteralExpression(initializer)) {
                for (const element of initializer.getElements()) {
                  const route = this.parseRouteObject(element);
                  if (route) {
                    routes.push(route);
                  }
                }
              }
            }
          }
        }
      }
    });

    // 3. 如果没找到，尝试解析函数返回的路由数组（如 getRoutes() 或 export default () => []）
    if (routes.length === 0) {
      const parsedFromFunctions = this.parseRoutesFromFunctions(sourceFile);
      routes.push(...parsedFromFunctions);
    }

    return routes;
  }

  /**
   * 从函数中解析路由配置
   * 支持：
   * - const getRoutes = () => [...]
   * - function getRoutes() { return [...] }
   * - export default () => [...]
   * - export default function() { return [...] }
   */
  private parseRoutesFromFunctions(sourceFile: SourceFile): RouteConfig[] {
    const routes: RouteConfig[] = [];

    sourceFile.forEachDescendant(node => {
      // 箭头函数: const getRoutes = () => [...]
      if (Node.isArrowFunction(node)) {
        const body = node.getBody();
        if (Node.isArrayLiteralExpression(body)) {
          for (const element of body.getElements()) {
            const route = this.parseRouteObject(element);
            if (route) routes.push(route);
          }
        }
      }

      // 函数声明或函数表达式中的 return 语句
      if (Node.isReturnStatement(node)) {
        const expr = node.getExpression();
        if (Node.isArrayLiteralExpression(expr)) {
          for (const element of expr.getElements()) {
            const route = this.parseRouteObject(element);
            if (route) routes.push(route);
          }
        }
      }
    });

    return routes;
  }

  /**
   * 解析 React Router 配置
   */
  private parseReactRouterConfig(sourceFile: SourceFile): RouteConfig[] {
    const routes: RouteConfig[] = [];

    sourceFile.forEachDescendant(node => {
      // 查找 <Route> JSX 元素
      if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
        const tagName = Node.isJsxElement(node)
          ? node.getOpeningElement().getTagNameNode().getText()
          : node.getTagNameNode().getText();

        if (tagName === 'Route') {
          const route = this.parseReactRouteElement(node);
          if (route) {
            routes.push(route);
          }
        }
      }

      // 查找 createBrowserRouter 配置
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();
        const funcName = Node.isIdentifier(expression) ? expression.getText() : '';

        if (funcName === 'createBrowserRouter' || funcName === 'createHashRouter') {
          const args = node.getArguments();
          if (args.length > 0 && Node.isArrayLiteralExpression(args[0])) {
            for (const element of args[0].getElements()) {
              const route = this.parseRouteObject(element);
              if (route) {
                routes.push(route);
              }
            }
          }
        }
      }
    });

    return routes;
  }

  /**
   * 解析路由对象
   */
  private parseRouteObject(node: any): RouteConfig | null {
    if (!Node.isObjectLiteralExpression(node)) {
      return null;
    }

    const route: RouteConfig = {
      path: '',
      component: '',
      componentPath: '',
    };

    for (const prop of node.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;

      const propName = prop.getName();
      const initializer = prop.getInitializer();

      switch (propName) {
        case 'path':
          route.path = this.getStringValue(initializer);
          break;

        case 'name':
          route.name = this.getStringValue(initializer);
          break;

        case 'component':
          const componentInfo = this.parseComponentValue(initializer);
          route.component = componentInfo.name;
          route.componentPath = componentInfo.path;
          break;

        case 'redirect':
          route.redirect = this.getStringValue(initializer);
          break;

        case 'meta':
          route.meta = this.parseMetaObject(initializer);
          break;

        case 'children':
          if (Node.isArrayLiteralExpression(initializer)) {
            route.children = [];
            for (const child of initializer.getElements()) {
              const childRoute = this.parseRouteObject(child);
              if (childRoute) {
                route.children.push(childRoute);
              }
            }
          }
          break;

        case 'element':
          // React Router v6 使用 element
          const elementInfo = this.parseComponentValue(initializer);
          route.component = elementInfo.name;
          route.componentPath = elementInfo.path;
          break;
      }
    }

    return route.path ? route : null;
  }

  /**
   * 解析 React Route JSX 元素
   */
  private parseReactRouteElement(node: any): RouteConfig | null {
    const attributes = Node.isJsxElement(node)
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();

    const route: RouteConfig = {
      path: '',
      component: '',
      componentPath: '',
    };

    for (const attr of attributes) {
      if (!Node.isJsxAttribute(attr)) continue;

      const name = attr.getNameNode().getText();
      const initializer = attr.getInitializer();

      switch (name) {
        case 'path':
          route.path = this.getStringValue(initializer);
          break;

        case 'element':
        case 'component':
          if (Node.isJsxExpression(initializer)) {
            const expr = initializer.getExpression();
            if (expr) {
              const componentInfo = this.parseComponentValue(expr);
              route.component = componentInfo.name;
              route.componentPath = componentInfo.path;
            }
          }
          break;
      }
    }

    // 处理子路由
    if (Node.isJsxElement(node)) {
      const children = node.getJsxChildren();
      route.children = [];

      for (const child of children) {
        if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
          const tagName = Node.isJsxElement(child)
            ? child.getOpeningElement().getTagNameNode().getText()
            : child.getTagNameNode().getText();

          if (tagName === 'Route') {
            const childRoute = this.parseReactRouteElement(child);
            if (childRoute) {
              route.children.push(childRoute);
            }
          }
        }
      }
    }

    return route.path ? route : null;
  }

  /**
   * 解析组件值
   */
  private parseComponentValue(node: any): { name: string; path: string } {
    if (!node) return { name: '', path: '' };

    // 箭头函数懒加载: () => import('./pages/Home')
    if (Node.isArrowFunction(node)) {
      const body = node.getBody();
      if (Node.isCallExpression(body)) {
        const expr = body.getExpression();
        if (Node.isIdentifier(expr) && expr.getText() === 'import') {
          const args = body.getArguments();
          if (args.length > 0) {
            const importPath = this.getStringValue(args[0]);
            return {
              name: this.extractComponentName(importPath),
              path: importPath,
            };
          }
        }
      }
    }

    // 直接引用: Home
    if (Node.isIdentifier(node)) {
      return { name: node.getText(), path: '' };
    }

    // JSX 元素: <Home />
    if (Node.isJsxSelfClosingElement(node)) {
      const name = node.getTagNameNode().getText();
      return { name, path: '' };
    }

    // JSX 表达式: {<Home />}
    if (Node.isJsxExpression(node)) {
      const expr = node.getExpression();
      if (expr) {
        return this.parseComponentValue(expr);
      }
    }

    return { name: node.getText?.() || '', path: '' };
  }

  /**
   * 解析 meta 对象
   */
  private parseMetaObject(node: any): Record<string, any> {
    const meta: Record<string, any> = {};

    if (Node.isObjectLiteralExpression(node)) {
      for (const prop of node.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
          const name = prop.getName();
          const value = prop.getInitializer();
          meta[name] = this.getNodeValue(value);
        }
      }
    }

    return meta;
  }

  /**
   * 获取字符串值
   */
  private getStringValue(node: any): string {
    if (!node) return '';

    if (Node.isStringLiteral(node)) {
      return node.getLiteralValue();
    }

    if (Node.isNoSubstitutionTemplateLiteral(node)) {
      return node.getLiteralValue();
    }

    return node.getText?.()?.replace(/['"]/g, '') || '';
  }

  /**
   * 获取节点值
   */
  private getNodeValue(node: any): any {
    if (!node) return undefined;

    if (Node.isStringLiteral(node)) return node.getLiteralValue();
    if (Node.isNumericLiteral(node)) return Number(node.getLiteralValue());
    if (Node.isTrueLiteral(node)) return true;
    if (Node.isFalseLiteral(node)) return false;

    return node.getText?.();
  }

  /**
   * 从路径提取组件名
   */
  private extractComponentName(importPath: string): string {
    const parts = importPath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName
      .replace(/\.(tsx?|jsx?|vue)$/, '')
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, c => c.toUpperCase());
  }

  /**
   * 扁平化路由树
   */
  private flattenRoutes(routes: RouteConfig[], parentPath = '', depth = 0): FlatRoute[] {
    const flatRoutes: FlatRoute[] = [];

    for (const route of routes) {
      const fullPath = this.joinPaths(parentPath, route.path);

      flatRoutes.push({
        fullPath,
        name: route.name,
        component: route.component,
        componentPath: route.componentPath,
        depth,
        parent: parentPath || undefined,
        meta: route.meta,
      });

      if (route.children && route.children.length > 0) {
        const childRoutes = this.flattenRoutes(route.children, fullPath, depth + 1);
        flatRoutes.push(...childRoutes);
      }
    }

    return flatRoutes;
  }

  /**
   * 拼接路径
   */
  private joinPaths(parent: string, child: string): string {
    if (child.startsWith('/')) return child;
    if (!parent) return '/' + child;
    return parent.endsWith('/') ? parent + child : parent + '/' + child;
  }

  /**
   * 分析页面组件
   */
  private async analyzePageComponents(flatRoutes: FlatRoute[]): Promise<PageComponent[]> {
    const pageComponents: PageComponent[] = [];

    let project;
    try {
      project = createTsProject(this.projectRoot);
    } catch {
      project = createTsProjectWithoutConfig(this.projectRoot);
    }

    for (const route of flatRoutes) {
      if (!route.componentPath) continue;

      // 解析组件路径
      const componentPath = this.resolveComponentPath(route.componentPath);
      if (!componentPath || !await fs.pathExists(componentPath)) continue;

      try {
        project.addSourceFileAtPath(componentPath);
        const sourceFile = project.getSourceFileOrThrow(componentPath);

        const interactiveElements = this.findInteractiveElements(sourceFile);
        const existingTestIds = this.findExistingTestIds(sourceFile);
        const suggestedTestIds = this.generateTestIdSuggestions(
          route.component,
          interactiveElements
        );

        pageComponents.push({
          name: route.component,
          path: path.relative(this.projectRoot, componentPath),
          route: route.fullPath,
          type: this.classifyComponentType(route, componentPath),
          interactiveElements,
          existingTestIds,
          suggestedTestIds,
        });

      } catch (error) {
        Logger.debug(`无法分析组件: ${componentPath}`);
      }
    }

    return pageComponents;
  }

  /**
   * 解析组件路径
   */
  private resolveComponentPath(importPath: string): string | null {
    // 处理相对路径
    let resolved = importPath;

    if (resolved.startsWith('./') || resolved.startsWith('../')) {
      resolved = path.join(this.projectRoot, 'src', resolved);
    } else if (resolved.startsWith('@/')) {
      resolved = path.join(this.projectRoot, 'src', resolved.slice(2));
    } else if (!path.isAbsolute(resolved)) {
      resolved = path.join(this.projectRoot, 'src', resolved);
    }

    // 尝试不同扩展名
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '.vue', '/index.tsx', '/index.ts', '/index.vue'];

    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // 尝试原始路径
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    return null;
  }

  /**
   * 查找交互元素
   */
  private findInteractiveElements(sourceFile: SourceFile): InteractiveElementInfo[] {
    const elements: InteractiveElementInfo[] = [];
    const interactiveTags = new Set([
      'button', 'input', 'select', 'textarea', 'a', 'form',
      'Button', 'Input', 'Select', 'Checkbox', 'Radio', 'Switch',
      'BkButton', 'BkInput', 'BkSelect', 'BkTable', 'BkDialog',
      'Table', 'Modal', 'Drawer', 'Dropdown', 'Menu',
    ]);

    sourceFile.forEachDescendant(node => {
      if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
        const tagName = Node.isJsxElement(node)
          ? node.getOpeningElement().getTagNameNode().getText()
          : node.getTagNameNode().getText();

        if (interactiveTags.has(tagName)) {
          const testId = this.getTestIdFromElement(node);
          const context = this.getElementContext(node);

          elements.push({
            tagName,
            type: this.mapTagToElementType(tagName),
            lineNumber: node.getStartLineNumber(),
            hasTestId: !!testId,
            existingTestId: testId,
            context,
          });
        }
      }
    });

    return elements;
  }

  /**
   * 获取元素的 test-id
   */
  private getTestIdFromElement(node: any): string | undefined {
    const attributes = Node.isJsxElement(node)
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();

    for (const attr of attributes) {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        if (name === 'data-testid' || name === 'data-test') {
          const init = attr.getInitializer();
          if (init) {
            return this.getStringValue(init);
          }
        }
      }
    }

    return undefined;
  }

  /**
   * 获取元素上下文
   */
  private getElementContext(node: any): string {
    const attributes = Node.isJsxElement(node)
      ? node.getOpeningElement().getAttributes()
      : node.getAttributes();

    for (const attr of attributes) {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        if (['aria-label', 'title', 'placeholder', 'name'].includes(name)) {
          const init = attr.getInitializer();
          if (init) {
            return this.getStringValue(init);
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
          if (text) return text;
        }
      }
    }

    return '';
  }

  /**
   * 映射标签到元素类型
   */
  private mapTagToElementType(tagName: string): InteractiveElementInfo['type'] {
    const lower = tagName.toLowerCase();

    if (lower.includes('button') || lower.includes('btn')) return 'button';
    if (lower.includes('input') || lower.includes('text')) return 'input';
    if (lower.includes('select') || lower.includes('dropdown')) return 'select';
    if (lower.includes('table')) return 'table';
    if (lower.includes('modal') || lower.includes('dialog') || lower.includes('drawer')) return 'modal';
    if (lower === 'a' || lower.includes('link')) return 'link';
    if (lower === 'form') return 'form';

    return 'other';
  }

  /**
   * 查找已存在的 test-id
   */
  private findExistingTestIds(sourceFile: SourceFile): string[] {
    const testIds: string[] = [];

    sourceFile.forEachDescendant(node => {
      if (Node.isJsxAttribute(node)) {
        const name = node.getNameNode().getText();
        if (name === 'data-testid' || name === 'data-test') {
          const init = node.getInitializer();
          if (init) {
            const value = this.getStringValue(init);
            if (value) testIds.push(value);
          }
        }
      }
    });

    return testIds;
  }

  /**
   * 生成 test-id 建议
   */
  private generateTestIdSuggestions(
    componentName: string,
    elements: InteractiveElementInfo[]
  ): TestIdSuggestion[] {
    const suggestions: TestIdSuggestion[] = [];
    const kebabName = this.toKebabCase(componentName);

    const typeCounters: Record<string, number> = {};

    for (const element of elements) {
      if (element.hasTestId) continue;

      const typeKey = element.type;
      typeCounters[typeKey] = (typeCounters[typeKey] || 0) + 1;

      let suggestedId: string;
      if (element.context) {
        const contextKebab = this.toKebabCase(element.context.slice(0, 20));
        suggestedId = `${kebabName}-${typeKey}-${contextKebab}`;
      } else {
        suggestedId = `${kebabName}-${typeKey}-${typeCounters[typeKey]}`;
      }

      suggestions.push({
        element: element.tagName,
        lineNumber: element.lineNumber,
        suggestedId,
        reason: element.context
          ? `基于上下文 "${element.context}"`
          : `第 ${typeCounters[typeKey]} 个 ${typeKey} 元素`,
      });
    }

    return suggestions;
  }

  /**
   * 分类组件类型
   */
  private classifyComponentType(route: FlatRoute, componentPath: string): PageComponent['type'] {
    const lower = componentPath.toLowerCase();

    if (lower.includes('/layout')) return 'layout';
    if (lower.includes('/container')) return 'container';
    if (lower.includes('/widget') || lower.includes('/common')) return 'widget';

    return 'page';
  }

  /**
   * 提取 layout 组件
   */
  private extractLayoutComponents(routes: RouteConfig[]): string[] {
    const layouts: string[] = [];

    const traverse = (route: RouteConfig) => {
      if (route.component && route.component.toLowerCase().includes('layout')) {
        layouts.push(route.component);
      }
      if (route.children) {
        route.children.forEach(traverse);
      }
    };

    routes.forEach(traverse);
    return [...new Set(layouts)];
  }

  /**
   * 提取路由守卫
   */
  private async extractGuards(routerFile: string): Promise<GuardInfo[]> {
    const guards: GuardInfo[] = [];
    const content = await fs.readFile(routerFile, 'utf-8');

    const guardPatterns = [
      { pattern: /router\.beforeEach/g, type: 'beforeEach' as const },
      { pattern: /beforeEnter/g, type: 'beforeEnter' as const },
      { pattern: /beforeRouteEnter/g, type: 'beforeRouteEnter' as const },
      { pattern: /beforeRouteLeave/g, type: 'beforeRouteLeave' as const },
    ];

    for (const { pattern, type } of guardPatterns) {
      if (pattern.test(content)) {
        guards.push({
          name: type,
          type,
          filePath: routerFile,
        });
      }
    }

    return guards;
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(): RouterAnalysisResult {
    return {
      framework: 'unknown',
      routerFilePath: '',
      routes: [],
      flatRoutes: [],
      pageComponents: [],
      layoutComponents: [],
      guards: [],
    };
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
 * 导出分析函数
 */
export async function analyzeRouter(projectRoot?: string): Promise<RouterAnalysisResult> {
  const root = projectRoot || process.cwd();
  const analyzer = new RouterAnalyzer(root);
  return await analyzer.analyze();
}
