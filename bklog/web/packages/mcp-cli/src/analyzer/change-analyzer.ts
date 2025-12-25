import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { GitAnalyzer } from '../utils/git.js';
import { createTsProject, createTsProjectWithoutConfig } from './project.js';
import { buildDependencyGraph, DependencyGraph } from './dependencyGraph.js';
import { findAffectedFiles } from './affected.js';
import { RouterAnalysisResult, FlatRoute, PageComponent } from './router-analyzer.js';

/**
 * 变更文件信息
 */
export interface ChangedFile {
  path: string;
  relativePath: string;
  status: 'added' | 'modified' | 'deleted';
}

/**
 * 变更影响分析结果
 */
export interface ChangeImpactResult {
  /** 变更文件列表 */
  changedFiles: ChangedFile[];
  /** 受影响的文件列表 */
  affectedFiles: string[];
  /** 受影响的路由列表 */
  affectedRoutes: AffectedRoute[];
  /** 影响范围 */
  impactScope: 'small' | 'large';
  /** 风险等级 */
  riskLevel: 'high' | 'medium' | 'low';
  /** Git 信息 */
  gitInfo: {
    branch: string;
    commitHash: string;
    baseRef: string;
  };
  /** 分析时间 */
  analyzedAt: string;
}

/**
 * 受影响的路由
 */
export interface AffectedRoute {
  /** 路由路径 */
  route: string;
  /** 路由名称 */
  name: string;
  /** 组件名称 */
  component: string;
  /** 组件路径 */
  componentPath: string;
  /** 影响类型 */
  impactType: 'direct' | 'indirect';
  /** 影响原因 */
  reason: string;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 关联的变更文件 */
  relatedChanges: string[];
  /** 可用的 test-id */
  testIds: string[];
}

/**
 * 变更分析器
 */
export class ChangeAnalyzer {
  private projectRoot: string;
  private gitAnalyzer: GitAnalyzer;
  private routeThreshold: number;

  constructor(projectRoot: string, options?: { threshold?: number }) {
    this.projectRoot = projectRoot;
    this.gitAnalyzer = new GitAnalyzer(projectRoot);
    this.routeThreshold = options?.threshold || 5;
  }

