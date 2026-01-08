import { SourceFile } from 'ts-morph';
import path from 'path';

/**
 * 依赖图结构
 */
export interface DependencyGraph {
  /** 文件 -> 依赖的文件集合 */
  dependencies: Map<string, Set<string>>;
  /** 文件 -> 被依赖的文件集合（反向依赖） */
  reverseDependencies: Map<string, Set<string>>;
}

/**
 * 增强的依赖图结构
 */
export interface EnhancedDependencyGraph extends DependencyGraph {
  /** 文件元数据 */
  fileMetadata: Map<string, FileMetadata>;
  /** 模块分组 */
  moduleGroups: Map<string, Set<string>>;
  /** 循环依赖 */
  circularDependencies: CircularDependency[];
  /** 依赖深度 */
  dependencyDepths: Map<string, number>;
}

/**
 * 文件元数据
 */
export interface FileMetadata {
  /** 文件路径 */
  filePath: string;
  /** 文件类型 */
  fileType: 'component' | 'page' | 'util' | 'hook' | 'store' | 'api' | 'config' | 'type' | 'other';
  /** 模块名称 */
  moduleName: string;
  /** 导出的符号 */
  exports: string[];
  /** 导入的符号 */
  imports: ImportInfo[];
  /** 是否为入口文件 */
  isEntryPoint: boolean;
  /** 被依赖数量 */
  dependentCount: number;
  /** 依赖数量 */
  dependencyCount: number;
  /** 影响权重 */
  impactWeight: number;
}

/**
 * 导入信息
 */
export interface ImportInfo {
  /** 模块路径 */
  moduleSpecifier: string;
  /** 导入的符号 */
  symbols: string[];
  /** 是否为类型导入 */
  isTypeOnly: boolean;
  /** 解析后的路径 */
  resolvedPath?: string;
}

/**
 * 循环依赖
 */
export interface CircularDependency {
  /** 循环路径 */
  path: string[];
  /** 涉及的文件数 */
  size: number;
}

/**
 * 依赖路径
 */
export interface DependencyPath {
  /** 起点 */
  from: string;
  /** 终点 */
  to: string;
  /** 路径 */
  path: string[];
  /** 深度 */
  depth: number;
}

/**
 * 构建基础依赖图
 */
