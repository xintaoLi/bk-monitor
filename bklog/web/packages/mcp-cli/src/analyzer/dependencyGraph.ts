import { SourceFile } from "ts-morph";
import path from "path";

export interface DependencyGraph {
  dependencies: Map<string, Set<string>>;
  reverseDependencies: Map<string, Set<string>>;
}

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
        if (callExpr.getExpression().getText() === "import") {
          const args = callExpr.getArguments?.() || [];
          if (args.length > 0) {
            const moduleSpecifier = args[0].getText().replace(/['"]/g, "");
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

function isRelativeImport(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../');
}

function resolveRelativePath(fromFile: string, moduleSpecifier: string): string | null {
  try {
    const fromDir = path.dirname(fromFile);
    let resolved = path.resolve(fromDir, moduleSpecifier);
    
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