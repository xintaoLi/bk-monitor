import path from 'path';
import fs from 'fs-extra';
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { Logger } from '../utils/log.js';
import { GitAnalyzer } from '../utils/git.js';
import { createTsProject, createTsProjectWithoutConfig } from './project.js';
import { buildDependencyGraph, DependencyGraph } from './dependencyGraph.js';
import { findAffectedFiles } from './affected.js';
import {
  ChangeDetailAnalyzer,
  DetailedChangeAnalysis,
  ChangeDetail,
  CodeEntity,
} from './change-detail-analyzer.js';

/**
 * 影响预测结果
 */
export interface ImpactPrediction {
  /** 分析时间 */
  timestamp: string;
  /** Git 信息 */
  gitInfo: {
    branch: string;
    commitHash: string;
    baseRef: string;
  };
  /** 变更文件列表 */
  changedFiles: ChangedFileInfo[];
  /** 影响范围预测 */
  impactScope: ImpactScope;
  /** 受影响的模块 */
  affectedModules: AffectedModule[];
  /** 受影响的组件 */
  affectedComponents: AffectedComponentInfo[];
  /** 风险评估 */
  riskAssessment: RiskAssessment;
  /** 测试建议 */
  testSuggestions: TestSuggestion[];
  /** 排查建议 */
  investigationSuggestions: InvestigationSuggestion[];
}

/**
 * 变更文件信息
 */
export interface ChangedFileInfo {
  /** 文件路径 */
  path: string;
  /** 相对路径 */
  relativePath: string;
  /** 变更状态 */
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  /** 文件类型 */
  fileType: FileType;
  /** 模块分类 */
  moduleCategory: string;
  /** 变更统计 */
  stats: {
    additions: number;
    deletions: number;
  };
  /** 受影响的实体 */
  affectedEntities: CodeEntity[];
  /** 导出的符号 */
  exportedSymbols: ExportedSymbol[];
  /** 依赖此文件的文件数 */
  dependentCount: number;
  /** 影响权重 */
  impactWeight: number;
}

/**
 * 文件类型
 */
export type FileType = 'component' | 'page' | 'util' | 'hook' | 'store' | 'api' | 'config' | 'type' | 'style' | 'test' | 'other';

/**
 * 导出的符号
 */
export interface ExportedSymbol {
  name: string;
  type: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'component' | 'hook' | 'constant';
  isDefault: boolean;
  usageCount: number;
  usedBy: string[];
}

/**
 * 影响范围
 */
export interface ImpactScope {
  /** 直接影响的文件数 */
  directImpact: number;
  /** 间接影响的文件数 */
  indirectImpact: number;
  /** 传递影响的文件数 */
  transitiveImpact: number;
  /** 总影响文件数 */
  totalImpact: number;
  /** 影响深度 */
  maxDepth: number;
  /** 范围等级 */
  level: 'minimal' | 'small' | 'medium' | 'large' | 'critical';
  /** 范围描述 */
  description: string;
}

/**
 * 受影响的模块
 */
export interface AffectedModule {
  /** 模块名称 */
  name: string;
  /** 模块路径 */
  path: string;
  /** 影响类型 */
  impactType: 'direct' | 'indirect' | 'transitive';
  /** 影响深度 */
  depth: number;
  /** 受影响的文件 */
  affectedFiles: string[];
  /** 受影响的导出 */
  affectedExports: string[];
  /** 关联的路由 */
  relatedRoutes: string[];
  /** 风险等级 */
  riskLevel: 'high' | 'medium' | 'low';
}

/**
 * 受影响的组件信息
 */
export interface AffectedComponentInfo {
  /** 组件名称 */
  name: string;
  /** 组件路径 */
  path: string;
  /** 影响类型 */
  impactType: 'direct' | 'indirect' | 'transitive';
  /** 影响深度 */
  depth: number;
  /** 组件类型 */
  componentType: 'page' | 'layout' | 'component' | 'widget';
  /** 关联的路由 */
  route?: string;
  /** 影响原因 */
  impactReason: string;
  /** 关联的变更文件 */
  relatedChanges: string[];
  /** 可用的 test-id */
  testIds: string[];
  /** 建议的测试类型 */
  suggestedTestTypes: ('smoke' | 'functional' | 'regression' | 'visual')[];
}

/**
 * 风险评估
 */
