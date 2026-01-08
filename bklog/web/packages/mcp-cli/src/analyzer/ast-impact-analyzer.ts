import path from 'path';
import fs from 'fs-extra';
import { Project, SourceFile, SyntaxKind, Node, CallExpression, ImportDeclaration } from 'ts-morph';
import { Logger } from '../utils/log.js';
import { createTsProject, createTsProjectWithoutConfig } from './project.js';
import { ChangeDetail, CodeEntity } from './change-detail-analyzer.js';

/**
 * AST 深度影响分析结果
 */
export interface ASTImpactAnalysis {
  /** 分析时间 */
  timestamp: string;
  /** 变更文件分析 */
  fileAnalyses: FileASTAnalysis[];
  /** 函数调用链 */
  callChains: CallChain[];
  /** 组件依赖树 */
  componentTree: ComponentDependencyTree;
  /** 类型依赖 */
  typeDependencies: TypeDependency[];
  /** 副作用分析 */
  sideEffects: SideEffectAnalysis[];
  /** 测试路径建议 */
  testPathSuggestions: TestPathSuggestion[];
}

/**
 * 文件 AST 分析结果
 */
export interface FileASTAnalysis {
  /** 文件路径 */
  filePath: string;
  /** 相对路径 */
  relativePath: string;
  /** 变更的函数 */
  changedFunctions: FunctionAnalysis[];
  /** 变更的组件 */
  changedComponents: ComponentAnalysis[];
  /** 变更的类 */
  changedClasses: ClassAnalysis[];
  /** 变更的类型/接口 */
  changedTypes: TypeAnalysis[];
  /** 导入分析 */
  imports: ImportAnalysis[];
  /** 导出分析 */
  exports: ExportAnalysis[];
}

/**
 * 函数分析
 */
export interface FunctionAnalysis {
  /** 函数名 */
  name: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 参数 */
  parameters: ParameterInfo[];
  /** 返回类型 */
  returnType: string;
  /** 是否异步 */
  isAsync: boolean;
  /** 是否导出 */
  isExported: boolean;
  /** 调用的其他函数 */
  calls: string[];
  /** 被调用次数 */
  calledByCount: number;
  /** 调用者列表 */
  calledBy: CallerInfo[];
  /** 使用的状态/变量 */
  usedVariables: string[];
  /** 副作用类型 */
  sideEffects: SideEffectType[];
  /** 复杂度评估 */
  complexity: 'low' | 'medium' | 'high';
  /** 变更类型 */
  changeType: 'added' | 'modified' | 'deleted';
}

/**
 * 参数信息
 */
export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
}

/**
 * 调用者信息
 */
export interface CallerInfo {
  /** 调用者文件 */
  file: string;
  /** 调用者函数/组件 */
  caller: string;
  /** 调用行号 */
  line: number;
}

/**
 * 副作用类型
 */
export type SideEffectType =
  | 'dom-manipulation'
  | 'network-request'
  | 'state-mutation'
  | 'storage-access'
  | 'timer'
  | 'event-listener'
  | 'console'
  | 'external-api';

/**
 * 组件分析
 */
export interface ComponentAnalysis {
  /** 组件名 */
  name: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 组件类型 */
  type: 'functional' | 'class' | 'vue-sfc' | 'vue-composition';
  /** Props */
  props: PropInfo[];
  /** 使用的 Hooks */
  hooks: string[];
  /** 子组件 */
  childComponents: string[];
  /** 事件处理器 */
  eventHandlers: string[];
  /** 状态变量 */
  stateVariables: string[];
  /** 计算属性/Memo */
  computedProperties: string[];
  /** 是否导出 */
  isExported: boolean;
  /** 变更类型 */
  changeType: 'added' | 'modified' | 'deleted';
}

/**
 * Props 信息
 */
export interface PropInfo {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
}

/**
 * 类分析
 */
export interface ClassAnalysis {
  /** 类名 */
  name: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 父类 */
  extends?: string;
  /** 实现的接口 */
  implements: string[];
  /** 方法 */
  methods: MethodAnalysis[];
  /** 属性 */
  properties: PropertyAnalysis[];
  /** 是否导出 */
  isExported: boolean;
  /** 变更类型 */
  changeType: 'added' | 'modified' | 'deleted';
}

/**
 * 方法分析
 */
export interface MethodAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isAsync: boolean;
  parameters: ParameterInfo[];
  returnType: string;
  changeType?: 'added' | 'modified' | 'deleted';
}

/**
 * 属性分析
 */
export interface PropertyAnalysis {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isReadonly: boolean;
  changeType?: 'added' | 'modified' | 'deleted';
}

/**
 * 类型分析
 */
export interface TypeAnalysis {
  /** 类型名 */
  name: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 类型种类 */
  kind: 'interface' | 'type' | 'enum';
  /** 属性/成员 */
  members: string[];
  /** 是否导出 */
  isExported: boolean;
  /** 使用此类型的文件 */
  usedBy: string[];
  /** 变更类型 */
  changeType: 'added' | 'modified' | 'deleted';
}

/**
 * 导入分析
 */