export function buildDependencyGraph(files: SourceFile[]): DependencyGraph {
  const dependencies = new Map<string, Set<string>>();
  const reverseDependencies = new Map<string, Set<string>>();

  // 初始化所有文件
  files.forEach(file => {
    const filePath = file.getFilePath();
    dependencies.set(filePath, new Set());
    reverseDependencies.set(filePath, new Set());
  });

  // 构建依赖关系
  files.forEach(file => {
    const filePath = file.getFilePath();
    const deps = dependencies.get(filePath)!;

    // 分析 import 声明
    file.getImportDeclarations().forEach(imp => {
      const moduleSpecifier = imp.getModuleSpecifierValue();

      // 尝试解析模块路径
      const resolved = imp.getModuleSpecifierSourceFile();
      if (resolved) {
        const resolvedPath = resolved.getFilePath();
        deps.add(resolvedPath);

        // 添加反向依赖
        if (!reverseDependencies.has(resolvedPath)) {
          reverseDependencies.set(resolvedPath, new Set());
        }
        reverseDependencies.get(resolvedPath)!.add(filePath);
      } else if (isRelativeImport(moduleSpecifier)) {
        // 手动解析相对路径
        const resolvedPath = resolveRelativePath(filePath, moduleSpecifier);
        if (resolvedPath && dependencies.has(resolvedPath)) {
          deps.add(resolvedPath);
          reverseDependencies.get(resolvedPath)!.add(filePath);
        }
      }
    });

    // 分析动态 import
    file.forEachDescendant(node => {
      if (node.getKind() === 211) { // CallExpression
        const callExpr = node.asKindOrThrow(211) as any;
        if (callExpr.getExpression().getText() === 'import') {
          const args = callExpr.getArguments?.() || [];
          if (args.length > 0) {
            const moduleSpecifier = args[0].getText().replace(/['"]/g, '');
            if (isRelativeImport(moduleSpecifier)) {
              const resolvedPath = resolveRelativePath(filePath, moduleSpecifier);
              if (resolvedPath && dependencies.has(resolvedPath)) {
                deps.add(resolvedPath);
                reverseDependencies.get(resolvedPath)!.add(filePath);
              }
            }
          }
        }
      }
    });
  });

  return { dependencies, reverseDependencies };
}

/**
 * 构建增强依赖图
 */
export function buildEnhancedDependencyGraph(
  files: SourceFile[],
  projectRoot: string
): EnhancedDependencyGraph {
  const baseGraph = buildDependencyGraph(files);
  const fileMetadata = new Map<string, FileMetadata>();
  const moduleGroups = new Map<string, Set<string>>();

  // 构建文件元数据
  for (const file of files) {
    const filePath = file.getFilePath();
    const relativePath = path.relative(projectRoot, filePath);
    const metadata = extractFileMetadata(file, relativePath, baseGraph);
    fileMetadata.set(filePath, metadata);

    // 按模块分组
    if (!moduleGroups.has(metadata.moduleName)) {
      moduleGroups.set(metadata.moduleName, new Set());
    }
    moduleGroups.get(metadata.moduleName)!.add(filePath);
  }

  // 检测循环依赖
  const circularDependencies = detectCircularDependencies(baseGraph);

  // 计算依赖深度
  const dependencyDepths = calculateDependencyDepths(baseGraph);

  return {
    ...baseGraph,
    fileMetadata,
    moduleGroups,
    circularDependencies,
    dependencyDepths,
  };
}

/**
 * 提取文件元数据
 */
function extractFileMetadata(
  file: SourceFile,
  relativePath: string,
  graph: DependencyGraph
): FileMetadata {
  const filePath = file.getFilePath();

  // 推断文件类型
  const fileType = inferFileType(relativePath);

  // 推断模块名称
  const moduleName = inferModuleName(relativePath);

  // 提取导出
  const exports: string[] = [];
  file.getExportedDeclarations().forEach((decls, name) => {
    exports.push(name);
  });

  // 提取导入
  const imports: ImportInfo[] = [];
  file.getImportDeclarations().forEach(imp => {
    const namedImports = imp.getNamedImports().map(n => n.getName());
    const defaultImport = imp.getDefaultImport()?.getText();
    const symbols = [...(defaultImport ? [defaultImport] : []), ...namedImports];

    imports.push({
      moduleSpecifier: imp.getModuleSpecifierValue(),
      symbols,
      isTypeOnly: imp.isTypeOnly(),
      resolvedPath: imp.getModuleSpecifierSourceFile()?.getFilePath(),
    });
  });

  // 计算依赖数量
  const dependentCount = graph.reverseDependencies.get(filePath)?.size || 0;
  const dependencyCount = graph.dependencies.get(filePath)?.size || 0;

  // 判断是否为入口文件
  const isEntryPoint = relativePath.includes('index.') ||
    relativePath.includes('main.') ||
    relativePath.includes('app.');

  // 计算影响权重
  const impactWeight = calculateImpactWeight(fileType, dependentCount, exports.length);

  return {
    filePath,
    fileType,
    moduleName,
    exports,
    imports,
    isEntryPoint,
    dependentCount,
    dependencyCount,
    impactWeight,
  };
}

/**
 * 推断文件类型
 */
function inferFileType(relativePath: string): FileMetadata['fileType'] {
  const lowerPath = relativePath.toLowerCase();

  if (lowerPath.includes('/pages/') || lowerPath.includes('/views/')) return 'page';
  if (lowerPath.includes('/components/')) return 'component';
  if (lowerPath.includes('/hooks/') || lowerPath.includes('use')) return 'hook';
  if (lowerPath.includes('/store/') || lowerPath.includes('/state/')) return 'store';
  if (lowerPath.includes('/api/') || lowerPath.includes('/services/')) return 'api';
  if (lowerPath.includes('/utils/') || lowerPath.includes('/helpers/')) return 'util';
  if (lowerPath.includes('/types/') || lowerPath.endsWith('.d.ts')) return 'type';
  if (lowerPath.includes('.config.') || lowerPath.includes('/config/')) return 'config';

  return 'other';
}

/**
 * 推断模块名称
 */
function inferModuleName(relativePath: string): string {
  const parts = relativePath.split(/[\/\\]/);
  const srcIndex = parts.findIndex(p => p === 'src');

  if (srcIndex >= 0 && parts.length > srcIndex + 1) {
    return parts[srcIndex + 1];
  }

  return parts[0] || 'root';
}

/**
 * 计算影响权重
 */
function calculateImpactWeight(
  fileType: FileMetadata['fileType'],
  dependentCount: number,
  exportCount: number
): number {
  const typeWeights: Record<string, number> = {
    api: 30,
    store: 25,
    hook: 20,
    util: 15,
    component: 10,
    page: 10,
    config: 20,
    type: 5,
    other: 5,
  };

  let weight = typeWeights[fileType] || 5;
  weight += Math.min(dependentCount * 3, 30);
  weight += Math.min(exportCount * 2, 20);

  return Math.min(weight, 100);
}

/**
 * 检测循环依赖
 */
function detectCircularDependencies(graph: DependencyGraph): CircularDependency[] {
  const cycles: CircularDependency[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const pathStack: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    pathStack.push(node);

    const deps = graph.dependencies.get(node);
    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep)) {
          dfs(dep);
        } else if (recursionStack.has(dep)) {
          // 发现循环
          const cycleStart = pathStack.indexOf(dep);
          const cyclePath = pathStack.slice(cycleStart);
          cyclePath.push(dep);

          cycles.push({
            path: cyclePath,
            size: cyclePath.length - 1,
          });
        }
      }
    }

    pathStack.pop();
    recursionStack.delete(node);
  }

  for (const node of graph.dependencies.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * 计算依赖深度
 */
function calculateDependencyDepths(graph: DependencyGraph): Map<string, number> {
  const depths = new Map<string, number>();

  // 找出没有依赖的文件作为根节点
  const roots: string[] = [];
  for (const [file, deps] of graph.dependencies) {
    if (deps.size === 0) {
      roots.push(file);
      depths.set(file, 0);
    }
  }

  // BFS 计算深度
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current) || 0;

    const dependents = graph.reverseDependencies.get(current);
    if (dependents) {
      for (const dependent of dependents) {
        const existingDepth = depths.get(dependent);
        if (existingDepth === undefined || existingDepth < currentDepth + 1) {
          depths.set(dependent, currentDepth + 1);
          queue.push(dependent);
        }
      }
    }
  }

  return depths;
}