export interface RiskAssessment {
  /** 总体风险等级 */
  overallRisk: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  /** 风险分数 (0-100) */
  riskScore: number;
  /** 风险因素 */
  riskFactors: RiskFactor[];
  /** 缓解建议 */
  mitigations: string[];
}

/**
 * 风险因素
 */
export interface RiskFactor {
  /** 因素名称 */
  name: string;
  /** 因素描述 */
  description: string;
  /** 权重 */
  weight: number;
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * 测试建议
 */
export interface TestSuggestion {
  /** 建议 ID */
  id: string;
  /** 测试类型 */
  type: 'smoke' | 'functional' | 'regression' | 'integration' | 'visual' | 'performance';
  /** 优先级 */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** 目标路由/组件 */
  target: string;
  /** 描述 */
  description: string;
  /** 测试步骤 */
  steps: string[];
  /** 预期结果 */
  expectedResults: string[];
  /** 关联的变更 */
  relatedChanges: string[];
}

/**
 * 排查建议
 */
export interface InvestigationSuggestion {
  /** 建议 ID */
  id: string;
  /** 排查类型 */
  type: 'code-review' | 'dependency-check' | 'api-compatibility' | 'state-management' | 'side-effect';
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 目标 */
  target: string;
  /** 描述 */
  description: string;
  /** 排查要点 */
  checkpoints: string[];
  /** 潜在问题 */
  potentialIssues: string[];
}

/**
 * 变更影响预测器
 *
 * 功能：
 * 1. 分析变更文件，预测影响范围
 * 2. 识别受影响的模块和组件
 * 3. 评估风险等级
 * 4. 生成测试和排查建议
 */
export class ImpactPredictor {
  private projectRoot: string;
  private gitAnalyzer: GitAnalyzer;
  private project: Project | null = null;
  private dependencyGraph: DependencyGraph | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.gitAnalyzer = new GitAnalyzer(projectRoot);
  }

  /**
   * 预测变更影响
   */
  async predict(options?: {
    baseRef?: string;
    includeTransitive?: boolean;
    maxDepth?: number;
  }): Promise<ImpactPrediction> {
    Logger.header('变更影响预测');

    const baseRef = options?.baseRef || 'HEAD~1';
    const includeTransitive = options?.includeTransitive ?? true;
    const maxDepth = options?.maxDepth ?? 5;

    // 1. 获取 Git 信息
    Logger.step(1, 7, '获取 Git 信息...');
    const gitInfo = await this.getGitInfo(baseRef);

    // 2. 获取详细变更分析
    Logger.step(2, 7, '分析变更详情...');
    const detailAnalyzer = new ChangeDetailAnalyzer(this.projectRoot);
    const detailedAnalysis = await detailAnalyzer.analyze(baseRef);

    if (detailedAnalysis.changes.length === 0) {
      Logger.warn('未检测到变更文件');
      return this.createEmptyPrediction(gitInfo);
    }

    Logger.info(`检测到 ${detailedAnalysis.changes.length} 个变更文件`);

    // 3. 初始化 TypeScript 项目和依赖图
    Logger.step(3, 7, '构建依赖图...');
    await this.initProject();
    await this.buildDependencyGraph();

    // 4. 分析变更文件的影响权重
    Logger.step(4, 7, '计算影响权重...');
    const changedFiles = await this.analyzeChangedFiles(detailedAnalysis.changes);

    // 5. 预测影响范围
    Logger.step(5, 7, '预测影响范围...');
    const impactScope = await this.predictImpactScope(changedFiles, includeTransitive, maxDepth);
    const affectedModules = await this.identifyAffectedModules(changedFiles, impactScope);
    const affectedComponents = await this.identifyAffectedComponents(changedFiles, affectedModules);

    // 6. 风险评估
    Logger.step(6, 7, '评估风险...');
    const riskAssessment = this.assessRisk(changedFiles, impactScope, affectedModules);

    // 7. 生成建议
    Logger.step(7, 7, '生成建议...');
    const testSuggestions = this.generateTestSuggestions(changedFiles, affectedComponents, riskAssessment);
    const investigationSuggestions = this.generateInvestigationSuggestions(changedFiles, affectedModules);

    Logger.success('影响预测完成！');

    return {
      timestamp: new Date().toISOString(),
      gitInfo,
      changedFiles,
      impactScope,
      affectedModules,
      affectedComponents,
      riskAssessment,
      testSuggestions,
      investigationSuggestions,
    };
  }

