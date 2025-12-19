import { DependencyGraph } from "./dependencyGraph.js";

export function findAffectedFiles(
  graph: DependencyGraph,
  changedFiles: string[]
): string[] {
  const affected = new Set(changedFiles);
  
  // 使用广度优先搜索找到所有受影响的文件
  const queue = [...changedFiles];
  
  while (queue.length > 0) {
    const currentFile = queue.shift()!;
    const dependents = graph.reverseDependencies.get(currentFile);
    
    if (dependents) {
      for (const dependent of dependents) {
        if (!affected.has(dependent)) {
          affected.add(dependent);
          queue.push(dependent);
        }
      }
    }
  }
  
  return Array.from(affected);
}

export function findDirectDependencies(
  graph: DependencyGraph,
  filePath: string
): string[] {
  const deps = graph.dependencies.get(filePath);
  return deps ? Array.from(deps) : [];
}

export function findAllDependencies(
  graph: DependencyGraph,
  filePath: string
): string[] {
  const visited = new Set<string>();
  const result = new Set<string>();
  
  function traverse(file: string) {
    if (visited.has(file)) return;
    visited.add(file);
    
    const deps = graph.dependencies.get(file);
    if (deps) {
      for (const dep of deps) {
        result.add(dep);
        traverse(dep);
      }
    }
  }
  
  traverse(filePath);
  return Array.from(result);
}

export interface AffectedAnalysis {
  changedFiles: string[];
  affectedFiles: string[];
  componentsToTest: ComponentInfo[];
}

export interface ComponentInfo {
  filePath: string;
  componentName: string;
  route?: string;
  selectors: string[];
}