/**
 * 查找两个文件之间的依赖路径
 */
export function findDependencyPath(
  graph: DependencyGraph,
  from: string,
  to: string
): DependencyPath | null {
  const visited = new Set<string>();
  const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [from] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;

    if (node === to) {
      return {
        from,
        to,
        path,
        depth: path.length - 1,
      };
    }

    if (visited.has(node)) continue;
    visited.add(node);

    const deps = graph.dependencies.get(node);
    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep)) {
          queue.push({ node: dep, path: [...path, dep] });
        }
      }
    }
  }

  return null;
}

/**
 * 获取文件的所有传递依赖
 */
export function getTransitiveDependencies(
  graph: DependencyGraph,
  filePath: string,
  maxDepth: number = 10
): Set<string> {
  const result = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ node: string; depth: number }> = [{ node: filePath, depth: 0 }];

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;

    if (visited.has(node) || depth > maxDepth) continue;
    visited.add(node);

    const deps = graph.dependencies.get(node);
    if (deps) {
      for (const dep of deps) {
        result.add(dep);
        if (!visited.has(dep)) {
          queue.push({ node: dep, depth: depth + 1 });
        }
      }
    }
  }

  return result;
}

/**
 * 获取文件的所有传递依赖者
 */
export function getTransitiveDependents(
  graph: DependencyGraph,
  filePath: string,
  maxDepth: number = 10
): Set<string> {
  const result = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ node: string; depth: number }> = [{ node: filePath, depth: 0 }];

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;

    if (visited.has(node) || depth > maxDepth) continue;
    visited.add(node);

    const dependents = graph.reverseDependencies.get(node);
    if (dependents) {
      for (const dependent of dependents) {
        result.add(dependent);
        if (!visited.has(dependent)) {
          queue.push({ node: dependent, depth: depth + 1 });
        }
      }
    }
  }

  return result;
}

/**
 * 计算变更的影响范围
 */
export function calculateChangeImpact(
  graph: DependencyGraph,
  changedFiles: string[]
): {
  directImpact: Set<string>;
  indirectImpact: Set<string>;
  transitiveImpact: Set<string>;
  impactByDepth: Map<number, Set<string>>;
} {
  const directImpact = new Set<string>();
  const indirectImpact = new Set<string>();
  const transitiveImpact = new Set<string>();
  const impactByDepth = new Map<number, Set<string>>();
  const changedSet = new Set(changedFiles);

  // 直接影响
  for (const file of changedFiles) {
    directImpact.add(file);
  }

  // 按深度计算影响
  let currentDepth = 0;
  let currentLevel = new Set(changedFiles);
  const visited = new Set(changedFiles);

  impactByDepth.set(0, new Set(changedFiles));

  while (currentLevel.size > 0 && currentDepth < 10) {
    const nextLevel = new Set<string>();

    for (const file of currentLevel) {
      const dependents = graph.reverseDependencies.get(file);
      if (dependents) {
        for (const dependent of dependents) {
          if (!visited.has(dependent)) {
            visited.add(dependent);
            nextLevel.add(dependent);

            if (currentDepth === 0) {
              indirectImpact.add(dependent);
            } else {
              transitiveImpact.add(dependent);
            }
          }
        }
      }
    }

    if (nextLevel.size > 0) {
      currentDepth++;
      impactByDepth.set(currentDepth, nextLevel);
      currentLevel = nextLevel;
    } else {
      break;
    }
  }

  return {
    directImpact,
    indirectImpact,
    transitiveImpact,
    impactByDepth,
  };
}

// ============ 辅助函数 ============

function isRelativeImport(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../');
}

function resolveRelativePath(fromFile: string, moduleSpecifier: string): string | null {
  try {
    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, moduleSpecifier);

    // 尝试不同的文件扩展名
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (require('fs').existsSync(withExt)) {
        return withExt;
      }
    }

    // 尝试 index 文件
    for (const ext of extensions) {
      const indexFile = path.join(resolved, `index${ext}`);
      if (require('fs').existsSync(indexFile)) {
        return indexFile;
      }
    }

    return null;
  } catch {
    return null;
  }
}