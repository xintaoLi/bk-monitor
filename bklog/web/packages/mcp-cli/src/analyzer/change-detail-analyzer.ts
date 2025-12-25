import path from 'path';
import fs from 'fs-extra';
import simpleGit, { SimpleGit } from 'simple-git';
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { Logger } from '../utils/log.js';

/**
 * 变更详情 - 包含行号、函数名等详细信息
 */
export interface ChangeDetail {
  /** 文件路径 */
  filePath: string;
  /** 相对路径 */
  relativePath: string;
  /** 变更状态 */
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  /** 变更统计 */
  stats: {
    additions: number;
    deletions: number;
  };
  /** 变更区块列表 */
  hunks: ChangeHunk[];
  /** 受影响的代码实体 */
  affectedEntities: CodeEntity[];
  /** 文件类型 */
  fileType: 'component' | 'util' | 'store' | 'api' | 'config' | 'style' | 'other';
  /** 模块分类 */
  moduleCategory: string;
}

/**
 * 变更区块 - 对应 git diff 的 hunk
 */
export interface ChangeHunk {
  /** 旧文件起始行 */
  oldStart: number;
  /** 旧文件行数 */
  oldLines: number;
  /** 新文件起始行 */
  newStart: number;
  /** 新文件行数 */
  newLines: number;
  /** 变更内容摘要 */
  content: string;
  /** 变更类型 */
  changeType: 'add' | 'remove' | 'modify';
}

/**
 * 代码实体 - 函数、类、变量等
 */
export interface CodeEntity {
  /** 实体类型 */
  type: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'export' | 'import' | 'component' | 'hook' | 'config';
  /** 实体名称 */
  name: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 变更类型 */
  changeType: 'added' | 'modified' | 'deleted';
  /** 签名/声明 */
  signature?: string;
  /** 描述 */
  description?: string;
  /** 是否导出 */
  isExported?: boolean;
  /** 父实体 */
  parent?: string;
}

/**
 * 详细变更分析结果
 */
export interface DetailedChangeAnalysis {
  /** 分析时间 */
  timestamp: string;
  /** Git 信息 */
  gitInfo: {
    branch: string;
    commitHash: string;
    baseRef: string;
    commitMessage?: string;
  };
  /** 变更详情列表 */
  changes: ChangeDetail[];
  /** 变更摘要 */
  summary: ChangeSummary;
}

/**
 * 变更摘要
 */
export interface ChangeSummary {
  /** 总变更文件数 */
  totalFiles: number;
  /** 新增文件数 */
  addedFiles: number;
  /** 修改文件数 */
  modifiedFiles: number;
  /** 删除文件数 */
  deletedFiles: number;
  /** 总新增行数 */
  totalAdditions: number;
  /** 总删除行数 */
  totalDeletions: number;
  /** 受影响的函数数 */
  affectedFunctions: number;
  /** 受影响的组件数 */
  affectedComponents: number;
  /** 按文件类型分组 */
  byFileType: Record<string, number>;
  /** 按模块分组 */
  byModule: Record<string, number>;
}

/**
 * 变更详情分析器
 */
