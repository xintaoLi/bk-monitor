import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { ImpactPrediction, ChangedFileInfo, AffectedModule, TestSuggestion, InvestigationSuggestion } from '../analyzer/impact-predictor.js';
import { ASTImpactAnalysis, FileASTAnalysis, TestPathSuggestion, SideEffectAnalysis } from '../analyzer/ast-impact-analyzer.js';

/**
 * Prompt 生成模式
 */
export type PromptMode = 'ai-analysis' | 'detailed-ast' | 'test-execution';

/**
 * Prompt 生成选项
 */
export interface PromptGeneratorOptions {
  /** 生成模式 */
  mode: PromptMode;
  /** 基础 URL */
  baseUrl?: string;
  /** 输出目录 */
  outputDir?: string;
  /** 是否包含代码片段 */
  includeCodeSnippets?: boolean;
  /** 最大文件数 */
  maxFiles?: number;
}

/**
 * 生成结果
 */
export interface PromptGeneratorResult {
  /** 生成的文件路径 */
  filePath: string;
  /** 文件名 */
  fileName: string;
  /** Prompt 内容 */
  content: string;
  /** 模式 */
  mode: PromptMode;
  /** 统计信息 */
  stats: {
    changedFiles: number;
    affectedModules: number;
    testSuggestions: number;
    totalLines: number;
  };
}

/**
 * 影响分析 Prompt 生成器
 *
 * 功能：
 * 1. 生成供 AI 分析的 Prompt（模式一）
 * 2. 生成基于 AST 的详细分析文档（模式二）
 * 3. 生成可执行的测试 Prompt（模式三）
 */
export class ImpactPromptGenerator {
  private projectRoot: string;
  private options: PromptGeneratorOptions;

  constructor(projectRoot: string, options: PromptGeneratorOptions) {
    this.projectRoot = projectRoot;
    this.options = {
      baseUrl: 'http://localhost:8080',
      outputDir: '.codebuddy/rules/impact',
      includeCodeSnippets: true,
      maxFiles: 20,
      ...options,
    };
  }