  /**
   * 获取 Git 信息
   */
  private async getGitInfo(baseRef: string): Promise<ImpactPrediction['gitInfo']> {
    const branch = await this.gitAnalyzer.getCurrentBranch();
    const commitHash = await this.gitAnalyzer.getCommitHash();

    return {
      branch,
      commitHash: commitHash.slice(0, 7),
      baseRef,
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
      Logger.debug(`初始化 TypeScript 项目失败: ${error}`);
      this.project = createTsProjectWithoutConfig(this.projectRoot);
    }
  }

  /**
   * 构建依赖图
   */
  private async buildDependencyGraph(): Promise<void> {
    if (!this.project) return;

    const sourceFiles = this.project.getSourceFiles();
    this.dependencyGraph = buildDependencyGraph(sourceFiles);
    Logger.info(`依赖图包含 ${this.dependencyGraph.dependencies.size} 个节点`);
  }

  /**
   * 分析变更文件
   */
  private async analyzeChangedFiles(changes: ChangeDetail[]): Promise<ChangedFileInfo[]> {
    const result: ChangedFileInfo[] = [];

    for (const change of changes) {
      // 获取导出的符号
      const exportedSymbols = await this.extractExportedSymbols(change.filePath);

      // 计算依赖此文件的文件数
      const dependentCount = this.countDependents(change.filePath);

      // 计算影响权重
      const impactWeight = this.calculateImpactWeight(change, exportedSymbols, dependentCount);

      result.push({
        path: change.filePath,
        relativePath: change.relativePath,
        status: change.status,
        fileType: change.fileType as FileType,
        moduleCategory: change.moduleCategory,
        stats: change.stats,
        affectedEntities: change.affectedEntities,
        exportedSymbols,
        dependentCount,
        impactWeight,
      });
    }

    // 按影响权重排序
    return result.sort((a, b) => b.impactWeight - a.impactWeight);
  }

  /**
   * 提取导出的符号
   */
  private async extractExportedSymbols(filePath: string): Promise<ExportedSymbol[]> {
    const symbols: ExportedSymbol[] = [];

    if (!this.project) return symbols;

    try {
      let sourceFile = this.project.getSourceFile(filePath);
      if (!sourceFile && await fs.pathExists(filePath)) {
        sourceFile = this.project.addSourceFileAtPath(filePath);
      }
      if (!sourceFile) return symbols;

      // 提取导出声明
      const exportDeclarations = sourceFile.getExportDeclarations();
      for (const exp of exportDeclarations) {
        for (const namedExport of exp.getNamedExports()) {
          const usedBy = this.findSymbolUsage(filePath, namedExport.getName());
          symbols.push({
            name: namedExport.getName(),
            type: 'variable',
            isDefault: false,
            usageCount: usedBy.length,
            usedBy,
          });
        }
      }

      // 提取导出的函数
      for (const func of sourceFile.getFunctions()) {
        if (func.isExported()) {
          const name = func.getName() || 'default';
          const usedBy = this.findSymbolUsage(filePath, name);
          symbols.push({
            name,
            type: name.startsWith('use') ? 'hook' : 'function',
            isDefault: func.isDefaultExport(),
            usageCount: usedBy.length,
            usedBy,
          });
        }
      }

      // 提取导出的类
      for (const cls of sourceFile.getClasses()) {
        if (cls.isExported()) {
          const name = cls.getName() || 'default';
          const usedBy = this.findSymbolUsage(filePath, name);
          symbols.push({
            name,
            type: 'class',
            isDefault: cls.isDefaultExport(),
            usageCount: usedBy.length,
            usedBy,
          });
        }
      }

      // 提取导出的变量
      for (const varDecl of sourceFile.getVariableDeclarations()) {
        const statement = varDecl.getVariableStatement();
        if (statement?.isExported()) {
          const name = varDecl.getName();
          const usedBy = this.findSymbolUsage(filePath, name);
          const initializer = varDecl.getInitializer()?.getText() || '';

          let type: ExportedSymbol['type'] = 'variable';
          if (initializer.includes('defineComponent') || initializer.includes('React.')) {
            type = 'component';
          } else if (name.startsWith('use')) {
            type = 'hook';
          } else if (name === name.toUpperCase()) {
            type = 'constant';
          }

          symbols.push({
            name,
            type,
            isDefault: false,
            usageCount: usedBy.length,
            usedBy,
          });
        }
      }

      // 提取导出的接口和类型
      for (const iface of sourceFile.getInterfaces()) {
        if (iface.isExported()) {
          const name = iface.getName();
          const usedBy = this.findSymbolUsage(filePath, name);
          symbols.push({
            name,
            type: 'interface',
            isDefault: false,
            usageCount: usedBy.length,
            usedBy,
          });
        }
      }

      for (const typeAlias of sourceFile.getTypeAliases()) {
        if (typeAlias.isExported()) {
          const name = typeAlias.getName();
          const usedBy = this.findSymbolUsage(filePath, name);
          symbols.push({
            name,
            type: 'type',
            isDefault: false,
            usageCount: usedBy.length,
            usedBy,
          });
        }
      }

    } catch (error) {
      Logger.debug(`提取导出符号失败: ${filePath} - ${error}`);
    }

    return symbols;
  }