export interface ImportAnalysis {
  /** 模块路径 */
  moduleSpecifier: string;
  /** 导入的符号 */
  imports: string[];
  /** 是否为类型导入 */
  isTypeOnly: boolean;
  /** 解析后的文件路径 */
  resolvedPath?: string;
  /** 是否为外部模块 */
  isExternal: boolean;
}

/**
 * 导出分析
 */
export interface ExportAnalysis {
  /** 导出名 */
  name: string;
  /** 导出类型 */
  type: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'enum' | 'default';
  /** 是否为重导出 */
  isReExport: boolean;
  /** 原始模块（如果是重导出） */
  originalModule?: string;
}

/**
 * 调用链
 */
export interface CallChain {
  /** 链 ID */
  id: string;
  /** 入口函数 */
  entryPoint: string;
  /** 入口文件 */
  entryFile: string;
  /** 调用路径 */
  path: CallChainNode[];
  /** 最大深度 */
  depth: number;
  /** 涉及的文件 */
  involvedFiles: string[];
  /** 是否包含变更 */
  containsChange: boolean;
  /** 风险等级 */
  riskLevel: 'high' | 'medium' | 'low';
}

/**
 * 调用链节点
 */
export interface CallChainNode {
  /** 函数名 */
  name: string;
  /** 文件路径 */
  file: string;
  /** 行号 */
  line: number;
  /** 是否为变更点 */
  isChanged: boolean;
  /** 深度 */
  depth: number;
}

/**
 * 组件依赖树
 */
export interface ComponentDependencyTree {
  /** 根组件 */
  roots: ComponentTreeNode[];
  /** 总节点数 */
  totalNodes: number;
  /** 最大深度 */
  maxDepth: number;
  /** 受影响的节点 */
  affectedNodes: string[];
}

/**
 * 组件树节点
 */
export interface ComponentTreeNode {
  /** 组件名 */
  name: string;
  /** 文件路径 */
  file: string;
  /** 是否变更 */
  isChanged: boolean;
  /** 是否受影响 */
  isAffected: boolean;
  /** 深度 */
  depth: number;
  /** 子组件 */
  children: ComponentTreeNode[];
}

/**
 * 类型依赖
 */
export interface TypeDependency {
  /** 类型名 */
  typeName: string;
  /** 定义文件 */
  definedIn: string;
  /** 使用文件 */
  usedIn: string[];
  /** 是否变更 */
  isChanged: boolean;
  /** 影响范围 */
  impactScope: number;
}

/**
 * 副作用分析
 */
export interface SideEffectAnalysis {
  /** 文件路径 */
  file: string;
  /** 函数/组件名 */
  source: string;
  /** 副作用类型 */
  type: SideEffectType;
  /** 描述 */
  description: string;
  /** 行号 */
  line: number;
  /** 风险等级 */
  riskLevel: 'high' | 'medium' | 'low';
  /** 建议 */
  suggestion: string;
}

/**
 * 测试路径建议
 */
export interface TestPathSuggestion {
  /** 建议 ID */
  id: string;
  /** 测试路径名称 */
  name: string;
  /** 优先级 */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** 入口点 */
  entryPoint: string;
  /** 路由（如果有） */
  route?: string;
  /** 涉及的组件 */
  components: string[];
  /** 涉及的函数 */
  functions: string[];
  /** 测试步骤 */
  steps: TestStep[];
  /** 验证点 */
  verifications: string[];
  /** 关联的变更 */
  relatedChanges: string[];
  /** 风险说明 */
  riskDescription: string;
}

/**
 * 测试步骤
 */
export interface TestStep {
  /** 步骤序号 */
  order: number;
  /** 操作类型 */
  action: 'navigate' | 'click' | 'input' | 'wait' | 'assert' | 'hover' | 'scroll';
  /** 目标 */
  target: string;
  /** 选择器 */
  selector?: string;
  /** 值 */
  value?: string;
  /** 描述 */
  description: string;
}

/**
 * AST 深度影响分析器
 *
 * 功能：
 * 1. 深度解析代码 AST，提取函数、组件、类等详细信息
 * 2. 构建函数调用链，追踪变更的传播路径
 * 3. 构建组件依赖树，识别受影响的 UI 层
 * 4. 分析副作用，识别潜在风险点
 * 5. 生成详细的测试路径建议
 */