export class ChangeDetailAnalyzer {
  private git: SimpleGit;
  private projectRoot: string;
  private gitRoot: string = '';
  private project: Project | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.git = simpleGit(projectRoot);
  }

  /**
   * 获取 Git 仓库根目录
   */
  private async getGitRoot(): Promise<string> {
    if (!this.gitRoot) {
      try {
        const root = await this.git.revparse(['--show-toplevel']);
        this.gitRoot = root.trim().replace(/\\/g, '/');
      } catch (error) {
        Logger.debug(`获取 Git 根目录失败: ${error}`);
        this.gitRoot = this.projectRoot;
      }
    }
    return this.gitRoot;
  }

  /**
   * 将相对于 Git 根目录的路径转换为相对于 projectRoot 的路径
   */
  private async gitPathToProjectPath(gitPath: string): Promise<string> {
    const gitRoot = await this.getGitRoot();
    const normalizedProjectRoot = this.projectRoot.replace(/\\/g, '/');
    const normalizedGitPath = gitPath.replace(/\\/g, '/');
    
    // 如果 projectRoot 和 gitRoot 相同，直接返回
    if (normalizedProjectRoot === gitRoot) {
      return normalizedGitPath;
    }
    
    // 计算 projectRoot 相对于 gitRoot 的路径前缀
    const relativePrefix = normalizedProjectRoot.substring(gitRoot.length + 1);
    
    // 如果 gitPath 以 relativePrefix 开头，去掉这个前缀
    if (normalizedGitPath.startsWith(relativePrefix + '/')) {
      return normalizedGitPath.substring(relativePrefix.length + 1);
    }
    
    // 否则返回原路径
    return normalizedGitPath;
  }

  /**
   * 分析变更详情
   */
  async analyze(baseRef?: string): Promise<DetailedChangeAnalysis> {
    Logger.info('正在分析变更详情...');

    // 1. 获取 Git 信息
    const gitInfo = await this.getGitInfo(baseRef);

    // 2. 获取变更文件列表
    const changedFiles = await this.getChangedFilesWithStats(baseRef);

    if (changedFiles.length === 0) {
      Logger.warn('未检测到变更文件');
      return this.createEmptyResult(gitInfo);
    }

    // 3. 初始化 TypeScript 项目（用于 AST 分析）
    await this.initProject();

    // 4. 分析每个变更文件的详情
    const changes: ChangeDetail[] = [];
    for (const file of changedFiles) {
      try {
        const detail = await this.analyzeFileChange(file, baseRef);
        if (detail) {
          changes.push(detail);
        }
      } catch (error) {
        Logger.debug(`分析文件失败: ${file.path} - ${error}`);
      }
    }

    // 5. 生成摘要
    const summary = this.generateSummary(changes);

    return {
      timestamp: new Date().toISOString(),
      gitInfo,
      changes,
      summary,
    };
  }

  /**
   * 获取 Git 信息
   */
  private async getGitInfo(baseRef?: string): Promise<DetailedChangeAnalysis['gitInfo']> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']).catch(() => 'unknown');
    const commitHash = await this.git.revparse(['HEAD']).catch(() => '');
    const commitMessage = await this.git.log(['-1', '--format=%s']).catch(() => null);

    return {
      branch: branch.trim(),
      commitHash: commitHash.trim().slice(0, 7),
      baseRef: baseRef || 'HEAD~1',
      commitMessage: commitMessage?.latest?.message || undefined,
    };
  }

  /**
   * 获取变更文件及统计信息
   */
  private async getChangedFilesWithStats(baseRef?: string): Promise<Array<{
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
  }>> {
    const files: Array<{
      path: string;
      status: 'added' | 'modified' | 'deleted' | 'renamed';
      additions: number;
      deletions: number;
    }> = [];

    try {
      // 获取未提交的变更
      const status = await this.git.status();
      const uncommittedFiles = [
        ...status.modified.map(f => ({ path: f, status: 'modified' as const })),
        ...status.not_added.map(f => ({ path: f, status: 'added' as const })),
        ...status.created.map(f => ({ path: f, status: 'added' as const })),
        ...status.deleted.map(f => ({ path: f, status: 'deleted' as const })),
        ...status.staged.map(f => ({ path: f, status: 'modified' as const })),
      ];

      if (uncommittedFiles.length > 0) {
        // 有未提交的变更
        for (const file of uncommittedFiles) {
          if (!this.isRelevantFile(file.path)) continue;

          // 转换路径：从 git 根目录相对路径转换为 projectRoot 相对路径
          const projectRelativePath = await this.gitPathToProjectPath(file.path);
          const stats = await this.getFileStats(projectRelativePath, file.status);
          const fullPath = path.resolve(this.projectRoot, projectRelativePath);
          
          files.push({
            path: fullPath,
            status: file.status,
            additions: stats.additions,
            deletions: stats.deletions,
          });
          
          Logger.debug(`文件: ${file.path} -> ${projectRelativePath}, 状态: ${file.status}, +${stats.additions}/-${stats.deletions}`);
        }
      } else if (baseRef) {
        // 获取与 baseRef 的差异
        const diffSummary = await this.git.diffSummary([baseRef, 'HEAD']);
        for (const file of diffSummary.files) {
          if (!this.isRelevantFile(file.file)) continue;

          const projectRelativePath = await this.gitPathToProjectPath(file.file);

          // 处理二进制文件和文本文件的类型差异
          const isBinary = 'binary' in file && file.binary;
          const insertions = 'insertions' in file ? file.insertions : 0;
          const deletions = 'deletions' in file ? file.deletions : 0;

          files.push({
            path: path.resolve(this.projectRoot, projectRelativePath),
            status: isBinary ? 'modified' : (insertions > 0 && deletions === 0 ? 'added' : 'modified'),
            additions: insertions,
            deletions: deletions,
          });
        }
      }
    } catch (error) {
      Logger.debug(`获取变更文件失败: ${error}`);
    }

    return files;
  }

  /**
   * 获取文件变更统计
   */
  private async getFileStats(filePath: string, status: string): Promise<{ additions: number; deletions: number }> {
    try {
      const fullPath = path.resolve(this.projectRoot, filePath);
      
      // 对于新增的文件（未跟踪或新创建）
      if (status === 'added') {
        if (await fs.pathExists(fullPath)) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n').length;
          return { additions: lines, deletions: 0 };
        }
      }

      // 对于修改的文件，尝试多种 git diff 策略
      // 策略1: 工作区变更（未暂存）
      let diff = await this.git.diff(['--numstat', '--', filePath]).catch(() => '');
      
      // 策略2: 已暂存但未提交
      if (!diff || diff.trim() === '') {
        diff = await this.git.diff(['--numstat', '--cached', '--', filePath]).catch(() => '');
      }
      
      // 策略3: 与 HEAD 比较（如果都没有，说明已经提交）
      if (!diff || diff.trim() === '') {
        diff = await this.git.diff(['--numstat', 'HEAD~1', 'HEAD', '--', filePath]).catch(() => '');
      }
      
      if (diff && diff.trim() !== '') {
        const match = diff.match(/^(\d+)\s+(\d+)/);
        if (match) {
          const additions = parseInt(match[1], 10);
          const deletions = parseInt(match[2], 10);
          return { additions, deletions };
        }
      }
    } catch (error) {
      // Silent fail
    }
    return { additions: 0, deletions: 0 };
  }

  /**
   * 分析单个文件的变更详情
   */
  private async analyzeFileChange(
    file: { path: string; status: string; additions: number; deletions: number },
    baseRef?: string
  ): Promise<ChangeDetail | null> {
    const relativePath = path.relative(this.projectRoot, file.path);
    const fileType = this.inferFileType(relativePath);
    const moduleCategory = this.inferModuleCategory(relativePath);

    // 获取变更区块
    const hunks = await this.getChangeHunks(relativePath, baseRef);

    // 分析受影响的代码实体
    const affectedEntities = await this.analyzeAffectedEntities(file.path, hunks);

    return {
      filePath: file.path,
      relativePath,
      status: file.status as ChangeDetail['status'],
      stats: {
        additions: file.additions,
        deletions: file.deletions,
      },
      hunks,
      affectedEntities,
      fileType,
      moduleCategory,
    };
  }

  /**
   * 获取变更区块（hunks）
   */
  private async getChangeHunks(relativePath: string, baseRef?: string): Promise<ChangeHunk[]> {
    const hunks: ChangeHunk[] = [];

    try {
      let diffOutput: string = '';

      // 策略1: 尝试获取工作区的变更（未暂存的变更）
      try {
        diffOutput = await this.git.diff(['--unified=3', '--', relativePath]);
      } catch (e) {
        Logger.debug(`工作区 diff 失败: ${e}`);
      }

      // 策略2: 如果没有工作区变更，尝试获取已暂存但未提交的变更
      if (!diffOutput) {
        try {
          diffOutput = await this.git.diff(['--unified=3', '--cached', '--', relativePath]);
        } catch (e) {
          Logger.debug(`暂存区 diff 失败: ${e}`);
        }
      }

      // 策略3: 如果还是没有，尝试与 HEAD 比较（已提交但未推送）
      if (!diffOutput) {
        try {
          diffOutput = await this.git.diff(['--unified=3', 'HEAD~1', 'HEAD', '--', relativePath]);
        } catch (e) {
          Logger.debug(`HEAD diff 失败: ${e}`);
        }
      }

      // 策略4: 如果指定了 baseRef，与 baseRef 比较
      if (!diffOutput && baseRef) {
        try {
          diffOutput = await this.git.diff(['--unified=3', baseRef, 'HEAD', '--', relativePath]);
        } catch (e) {
          Logger.debug(`baseRef diff 失败: ${e}`);
        }
      }

      if (!diffOutput) {
        Logger.debug(`无法获取文件变更: ${relativePath}`);
        return hunks;
      }

      // 解析 diff 输出
      const hunkRegex = /@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/g;
      let match;

      while ((match = hunkRegex.exec(diffOutput)) !== null) {
        const oldStart = parseInt(match[1], 10);
        const oldLines = match[2] ? parseInt(match[2], 10) : 1;
        const newStart = parseInt(match[3], 10);
        const newLines = match[4] ? parseInt(match[4], 10) : 1;
        const context = match[5]?.trim() || '';

        // 提取 hunk 内容
        const hunkStartIndex = match.index + match[0].length;
        const nextHunkMatch = hunkRegex.exec(diffOutput);
        const hunkEndIndex = nextHunkMatch ? nextHunkMatch.index : diffOutput.length;
        hunkRegex.lastIndex = match.index + match[0].length; // Reset for next iteration

        const hunkContent = diffOutput.slice(hunkStartIndex, hunkEndIndex).trim();
        const addedLines = (hunkContent.match(/^\+[^+]/gm) || []).length;
        const removedLines = (hunkContent.match(/^-[^-]/gm) || []).length;

        let changeType: ChangeHunk['changeType'] = 'modify';
        if (addedLines > 0 && removedLines === 0) {
          changeType = 'add';
        } else if (removedLines > 0 && addedLines === 0) {
          changeType = 'remove';
        }

        hunks.push({
          oldStart,
          oldLines,
          newStart,
          newLines,
          content: context || this.extractHunkSummary(hunkContent),
          changeType,
        });
      }

      Logger.debug(`成功解析 ${hunks.length} 个变更区块: ${relativePath}`);
    } catch (error) {
      Logger.debug(`获取变更区块失败: ${relativePath} - ${error}`);
    }

    return hunks;
  }

  /**
   * 提取 hunk 内容摘要
   */
  private extractHunkSummary(content: string): string {
    const lines = content.split('\n').filter(l => l.startsWith('+') || l.startsWith('-'));
    if (lines.length === 0) return '';

    // 返回前几行变更作为摘要
    return lines.slice(0, 3).map(l => l.slice(1).trim()).join('; ').slice(0, 100);
  }

  /**
   * 分析受影响的代码实体
   */
  private async analyzeAffectedEntities(filePath: string, hunks: ChangeHunk[]): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];

    if (!this.project) return entities;

    try {
      const sourceFile = this.project.getSourceFile(filePath);
      if (!sourceFile) {
        // 尝试添加文件
        if (await fs.pathExists(filePath)) {
          const addedFile = this.project.addSourceFileAtPath(filePath);
          return this.extractEntitiesFromFile(addedFile, hunks);
        }
        return entities;
      }

      return this.extractEntitiesFromFile(sourceFile, hunks);
    } catch (error) {
      Logger.debug(`分析代码实体失败: ${filePath} - ${error}`);
    }

    return entities;
  }

  /**
   * 从源文件提取代码实体
   */
  private extractEntitiesFromFile(sourceFile: SourceFile, hunks: ChangeHunk[]): CodeEntity[] {
    const entities: CodeEntity[] = [];
    const changedLineRanges = hunks.map(h => ({
      start: h.newStart,
      end: h.newStart + h.newLines,
      changeType: h.changeType,
    }));

    // 提取函数声明
    sourceFile.getFunctions().forEach(func => {
      const startLine = func.getStartLineNumber();
      const endLine = func.getEndLineNumber();
      const changeType = this.getEntityChangeType(startLine, endLine, changedLineRanges);

      if (changeType) {
        entities.push({
          type: func.getName()?.startsWith('use') ? 'hook' : 'function',
          name: func.getName() || 'anonymous',
          startLine,
          endLine,
          changeType,
          signature: this.getFunctionSignature(func),
          isExported: func.isExported(),
        });
      }
    });

    // 提取类声明
    sourceFile.getClasses().forEach(cls => {
      const startLine = cls.getStartLineNumber();
      const endLine = cls.getEndLineNumber();
      const changeType = this.getEntityChangeType(startLine, endLine, changedLineRanges);

      if (changeType) {
        entities.push({
          type: 'class',
          name: cls.getName() || 'anonymous',
          startLine,
          endLine,
          changeType,
          signature: `class ${cls.getName()}`,
          isExported: cls.isExported(),
        });

        // 提取类方法
        cls.getMethods().forEach(method => {
          const methodStart = method.getStartLineNumber();
          const methodEnd = method.getEndLineNumber();
          const methodChangeType = this.getEntityChangeType(methodStart, methodEnd, changedLineRanges);

          if (methodChangeType) {
            entities.push({
              type: 'function',
              name: method.getName(),
              startLine: methodStart,
              endLine: methodEnd,
              changeType: methodChangeType,
              signature: this.getMethodSignature(method),
              parent: cls.getName(),
            });
          }
        });
      }
    });

    // 提取变量声明（包括组件、配置等）
    sourceFile.getVariableDeclarations().forEach(varDecl => {
      const startLine = varDecl.getStartLineNumber();
      const endLine = varDecl.getEndLineNumber();
      const changeType = this.getEntityChangeType(startLine, endLine, changedLineRanges);

      if (changeType) {
        const name = varDecl.getName();
        const initializer = varDecl.getInitializer();
        let type: CodeEntity['type'] = 'variable';
        let signature = `const ${name}`;

        // 判断是否为组件
        if (initializer) {
          const text = initializer.getText();
          if (text.includes('defineComponent') || text.includes('React.') ||
              text.match(/^\s*\(\s*\)\s*=>\s*</)) {
            type = 'component';
            signature = `const ${name} = Component`;
          } else if (name.startsWith('use')) {
            type = 'hook';
          } else if (name.match(/^[A-Z_]+$/) || name.endsWith('Config') || name.endsWith('Options')) {
            type = 'config';
          }
        }

        const statement = varDecl.getVariableStatement();
        const isExported = statement?.isExported() ?? false;

        entities.push({
          type,
          name,
          startLine,
          endLine,
          changeType,
          signature,
          isExported,
        });
      }
    });

    // 提取接口声明
    sourceFile.getInterfaces().forEach(iface => {
      const startLine = iface.getStartLineNumber();
      const endLine = iface.getEndLineNumber();
      const changeType = this.getEntityChangeType(startLine, endLine, changedLineRanges);

      if (changeType) {
        entities.push({
          type: 'interface',
          name: iface.getName(),
          startLine,
          endLine,
          changeType,
          signature: `interface ${iface.getName()}`,
          isExported: iface.isExported(),
        });
      }
    });

    // 提取类型别名
    sourceFile.getTypeAliases().forEach(typeAlias => {
      const startLine = typeAlias.getStartLineNumber();
      const endLine = typeAlias.getEndLineNumber();
      const changeType = this.getEntityChangeType(startLine, endLine, changedLineRanges);

      if (changeType) {
        entities.push({
          type: 'type',
          name: typeAlias.getName(),
          startLine,
          endLine,
          changeType,
          signature: `type ${typeAlias.getName()}`,
          isExported: typeAlias.isExported(),
        });
      }
    });

    // 提取导出声明
    sourceFile.getExportDeclarations().forEach(exp => {
      const startLine = exp.getStartLineNumber();
      const endLine = exp.getEndLineNumber();
      const changeType = this.getEntityChangeType(startLine, endLine, changedLineRanges);

      if (changeType) {
        const namedExports = exp.getNamedExports().map(e => e.getName()).join(', ');
        entities.push({
          type: 'export',
          name: namedExports || 'default',
          startLine,
          endLine,
          changeType,
          signature: `export { ${namedExports} }`,
        });
      }
    });

    return entities;
  }

  /**
   * 判断实体的变更类型
   */
  private getEntityChangeType(
    startLine: number,
    endLine: number,
    changedRanges: Array<{ start: number; end: number; changeType: string }>
  ): CodeEntity['changeType'] | null {
    for (const range of changedRanges) {
      // 检查是否有重叠
      if (startLine <= range.end && endLine >= range.start) {
        if (range.changeType === 'add') return 'added';
        if (range.changeType === 'remove') return 'deleted';
        return 'modified';
      }
    }
    return null;
  }

  /**
   * 获取函数签名
   */
  private getFunctionSignature(func: any): string {
    const name = func.getName() || 'anonymous';
    const params = func.getParameters().map((p: any) => {
      const paramName = p.getName();
      const paramType = p.getType()?.getText()?.slice(0, 30) || 'any';
      return `${paramName}: ${paramType}`;
    }).join(', ');
    const returnType = func.getReturnType()?.getText()?.slice(0, 30) || 'void';
    return `function ${name}(${params}): ${returnType}`;
  }

  /**
   * 获取方法签名
   */
  private getMethodSignature(method: any): string {
    const name = method.getName();
    const params = method.getParameters().map((p: any) => p.getName()).join(', ');
    return `${name}(${params})`;
  }

  /**
   * 初始化 TypeScript 项目
   */
  private async initProject(): Promise<void> {
    try {
      const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
      if (await fs.pathExists(tsconfigPath)) {
        this.project = new Project({
          tsConfigFilePath: tsconfigPath,
          skipAddingFilesFromTsConfig: true,
        });
      } else {
        this.project = new Project({
          compilerOptions: {
            target: 99, // ESNext
            module: 99, // ESNext
            jsx: 4, // React JSX
            esModuleInterop: true,
            allowJs: true,
          },
        });
      }
    } catch (error) {
      Logger.debug(`初始化 TypeScript 项目失败: ${error}`);
      this.project = null;
    }
  }

  /**
   * 推断文件类型
   */
  private inferFileType(relativePath: string): ChangeDetail['fileType'] {
    if (relativePath.match(/\/(components?|views?|pages?)\//i)) return 'component';
    if (relativePath.match(/\/(utils?|helpers?|lib)\//i)) return 'util';
    if (relativePath.match(/\/(stores?|state|redux|vuex|pinia)\//i)) return 'store';
    if (relativePath.match(/\/(api|services?|http)\//i)) return 'api';
    if (relativePath.match(/\.(config|rc)\.(ts|js|json)$/i)) return 'config';
    if (relativePath.match(/\.(css|scss|less|styl)$/i)) return 'style';
    return 'other';
  }

  /**
   * 推断模块分类
   */
  private inferModuleCategory(relativePath: string): string {
    const parts = relativePath.split(/[\/\\]/);

    // 查找 src 后的第一个目录
    const srcIndex = parts.findIndex(p => p === 'src');
    if (srcIndex >= 0 && parts.length > srcIndex + 1) {
      return parts[srcIndex + 1];
    }

    // 返回第一个目录
    return parts[0] || 'root';
  }

  /**
   * 判断是否为相关文件
   */
  private isRelevantFile(filePath: string): boolean {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];
    const ext = path.extname(filePath);
    return extensions.includes(ext) && !filePath.includes('node_modules');
  }

  /**
   * 生成变更摘要
   */
  private generateSummary(changes: ChangeDetail[]): ChangeSummary {
    const byFileType: Record<string, number> = {};
    const byModule: Record<string, number> = {};
    let totalAdditions = 0;
    let totalDeletions = 0;
    let affectedFunctions = 0;
    let affectedComponents = 0;

    for (const change of changes) {
      totalAdditions += change.stats.additions;
      totalDeletions += change.stats.deletions;

      byFileType[change.fileType] = (byFileType[change.fileType] || 0) + 1;
      byModule[change.moduleCategory] = (byModule[change.moduleCategory] || 0) + 1;

      for (const entity of change.affectedEntities) {
        if (entity.type === 'function' || entity.type === 'hook') {
          affectedFunctions++;
        }
        if (entity.type === 'component') {
          affectedComponents++;
        }
      }
    }

    return {
      totalFiles: changes.length,
      addedFiles: changes.filter(c => c.status === 'added').length,
      modifiedFiles: changes.filter(c => c.status === 'modified').length,
      deletedFiles: changes.filter(c => c.status === 'deleted').length,
      totalAdditions,
      totalDeletions,
      affectedFunctions,
      affectedComponents,
      byFileType,
      byModule,
    };
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(gitInfo: DetailedChangeAnalysis['gitInfo']): DetailedChangeAnalysis {
    return {
      timestamp: new Date().toISOString(),
      gitInfo,
      changes: [],
      summary: {
        totalFiles: 0,
        addedFiles: 0,
        modifiedFiles: 0,
        deletedFiles: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        affectedFunctions: 0,
        affectedComponents: 0,
        byFileType: {},
        byModule: {},
      },
    };
  }
}

/**
 * 导出分析函数
 */
export async function analyzeChangeDetails(
  projectRoot?: string,
  baseRef?: string
): Promise<DetailedChangeAnalysis> {
  const root = projectRoot || process.cwd();
  const analyzer = new ChangeDetailAnalyzer(root);
  return await analyzer.analyze(baseRef);
}