  /**
   * 查找符号使用
   */
  private findSymbolUsage(filePath: string, symbolName: string): string[] {
    const usedBy: string[] = [];

    if (!this.dependencyGraph) return usedBy;

    const dependents = this.dependencyGraph.reverseDependencies.get(filePath);
    if (!dependents) return usedBy;

    // 检查每个依赖文件是否使用了该符号
    for (const dependent of dependents) {
      if (this.project) {
        const sourceFile = this.project.getSourceFile(dependent);
        if (sourceFile) {
          const text = sourceFile.getText();
          if (text.includes(symbolName)) {
            usedBy.push(path.relative(this.projectRoot, dependent));
          }
        }
      }
    }

    return usedBy;
  }

  /**
   * 计算依赖此文件的文件数
   */
  private countDependents(filePath: string): number {
    if (!this.dependencyGraph) return 0;

    const dependents = this.dependencyGraph.reverseDependencies.get(filePath);
    return dependents ? dependents.size : 0;
  }

  /**
   * 计算影响权重
   */
  private calculateImpactWeight(
    change: ChangeDetail,
    exportedSymbols: ExportedSymbol[],
    dependentCount: number
  ): number {
    let weight = 0;

    // 基于文件类型的权重
    const fileTypeWeights: Record<string, number> = {
      api: 30,
      store: 25,
      hook: 20,
      util: 15,
      component: 10,
      page: 10,
      config: 20,
      type: 5,
      style: 3,
      test: 0,
      other: 5,
    };
    weight += fileTypeWeights[change.fileType] || 5;

    // 基于导出符号使用量的权重
    const totalUsage = exportedSymbols.reduce((sum, s) => sum + s.usageCount, 0);
    weight += Math.min(totalUsage * 2, 30);

    // 基于依赖数量的权重
    weight += Math.min(dependentCount * 3, 20);

    // 基于变更行数的权重
    const changeLines = change.stats.additions + change.stats.deletions;
    weight += Math.min(changeLines / 10, 10);

    // 基于受影响实体类型的权重
    for (const entity of change.affectedEntities) {
      if (entity.isExported) {
        weight += 5;
      }
      if (entity.type === 'function' || entity.type === 'hook') {
        weight += 3;
      }
      if (entity.type === 'component') {
        weight += 4;
      }
    }

    return Math.min(weight, 100);
  }

  /**
   * 预测影响范围
   */
  private async predictImpactScope(
    changedFiles: ChangedFileInfo[],
    includeTransitive: boolean,
    maxDepth: number
  ): Promise<ImpactScope> {
    const changedPaths = changedFiles.map(f => f.path);
    const directImpact = changedFiles.length;

    let indirectImpact = 0;
    let transitiveImpact = 0;
    let currentMaxDepth = 0;

    if (this.dependencyGraph) {
      // 计算直接依赖
      const directDependents = new Set<string>();
      for (const filePath of changedPaths) {
        const dependents = this.dependencyGraph.reverseDependencies.get(filePath);
        if (dependents) {
          for (const dep of dependents) {
            if (!changedPaths.includes(dep)) {
              directDependents.add(dep);
            }
          }
        }
      }
      indirectImpact = directDependents.size;

      // 计算传递依赖
      if (includeTransitive) {
        const allAffected = findAffectedFiles(this.dependencyGraph, changedPaths);
        transitiveImpact = allAffected.length - directImpact - indirectImpact;
        if (transitiveImpact < 0) transitiveImpact = 0;

        // 计算最大深度
        currentMaxDepth = this.calculateMaxDepth(changedPaths, maxDepth);
      }
    }

    const totalImpact = directImpact + indirectImpact + transitiveImpact;

    // 确定影响等级
    let level: ImpactScope['level'];
    let description: string;

    if (totalImpact <= 3) {
      level = 'minimal';
      description = '影响范围极小，仅涉及少量文件';
    } else if (totalImpact <= 10) {
      level = 'small';
      description = '影响范围较小，建议进行针对性测试';
    } else if (totalImpact <= 30) {
      level = 'medium';
      description = '影响范围中等，建议进行模块级测试';
    } else if (totalImpact <= 50) {
      level = 'large';
      description = '影响范围较大，建议进行全面回归测试';
    } else {
      level = 'critical';
      description = '影响范围很大，建议进行全量测试并重点关注核心流程';
    }

    return {
      directImpact,
      indirectImpact,
      transitiveImpact,
      totalImpact,
      maxDepth: currentMaxDepth,
      level,
      description,
    };
  }