export class ASTImpactAnalyzer {
  private projectRoot: string;
  private project: Project | null = null;
  private changedEntities: Map<string, CodeEntity[]> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 执行 AST 深度分析
   */
  async analyze(changes: ChangeDetail[]): Promise<ASTImpactAnalysis> {
    Logger.header('AST 深度影响分析');

    // 1. 初始化项目
    Logger.step(1, 6, '初始化 TypeScript 项目...');
    await this.initProject();

    // 2. 收集变更实体
    Logger.step(2, 6, '收集变更实体...');
    this.collectChangedEntities(changes);

    // 3. 分析每个变更文件
    Logger.step(3, 6, '分析变更文件...');
    const fileAnalyses: FileASTAnalysis[] = [];
    for (const change of changes) {
      const analysis = await this.analyzeFile(change);
      if (analysis) {
        fileAnalyses.push(analysis);
      }
    }

    // 4. 构建调用链
    Logger.step(4, 6, '构建调用链...');
    const callChains = await this.buildCallChains(fileAnalyses);

    // 5. 构建组件依赖树
    Logger.step(5, 6, '构建组件依赖树...');
    const componentTree = await this.buildComponentTree(fileAnalyses);

    // 6. 分析副作用和生成测试建议
    Logger.step(6, 6, '分析副作用并生成测试建议...');
    const typeDependencies = this.analyzeTypeDependencies(fileAnalyses);
    const sideEffects = this.analyzeSideEffects(fileAnalyses);
    const testPathSuggestions = this.generateTestPathSuggestions(
      fileAnalyses,
      callChains,
      componentTree,
      sideEffects
    );

    Logger.success('AST 深度分析完成！');

    return {
      timestamp: new Date().toISOString(),
      fileAnalyses,
      callChains,
      componentTree,
      typeDependencies,
      sideEffects,
      testPathSuggestions,
    };
  }

  /**
   * 初始化 TypeScript 项目
   */
  private async initProject(): Promise<void> {
    try {
      const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
      if (await fs.pathExists(tsconfigPath)) {
        this.project = createTsProject(this.projectRoot);
      } else {
        this.project = createTsProjectWithoutConfig(this.projectRoot);
      }
    } catch (error) {
      Logger.debug(`初始化项目失败: ${error}`);
      this.project = createTsProjectWithoutConfig(this.projectRoot);
    }
  }

  /**
   * 收集变更实体
   */
  private collectChangedEntities(changes: ChangeDetail[]): void {
    for (const change of changes) {
      this.changedEntities.set(change.filePath, change.affectedEntities);
    }
  }

  /**
   * 分析单个文件
   */
  private async analyzeFile(change: ChangeDetail): Promise<FileASTAnalysis | null> {
    if (!this.project) return null;

    try {
      let sourceFile = this.project.getSourceFile(change.filePath);
      if (!sourceFile && await fs.pathExists(change.filePath)) {
        sourceFile = this.project.addSourceFileAtPath(change.filePath);
      }
      if (!sourceFile) return null;

      const changedFunctions = this.analyzeFunctions(sourceFile, change);
      const changedComponents = this.analyzeComponents(sourceFile, change);
      const changedClasses = this.analyzeClasses(sourceFile, change);
      const changedTypes = this.analyzeTypes(sourceFile, change);
      const imports = this.analyzeImports(sourceFile);
      const exports = this.analyzeExports(sourceFile);

      return {
        filePath: change.filePath,
        relativePath: change.relativePath,
        changedFunctions,
        changedComponents,
        changedClasses,
        changedTypes,
        imports,
        exports,
      };
    } catch (error) {
      Logger.debug(`分析文件失败: ${change.filePath} - ${error}`);
      return null;
    }
  }

  /**
   * 分析函数
   */
  private analyzeFunctions(sourceFile: SourceFile, change: ChangeDetail): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    const changedEntities = change.affectedEntities.filter(
      e => e.type === 'function' || e.type === 'hook'
    );

    // 分析函数声明
    for (const func of sourceFile.getFunctions()) {
      const name = func.getName() || 'anonymous';
      const startLine = func.getStartLineNumber();
      const endLine = func.getEndLineNumber();

      // 检查是否在变更范围内
      const isChanged = changedEntities.some(
        e => e.name === name || (startLine >= e.startLine && endLine <= e.endLine)
      );

      if (!isChanged && changedEntities.length > 0) continue;

      const parameters = func.getParameters().map(p => ({
        name: p.getName(),
        type: p.getType().getText().slice(0, 50),
        isOptional: p.isOptional(),
        defaultValue: p.getInitializer()?.getText(),
      }));

      const calls = this.extractFunctionCalls(func);
      const usedVariables = this.extractUsedVariables(func);
      const sideEffects = this.detectSideEffects(func);

      functions.push({
        name,
        startLine,
        endLine,
        parameters,
        returnType: func.getReturnType().getText().slice(0, 50),
        isAsync: func.isAsync(),
        isExported: func.isExported(),
        calls,
        calledByCount: 0, // 稍后填充
        calledBy: [],
        usedVariables,
        sideEffects,
        complexity: this.estimateComplexity(func),
        changeType: isChanged ? 'modified' : 'added',
      });
    }

    // 分析箭头函数变量
    for (const varDecl of sourceFile.getVariableDeclarations()) {
      const initializer = varDecl.getInitializer();
      if (!initializer) continue;

      const initText = initializer.getText();
      if (!initText.includes('=>') && !initText.startsWith('function')) continue;

      const name = varDecl.getName();
      const startLine = varDecl.getStartLineNumber();
      const endLine = varDecl.getEndLineNumber();

      const isChanged = changedEntities.some(
        e => e.name === name || (startLine >= e.startLine && endLine <= e.endLine)
      );

      if (!isChanged && changedEntities.length > 0) continue;

      const statement = varDecl.getVariableStatement();

      functions.push({
        name,
        startLine,
        endLine,
        parameters: [],
        returnType: varDecl.getType().getText().slice(0, 50),
        isAsync: initText.includes('async'),
        isExported: statement?.isExported() ?? false,
        calls: [],
        calledByCount: 0,
        calledBy: [],
        usedVariables: [],
        sideEffects: [],
        complexity: 'low',
        changeType: isChanged ? 'modified' : 'added',
      });
    }

