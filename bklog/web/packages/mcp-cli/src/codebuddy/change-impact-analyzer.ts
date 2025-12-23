import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { GitAnalyzer } from '../utils/git.js';
import { createTsProject, createTsProjectWithoutConfig } from '../analyzer/project.js';
import { buildDependencyGraph, DependencyGraph } from '../analyzer/dependencyGraph.js';
import { findAffectedFiles } from '../analyzer/affected.js';
import { inferSelectors } from '../selectors/index.js';

/**
 * 代码变更影响分析器
 * 
 * 功能：
 * 1. 检测 Git 变更文件
 * 2. 构建依赖图，找出受影响的组件树
 * 3. 生成受影响的业务路径
 * 4. 输出测试 Rule 用于精准测试
 */

export interface ChangeImpactAnalysis {
  timestamp: string;
  commitHash?: string;
  branch?: string;
  changedFiles: ChangedFile[];
  affectedComponents: AffectedComponent[];
  affectedRoutes: string[];
  impactTree: ImpactNode;
  testPaths: TestPath[];
  suggestedTests: SuggestedTest[];
}

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
}

export interface AffectedComponent {
  name: string;
  path: string;
  impactLevel: 'direct' | 'indirect' | 'transitive';
  depth: number;
  testIds: string[];
  selectors: string[];
  route?: string;
}

export interface ImpactNode {
  name: string;
  path: string;
  type: 'changed' | 'affected';
  depth: number;
  children: ImpactNode[];
}

export interface TestPath {
  id: string;
  name: string;
  route: string;
  components: string[];
  priority: number;
  reason: string;
}

export interface SuggestedTest {
  id: string;
  name: string;
  description: string;
  priority: number;
  type: 'smoke' | 'regression' | 'integration';
  scope: 'component' | 'page' | 'flow';
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
 * 变更影响测试 Rule
 */
export interface ChangeImpactTestRule {
  id: string;
  name: string;
  version: string;
  description: string;
  trigger: 'on_change' | 'on_commit';
  enabled: boolean;
  
  // 变更上下文
  changeContext: {
    commitHash?: string;
    branch?: string;
    changedFiles: string[];
    affectedComponents: string[];
    affectedRoutes: string[];
  };
  
  // 影响分析
  impactAnalysis: {
    directImpact: string[];
    indirectImpact: string[];
    transitiveImpact: string[];
    totalAffected: number;
  };
  
  // 测试配置
  tests: SuggestedTest[];
  
  // 执行配置
  config: {
    timeout: number;
    retries: number;
    parallel: boolean;
    headless: boolean;
    screenshot: boolean;
    stopOnFirstFailure: boolean;
  };
  
  // 元数据
  metadata: {
    createdAt: string;
    analyzedAt: string;
    author: string;
    tags: string[];
  };
}

/**
 * 代码变更影响分析器
 */
export class ChangeImpactAnalyzer {
  private projectRoot: string;
  private gitAnalyzer: GitAnalyzer;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.gitAnalyzer = new GitAnalyzer(projectRoot);
  }

  /**
   * 分析代码变更并生成测试 Rule
   */
  async analyzeAndGenerateTestRule(baseBranch?: string): Promise<ChangeImpactTestRule> {
    Logger.header('代码变更影响分析 - 生成测试 Rule');
    
    // 1. 获取变更文件
    Logger.step(1, 6, '获取 Git 变更文件...');
    const changedFiles = await this.getChangedFiles(baseBranch);
    Logger.info(`检测到 ${changedFiles.length} 个变更文件`);
    
    if (changedFiles.length === 0) {
      Logger.warn('未检测到变更文件');
      return this.createEmptyRule();
    }
    
    // 2. 构建依赖图
    Logger.step(2, 6, '构建组件依赖图...');
    const dependencyGraph = await this.buildDependencyGraph();
    
    // 3. 分析受影响组件
    Logger.step(3, 6, '分析受影响组件...');
    const affectedComponents = await this.analyzeAffectedComponents(
      changedFiles,
      dependencyGraph
    );
    Logger.info(`发现 ${affectedComponents.length} 个受影响组件`);
    
    // 4. 构建影响树
    Logger.step(4, 6, '构建影响树...');
    const impactTree = this.buildImpactTree(changedFiles, affectedComponents, dependencyGraph);
    
    // 5. 生成测试路径
    Logger.step(5, 6, '生成测试路径...');
    const testPaths = this.generateTestPaths(affectedComponents);
    const suggestedTests = this.generateSuggestedTests(affectedComponents, testPaths);
    
    // 6. 创建测试 Rule
    Logger.step(6, 6, '创建测试 Rule...');
    const rule = await this.createTestRule(changedFiles, affectedComponents, suggestedTests);
    
    // 保存分析结果
    await this.saveAnalysisResult(rule, impactTree);
    
    Logger.success('变更影响分析完成！');
    return rule;
  }