  /**
   * 生成 AI 分析 Prompt（模式一）
   *
   * 输出受影响文件和变更代码范围的 Prompt，交给 AI 模型分析
   */
  async generateAIAnalysisPrompt(prediction: ImpactPrediction): Promise<PromptGeneratorResult> {
    Logger.info('生成 AI 分析 Prompt...');

    const lines: string[] = [];
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `impact-analysis-${timestamp}-${prediction.gitInfo.commitHash}.md`;

    // 标题和任务说明
    lines.push('# 代码变更影响分析任务');
    lines.push('');
    lines.push('> 请根据以下变更信息，分析代码变更的影响范围，并给出测试和排查建议。');
    lines.push('');

    // AI 任务指引
    lines.push('## 📋 分析任务');
    lines.push('');
    lines.push('请完成以下分析任务：');
    lines.push('');
    lines.push('### 1. 变更影响评估');
    lines.push('');
    lines.push('- 分析每个变更文件的影响范围');
    lines.push('- 识别可能受影响的业务功能');
    lines.push('- 评估变更的风险等级');
    lines.push('');
    lines.push('### 2. 依赖关系分析');
    lines.push('');
    lines.push('- 检查变更文件的导出是否被其他模块使用');
    lines.push('- 分析接口/类型变更对调用方的影响');
    lines.push('- 识别可能的兼容性问题');
    lines.push('');
    lines.push('### 3. 测试建议');
    lines.push('');
    lines.push('- 列出需要重点测试的功能点');
    lines.push('- 建议测试用例和验证方法');
    lines.push('- 给出测试优先级排序');
    lines.push('');
    lines.push('### 4. 排查建议');
    lines.push('');
    lines.push('- 指出需要重点审查的代码');
    lines.push('- 列出潜在的问题点');
    lines.push('- 给出代码审查清单');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 变更概要
    lines.push('## 一、变更概要');
    lines.push('');
    lines.push('| 属性 | 值 |');
    lines.push('|------|-----|');
    lines.push(`| 分支 | \`${prediction.gitInfo.branch}\` |`);
    lines.push(`| Commit | \`${prediction.gitInfo.commitHash}\` |`);
    lines.push(`| 变更文件数 | ${prediction.changedFiles.length} |`);
    lines.push(`| 影响范围 | ${prediction.impactScope.level} (${prediction.impactScope.totalImpact} 个文件) |`);
    lines.push(`| 风险等级 | ${this.getRiskBadge(prediction.riskAssessment.overallRisk)} (${prediction.riskAssessment.riskScore}/100) |`);
    lines.push('');

    // 变更文件详情
    lines.push('## 二、变更文件详情');
    lines.push('');

    const filesToShow = prediction.changedFiles.slice(0, this.options.maxFiles!);
    for (let i = 0; i < filesToShow.length; i++) {
      const file = filesToShow[i];
      lines.push(`### ${i + 1}. \`${file.relativePath}\``);
      lines.push('');
      lines.push('**基本信息**');
      lines.push('');
      lines.push(`- 文件类型: ${this.getFileTypeLabel(file.fileType)}`);
      lines.push(`- 模块: ${file.moduleCategory}`);
      lines.push(`- 变更行数: +${file.stats.additions} / -${file.stats.deletions}`);
      lines.push(`- 影响权重: ${file.impactWeight}/100`);
      lines.push(`- 被依赖数: ${file.dependentCount} 个文件`);
      lines.push('');

      // 受影响的实体
      if (file.affectedEntities.length > 0) {
        lines.push('**受影响的代码实体**');
        lines.push('');
        lines.push('| 类型 | 名称 | 行号 | 变更 | 导出 |');
        lines.push('|------|------|------|------|------|');
        for (const entity of file.affectedEntities.slice(0, 10)) {
          const lineRange = entity.startLine === entity.endLine
            ? `L${entity.startLine}`
            : `L${entity.startLine}-${entity.endLine}`;
          const exportBadge = entity.isExported ? '✅' : '-';
          lines.push(`| ${entity.type} | \`${entity.name}\` | ${lineRange} | ${entity.changeType} | ${exportBadge} |`);
        }
        lines.push('');
      }

      // 导出的符号
      if (file.exportedSymbols.length > 0) {
        lines.push('**导出的符号及使用情况**');
        lines.push('');
        for (const symbol of file.exportedSymbols.slice(0, 5)) {
          lines.push(`- \`${symbol.name}\` (${symbol.type}): 被 ${symbol.usageCount} 处使用`);
          if (symbol.usedBy.length > 0) {
            lines.push(`  - 使用者: ${symbol.usedBy.slice(0, 3).map(f => `\`${f}\``).join(', ')}`);
          }
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    if (prediction.changedFiles.length > this.options.maxFiles!) {
      lines.push(`> 还有 ${prediction.changedFiles.length - this.options.maxFiles!} 个变更文件未显示`);
      lines.push('');
    }

    // 受影响的模块
    lines.push('## 三、受影响的模块');
    lines.push('');
    lines.push('| 模块 | 影响类型 | 风险等级 | 受影响文件数 | 关联路由 |');
    lines.push('|------|----------|----------|--------------|----------|');
    for (const module of prediction.affectedModules.slice(0, 15)) {
      const impactBadge = module.impactType === 'direct' ? '🔴 直接' : module.impactType === 'indirect' ? '🟡 间接' : '🟢 传递';
      const routes = module.relatedRoutes.slice(0, 2).join(', ') || '-';
      lines.push(`| ${module.name} | ${impactBadge} | ${module.riskLevel} | ${module.affectedFiles.length} | ${routes} |`);
    }
    lines.push('');

    // 风险评估
    lines.push('## 四、风险评估');
    lines.push('');
    lines.push(`**总体风险**: ${this.getRiskBadge(prediction.riskAssessment.overallRisk)}`);
    lines.push('');

    if (prediction.riskAssessment.riskFactors.length > 0) {
      lines.push('**风险因素**');
      lines.push('');
      for (const factor of prediction.riskAssessment.riskFactors) {
        lines.push(`- **${factor.name}** (${factor.severity}): ${factor.description}`);
      }
      lines.push('');
    }

    if (prediction.riskAssessment.mitigations.length > 0) {
      lines.push('**缓解建议**');
      lines.push('');
      for (const mitigation of prediction.riskAssessment.mitigations) {
        lines.push(`- ${mitigation}`);
      }
      lines.push('');
    }

    // 影响范围说明
    lines.push('## 五、影响范围');
    lines.push('');
    lines.push(`- 直接影响: ${prediction.impactScope.directImpact} 个文件`);
    lines.push(`- 间接影响: ${prediction.impactScope.indirectImpact} 个文件`);
    lines.push(`- 传递影响: ${prediction.impactScope.transitiveImpact} 个文件`);
    lines.push(`- 最大深度: ${prediction.impactScope.maxDepth} 层`);
    lines.push('');
    lines.push(`> ${prediction.impactScope.description}`);
    lines.push('');

    // 预生成的测试建议
    lines.push('## 六、初步测试建议');
    lines.push('');
    for (const suggestion of prediction.testSuggestions.slice(0, 10)) {
      lines.push(`### ${suggestion.id}: ${suggestion.description}`);
      lines.push('');
      lines.push(`- **类型**: ${suggestion.type}`);
      lines.push(`- **优先级**: ${suggestion.priority}`);
      lines.push(`- **目标**: ${suggestion.target}`);
      lines.push('');
      lines.push('**测试步骤**');
      lines.push('');
      for (const step of suggestion.steps) {
        lines.push(`1. ${step}`);
      }
      lines.push('');
    }

    // 排查建议
    lines.push('## 七、排查建议');
    lines.push('');
    for (const suggestion of prediction.investigationSuggestions.slice(0, 10)) {
      lines.push(`### ${suggestion.id}: ${suggestion.description}`);
      lines.push('');
      lines.push(`- **类型**: ${suggestion.type}`);
      lines.push(`- **优先级**: ${suggestion.priority}`);
      lines.push('');
      lines.push('**排查要点**');
      lines.push('');
      for (const checkpoint of suggestion.checkpoints) {
        lines.push(`- [ ] ${checkpoint}`);
      }
      lines.push('');
      if (suggestion.potentialIssues.length > 0) {
        lines.push('**潜在问题**');
        lines.push('');
        for (const issue of suggestion.potentialIssues) {
          lines.push(`- ⚠️ ${issue}`);
        }
        lines.push('');
      }
    }

    // 结构化数据
    lines.push('---');
    lines.push('');
    lines.push('## 附录：结构化数据');
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>点击展开 JSON 格式数据</summary>');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify({
      version: '1.0',
      mode: 'ai-analysis',
      timestamp: prediction.timestamp,
      gitInfo: prediction.gitInfo,
      impactScope: prediction.impactScope,
      riskAssessment: {
        overallRisk: prediction.riskAssessment.overallRisk,
        riskScore: prediction.riskAssessment.riskScore,
      },
      changedFiles: prediction.changedFiles.map(f => ({
        path: f.relativePath,
        type: f.fileType,
        impactWeight: f.impactWeight,
        dependentCount: f.dependentCount,
        entities: f.affectedEntities.length,
        exports: f.exportedSymbols.length,
      })),
      affectedModules: prediction.affectedModules.map(m => ({
        name: m.name,
        impactType: m.impactType,
        riskLevel: m.riskLevel,
        files: m.affectedFiles.length,
      })),
    }, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');

    const content = lines.join('\n');

    // 保存文件
    const outputDir = path.join(this.projectRoot, this.options.outputDir!);
    await fs.ensureDir(outputDir);
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, content);

    Logger.success(`AI 分析 Prompt 已生成: ${path.relative(this.projectRoot, filePath)}`);

    return {
      filePath: path.relative(this.projectRoot, filePath),
      fileName,
      content,
      mode: 'ai-analysis',
      stats: {
        changedFiles: prediction.changedFiles.length,
        affectedModules: prediction.affectedModules.length,
        testSuggestions: prediction.testSuggestions.length,
        totalLines: lines.length,
      },
    };
  }