  /**
   * 计算最大影响深度
   */
  private calculateMaxDepth(changedPaths: string[], maxDepth: number): number {
    if (!this.dependencyGraph) return 0;

    let currentDepth = 0;
    let currentLevel = new Set(changedPaths);
    const visited = new Set(changedPaths);

    while (currentLevel.size > 0 && currentDepth < maxDepth) {
      const nextLevel = new Set<string>();

      for (const filePath of currentLevel) {
        const dependents = this.dependencyGraph.reverseDependencies.get(filePath);
        if (dependents) {
          for (const dep of dependents) {
            if (!visited.has(dep)) {
              visited.add(dep);
              nextLevel.add(dep);
            }
          }
        }
      }

      if (nextLevel.size > 0) {
        currentDepth++;
        currentLevel = nextLevel;
      } else {
        break;
      }
    }

    return currentDepth;
  }

  /**
   * 识别受影响的模块
   */
  private async identifyAffectedModules(
    changedFiles: ChangedFileInfo[],
    impactScope: ImpactScope
  ): Promise<AffectedModule[]> {
    const moduleMap = new Map<string, AffectedModule>();

    // 从变更文件中提取模块
    for (const file of changedFiles) {
      const moduleName = file.moduleCategory;
      const modulePath = this.getModulePath(file.relativePath);

      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, {
          name: moduleName,
          path: modulePath,
          impactType: 'direct',
          depth: 0,
          affectedFiles: [],
          affectedExports: [],
          relatedRoutes: [],
          riskLevel: 'medium',
        });
      }

      const module = moduleMap.get(moduleName)!;
      module.affectedFiles.push(file.relativePath);
      module.affectedExports.push(...file.exportedSymbols.map(s => s.name));