  /**
   * 获取变更文件
   */
  private async getChangedFiles(baseBranch?: string): Promise<ChangedFile[]> {
    const changedPaths = await this.gitAnalyzer.getChangedFiles(baseBranch || 'HEAD~1');
    
    return changedPaths.map(filePath => ({
      path: path.relative(this.projectRoot, filePath),
      status: 'modified' as const,
      additions: 0,
      deletions: 0,
    }));
  }

  /**
   * 构建依赖图
   */
  private async buildDependencyGraph(): Promise<DependencyGraph> {
    let project;
    try {
      project = createTsProject(this.projectRoot);
    } catch {
      project = createTsProjectWithoutConfig(this.projectRoot);
    }
    
    const sourceFiles = project.getSourceFiles();
    return buildDependencyGraph(sourceFiles);
  }

  /**
   * 分析受影响组件
   */
  private async analyzeAffectedComponents(
    changedFiles: ChangedFile[],
    dependencyGraph: DependencyGraph
  ): Promise<AffectedComponent[]> {
    const changedPaths = changedFiles.map(f => path.resolve(this.projectRoot, f.path));
    const affectedPaths = findAffectedFiles(dependencyGraph, changedPaths);
    
    const components: AffectedComponent[] = [];
    const changedSet = new Set(changedPaths);
    
    // 计算每个文件的影响深度
    const depthMap = this.calculateImpactDepth(changedPaths, dependencyGraph);
    
    for (const filePath of affectedPaths) {
      const relativePath = path.relative(this.projectRoot, filePath);
      const componentName = this.extractComponentName(filePath);
      const depth = depthMap.get(filePath) || 0;
      
      // 确定影响级别
      let impactLevel: AffectedComponent['impactLevel'];
      if (changedSet.has(filePath)) {
        impactLevel = 'direct';
      } else if (depth === 1) {
        impactLevel = 'indirect';
      } else {
        impactLevel = 'transitive';
      }
      
      // 提取 selectors
      const selectors = inferSelectors(filePath);
      
      components.push({
        name: componentName,
        path: relativePath,
        impactLevel,
        depth,
        testIds: selectors.map(s => s.selector),
        selectors: selectors.map(s => s.selector),
        route: this.inferRoute(relativePath),
      });
    }
    
    // 按影响深度排序
    return components.sort((a, b) => a.depth - b.depth);
  }

  /**
   * 计算影响深度
   */
  private calculateImpactDepth(
    changedPaths: string[],
    dependencyGraph: DependencyGraph
  ): Map<string, number> {
    const depthMap = new Map<string, number>();
    const visited = new Set<string>();
    
    // BFS 计算深度
    const queue: Array<{ path: string; depth: number }> = [];
    
    for (const changedPath of changedPaths) {
      queue.push({ path: changedPath, depth: 0 });
      depthMap.set(changedPath, 0);
    }
    
    while (queue.length > 0) {
      const { path: currentPath, depth } = queue.shift()!;
      
      if (visited.has(currentPath)) continue;
      visited.add(currentPath);
      
      const dependents = dependencyGraph.reverseDependencies.get(currentPath);
      if (dependents) {
        for (const dependent of dependents) {
          if (!depthMap.has(dependent) || depthMap.get(dependent)! > depth + 1) {
            depthMap.set(dependent, depth + 1);
            queue.push({ path: dependent, depth: depth + 1 });
          }
        }
      }
    }
    
    return depthMap;
  }

  /**
   * 构建影响树
   */
  private buildImpactTree(
    changedFiles: ChangedFile[],
    affectedComponents: AffectedComponent[],
    dependencyGraph: DependencyGraph
  ): ImpactNode {
    const root: ImpactNode = {
      name: 'root',
      path: '',
      type: 'changed',
      depth: -1,
      children: [],
    };
    
    // 按深度组织节点
    const nodeMap = new Map<string, ImpactNode>();
    
    for (const component of affectedComponents) {
      const node: ImpactNode = {
        name: component.name,
        path: component.path,
        type: component.impactLevel === 'direct' ? 'changed' : 'affected',
        depth: component.depth,
        children: [],
      };
      nodeMap.set(component.path, node);
    }
    
    // 构建树结构
    for (const component of affectedComponents) {
      const node = nodeMap.get(component.path)!;
      
      if (component.depth === 0) {
        root.children.push(node);
      } else {
        // 找到父节点
        const fullPath = path.resolve(this.projectRoot, component.path);
        const deps = dependencyGraph.dependencies.get(fullPath);
        
        if (deps) {
          for (const dep of deps) {
            const depRelative = path.relative(this.projectRoot, dep);
            const parentNode = nodeMap.get(depRelative);
            if (parentNode && parentNode.depth < node.depth) {
              parentNode.children.push(node);
              break;
            }
          }
        }
      }
    }
    
    return root;
  }