  /**
   * 分析变更影响
   */
  async analyze(
    routerAnalysis: RouterAnalysisResult,
    options?: { base?: string }
  ): Promise<ChangeImpactResult> {
    Logger.header('变更影响分析');

    // 1. 获取变更文件
    Logger.step(1, 4, '获取变更文件...');
    const changedFiles = await this.getChangedFiles(options?.base);

    if (changedFiles.length === 0) {
      Logger.warn('未检测到变更文件');
      return this.createEmptyResult(options?.base || 'HEAD~1');
    }

    Logger.info(`检测到 ${changedFiles.length} 个变更文件:`);
    changedFiles.slice(0, 5).forEach(f => Logger.info(`  - ${f.relativePath}`));
    if (changedFiles.length > 5) {
      Logger.info(`  ... 还有 ${changedFiles.length - 5} 个文件`);
    }

    // 2. 构建依赖图，分析影响范围
    Logger.step(2, 4, '分析依赖关系...');
    const affectedFiles = await this.findAffectedFiles(changedFiles);
    Logger.info(`受影响文件: ${affectedFiles.length} 个`);

    // 3. 关联到路由
    Logger.step(3, 4, '关联路由...');
    const affectedRoutes = this.mapToRoutes(
      changedFiles,
      affectedFiles,
      routerAnalysis
    );
    Logger.info(`受影响路由: ${affectedRoutes.length} 个`);

    // 4. 计算影响范围和风险等级
    Logger.step(4, 4, '评估影响范围...');
    const impactScope = affectedRoutes.length <= this.routeThreshold ? 'small' : 'large';
    const riskLevel = this.calculateRiskLevel(changedFiles, affectedRoutes);

    // 获取 Git 信息
    const gitInfo = await this.getGitInfo(options?.base || 'HEAD~1');

    Logger.divider();
    Logger.info(`影响范围: ${impactScope === 'small' ? '小范围' : '大范围'}`);
    Logger.info(`风险等级: ${riskLevel}`);

    return {
      changedFiles,
      affectedFiles,
      affectedRoutes,
      impactScope,
      riskLevel,
      gitInfo,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * 获取变更文件
   */
  private async getChangedFiles(base?: string): Promise<ChangedFile[]> {
    let changedPaths: string[];

    if (base) {
      changedPaths = await this.gitAnalyzer.getChangedFiles(base);
    } else {
      // 优先获取未提交的变更
      changedPaths = await this.gitAnalyzer.getUncommittedFiles();
      if (changedPaths.length === 0) {
        // 没有未提交变更，获取最近一次提交的变更
        changedPaths = await this.gitAnalyzer.getChangedFiles('HEAD~1');
      }
    }

    return changedPaths.map(filePath => ({
      path: filePath,
      relativePath: path.relative(this.projectRoot, filePath),
      status: 'modified' as const,
    }));
  }

  /**
   * 查找受影响的文件
   */
  private async findAffectedFiles(changedFiles: ChangedFile[]): Promise<string[]> {
    try {
      let project;
      try {
        project = createTsProject(this.projectRoot);
      } catch {
        project = createTsProjectWithoutConfig(this.projectRoot);
      }

      const sourceFiles = project.getSourceFiles();
      const dependencyGraph = buildDependencyGraph(sourceFiles);

      const changedPaths = changedFiles.map(f => f.path);
      return findAffectedFiles(dependencyGraph, changedPaths);
    } catch (error) {
      Logger.debug(`依赖分析失败，仅使用直接变更文件: ${error}`);
      return changedFiles.map(f => f.path);
    }
  }

  /**
   * 将变更文件映射到路由
   */
  private mapToRoutes(
    changedFiles: ChangedFile[],
    affectedFiles: string[],
    routerAnalysis: RouterAnalysisResult
  ): AffectedRoute[] {
    const affectedRoutes: AffectedRoute[] = [];
    const routeMap = new Map<string, AffectedRoute>();

    // 构建组件路径到路由的映射
    const componentToRoute = new Map<string, FlatRoute>();
    const componentToPageComponent = new Map<string, PageComponent>();

    for (const route of routerAnalysis.flatRoutes) {
      if (route.componentPath) {
        const resolvedPath = this.resolveComponentPath(route.componentPath);
        if (resolvedPath) {
          componentToRoute.set(resolvedPath, route);
        }
      }
    }

    for (const component of routerAnalysis.pageComponents) {
      const resolvedPath = path.resolve(this.projectRoot, component.path);
      componentToPageComponent.set(resolvedPath, component);
    }

    // 处理直接变更的文件
    for (const changed of changedFiles) {
      const route = componentToRoute.get(changed.path);
      const pageComponent = componentToPageComponent.get(changed.path);

      if (route) {
        const key = route.fullPath;
        if (!routeMap.has(key)) {
          routeMap.set(key, {
            route: route.fullPath,
            name: route.name || route.component,
            component: route.component,
            componentPath: changed.relativePath,
            impactType: 'direct',
            reason: `组件文件直接变更: ${changed.relativePath}`,
            priority: 'high',
            relatedChanges: [changed.relativePath],
            testIds: pageComponent?.existingTestIds || [],
          });
        } else {
          routeMap.get(key)!.relatedChanges.push(changed.relativePath);
        }
      }
    }

    // 处理间接影响的文件
    const changedPaths = new Set(changedFiles.map(f => f.path));
    for (const affectedPath of affectedFiles) {
      if (changedPaths.has(affectedPath)) continue;

      const route = componentToRoute.get(affectedPath);
      const pageComponent = componentToPageComponent.get(affectedPath);

      if (route) {
        const key = route.fullPath;
        if (!routeMap.has(key)) {
          const relativePath = path.relative(this.projectRoot, affectedPath);
          routeMap.set(key, {
            route: route.fullPath,
            name: route.name || route.component,
            component: route.component,
            componentPath: relativePath,
            impactType: 'indirect',
            reason: `依赖的文件发生变更`,
            priority: 'medium',
            relatedChanges: [],
            testIds: pageComponent?.existingTestIds || [],
          });
        }
      }
    }

    // 检查公共组件/工具的变更
    for (const changed of changedFiles) {
      const isCommonFile = this.isCommonFile(changed.relativePath);
      if (isCommonFile && routeMap.size === 0) {
        // 公共文件变更但没有找到直接关联的路由，标记所有使用它的路由
        for (const [routePath, route] of componentToRoute) {
          if (affectedFiles.includes(routePath)) {
            const key = route.fullPath;
            if (!routeMap.has(key)) {
              const pageComponent = componentToPageComponent.get(routePath);
              routeMap.set(key, {
                route: route.fullPath,
                name: route.name || route.component,
                component: route.component,
                componentPath: path.relative(this.projectRoot, routePath),
                impactType: 'indirect',
                reason: `公共文件变更: ${changed.relativePath}`,
                priority: 'medium',
                relatedChanges: [changed.relativePath],
                testIds: pageComponent?.existingTestIds || [],
              });
            }
          }
        }
      }
    }

    // 转换为数组并排序
    for (const route of routeMap.values()) {
      affectedRoutes.push(route);
    }

    return affectedRoutes.sort((a, b) => {
      // 按优先级排序
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 解析组件路径
   */
  private resolveComponentPath(importPath: string): string | null {
    let resolved = importPath;

    if (resolved.startsWith('./') || resolved.startsWith('../')) {
      resolved = path.join(this.projectRoot, 'src', resolved);
    } else if (resolved.startsWith('@/')) {
      resolved = path.join(this.projectRoot, 'src', resolved.slice(2));
    } else if (!path.isAbsolute(resolved)) {
      resolved = path.join(this.projectRoot, 'src', resolved);
    }

    const extensions = ['.tsx', '.ts', '.jsx', '.js', '.vue', '/index.tsx', '/index.ts', '/index.vue'];

    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    if (fs.existsSync(resolved)) {
      return resolved;
    }

    return null;
  }

  /**
   * 判断是否为公共文件
   */
  private isCommonFile(relativePath: string): boolean {
    const commonPatterns = [
      '/components/',
      '/common/',
      '/shared/',
      '/utils/',
      '/helpers/',
      '/hooks/',
      '/store/',
      '/api/',
      '/services/',
    ];
    return commonPatterns.some(pattern => relativePath.includes(pattern));
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(
    changedFiles: ChangedFile[],
    affectedRoutes: AffectedRoute[]
  ): 'high' | 'medium' | 'low' {
    // 高风险条件
    const hasHighRisk =
      affectedRoutes.some(r => r.impactType === 'direct') &&
      affectedRoutes.length > 3;

    // 中风险条件
    const hasMediumRisk =
      changedFiles.some(f => this.isCommonFile(f.relativePath)) ||
      affectedRoutes.length > 1;

    if (hasHighRisk) return 'high';
    if (hasMediumRisk) return 'medium';
    return 'low';
  }

  /**
   * 获取 Git 信息
   */
  private async getGitInfo(baseRef: string): Promise<ChangeImpactResult['gitInfo']> {
    const branch = await this.gitAnalyzer.getCurrentBranch();
    const commitHash = await this.gitAnalyzer.getCommitHash();

    return {
      branch,
      commitHash: commitHash.slice(0, 7),
      baseRef,
    };
  }

  /**
   * 创建空结果
   */
  private async createEmptyResult(baseRef: string): Promise<ChangeImpactResult> {
    const gitInfo = await this.getGitInfo(baseRef);

    return {
      changedFiles: [],
      affectedFiles: [],
      affectedRoutes: [],
      impactScope: 'small',
      riskLevel: 'low',
      gitInfo,
      analyzedAt: new Date().toISOString(),
    };
  }
}

/**
 * 导出分析函数
 */
export async function analyzeChanges(
  routerAnalysis: RouterAnalysisResult,
  projectRoot?: string,
  options?: { base?: string; threshold?: number }
): Promise<ChangeImpactResult> {
  const root = projectRoot || process.cwd();
  const analyzer = new ChangeAnalyzer(root, { threshold: options?.threshold });
  return await analyzer.analyze(routerAnalysis, { base: options?.base });
}