  /**
   * 生成详细 AST 分析文档（模式二）
   *
   * 使用 AST 解析代码树，直接分析受影响的具体文件
   */
  async generateDetailedASTPrompt(
    prediction: ImpactPrediction,
    astAnalysis: ASTImpactAnalysis
  ): Promise<PromptGeneratorResult> {
    Logger.info('生成详细 AST 分析文档...');

    const lines: string[] = [];
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `impact-ast-analysis-${timestamp}-${prediction.gitInfo.commitHash}.md`;

    // 标题
    lines.push('# 代码变更 AST 深度分析报告');
    lines.push('');
    lines.push('> 本文档基于 AST 解析生成，包含函数调用链、组件依赖树、副作用分析等详细信息。');
    lines.push('');

    // 分析概要
    lines.push('## 一、分析概要');
    lines.push('');
    lines.push('| 指标 | 值 |');
    lines.push('|------|-----|');
    lines.push(`| 分析时间 | ${astAnalysis.timestamp} |`);
    lines.push(`| 分析文件数 | ${astAnalysis.fileAnalyses.length} |`);
    lines.push(`| 调用链数 | ${astAnalysis.callChains.length} |`);
    lines.push(`| 组件树节点 | ${astAnalysis.componentTree.totalNodes} |`);
    lines.push(`| 副作用数 | ${astAnalysis.sideEffects.length} |`);
    lines.push(`| 测试路径建议 | ${astAnalysis.testPathSuggestions.length} |`);
    lines.push('');

    // 文件分析详情
    lines.push('## 二、文件分析详情');
    lines.push('');

    for (const fileAnalysis of astAnalysis.fileAnalyses.slice(0, this.options.maxFiles!)) {
      lines.push(`### \`${fileAnalysis.relativePath}\``);
      lines.push('');

      // 变更的函数
      if (fileAnalysis.changedFunctions.length > 0) {
        lines.push('#### 变更的函数');
        lines.push('');
        lines.push('| 函数名 | 行号 | 异步 | 导出 | 复杂度 | 调用 | 副作用 |');
        lines.push('|--------|------|------|------|--------|------|--------|');
        for (const func of fileAnalysis.changedFunctions) {
          const lineRange = `L${func.startLine}-${func.endLine}`;
          const asyncBadge = func.isAsync ? '✅' : '-';
          const exportBadge = func.isExported ? '✅' : '-';
          const calls = func.calls.slice(0, 3).join(', ') || '-';
          const effects = func.sideEffects.slice(0, 2).join(', ') || '-';
          lines.push(`| \`${func.name}\` | ${lineRange} | ${asyncBadge} | ${exportBadge} | ${func.complexity} | ${calls} | ${effects} |`);
        }
        lines.push('');
      }

      // 变更的组件
      if (fileAnalysis.changedComponents.length > 0) {
        lines.push('#### 变更的组件');
        lines.push('');
        for (const component of fileAnalysis.changedComponents) {
          lines.push(`**${component.name}** (${component.type})`);
          lines.push('');
          lines.push(`- 行号: L${component.startLine}-${component.endLine}`);
          if (component.hooks.length > 0) {
            lines.push(`- Hooks: ${component.hooks.join(', ')}`);
          }
          if (component.childComponents.length > 0) {
            lines.push(`- 子组件: ${component.childComponents.join(', ')}`);
          }
          if (component.eventHandlers.length > 0) {
            lines.push(`- 事件处理: ${component.eventHandlers.join(', ')}`);
          }
          lines.push('');
        }
      }

      // 变更的类型
      if (fileAnalysis.changedTypes.length > 0) {
        lines.push('#### 变更的类型/接口');
        lines.push('');
        for (const type of fileAnalysis.changedTypes) {
          lines.push(`- \`${type.name}\` (${type.kind}): L${type.startLine}-${type.endLine}`);
        }
        lines.push('');
      }

      // 导入分析
      if (fileAnalysis.imports.length > 0) {
        lines.push('#### 导入依赖');
        lines.push('');
        const internalImports = fileAnalysis.imports.filter(i => !i.isExternal);
        const externalImports = fileAnalysis.imports.filter(i => i.isExternal);

        if (internalImports.length > 0) {
          lines.push('**内部模块**');
          lines.push('');
          for (const imp of internalImports.slice(0, 5)) {
            lines.push(`- \`${imp.moduleSpecifier}\`: ${imp.imports.join(', ')}`);
          }
          lines.push('');
        }

        if (externalImports.length > 0) {
          lines.push('**外部依赖**');
          lines.push('');
          for (const imp of externalImports.slice(0, 5)) {
            lines.push(`- \`${imp.moduleSpecifier}\`: ${imp.imports.join(', ')}`);
          }
          lines.push('');
        }
      }

      lines.push('---');
      lines.push('');
    }

    // 调用链分析
    lines.push('## 三、函数调用链');
    lines.push('');

    if (astAnalysis.callChains.length > 0) {
      for (const chain of astAnalysis.callChains.filter(c => c.riskLevel === 'high').slice(0, 10)) {
        lines.push(`### ${chain.id}: ${chain.entryPoint}`);
        lines.push('');
        lines.push(`- **入口文件**: ${chain.entryFile}`);
        lines.push(`- **深度**: ${chain.depth}`);
        lines.push(`- **涉及文件**: ${chain.involvedFiles.length}`);
        lines.push(`- **风险等级**: ${chain.riskLevel}`);
        lines.push('');
        lines.push('**调用路径**');
        lines.push('');
        lines.push('```');
        for (const node of chain.path) {
          const changedMark = node.isChanged ? ' ⚠️' : '';
          const indent = '  '.repeat(node.depth);
          lines.push(`${indent}${node.name} (${node.file}:${node.line})${changedMark}`);
        }
        lines.push('```');
        lines.push('');
      }
    } else {
      lines.push('> 未检测到高风险调用链');
      lines.push('');
    }

    // 组件依赖树
    lines.push('## 四、组件依赖树');
    lines.push('');

    if (astAnalysis.componentTree.roots.length > 0) {
      lines.push(`- 根组件数: ${astAnalysis.componentTree.roots.length}`);
      lines.push(`- 总节点数: ${astAnalysis.componentTree.totalNodes}`);
      lines.push(`- 最大深度: ${astAnalysis.componentTree.maxDepth}`);
      lines.push(`- 受影响节点: ${astAnalysis.componentTree.affectedNodes.length}`);
      lines.push('');

      lines.push('**组件树结构**');
      lines.push('');
      lines.push('```');
      for (const root of astAnalysis.componentTree.roots.slice(0, 5)) {
        this.renderComponentTree(root, lines, 0);
      }
      lines.push('```');
      lines.push('');
    } else {
      lines.push('> 未检测到组件依赖');
      lines.push('');
    }

    // 副作用分析
    lines.push('## 五、副作用分析');
    lines.push('');

    if (astAnalysis.sideEffects.length > 0) {
      lines.push('| 文件 | 来源 | 类型 | 风险 | 建议 |');
      lines.push('|------|------|------|------|------|');
      for (const effect of astAnalysis.sideEffects.slice(0, 20)) {
        const riskBadge = effect.riskLevel === 'high' ? '🔴' : effect.riskLevel === 'medium' ? '🟡' : '🟢';
        lines.push(`| ${path.basename(effect.file)} | ${effect.source} | ${effect.type} | ${riskBadge} | ${effect.suggestion.slice(0, 30)}... |`);
      }
      lines.push('');
    } else {
      lines.push('> 未检测到副作用');
      lines.push('');
    }

    // 测试路径建议
    lines.push('## 六、测试路径建议');
    lines.push('');

    for (const suggestion of astAnalysis.testPathSuggestions.slice(0, 10)) {
      lines.push(`### ${suggestion.id}: ${suggestion.name}`);
      lines.push('');
      lines.push(`- **优先级**: ${suggestion.priority}`);
      lines.push(`- **入口**: ${suggestion.entryPoint}`);
      if (suggestion.route) {
        lines.push(`- **路由**: ${suggestion.route}`);
      }
      lines.push(`- **风险说明**: ${suggestion.riskDescription}`);
      lines.push('');

      if (suggestion.components.length > 0) {
        lines.push(`**涉及组件**: ${suggestion.components.join(', ')}`);
        lines.push('');
      }

      if (suggestion.functions.length > 0) {
        lines.push(`**涉及函数**: ${suggestion.functions.join(', ')}`);
        lines.push('');
      }

      lines.push('**测试步骤**');
      lines.push('');
      for (const step of suggestion.steps) {
        lines.push(`${step.order}. ${step.description}`);
        if (step.selector) {
          lines.push(`   - 选择器: \`${step.selector}\``);
        }
      }
      lines.push('');

      lines.push('**验证点**');
      lines.push('');
      for (const verification of suggestion.verifications) {
        lines.push(`- [ ] ${verification}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    const content = lines.join('\n');

    // 保存文件
    const outputDir = path.join(this.projectRoot, this.options.outputDir!);
    await fs.ensureDir(outputDir);
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, content);

    Logger.success(`AST 分析文档已生成: ${path.relative(this.projectRoot, filePath)}`);

    return {
      filePath: path.relative(this.projectRoot, filePath),
      fileName,
      content,
      mode: 'detailed-ast',
      stats: {
        changedFiles: astAnalysis.fileAnalyses.length,
        affectedModules: astAnalysis.componentTree.totalNodes,
        testSuggestions: astAnalysis.testPathSuggestions.length,
        totalLines: lines.length,
      },
    };
  }

  /**
   * 生成可执行的测试 Prompt（模式三）
   *
   * 生成测试路径的 Prompt，可直接交给 AI 执行测试
   */
  async generateTestExecutionPrompt(
    prediction: ImpactPrediction,
    astAnalysis?: ASTImpactAnalysis
  ): Promise<PromptGeneratorResult> {
    Logger.info('生成测试执行 Prompt...');

    const lines: string[] = [];
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `impact-test-${timestamp}-${prediction.gitInfo.commitHash}.md`;

    // 标题
    lines.push('# 变更影响测试执行指南');
    lines.push('');
    lines.push('> 本文档包含可直接执行的测试步骤，请使用 Chrome DevTools MCP 执行以下测试。');
    lines.push('');

    // 测试环境
    lines.push('## 测试环境');
    lines.push('');
    lines.push(`- **基础 URL**: ${this.options.baseUrl}`);
    lines.push(`- **分支**: ${prediction.gitInfo.branch}`);
    lines.push(`- **Commit**: ${prediction.gitInfo.commitHash}`);
    lines.push(`- **风险等级**: ${this.getRiskBadge(prediction.riskAssessment.overallRisk)}`);
    lines.push('');

    // 测试概要
    lines.push('## 测试概要');
    lines.push('');

    const testSuggestions = astAnalysis?.testPathSuggestions || [];
    const criticalTests = testSuggestions.filter(t => t.priority === 'critical');
    const highTests = testSuggestions.filter(t => t.priority === 'high');
    const mediumTests = testSuggestions.filter(t => t.priority === 'medium');

    lines.push(`- 🔴 关键测试: ${criticalTests.length} 个`);
    lines.push(`- 🟠 高优先级: ${highTests.length} 个`);
    lines.push(`- 🟡 中优先级: ${mediumTests.length} 个`);
    lines.push('');

    // 快速开始
    lines.push('## 快速开始');
    lines.push('');
    lines.push('请按以下步骤执行测试：');
    lines.push('');
    lines.push('1. 确保开发服务器已启动');
    lines.push('2. 使用 Chrome DevTools MCP 连接浏览器');
    lines.push('3. 按优先级顺序执行以下测试场景');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 测试场景
    let testIndex = 1;

    // 关键测试
    if (criticalTests.length > 0) {
      lines.push('## 🔴 关键测试');
      lines.push('');
      for (const test of criticalTests) {
        lines.push(...this.generateTestScenario(test, testIndex++));
      }
    }

    // 高优先级测试
    if (highTests.length > 0) {
      lines.push('## 🟠 高优先级测试');
      lines.push('');
      for (const test of highTests) {
        lines.push(...this.generateTestScenario(test, testIndex++));
      }
    }

    // 中优先级测试
    if (mediumTests.length > 0) {
      lines.push('## 🟡 中优先级测试');
      lines.push('');
      for (const test of mediumTests.slice(0, 10)) {
        lines.push(...this.generateTestScenario(test, testIndex++));
      }
    }

    // 如果没有 AST 分析，使用预测结果生成测试
    if (!astAnalysis) {
      lines.push('## 基于变更的测试');
      lines.push('');

      for (const component of prediction.affectedComponents.slice(0, 10)) {
        lines.push(`### 测试 ${testIndex++}: ${component.name}`);
        lines.push('');
        lines.push(`**路由**: ${component.route || '/'}`);
        lines.push(`**影响类型**: ${component.impactType}`);
        lines.push('');
        lines.push('```');
        lines.push(`请执行以下测试：`);
        lines.push('');
        lines.push(`1. 导航到页面`);
        lines.push(`   工具: navigate_page`);
        lines.push(`   参数: { "url": "${this.options.baseUrl}${component.route || '/'}" }`);
        lines.push('');
        lines.push(`2. 获取页面快照`);
        lines.push(`   工具: take_snapshot`);
        lines.push('');
        lines.push(`3. 检查控制台错误`);
        lines.push(`   工具: list_console_messages`);
        lines.push(`   验证: 无 error 类型消息`);
        lines.push('');
        lines.push(`4. 截图保存`);
        lines.push(`   工具: take_screenshot`);
        lines.push('');
        lines.push('通过标准: 页面正常加载，无错误');
        lines.push('```');
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    // 测试通过标准
    lines.push('## 测试通过标准');
    lines.push('');
    lines.push('- [ ] 所有页面能够正常加载');
    lines.push('- [ ] 无 JavaScript 控制台错误');
    lines.push('- [ ] 关键交互功能正常');
    lines.push('- [ ] 页面布局无异常');
    lines.push('- [ ] 网络请求正常响应');
    lines.push('');

    // 测试报告模板
    lines.push('## 测试报告模板');
    lines.push('');
    lines.push('```markdown');
    lines.push('## 测试报告');
    lines.push('');
    lines.push('- 测试时间: [填写]');
    lines.push('- 测试人员: AI');
    lines.push('- 测试结果: [通过/失败]');
    lines.push('');
    lines.push('### 测试结果汇总');
    lines.push('');
    lines.push('| 测试场景 | 结果 | 备注 |');
    lines.push('|----------|------|------|');
    lines.push('| ... | ... | ... |');
    lines.push('');
    lines.push('### 发现的问题');
    lines.push('');
    lines.push('1. [问题描述]');
    lines.push('');
    lines.push('### 截图');
    lines.push('');
    lines.push('[附加截图]');
    lines.push('```');
    lines.push('');

    const content = lines.join('\n');

    // 保存文件
    const outputDir = path.join(this.projectRoot, this.options.outputDir!);
    await fs.ensureDir(outputDir);
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, content);

    Logger.success(`测试执行 Prompt 已生成: ${path.relative(this.projectRoot, filePath)}`);

    return {
      filePath: path.relative(this.projectRoot, filePath),
      fileName,
      content,
      mode: 'test-execution',
      stats: {
        changedFiles: prediction.changedFiles.length,
        affectedModules: prediction.affectedModules.length,
        testSuggestions: testSuggestions.length,
        totalLines: lines.length,
      },
    };
  }

  // ============ 辅助方法 ============

  private generateTestScenario(test: TestPathSuggestion, index: number): string[] {
    const lines: string[] = [];

    lines.push(`### 测试 ${index}: ${test.name}`);
    lines.push('');
    lines.push(`**优先级**: ${test.priority}`);
    if (test.route) {
      lines.push(`**路由**: ${test.route}`);
    }
    lines.push(`**风险说明**: ${test.riskDescription}`);
    lines.push('');
    lines.push('```');
    lines.push(`请执行以下测试：`);
    lines.push('');

    for (const step of test.steps) {
      lines.push(`${step.order}. ${step.description}`);
      if (step.action === 'navigate') {
        lines.push(`   工具: navigate_page`);
        lines.push(`   参数: { "url": "${this.options.baseUrl}${step.target}" }`);
      } else if (step.action === 'click') {
        lines.push(`   工具: click`);
        lines.push(`   参数: { "selector": "${step.selector || step.target}" }`);
      } else if (step.action === 'wait') {
        lines.push(`   工具: wait_for`);
        lines.push(`   参数: { "selector": "${step.selector || step.target}" }`);
      } else if (step.action === 'input') {
        lines.push(`   工具: fill`);
        lines.push(`   参数: { "selector": "${step.selector}", "value": "${step.value || 'test'}" }`);
      } else if (step.action === 'assert') {
        lines.push(`   工具: take_snapshot`);
        lines.push(`   验证: ${step.description}`);
      }
      lines.push('');
    }

    lines.push('验证点:');
    for (const verification of test.verifications) {
      lines.push(`- ${verification}`);
    }
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');

    return lines;
  }

  private renderComponentTree(node: any, lines: string[], depth: number): void {
    const indent = '  '.repeat(depth);
    const changedMark = node.isChanged ? ' ⚠️' : '';
    const affectedMark = node.isAffected && !node.isChanged ? ' 🔄' : '';
    lines.push(`${indent}├── ${node.name}${changedMark}${affectedMark}`);

    for (const child of node.children || []) {
      this.renderComponentTree(child, lines, depth + 1);
    }
  }

  private getRiskBadge(risk: string): string {
    const badges: Record<string, string> = {
      critical: '🔴 严重',
      high: '🟠 高',
      medium: '🟡 中',
      low: '🟢 低',
      minimal: '⚪ 极低',
    };
    return badges[risk] || risk;
  }

  private getFileTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      component: '📦 组件',
      page: '📄 页面',
      util: '🔧 工具',
      hook: '🪝 Hook',
      store: '📊 状态',
      api: '🌐 API',
      config: '⚙️ 配置',
      type: '📝 类型',
      style: '🎨 样式',
      test: '🧪 测试',
      other: '📁 其他',
    };
    return labels[type] || type;
  }
}

/**
 * 导出生成函数
 */
export async function generateImpactPrompt(
  prediction: ImpactPrediction,
  options: PromptGeneratorOptions,
  astAnalysis?: ASTImpactAnalysis,
  projectRoot?: string
): Promise<PromptGeneratorResult> {
  const root = projectRoot || process.cwd();
  const generator = new ImpactPromptGenerator(root, options);

  switch (options.mode) {
    case 'ai-analysis':
      return generator.generateAIAnalysisPrompt(prediction);
    case 'detailed-ast':
      if (!astAnalysis) {
        throw new Error('detailed-ast 模式需要提供 AST 分析结果');
      }
      return generator.generateDetailedASTPrompt(prediction, astAnalysis);
    case 'test-execution':
      return generator.generateTestExecutionPrompt(prediction, astAnalysis);
    default:
      return generator.generateAIAnalysisPrompt(prediction);
  }
}