      // 推断路由
      const route = this.inferRouteFromPath(file.relativePath);
      if (route && !module.relatedRoutes.includes(route)) {
        module.relatedRoutes.push(route);
      }
    }

    // 从间接影响中提取模块
    if (this.dependencyGraph) {
      const changedPaths = changedFiles.map(f => f.path);
      const allAffected = findAffectedFiles(this.dependencyGraph, changedPaths);

      for (const filePath of allAffected) {
        if (changedPaths.includes(filePath)) continue;

        const relativePath = path.relative(this.projectRoot, filePath);
        const moduleName = this.inferModuleCategory(relativePath);
        const modulePath = this.getModulePath(relativePath);

        if (!moduleMap.has(moduleName)) {
          moduleMap.set(moduleName, {
            name: moduleName,
            path: modulePath,
            impactType: 'indirect',
            depth: 1,
            affectedFiles: [],
            affectedExports: [],
            relatedRoutes: [],
            riskLevel: 'low',
          });
        }

        const module = moduleMap.get(moduleName)!;
        if (!module.affectedFiles.includes(relativePath)) {
          module.affectedFiles.push(relativePath);
        }
      }
    }

    // 计算风险等级
    for (const module of moduleMap.values()) {
      if (module.impactType === 'direct' && module.affectedFiles.length > 3) {
        module.riskLevel = 'high';
      } else if (module.affectedExports.length > 5) {
        module.riskLevel = 'high';
      } else if (module.impactType === 'direct') {
        module.riskLevel = 'medium';
      }
    }

    return Array.from(moduleMap.values()).sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });
  }

  /**
   * 识别受影响的组件
   */
  private async identifyAffectedComponents(
    changedFiles: ChangedFileInfo[],
    affectedModules: AffectedModule[]
  ): Promise<AffectedComponentInfo[]> {
    const components: AffectedComponentInfo[] = [];

    for (const file of changedFiles) {
      if (file.fileType === 'component' || file.fileType === 'page') {
        const componentName = this.extractComponentName(file.relativePath);
        const componentType = file.fileType === 'page' ? 'page' : 'component';
        const route = this.inferRouteFromPath(file.relativePath);

        components.push({
          name: componentName,
          path: file.relativePath,
          impactType: 'direct',
          depth: 0,
          componentType,
          route,
          impactReason: `组件文件直接变更`,
          relatedChanges: [file.relativePath],
          testIds: this.extractTestIds(file),
          suggestedTestTypes: this.suggestTestTypes(file, 'direct'),
        });
      }
    }

    // 从模块中提取间接影响的组件
    for (const module of affectedModules) {
      if (module.impactType !== 'direct') {
        for (const filePath of module.affectedFiles) {
          if (this.isComponentFile(filePath)) {
            const componentName = this.extractComponentName(filePath);
            const route = this.inferRouteFromPath(filePath);

            if (!components.find(c => c.path === filePath)) {
              components.push({
                name: componentName,
                path: filePath,
                impactType: module.impactType,
                depth: module.depth,
                componentType: 'component',
                route,
                impactReason: `依赖的模块 ${module.name} 发生变更`,
                relatedChanges: module.affectedFiles.filter(f => changedFiles.some(cf => cf.relativePath === f)),
                testIds: [],
                suggestedTestTypes: this.suggestTestTypes(null, module.impactType),
              });
            }
          }
        }
      }
    }

    return components.sort((a, b) => a.depth - b.depth);
  }

  /**
   * 评估风险
   */
  private assessRisk(
    changedFiles: ChangedFileInfo[],
    impactScope: ImpactScope,
    affectedModules: AffectedModule[]
  ): RiskAssessment {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;

    // 因素1: 影响范围
    if (impactScope.level === 'critical') {
      riskFactors.push({
        name: '大范围影响',
        description: `变更影响 ${impactScope.totalImpact} 个文件，覆盖范围很广`,
        weight: 30,
        severity: 'critical',
      });
      riskScore += 30;
    } else if (impactScope.level === 'large') {
      riskFactors.push({
        name: '较大范围影响',
        description: `变更影响 ${impactScope.totalImpact} 个文件`,
        weight: 20,
        severity: 'high',
      });
      riskScore += 20;
    }

    // 因素2: 核心模块变更
    const coreModules = ['api', 'store', 'utils', 'hooks', 'common'];
    const changedCoreModules = changedFiles.filter(f =>
      coreModules.some(m => f.moduleCategory.toLowerCase().includes(m))
    );
    if (changedCoreModules.length > 0) {
      riskFactors.push({
        name: '核心模块变更',
        description: `涉及 ${changedCoreModules.length} 个核心模块的变更`,
        weight: 25,
        severity: 'high',
      });
      riskScore += 25;
    }

    // 因素3: 高使用率导出变更
    const highUsageExports = changedFiles.flatMap(f =>
      f.exportedSymbols.filter(s => s.usageCount > 5)
    );
    if (highUsageExports.length > 0) {
      riskFactors.push({
        name: '高使用率导出变更',
        description: `${highUsageExports.length} 个高使用率的导出符号被修改`,
        weight: 20,
        severity: 'high',
      });
      riskScore += 20;
    }

    // 因素4: API 接口变更
    const apiChanges = changedFiles.filter(f => f.fileType === 'api');
    if (apiChanges.length > 0) {
      riskFactors.push({
        name: 'API 接口变更',
        description: `${apiChanges.length} 个 API 文件被修改`,
        weight: 15,
        severity: 'medium',
      });
      riskScore += 15;
    }

    // 因素5: 状态管理变更
    const storeChanges = changedFiles.filter(f => f.fileType === 'store');
    if (storeChanges.length > 0) {
      riskFactors.push({
        name: '状态管理变更',
        description: `${storeChanges.length} 个状态管理文件被修改`,
        weight: 15,
        severity: 'medium',
      });
      riskScore += 15;
    }

    // 确定总体风险等级
    let overallRisk: RiskAssessment['overallRisk'];
    if (riskScore >= 70) {
      overallRisk = 'critical';
    } else if (riskScore >= 50) {
      overallRisk = 'high';
    } else if (riskScore >= 30) {
      overallRisk = 'medium';
    } else if (riskScore >= 10) {
      overallRisk = 'low';
    } else {
      overallRisk = 'minimal';
    }

    // 生成缓解建议
    const mitigations: string[] = [];
    if (overallRisk === 'critical' || overallRisk === 'high') {
      mitigations.push('建议进行全面的回归测试');
      mitigations.push('建议进行代码审查，重点关注变更的核心模块');
    }
    if (highUsageExports.length > 0) {
      mitigations.push('检查所有使用变更导出的文件，确保兼容性');
    }
    if (apiChanges.length > 0) {
      mitigations.push('验证 API 接口的请求和响应格式');
    }
    if (storeChanges.length > 0) {
      mitigations.push('检查状态变更对 UI 的影响');
    }

    return {
      overallRisk,
      riskScore: Math.min(riskScore, 100),
      riskFactors,
      mitigations,
    };
  }

  /**
   * 生成测试建议
   */
  private generateTestSuggestions(
    changedFiles: ChangedFileInfo[],
    affectedComponents: AffectedComponentInfo[],
    riskAssessment: RiskAssessment
  ): TestSuggestion[] {
    const suggestions: TestSuggestion[] = [];
    let suggestionId = 1;

    // 为每个直接影响的组件生成测试建议
    for (const component of affectedComponents.filter(c => c.impactType === 'direct')) {
      // 冒烟测试
      suggestions.push({
        id: `test-${suggestionId++}`,
        type: 'smoke',
        priority: 'critical',
        target: component.route || component.path,
        description: `${component.name} 组件冒烟测试`,
        steps: [
          `导航到 ${component.route || '/'}`,
          '等待页面加载完成',
          '检查控制台无错误',
          '验证关键元素可见',
        ],
        expectedResults: [
          '页面正常加载',
          '无 JavaScript 错误',
          '核心功能可用',
        ],
        relatedChanges: component.relatedChanges,
      });

      // 功能测试
      if (component.testIds.length > 0) {
        suggestions.push({
          id: `test-${suggestionId++}`,
          type: 'functional',
          priority: 'high',
          target: component.route || component.path,
          description: `${component.name} 组件功能测试`,
          steps: [
            `导航到 ${component.route || '/'}`,
            ...component.testIds.slice(0, 5).map(id => `测试元素 [data-testid="${id}"]`),
          ],
          expectedResults: [
            '所有交互元素响应正常',
            '数据展示正确',
          ],
          relatedChanges: component.relatedChanges,
        });
      }
    }

    // 根据风险等级添加额外测试
    if (riskAssessment.overallRisk === 'critical' || riskAssessment.overallRisk === 'high') {
      suggestions.push({
        id: `test-${suggestionId++}`,
        type: 'regression',
        priority: 'high',
        target: '全局',
        description: '全面回归测试',
        steps: [
          '执行所有核心流程测试',
          '验证主要用户路径',
          '检查关键业务功能',
        ],
        expectedResults: [
          '所有核心功能正常',
          '无回归问题',
        ],
        relatedChanges: changedFiles.map(f => f.relativePath),
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 生成排查建议
   */
  private generateInvestigationSuggestions(
    changedFiles: ChangedFileInfo[],
    affectedModules: AffectedModule[]
  ): InvestigationSuggestion[] {
    const suggestions: InvestigationSuggestion[] = [];
    let suggestionId = 1;

    // 代码审查建议
    for (const file of changedFiles.filter(f => f.impactWeight > 50)) {
      suggestions.push({
        id: `inv-${suggestionId++}`,
        type: 'code-review',
        priority: 'high',
        target: file.relativePath,
        description: `重点审查高影响文件 ${file.relativePath}`,
        checkpoints: [
          '检查函数签名是否变更',
          '验证导出接口的兼容性',
          '确认边界条件处理',
          '检查错误处理逻辑',
        ],
        potentialIssues: [
          '可能影响依赖此文件的 ' + file.dependentCount + ' 个文件',
          '导出的 ' + file.exportedSymbols.length + ' 个符号可能需要检查',
        ],
      });
    }

    // 依赖检查建议
    const highUsageFiles = changedFiles.filter(f =>
      f.exportedSymbols.some(s => s.usageCount > 3)
    );
    if (highUsageFiles.length > 0) {
      suggestions.push({
        id: `inv-${suggestionId++}`,
        type: 'dependency-check',
        priority: 'high',
        target: '依赖关系',
        description: '检查高使用率导出的兼容性',
        checkpoints: highUsageFiles.flatMap(f =>
          f.exportedSymbols
            .filter(s => s.usageCount > 3)
            .map(s => `检查 ${s.name} 的 ${s.usageCount} 处使用`)
        ),
        potentialIssues: [
          '接口变更可能导致调用方报错',
          '类型变更可能导致编译失败',
        ],
      });
    }

    // API 兼容性检查
    const apiFiles = changedFiles.filter(f => f.fileType === 'api');
    if (apiFiles.length > 0) {
      suggestions.push({
        id: `inv-${suggestionId++}`,
        type: 'api-compatibility',
        priority: 'high',
        target: 'API 接口',
        description: '验证 API 接口兼容性',
        checkpoints: [
          '检查请求参数格式',
          '验证响应数据结构',
          '确认错误码处理',
          '检查超时和重试逻辑',
        ],
        potentialIssues: apiFiles.map(f => `${f.relativePath} 的 API 变更可能影响前端调用`),
      });
    }

    // 状态管理检查
    const storeFiles = changedFiles.filter(f => f.fileType === 'store');
    if (storeFiles.length > 0) {
      suggestions.push({
        id: `inv-${suggestionId++}`,
        type: 'state-management',
        priority: 'medium',
        target: '状态管理',
        description: '检查状态变更的影响',
        checkpoints: [
          '验证状态初始值',
          '检查状态更新逻辑',
          '确认订阅者正确响应',
          '检查异步状态处理',
        ],
        potentialIssues: storeFiles.map(f => `${f.relativePath} 的状态变更可能影响 UI 展示`),
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // ============ 辅助方法 ============

  private getModulePath(relativePath: string): string {
    const parts = relativePath.split(/[\/\\]/);
    const srcIndex = parts.findIndex(p => p === 'src');
    if (srcIndex >= 0 && parts.length > srcIndex + 1) {
      return parts.slice(0, srcIndex + 2).join('/');
    }
    return parts.slice(0, 2).join('/');
  }

  private inferModuleCategory(relativePath: string): string {
    const parts = relativePath.split(/[\/\\]/);
    const srcIndex = parts.findIndex(p => p === 'src');
    if (srcIndex >= 0 && parts.length > srcIndex + 1) {
      return parts[srcIndex + 1];
    }
    return parts[0] || 'root';
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

  private extractComponentName(filePath: string): string {
    const basename = path.basename(filePath, path.extname(filePath));
    return basename
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, c => c.toUpperCase())
      .replace(/\.(component|page|view|container)$/i, '');
  }

  private isComponentFile(filePath: string): boolean {
    return /\/(components?|pages?|views?|widgets?)\//i.test(filePath);
  }

  private extractTestIds(file: ChangedFileInfo): string[] {
    const testIds: string[] = [];
    for (const entity of file.affectedEntities) {
      if (entity.type === 'component' || entity.type === 'function') {
        testIds.push(`test-${entity.name.toLowerCase()}`);
      }
    }
    return testIds;
  }

  private suggestTestTypes(
    file: ChangedFileInfo | null,
    impactType: 'direct' | 'indirect' | 'transitive'
  ): ('smoke' | 'functional' | 'regression' | 'visual')[] {
    const types: ('smoke' | 'functional' | 'regression' | 'visual')[] = ['smoke'];

    if (impactType === 'direct') {
      types.push('functional');
      if (file?.fileType === 'component' || file?.fileType === 'page') {
        types.push('visual');
      }
    }

    if (impactType === 'indirect') {
      types.push('regression');
    }

    return types;
  }

  private createEmptyPrediction(gitInfo: ImpactPrediction['gitInfo']): ImpactPrediction {
    return {
      timestamp: new Date().toISOString(),
      gitInfo,
      changedFiles: [],
      impactScope: {
        directImpact: 0,
        indirectImpact: 0,
        transitiveImpact: 0,
        totalImpact: 0,
        maxDepth: 0,
        level: 'minimal',
        description: '未检测到变更',
      },
      affectedModules: [],
      affectedComponents: [],
      riskAssessment: {
        overallRisk: 'minimal',
        riskScore: 0,
        riskFactors: [],
        mitigations: [],
      },
      testSuggestions: [],
      investigationSuggestions: [],
    };
  }
}

/**
 * 导出预测函数
 */
export async function predictImpact(
  projectRoot?: string,
  options?: {
    baseRef?: string;
    includeTransitive?: boolean;
    maxDepth?: number;
  }
): Promise<ImpactPrediction> {
  const root = projectRoot || process.cwd();
  const predictor = new ImpactPredictor(root);
  return await predictor.predict(options);
}