    return functions;
  }

  /**
   * 分析组件
   */
  private analyzeComponents(sourceFile: SourceFile, change: ChangeDetail): ComponentAnalysis[] {
    const components: ComponentAnalysis[] = [];
    const changedEntities = change.affectedEntities.filter(e => e.type === 'component');

    // 分析函数组件
    for (const func of sourceFile.getFunctions()) {
      const name = func.getName();
      if (!name || !this.isComponentName(name)) continue;

      const startLine = func.getStartLineNumber();
      const endLine = func.getEndLineNumber();

      const isChanged = changedEntities.some(
        e => e.name === name || (startLine >= e.startLine && endLine <= e.endLine)
      );

      if (!isChanged && changedEntities.length > 0) continue;

      const hooks = this.extractHooks(func);
      const childComponents = this.extractChildComponents(func);
      const eventHandlers = this.extractEventHandlers(func);

      components.push({
        name,
        startLine,
        endLine,
        type: 'functional',
        props: this.extractProps(func),
        hooks,
        childComponents,
        eventHandlers,
        stateVariables: hooks.filter(h => h.startsWith('useState')).map(h => h),
        computedProperties: hooks.filter(h => h.startsWith('useMemo') || h.startsWith('useCallback')),
        isExported: func.isExported(),
        changeType: isChanged ? 'modified' : 'added',
      });
    }

    // 分析变量声明的组件
    for (const varDecl of sourceFile.getVariableDeclarations()) {
      const name = varDecl.getName();
      if (!this.isComponentName(name)) continue;

      const initializer = varDecl.getInitializer();
      if (!initializer) continue;

      const initText = initializer.getText();
      if (!initText.includes('defineComponent') &&
          !initText.includes('React.') &&
          !initText.match(/^\s*\(\s*\)\s*=>\s*</)) {
        continue;
      }

      const startLine = varDecl.getStartLineNumber();
      const endLine = varDecl.getEndLineNumber();

      const isChanged = changedEntities.some(
        e => e.name === name || (startLine >= e.startLine && endLine <= e.endLine)
      );

      if (!isChanged && changedEntities.length > 0) continue;

      const statement = varDecl.getVariableStatement();

      components.push({
        name,
        startLine,
        endLine,
        type: initText.includes('defineComponent') ? 'vue-composition' : 'functional',
        props: [],
        hooks: [],
        childComponents: [],
        eventHandlers: [],
        stateVariables: [],
        computedProperties: [],
        isExported: statement?.isExported() ?? false,
        changeType: isChanged ? 'modified' : 'added',
      });
    }

    return components;
  }

  /**
   * 分析类
   */
  private analyzeClasses(sourceFile: SourceFile, change: ChangeDetail): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    const changedEntities = change.affectedEntities.filter(e => e.type === 'class');

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (!name) continue;

      const startLine = cls.getStartLineNumber();
      const endLine = cls.getEndLineNumber();

      const isChanged = changedEntities.some(
        e => e.name === name || (startLine >= e.startLine && endLine <= e.endLine)
      );

      if (!isChanged && changedEntities.length > 0) continue;

      const methods: MethodAnalysis[] = cls.getMethods().map(method => ({
        name: method.getName(),
        startLine: method.getStartLineNumber(),
        endLine: method.getEndLineNumber(),
        visibility: this.getVisibility(method),
        isStatic: method.isStatic(),
        isAsync: method.isAsync(),
        parameters: method.getParameters().map(p => ({
          name: p.getName(),
          type: p.getType().getText().slice(0, 50),
          isOptional: p.isOptional(),
        })),
        returnType: method.getReturnType().getText().slice(0, 50),
      }));

      const properties: PropertyAnalysis[] = cls.getProperties().map(prop => ({
        name: prop.getName(),
        type: prop.getType().getText().slice(0, 50),
        visibility: this.getVisibility(prop),
        isStatic: prop.isStatic(),
        isReadonly: prop.isReadonly(),
      }));

      classes.push({
        name,
        startLine,
        endLine,
        extends: cls.getExtends()?.getText(),
        implements: cls.getImplements().map(i => i.getText()),
        methods,
        properties,
        isExported: cls.isExported(),
        changeType: isChanged ? 'modified' : 'added',
      });
    }

    return classes;
  }

  /**
   * 分析类型
   */
  private analyzeTypes(sourceFile: SourceFile, change: ChangeDetail): TypeAnalysis[] {
    const types: TypeAnalysis[] = [];
    const changedEntities = change.affectedEntities.filter(
      e => e.type === 'interface' || e.type === 'type'
    );

    // 分析接口
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      const startLine = iface.getStartLineNumber();
      const endLine = iface.getEndLineNumber();

      const isChanged = changedEntities.some(
        e => e.name === name || (startLine >= e.startLine && endLine <= e.endLine)
      );

      if (!isChanged && changedEntities.length > 0) continue;

      types.push({
        name,
        startLine,
        endLine,
        kind: 'interface',
        members: iface.getProperties().map(p => p.getName()),
        isExported: iface.isExported(),
        usedBy: [],
        changeType: isChanged ? 'modified' : 'added',
      });
    }

    // 分析类型别名
    for (const typeAlias of sourceFile.getTypeAliases()) {
      const name = typeAlias.getName();
      const startLine = typeAlias.getStartLineNumber();
      const endLine = typeAlias.getEndLineNumber();

      const isChanged = changedEntities.some(
        e => e.name === name || (startLine >= e.startLine && endLine <= e.endLine)
      );

      if (!isChanged && changedEntities.length > 0) continue;

      types.push({
        name,
        startLine,
        endLine,
        kind: 'type',
        members: [],
        isExported: typeAlias.isExported(),
        usedBy: [],
        changeType: isChanged ? 'modified' : 'added',
      });
    }

    // 分析枚举
    for (const enumDecl of sourceFile.getEnums()) {
      const name = enumDecl.getName();
      const startLine = enumDecl.getStartLineNumber();
      const endLine = enumDecl.getEndLineNumber();

      const isChanged = changedEntities.some(
        e => e.name === name || (startLine >= e.startLine && endLine <= e.endLine)
      );

      if (!isChanged && changedEntities.length > 0) continue;

      types.push({
        name,
        startLine,
        endLine,
        kind: 'enum',
        members: enumDecl.getMembers().map(m => m.getName()),
        isExported: enumDecl.isExported(),
        usedBy: [],
        changeType: isChanged ? 'modified' : 'added',
      });
    }

    return types;
  }

  /**
   * 分析导入
   */
  private analyzeImports(sourceFile: SourceFile): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];

    for (const imp of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      const namedImports = imp.getNamedImports().map(n => n.getName());
      const defaultImport = imp.getDefaultImport()?.getText();
      const namespaceImport = imp.getNamespaceImport()?.getText();

      const allImports = [
        ...(defaultImport ? [defaultImport] : []),
        ...(namespaceImport ? [namespaceImport] : []),
        ...namedImports,
      ];

      const resolved = imp.getModuleSpecifierSourceFile();
      const isExternal = !moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('@/');

      imports.push({
        moduleSpecifier,
        imports: allImports,
        isTypeOnly: imp.isTypeOnly(),
        resolvedPath: resolved?.getFilePath(),
        isExternal,
      });
    }

    return imports;
  }

  /**
   * 分析导出
   */
  private analyzeExports(sourceFile: SourceFile): ExportAnalysis[] {
    const exports: ExportAnalysis[] = [];

    // 导出声明
    for (const exp of sourceFile.getExportDeclarations()) {
      for (const namedExport of exp.getNamedExports()) {
        exports.push({
          name: namedExport.getName(),
          type: 'variable',
          isReExport: !!exp.getModuleSpecifierValue(),
          originalModule: exp.getModuleSpecifierValue(),
        });
      }
    }

    // 导出的函数
    for (const func of sourceFile.getFunctions()) {
      if (func.isExported()) {
        exports.push({
          name: func.getName() || 'default',
          type: 'function',
          isReExport: false,
        });
      }
    }

    // 导出的类
    for (const cls of sourceFile.getClasses()) {
      if (cls.isExported()) {
        exports.push({
          name: cls.getName() || 'default',
          type: 'class',
          isReExport: false,
        });
      }
    }

    // 导出的接口和类型
    for (const iface of sourceFile.getInterfaces()) {
      if (iface.isExported()) {
        exports.push({
          name: iface.getName(),
          type: 'interface',
          isReExport: false,
        });
      }
    }

    for (const typeAlias of sourceFile.getTypeAliases()) {
      if (typeAlias.isExported()) {
        exports.push({
          name: typeAlias.getName(),
          type: 'type',
          isReExport: false,
        });
      }
    }

    return exports;
  }

  /**
   * 构建调用链
   */
  private async buildCallChains(fileAnalyses: FileASTAnalysis[]): Promise<CallChain[]> {
    const chains: CallChain[] = [];
    let chainId = 1;

    // 收集所有变更的函数
    const changedFunctions = new Map<string, { file: string; func: FunctionAnalysis }>();
    for (const analysis of fileAnalyses) {
      for (const func of analysis.changedFunctions) {
        changedFunctions.set(func.name, { file: analysis.relativePath, func });
      }
    }

    // 为每个变更的函数构建调用链
    for (const [funcName, { file, func }] of changedFunctions) {
      const path: CallChainNode[] = [{
        name: funcName,
        file,
        line: func.startLine,
        isChanged: true,
        depth: 0,
      }];

      // 追踪调用者（向上）
      const callers = this.findCallers(funcName, fileAnalyses);
      for (const caller of callers) {
        path.push({
          name: caller.caller,
          file: caller.file,
          line: caller.line,
          isChanged: changedFunctions.has(caller.caller),
          depth: 1,
        });
      }

      // 追踪被调用者（向下）
      for (const callee of func.calls) {
        const calleeInfo = this.findFunction(callee, fileAnalyses);
        if (calleeInfo) {
          path.push({
            name: callee,
            file: calleeInfo.file,
            line: calleeInfo.func.startLine,
            isChanged: changedFunctions.has(callee),
            depth: 1,
          });
        }
      }

      const involvedFiles = [...new Set(path.map(n => n.file))];
      const containsChange = path.some(n => n.isChanged);

      chains.push({
        id: `chain-${chainId++}`,
        entryPoint: funcName,
        entryFile: file,
        path,
        depth: Math.max(...path.map(n => n.depth)),
        involvedFiles,
        containsChange,
        riskLevel: containsChange && involvedFiles.length > 2 ? 'high' : 'medium',
      });
    }

    return chains;
  }

  /**
   * 构建组件依赖树
   */
  private async buildComponentTree(fileAnalyses: FileASTAnalysis[]): Promise<ComponentDependencyTree> {
    const roots: ComponentTreeNode[] = [];
    const allNodes = new Map<string, ComponentTreeNode>();
    const affectedNodes: string[] = [];

    // 收集所有组件
    for (const analysis of fileAnalyses) {
      for (const component of analysis.changedComponents) {
        const node: ComponentTreeNode = {
          name: component.name,
          file: analysis.relativePath,
          isChanged: component.changeType !== 'added',
          isAffected: true,
          depth: 0,
          children: [],
        };
        allNodes.set(component.name, node);
        affectedNodes.push(component.name);
      }
    }

    // 构建父子关系
    for (const analysis of fileAnalyses) {
      for (const component of analysis.changedComponents) {
        const parentNode = allNodes.get(component.name);
        if (!parentNode) continue;

        for (const childName of component.childComponents) {
          let childNode = allNodes.get(childName);
          if (!childNode) {
            childNode = {
              name: childName,
              file: '',
              isChanged: false,
              isAffected: true,
              depth: parentNode.depth + 1,
              children: [],
            };
            allNodes.set(childName, childNode);
            affectedNodes.push(childName);
          }
          parentNode.children.push(childNode);
        }
      }
    }

    // 找出根节点（没有被其他组件引用的组件）
    const referencedComponents = new Set<string>();
    for (const analysis of fileAnalyses) {
      for (const component of analysis.changedComponents) {
        for (const child of component.childComponents) {
          referencedComponents.add(child);
        }
      }
    }

    for (const [name, node] of allNodes) {
      if (!referencedComponents.has(name)) {
        roots.push(node);
      }
    }

    // 计算最大深度
    const calculateMaxDepth = (node: ComponentTreeNode): number => {
      if (node.children.length === 0) return node.depth;
      return Math.max(...node.children.map(calculateMaxDepth));
    };

    const maxDepth = roots.length > 0 ? Math.max(...roots.map(calculateMaxDepth)) : 0;

    return {
      roots,
      totalNodes: allNodes.size,
      maxDepth,
      affectedNodes,
    };
  }

  /**
   * 分析类型依赖
   */
  private analyzeTypeDependencies(fileAnalyses: FileASTAnalysis[]): TypeDependency[] {
    const dependencies: TypeDependency[] = [];

    for (const analysis of fileAnalyses) {
      for (const type of analysis.changedTypes) {
        dependencies.push({
          typeName: type.name,
          definedIn: analysis.relativePath,
          usedIn: type.usedBy,
          isChanged: true,
          impactScope: type.usedBy.length,
        });
      }
    }

    return dependencies;
  }

  /**
   * 分析副作用
   */
  private analyzeSideEffects(fileAnalyses: FileASTAnalysis[]): SideEffectAnalysis[] {
    const effects: SideEffectAnalysis[] = [];

    for (const analysis of fileAnalyses) {
      for (const func of analysis.changedFunctions) {
        for (const effect of func.sideEffects) {
          effects.push({
            file: analysis.relativePath,
            source: func.name,
            type: effect,
            description: this.getSideEffectDescription(effect),
            line: func.startLine,
            riskLevel: this.getSideEffectRiskLevel(effect),
            suggestion: this.getSideEffectSuggestion(effect),
          });
        }
      }
    }

    return effects;
  }

  /**
   * 生成测试路径建议
   */
  private generateTestPathSuggestions(
    fileAnalyses: FileASTAnalysis[],
    callChains: CallChain[],
    componentTree: ComponentDependencyTree,
    sideEffects: SideEffectAnalysis[]
  ): TestPathSuggestion[] {
    const suggestions: TestPathSuggestion[] = [];
    let suggestionId = 1;

    // 基于组件生成测试路径
    for (const analysis of fileAnalyses) {
      for (const component of analysis.changedComponents) {
        const route = this.inferRouteFromPath(analysis.relativePath);
        const relatedFunctions = analysis.changedFunctions.map(f => f.name);
        const relatedSideEffects = sideEffects.filter(e => e.file === analysis.relativePath);

        const steps: TestStep[] = [];
        let stepOrder = 1;

        // 导航步骤
        if (route) {
          steps.push({
            order: stepOrder++,
            action: 'navigate',
            target: route,
            description: `导航到 ${route}`,
          });
        }

        // 等待组件加载
        steps.push({
          order: stepOrder++,
          action: 'wait',
          target: component.name,
          selector: `[data-testid="${component.name.toLowerCase()}"]`,
          description: `等待 ${component.name} 组件加载`,
        });

        // 测试事件处理器
        for (const handler of component.eventHandlers.slice(0, 3)) {
          steps.push({
            order: stepOrder++,
            action: 'click',
            target: handler,
            selector: `[data-testid="${handler.toLowerCase()}"]`,
            description: `触发 ${handler} 事件`,
          });
        }

        // 验证点
        const verifications: string[] = [
          '组件正常渲染',
          '无控制台错误',
        ];

        if (relatedSideEffects.length > 0) {
          verifications.push('副作用正常执行');
        }

        const priority = this.determinePriority(component, relatedSideEffects);

        suggestions.push({
          id: `test-path-${suggestionId++}`,
          name: `${component.name} 组件测试`,
          priority,
          entryPoint: component.name,
          route,
          components: [component.name, ...component.childComponents],
          functions: relatedFunctions,
          steps,
          verifications,
          relatedChanges: [analysis.relativePath],
          riskDescription: this.generateRiskDescription(component, relatedSideEffects),
        });
      }
    }

    // 基于调用链生成测试路径
    for (const chain of callChains.filter(c => c.riskLevel === 'high')) {
      suggestions.push({
        id: `test-path-${suggestionId++}`,
        name: `${chain.entryPoint} 调用链测试`,
        priority: 'high',
        entryPoint: chain.entryPoint,
        components: [],
        functions: chain.path.map(n => n.name),
        steps: [{
          order: 1,
          action: 'assert',
          target: chain.entryPoint,
          description: `验证 ${chain.entryPoint} 函数调用链`,
        }],
        verifications: [
          '函数调用正常',
          '返回值正确',
          '无异常抛出',
        ],
        relatedChanges: chain.involvedFiles,
        riskDescription: `调用链涉及 ${chain.involvedFiles.length} 个文件，深度 ${chain.depth}`,
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // ============ 辅助方法 ============

  private extractFunctionCalls(node: Node): string[] {
    const calls: string[] = [];
    node.forEachDescendant(child => {
      if (child.getKind() === SyntaxKind.CallExpression) {
        const callExpr = child as CallExpression;
        const expr = callExpr.getExpression();
        const text = expr.getText();
        // 提取函数名
        const match = text.match(/^(\w+)/);
        if (match) {
          calls.push(match[1]);
        }
      }
    });
    return [...new Set(calls)];
  }

  private extractUsedVariables(node: Node): string[] {
    const variables: string[] = [];
    node.forEachDescendant(child => {
      if (child.getKind() === SyntaxKind.Identifier) {
        variables.push(child.getText());
      }
    });
    return [...new Set(variables)].slice(0, 20);
  }

  private detectSideEffects(node: Node): SideEffectType[] {
    const effects: SideEffectType[] = [];
    const text = node.getText();

    if (text.includes('fetch(') || text.includes('axios') || text.includes('request')) {
      effects.push('network-request');
    }
    if (text.includes('document.') || text.includes('getElementById') || text.includes('querySelector')) {
      effects.push('dom-manipulation');
    }
    if (text.includes('localStorage') || text.includes('sessionStorage') || text.includes('cookie')) {
      effects.push('storage-access');
    }
    if (text.includes('setTimeout') || text.includes('setInterval')) {
      effects.push('timer');
    }
    if (text.includes('addEventListener') || text.includes('removeEventListener')) {
      effects.push('event-listener');
    }
    if (text.includes('console.')) {
      effects.push('console');
    }
    if (text.includes('setState') || text.includes('dispatch') || text.includes('commit')) {
      effects.push('state-mutation');
    }

    return effects;
  }

  private estimateComplexity(node: Node): 'low' | 'medium' | 'high' {
    const text = node.getText();
    const lines = text.split('\n').length;
    const conditions = (text.match(/if\s*\(|else\s*{|\?\s*:/g) || []).length;
    const loops = (text.match(/for\s*\(|while\s*\(|\.forEach|\.map|\.filter/g) || []).length;

    const score = lines / 10 + conditions * 2 + loops * 3;

    if (score > 10) return 'high';
    if (score > 5) return 'medium';
    return 'low';
  }

  private isComponentName(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  private extractHooks(node: Node): string[] {
    const hooks: string[] = [];
    const text = node.getText();
    const hookMatches = text.match(/use[A-Z][a-zA-Z]*/g);
    if (hookMatches) {
      hooks.push(...hookMatches);
    }
    return [...new Set(hooks)];
  }

  private extractChildComponents(node: Node): string[] {
    const components: string[] = [];
    const text = node.getText();
    const componentMatches = text.match(/<([A-Z][a-zA-Z0-9]*)/g);
    if (componentMatches) {
      components.push(...componentMatches.map(m => m.slice(1)));
    }
    return [...new Set(components)];
  }

  private extractEventHandlers(node: Node): string[] {
    const handlers: string[] = [];
    const text = node.getText();
    const handlerMatches = text.match(/on[A-Z][a-zA-Z]*\s*=/g);
    if (handlerMatches) {
      handlers.push(...handlerMatches.map(m => m.replace(/\s*=/, '')));
    }
    return [...new Set(handlers)];
  }

  private extractProps(func: Node): PropInfo[] {
    // 简化实现
    return [];
  }

  private getVisibility(node: any): 'public' | 'private' | 'protected' {
    if (node.hasModifier?.(SyntaxKind.PrivateKeyword)) return 'private';
    if (node.hasModifier?.(SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private findCallers(funcName: string, fileAnalyses: FileASTAnalysis[]): CallerInfo[] {
    const callers: CallerInfo[] = [];
    for (const analysis of fileAnalyses) {
      for (const func of analysis.changedFunctions) {
        if (func.calls.includes(funcName)) {
          callers.push({
            file: analysis.relativePath,
            caller: func.name,
            line: func.startLine,
          });
        }
      }
    }
    return callers;
  }

  private findFunction(
    funcName: string,
    fileAnalyses: FileASTAnalysis[]
  ): { file: string; func: FunctionAnalysis } | null {
    for (const analysis of fileAnalyses) {
      const func = analysis.changedFunctions.find(f => f.name === funcName);
      if (func) {
        return { file: analysis.relativePath, func };
      }
    }
    return null;
  }

  private inferRouteFromPath(relativePath: string): string | undefined {
    if (relativePath.includes('/pages/') || relativePath.includes('/views/')) {
      const routePart = relativePath.split(/\/(pages|views)\//)[2];
      if (routePart) {
        return '/' + routePart
          .replace(/\.(tsx?|jsx?|vue)$/, '')
          .replace(/\/index$/, '')
          .replace(/\\/g, '/');
      }
    }
    return undefined;
  }

  private getSideEffectDescription(effect: SideEffectType): string {
    const descriptions: Record<SideEffectType, string> = {
      'dom-manipulation': '直接操作 DOM 元素',
      'network-request': '发起网络请求',
      'state-mutation': '修改应用状态',
      'storage-access': '访问本地存储',
      'timer': '使用定时器',
      'event-listener': '添加/移除事件监听',
      'console': '控制台输出',
      'external-api': '调用外部 API',
    };
    return descriptions[effect];
  }

  private getSideEffectRiskLevel(effect: SideEffectType): 'high' | 'medium' | 'low' {
    const riskLevels: Record<SideEffectType, 'high' | 'medium' | 'low'> = {
      'network-request': 'high',
      'state-mutation': 'high',
      'dom-manipulation': 'medium',
      'storage-access': 'medium',
      'timer': 'medium',
      'event-listener': 'medium',
      'external-api': 'high',
      'console': 'low',
    };
    return riskLevels[effect];
  }

  private getSideEffectSuggestion(effect: SideEffectType): string {
    const suggestions: Record<SideEffectType, string> = {
      'dom-manipulation': '验证 DOM 操作的正确性和兼容性',
      'network-request': '检查请求参数和响应处理',
      'state-mutation': '验证状态变更对 UI 的影响',
      'storage-access': '确认存储数据的格式和清理逻辑',
      'timer': '检查定时器的清理和边界条件',
      'event-listener': '确保事件监听器正确移除',
      'console': '生产环境应移除调试日志',
      'external-api': '验证外部 API 的可用性和错误处理',
    };
    return suggestions[effect];
  }

  private determinePriority(
    component: ComponentAnalysis,
    sideEffects: SideEffectAnalysis[]
  ): 'critical' | 'high' | 'medium' | 'low' {
    const hasHighRiskEffect = sideEffects.some(e => e.riskLevel === 'high');
    const hasMultipleChildren = component.childComponents.length > 3;
    const hasMultipleHandlers = component.eventHandlers.length > 3;

    if (hasHighRiskEffect && hasMultipleChildren) return 'critical';
    if (hasHighRiskEffect || hasMultipleChildren) return 'high';
    if (hasMultipleHandlers) return 'medium';
    return 'low';
  }

  private generateRiskDescription(
    component: ComponentAnalysis,
    sideEffects: SideEffectAnalysis[]
  ): string {
    const parts: string[] = [];

    if (sideEffects.length > 0) {
      parts.push(`包含 ${sideEffects.length} 个副作用`);
    }
    if (component.childComponents.length > 0) {
      parts.push(`影响 ${component.childComponents.length} 个子组件`);
    }
    if (component.hooks.length > 0) {
      parts.push(`使用 ${component.hooks.length} 个 Hooks`);
    }

    return parts.join('，') || '低风险变更';
  }
}

/**
 * 导出分析函数
 */
export async function analyzeASTImpact(
  changes: ChangeDetail[],
  projectRoot?: string
): Promise<ASTImpactAnalysis> {
  const root = projectRoot || process.cwd();
  const analyzer = new ASTImpactAnalyzer(root);
  return await analyzer.analyze(changes);
}