  /**
   * 生成测试路径
   */
  private generateTestPaths(affectedComponents: AffectedComponent[]): TestPath[] {
    const paths: TestPath[] = [];
    const routeComponents = affectedComponents.filter(c => c.route);
    
    for (const component of routeComponents) {
      // 找出该路由涉及的所有组件
      const relatedComponents = affectedComponents
        .filter(c => c.route === component.route || c.depth <= component.depth + 1)
        .map(c => c.name);
      
      paths.push({
        id: `path-${component.name.toLowerCase()}`,
        name: `${component.name} 测试路径`,
        route: component.route!,
        components: relatedComponents,
        priority: component.impactLevel === 'direct' ? 1 : component.impactLevel === 'indirect' ? 2 : 3,
        reason: `${component.impactLevel} 影响`,
      });
    }
    
    // 按优先级排序
    return paths.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 生成建议测试
   */
  private generateSuggestedTests(
    affectedComponents: AffectedComponent[],
    testPaths: TestPath[]
  ): SuggestedTest[] {
    const tests: SuggestedTest[] = [];
    
    // 为每个直接影响的组件生成测试
    const directComponents = affectedComponents.filter(c => c.impactLevel === 'direct');
    
    for (const component of directComponents) {
      const steps: TestStep[] = [];
      
      // 导航步骤
      if (component.route) {
        steps.push({
          type: 'navigate',
          target: component.route,
          selector: '',
          timeout: 10000,
        });
      }
      
      // 等待组件加载
      if (component.selectors.length > 0) {
        steps.push({
          type: 'wait',
          target: component.name,
          selector: component.selectors[0],
          timeout: 5000,
        });
      }
      
      // 为每个可交互元素添加测试步骤
      for (const selector of component.selectors.slice(0, 5)) {
        if (selector.includes('btn') || selector.includes('button')) {
          steps.push({
            type: 'click',
            target: selector,
            selector,
            timeout: 3000,
            optional: true,
          });
        } else if (selector.includes('input') || selector.includes('text')) {
          steps.push({
            type: 'type',
            target: selector,
            selector,
            value: 'test_value',
            timeout: 3000,
            optional: true,
          });
        }
      }
      
      tests.push({
        id: `test-${component.name.toLowerCase()}-smoke`,
        name: `${component.name} 冒烟测试`,
        description: `验证 ${component.name} 组件基本功能`,
        priority: 1,
        type: 'smoke',
        scope: 'component',
        steps,
        signals: [
          { type: 'network-idle', timeout: 5000 },
          { type: 'no-error', timeout: 3000 },
        ],
      });
    }
    
    // 为测试路径生成集成测试
    for (const testPath of testPaths.slice(0, 5)) {
      const steps: TestStep[] = [
        {
          type: 'navigate',
          target: testPath.route,
          selector: '',
          timeout: 10000,
        },
        {
          type: 'wait',
          target: 'page-load',
          selector: 'body',
          timeout: 5000,
        },
      ];
      
      tests.push({
        id: `test-${testPath.id}-integration`,
        name: `${testPath.name} 集成测试`,
        description: `验证 ${testPath.route} 路径的完整功能`,
        priority: testPath.priority,
        type: 'integration',
        scope: 'page',
        steps,
        signals: [
          { type: 'route-match', value: testPath.route, timeout: 5000 },
          { type: 'network-idle', timeout: 10000 },
          { type: 'no-error', timeout: 3000 },
        ],
      });
    }
    
    return tests.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 创建测试 Rule
   */
  private async createTestRule(
    changedFiles: ChangedFile[],
    affectedComponents: AffectedComponent[],
    suggestedTests: SuggestedTest[]
  ): Promise<ChangeImpactTestRule> {
    const now = new Date().toISOString();
    const commitHash = await this.gitAnalyzer.getCommitHash();
    const branch = await this.gitAnalyzer.getCurrentBranch();
    
    const directImpact = affectedComponents.filter(c => c.impactLevel === 'direct').map(c => c.name);
    const indirectImpact = affectedComponents.filter(c => c.impactLevel === 'indirect').map(c => c.name);
    const transitiveImpact = affectedComponents.filter(c => c.impactLevel === 'transitive').map(c => c.name);
    
    return {
      id: `change-impact-test-${Date.now()}`,
      name: `变更影响测试 - ${branch}`,
      version: '1.0.0',
      description: `基于代码变更自动生成的测试规则 (${changedFiles.length} 个文件变更)`,
      trigger: 'on_change',
      enabled: true,
      
      changeContext: {
        commitHash,
        branch,
        changedFiles: changedFiles.map(f => f.path),
        affectedComponents: affectedComponents.map(c => c.name),
        affectedRoutes: [...new Set(affectedComponents.map(c => c.route).filter(Boolean) as string[])],
      },
      
      impactAnalysis: {
        directImpact,
        indirectImpact,
        transitiveImpact,
        totalAffected: affectedComponents.length,
      },
      
      tests: suggestedTests,
      
      config: {
        timeout: 30000,
        retries: 2,
        parallel: false,
        headless: false,
        screenshot: true,
        stopOnFirstFailure: false,
      },
      
      metadata: {
        createdAt: now,
        analyzedAt: now,
        author: 'MCP-CLI',
        tags: ['change-impact', 'auto-generated', branch],
      },
    };
  }

  /**
   * 创建空 Rule
   */
  private createEmptyRule(): ChangeImpactTestRule {
    const now = new Date().toISOString();
    
    return {
      id: `change-impact-test-empty-${Date.now()}`,
      name: '变更影响测试 - 无变更',
      version: '1.0.0',
      description: '未检测到代码变更',
      trigger: 'on_change',
      enabled: false,
      
      changeContext: {
        changedFiles: [],
        affectedComponents: [],
        affectedRoutes: [],
      },
      
      impactAnalysis: {
        directImpact: [],
        indirectImpact: [],
        transitiveImpact: [],
        totalAffected: 0,
      },
      
      tests: [],
      
      config: {
        timeout: 30000,
        retries: 2,
        parallel: false,
        headless: false,
        screenshot: true,
        stopOnFirstFailure: false,
      },
      
      metadata: {
        createdAt: now,
        analyzedAt: now,
        author: 'MCP-CLI',
        tags: ['change-impact', 'empty'],
      },
    };
  }

  /**
   * 保存分析结果
   */
  private async saveAnalysisResult(rule: ChangeImpactTestRule, impactTree: ImpactNode): Promise<void> {
    const outputDir = path.join(this.projectRoot, '.mcp', 'impact-analysis');
    await fs.ensureDir(outputDir);
    
    // 保存 Rule
    const rulePath = path.join(outputDir, `${rule.id}.json`);
    await fs.writeJson(rulePath, rule, { spaces: 2 });
    Logger.info(`Rule 已保存: ${path.relative(this.projectRoot, rulePath)}`);
    
    // 保存影响树
    const treePath = path.join(outputDir, 'impact-tree.json');
    await fs.writeJson(treePath, impactTree, { spaces: 2 });
    Logger.info(`影响树已保存: ${path.relative(this.projectRoot, treePath)}`);
    
    // 保存到 .codebuddy/rules 目录
    const codebuddyRulesDir = path.join(this.projectRoot, '.codebuddy', 'rules');
    await fs.ensureDir(codebuddyRulesDir);
    await fs.writeJson(path.join(codebuddyRulesDir, `${rule.id}.json`), rule, { spaces: 2 });
  }

  // 辅助方法
  private extractComponentName(filePath: string): string {
    const basename = path.basename(filePath, path.extname(filePath));
    return basename
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, c => c.toUpperCase())
      .replace(/\.(component|page|view|container)$/i, '');
  }

  private inferRoute(relativePath: string): string | undefined {
    if (relativePath.includes('/pages/') || relativePath.includes('/views/')) {
      return '/' + relativePath
        .split(/\/(pages|views)\//)[2]
        ?.replace(/\.(tsx?|jsx?|vue)$/, '')
        ?.replace(/\/index$/, '')
        ?.replace(/\\/g, '/');
    }
    return undefined;
  }
}

/**
 * 导出分析命令
 */
export async function analyzeChangeImpact(projectRoot?: string, baseBranch?: string): Promise<ChangeImpactTestRule> {
  const root = projectRoot || process.cwd();
  const analyzer = new ChangeImpactAnalyzer(root);
  return await analyzer.analyzeAndGenerateTestRule(baseBranch);
}
