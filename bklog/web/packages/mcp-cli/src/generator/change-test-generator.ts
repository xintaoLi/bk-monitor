import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { ChangeImpactResult, AffectedRoute } from '../analyzer/change-analyzer.js';
import { RouterAnalysisResult, PageComponent } from '../analyzer/router-analyzer.js';
import { DevToolsMCPRule, TestScenario, StructuredStep } from './devtools-mcp-rule.js';
import {
  DetailedChangeAnalysis,
  ChangeDetail,
  CodeEntity,
  analyzeChangeDetails,
} from '../analyzer/change-detail-analyzer.js';

/**
 * 变更测试文件生成器
 *
 * 根据变更影响分析结果生成针对性的测试文件
 * 输出详细的变更描述，便于大模型理解和后续测试分析
 */
export class ChangeTestGenerator {
  private projectRoot: string;
  private baseUrl: string;
  private outputDir: string;
  private detailedAnalysis: DetailedChangeAnalysis | null = null;

  constructor(projectRoot: string, baseUrl: string, outputDir?: string) {
    this.projectRoot = projectRoot;
    this.baseUrl = baseUrl;
    this.outputDir = outputDir || '.codebuddy/rules/changes';
  }

  /**
   * 设置详细变更分析结果
   */
  setDetailedAnalysis(analysis: DetailedChangeAnalysis): void {
    this.detailedAnalysis = analysis;
  }

  /**
   * 生成变更测试文件
   */
  async generate(
    impactResult: ChangeImpactResult,
    routerAnalysis: RouterAnalysisResult,
    existingRule?: DevToolsMCPRule
  ): Promise<GenerateResult> {
    Logger.header('生成变更测试文件');

    // 大范围变更，提示全量测试
    if (impactResult.impactScope === 'large') {
      Logger.warn(`变更影响范围较大（${impactResult.affectedRoutes.length} 个路由）`);
      Logger.info('建议执行全量测试');

      return {
        type: 'large-scope',
        affectedRouteCount: impactResult.affectedRoutes.length,
        suggestion: this.generateLargeScopeSuggestion(impactResult),
      };
    }

    // 小范围变更，生成独立测试文件
    Logger.info(`生成针对 ${impactResult.affectedRoutes.length} 个路由的测试文件...`);

    const fileName = this.generateFileName(impactResult);
    const content = this.generateTestFileContent(impactResult, routerAnalysis, existingRule);

    // 确保输出目录存在
    const outputDir = path.join(this.projectRoot, this.outputDir);
    await fs.ensureDir(outputDir);

    // 写入文件
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, content);

    Logger.success(`测试文件已生成: ${path.relative(this.projectRoot, filePath)}`);

    return {
      type: 'small-scope',
      filePath: path.relative(this.projectRoot, filePath),
      fileName,
      affectedRouteCount: impactResult.affectedRoutes.length,
      scenarios: impactResult.affectedRoutes.length * 2, // 每个路由生成冒烟+功能测试
    };
  }

  /**
   * 生成文件名
   */
  private generateFileName(impactResult: ChangeImpactResult): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const hash = impactResult.gitInfo.commitHash || 'uncommitted';
    return `change-${date}-${hash}.md`;
  }

  /**
   * 生成测试文件内容
   */
  private generateTestFileContent(
    impactResult: ChangeImpactResult,
    routerAnalysis: RouterAnalysisResult,
    existingRule?: DevToolsMCPRule
  ): string {
    const lines: string[] = [];

    // 标题和元信息
    lines.push(`# 变更影响测试 - ${new Date().toLocaleString('zh-CN')}`);
    lines.push('');
    lines.push('> 本文档由 mcp-e2e 自动生成，用于辅助大模型理解代码变更并进行测试分析。');
    lines.push('');

    // ============ 第一部分：变更概要（供大模型快速理解） ============
    lines.push('## 一、变更概要');
    lines.push('');
    lines.push('### 基本信息');
    lines.push('');
    lines.push(`| 属性 | 值 |`);
    lines.push(`|------|-----|`);
    lines.push(`| 分支 | \`${impactResult.gitInfo.branch}\` |`);
    lines.push(`| Commit | \`${impactResult.gitInfo.commitHash}\` |`);
    lines.push(`| 变更文件数 | ${impactResult.changedFiles.length} |`);
    lines.push(`| 影响路由数 | ${impactResult.affectedRoutes.length} |`);
    lines.push(`| 风险等级 | ${this.getRiskLevelText(impactResult.riskLevel)} |`);
    lines.push(`| 测试基础 URL | \`${this.baseUrl}\` |`);
    lines.push('');

    // 添加详细变更统计（如果有）
    if (this.detailedAnalysis) {
      const summary = this.detailedAnalysis.summary;
      lines.push('### 变更统计');
      lines.push('');
      lines.push(`- **新增行数**: ${summary.totalAdditions}`);
      lines.push(`- **删除行数**: ${summary.totalDeletions}`);
      lines.push(`- **受影响函数**: ${summary.affectedFunctions}`);
      lines.push(`- **受影响组件**: ${summary.affectedComponents}`);
      lines.push('');

      if (Object.keys(summary.byFileType).length > 0) {
        lines.push('### 按文件类型分布');
        lines.push('');
        for (const [type, count] of Object.entries(summary.byFileType)) {
          lines.push(`- ${this.getFileTypeLabel(type)}: ${count} 个文件`);
        }
        lines.push('');
      }
    }

    // ============ 第二部分：详细变更描述（核心内容） ============
    lines.push('---');
    lines.push('');
    lines.push('## 二、详细变更描述');
    lines.push('');
    lines.push('> 以下是每个变更文件的详细信息，包括变更位置（行号）、变更的函数/组件/配置名称等。');
    lines.push('');

    // 生成详细变更描述
    if (this.detailedAnalysis && this.detailedAnalysis.changes.length > 0) {
      lines.push(...this.generateDetailedChangeDescription(this.detailedAnalysis.changes));
    } else {
      // 使用基础变更信息
      lines.push(...this.generateBasicChangeDescription(impactResult.changedFiles));
    }
    lines.push('');

    // ============ 第三部分：影响范围分析 ============
    lines.push('---');
    lines.push('');
    lines.push('## 三、影响范围分析');
    lines.push('');
    lines.push('### 受影响的路由');
    lines.push('');
    lines.push('| 路由 | 组件 | 影响类型 | 优先级 | 关联变更 |');
    lines.push('|------|------|----------|--------|----------|');
    for (const route of impactResult.affectedRoutes) {
      const impactText = route.impactType === 'direct' ? '🔴 直接影响' : '🟡 间接影响';
      const priorityText = this.getPriorityText(route.priority);
      const relatedChanges = route.relatedChanges.slice(0, 2).map(c => `\`${path.basename(c)}\``).join(', ');
      lines.push(`| \`${route.route}\` | ${route.component} | ${impactText} | ${priorityText} | ${relatedChanges || '-'} |`);
    }
    lines.push('');

    // ============ 第四部分：测试范围 ============
    lines.push('---');
    lines.push('');
    lines.push('## 四、测试范围');
    lines.push('');
    lines.push('请按以下顺序执行测试，确保本次变更不影响原有功能。');
    lines.push('');

    // 为每个受影响的路由生成测试
    let testIndex = 1;
    for (const route of impactResult.affectedRoutes) {
      const pageComponent = routerAnalysis.pageComponents.find(c => c.route === route.route);
      const priorityBadge = route.priority === 'high' ? '🔴' : route.priority === 'medium' ? '🟡' : '🟢';

      lines.push(`### ${testIndex}. ${route.route} - ${route.name} ${priorityBadge}`);
      lines.push('');
      lines.push(`**组件**: ${route.component}`);
      lines.push(`**影响原因**: ${route.reason}`);
      lines.push('');

      // 冒烟测试
      lines.push('#### 冒烟测试');
      lines.push('');
      lines.push(this.generateSmokeTestPrompt(route, pageComponent));
      lines.push('');

      // 功能测试（如果有交互元素）
      if (pageComponent && pageComponent.interactiveElements.length > 0) {
        lines.push('#### 功能测试');
        lines.push('');
        lines.push(this.generateFunctionalTestPrompt(route, pageComponent));
        lines.push('');
      }

      // Test-ID 速查
      if (route.testIds.length > 0) {
        lines.push('#### 可用 Test-ID');
        lines.push('');
        for (const testId of route.testIds.slice(0, 10)) {
          lines.push(`- \`[data-testid="${testId}"]\``);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
      testIndex++;
    }

    // ============ 第五部分：AI 分析指引 ============
    lines.push('---');
    lines.push('');
    lines.push('## 五、AI 分析指引');
    lines.push('');
    lines.push('### 变更入口文件');
    lines.push('');
    lines.push('以下是本次变更的入口文件，AI 可以从这些文件开始分析：');
    lines.push('');
    for (const file of impactResult.changedFiles.slice(0, 5)) {
      lines.push(`- \`${file.relativePath}\``);
    }
    if (impactResult.changedFiles.length > 5) {
      lines.push(`- ... 还有 ${impactResult.changedFiles.length - 5} 个文件`);
    }
    lines.push('');

    // 生成 AI 理解摘要
    lines.push('### 变更理解要点');
    lines.push('');
    lines.push('请 AI 在分析时关注以下要点：');
    lines.push('');
    lines.push('1. **变更内容理解**');
    lines.push('   - 查看"详细变更描述"部分，了解每个文件的具体变更');
    lines.push('   - 关注变更的函数/组件名称及其行号范围');
    lines.push('   - 理解变更的代码实体类型（函数、组件、配置等）');
    lines.push('');
    lines.push('2. **影响范围评估**');
    lines.push('   - 分析受影响的路由及其关联关系');
    lines.push('   - 识别直接影响和间接影响的区别');
    lines.push('   - 评估变更可能带来的风险');
    lines.push('');
    lines.push('3. **测试策略建议**');
    lines.push('   - 根据变更内容确定测试优先级');
    lines.push('   - 针对变更的函数/组件设计测试用例');
    lines.push('   - 考虑边界条件和异常情况');
    lines.push('');

    // 执行说明
    lines.push('---');
    lines.push('');
    lines.push('## 六、执行说明');
    lines.push('');
    lines.push('### 在 CodeBuddy 中执行');
    lines.push('');
    lines.push('1. 引用此文件: `@' + path.join(this.outputDir, this.generateFileName(impactResult)) + '`');
    lines.push('2. 告诉 AI: "请执行上述测试"');
    lines.push('3. AI 将使用 Chrome DevTools MCP 自动执行测试');
    lines.push('');
    lines.push('### 命令行执行');
    lines.push('');
    lines.push('```bash');
    lines.push(`mcp-e2e test:run-prompt ${path.join(this.outputDir, this.generateFileName(impactResult))} --base-url ${this.baseUrl}`);
    lines.push('```');
    lines.push('');

    // 测试通过标准
    lines.push('## 七、测试通过标准');
    lines.push('');
    lines.push('- [ ] 所有页面能够正常加载');
    lines.push('- [ ] 无 JavaScript 控制台错误');
    lines.push('- [ ] 关键交互功能正常');
    lines.push('- [ ] 页面布局无异常');
    lines.push('');

    // 添加 JSON 格式的结构化数据（便于程序解析）
    lines.push('---');
    lines.push('');
    lines.push('## 附录：结构化数据');
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>点击展开 JSON 格式数据（供程序解析）</summary>');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      gitInfo: impactResult.gitInfo,
      summary: {
        changedFiles: impactResult.changedFiles.length,
        affectedRoutes: impactResult.affectedRoutes.length,
        riskLevel: impactResult.riskLevel,
        impactScope: impactResult.impactScope,
      },
      changedFiles: impactResult.changedFiles.map(f => f.relativePath),
      affectedRoutes: impactResult.affectedRoutes.map(r => ({
        route: r.route,
        name: r.name,
        component: r.component,
        impactType: r.impactType,
        priority: r.priority,
      })),
      detailedChanges: this.detailedAnalysis?.changes.map(c => ({
        file: c.relativePath,
        status: c.status,
        fileType: c.fileType,
        stats: c.stats,
        entities: c.affectedEntities.map(e => ({
          type: e.type,
          name: e.name,
          lines: `${e.startLine}-${e.endLine}`,
          changeType: e.changeType,
        })),
      })) || [],
    }, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 生成冒烟测试 Prompt
   */
  private generateSmokeTestPrompt(route: AffectedRoute, pageComponent?: PageComponent): string {
    const fullUrl = `${this.baseUrl}${route.route}`;
    const testIds = route.testIds.slice(0, 3);

    const lines: string[] = [];
    lines.push('```');
    lines.push(`请对 ${route.name} 页面执行冒烟测试：`);
    lines.push('');
    lines.push('1. 导航到页面');
    lines.push(`   工具: navigate_page`);
    lines.push(`   参数: { "url": "${fullUrl}" }`);
    lines.push('');
    lines.push('2. 等待页面加载，获取快照');
    lines.push('   工具: take_snapshot');
    lines.push('   参数: {}');
    lines.push('');
    lines.push('3. 检查控制台错误');
    lines.push('   工具: list_console_messages');
    lines.push('   验证: 无 error 类型消息');
    lines.push('');

    if (testIds.length > 0) {
      lines.push('4. 验证关键元素存在');
      lines.push('   在快照中检查以下元素:');
      for (const testId of testIds) {
        lines.push(`   - [data-testid="${testId}"]`);
      }
      lines.push('');
    }

    lines.push('5. 截图保存');
    lines.push('   工具: take_screenshot');
    lines.push(`   参数: { "filePath": ".codebuddy/screenshots/change-smoke-${this.toKebabCase(route.component)}.png" }`);
    lines.push('');
    lines.push('通过标准: 页面正常加载，无错误，关键元素可见');
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * 生成功能测试 Prompt
   */
  private generateFunctionalTestPrompt(route: AffectedRoute, pageComponent: PageComponent): string {
    const fullUrl = `${this.baseUrl}${route.route}`;
    const buttons = pageComponent.interactiveElements.filter(e => e.type === 'button').slice(0, 3);
    const inputs = pageComponent.interactiveElements.filter(e => e.type === 'input').slice(0, 3);

    const lines: string[] = [];
    lines.push('```');
    lines.push(`请对 ${route.name} 页面执行功能测试：`);
    lines.push('');
    lines.push('1. 确保已在页面上（如未导航，先执行冒烟测试）');
    lines.push('');

    if (inputs.length > 0) {
      lines.push('2. 测试输入框');
      for (const input of inputs) {
        const selector = input.existingTestId
          ? `[data-testid="${input.existingTestId}"]`
          : input.context
            ? `[placeholder*="${input.context}"]`
            : 'input';
        lines.push(`   - 填写 ${input.context || '输入框'}: 工具 fill, 选择器 "${selector}", 值 "test"`);
      }
      lines.push('');
    }

    if (buttons.length > 0) {
      lines.push(`${inputs.length > 0 ? '3' : '2'}. 测试按钮点击`);
      for (const button of buttons) {
        const selector = button.existingTestId
          ? `[data-testid="${button.existingTestId}"]`
          : button.context
            ? `text="${button.context}"`
            : 'button';
        lines.push(`   - 点击 ${button.context || '按钮'}: 工具 click, 选择器 "${selector}"`);
        lines.push('     点击后获取新快照，验证响应正常');
      }
      lines.push('');
    }

    lines.push('最后: 截图保存测试结果');
    lines.push('');
    lines.push('通过标准: 交互功能正常响应，无异常错误');
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * 生成大范围变更的建议
   */
  private generateLargeScopeSuggestion(impactResult: ChangeImpactResult): string {
    const lines: string[] = [];

    lines.push('## 大范围变更建议');
    lines.push('');
    lines.push(`本次变更影响 ${impactResult.affectedRoutes.length} 个路由，建议执行全量测试。`);
    lines.push('');
    lines.push('### 执行方式');
    lines.push('');
    lines.push('**方式一：全量冒烟测试**');
    lines.push('```bash');
    lines.push(`mcp-e2e test:smoke --base-url ${this.baseUrl}`);
    lines.push('```');
    lines.push('');
    lines.push('**方式二：在 CodeBuddy 中执行**');
    lines.push('```');
    lines.push('@.codebuddy/rules/<rule-id>-prompts.md');
    lines.push('然后告诉 AI 执行冒烟测试');
    lines.push('```');
    lines.push('');
    lines.push('### 影响的路由');
    lines.push('');
    for (const route of impactResult.affectedRoutes.slice(0, 10)) {
      const badge = route.impactType === 'direct' ? '🔴' : '🟡';
      lines.push(`- ${badge} \`${route.route}\` - ${route.name}`);
    }
    if (impactResult.affectedRoutes.length > 10) {
      lines.push(`- ... 还有 ${impactResult.affectedRoutes.length - 10} 个路由`);
    }

    return lines.join('\n');
  }

  /**
   * 获取风险等级文本
   */
  private getRiskLevelText(level: 'high' | 'medium' | 'low'): string {
    const map = {
      high: '🔴 高',
      medium: '🟡 中',
      low: '🟢 低',
    };
    return map[level];
  }

  /**
   * 获取优先级文本
   */
  private getPriorityText(priority: 'high' | 'medium' | 'low'): string {
    const map = {
      high: '高',
      medium: '中',
      low: '低',
    };
    return map[priority];
  }

  /**
   * 获取文件类型标签
   */
  private getFileTypeLabel(type: string): string {
    const map: Record<string, string> = {
      component: '📦 组件',
      util: '🔧 工具函数',
      store: '📊 状态管理',
      api: '🌐 API 接口',
      config: '⚙️ 配置文件',
      style: '🎨 样式文件',
      other: '📄 其他',
    };
    return map[type] || type;
  }

  /**
   * 获取实体类型标签
   */
  private getEntityTypeLabel(type: string): string {
    const map: Record<string, string> = {
      function: '函数',
      class: '类',
      variable: '变量',
      interface: '接口',
      type: '类型',
      export: '导出',
      import: '导入',
      component: '组件',
      hook: 'Hook',
      config: '配置',
    };
    return map[type] || type;
  }

  /**
   * 获取变更类型标签
   */
  private getChangeTypeLabel(type: string): string {
    const map: Record<string, string> = {
      added: '✅ 新增',
      modified: '📝 修改',
      deleted: '❌ 删除',
    };
    return map[type] || type;
  }

  /**
   * 生成详细变更描述
   */
  private generateDetailedChangeDescription(changes: ChangeDetail[]): string[] {
    const lines: string[] = [];

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const fileIndex = i + 1;

      lines.push(`### ${fileIndex}. \`${change.relativePath}\``);
      lines.push('');

      // 文件基本信息
      lines.push('**文件信息**');
      lines.push('');
      lines.push(`- **状态**: ${this.getChangeTypeLabel(change.status)}`);
      lines.push(`- **类型**: ${this.getFileTypeLabel(change.fileType)}`);
      lines.push(`- **模块**: ${change.moduleCategory}`);
      lines.push(`- **变更行数**: +${change.stats.additions} / -${change.stats.deletions}`);
      lines.push('');

      // 变更区块（行号范围）
      if (change.hunks.length > 0) {
        lines.push('**变更位置**');
        lines.push('');
        lines.push('| 行号范围 | 变更类型 | 上下文 |');
        lines.push('|----------|----------|--------|');
        for (const hunk of change.hunks) {
          const lineRange = `${hunk.newStart}-${hunk.newStart + hunk.newLines - 1}`;
          const changeType = hunk.changeType === 'add' ? '新增' : hunk.changeType === 'remove' ? '删除' : '修改';
          const context = hunk.content.slice(0, 50) + (hunk.content.length > 50 ? '...' : '');
          lines.push(`| L${lineRange} | ${changeType} | ${context || '-'} |`);
        }
        lines.push('');
      }

      // 受影响的代码实体（函数、组件、配置等）
      if (change.affectedEntities.length > 0) {
        lines.push('**受影响的代码实体**');
        lines.push('');
        lines.push('| 类型 | 名称 | 行号 | 变更 | 签名 |');
        lines.push('|------|------|------|------|------|');
        for (const entity of change.affectedEntities) {
          const typeLabel = this.getEntityTypeLabel(entity.type);
          const lineRange = entity.startLine === entity.endLine
            ? `L${entity.startLine}`
            : `L${entity.startLine}-${entity.endLine}`;
          const changeLabel = this.getChangeTypeLabel(entity.changeType);
          const signature = entity.signature?.slice(0, 40) || '-';
          const exportBadge = entity.isExported ? ' 🔗' : '';
          lines.push(`| ${typeLabel}${exportBadge} | \`${entity.name}\` | ${lineRange} | ${changeLabel} | \`${signature}\` |`);
        }
        lines.push('');

        // 生成代码实体的详细说明（便于大模型理解）
        lines.push('<details>');
        lines.push('<summary>代码实体详情</summary>');
        lines.push('');
        for (const entity of change.affectedEntities) {
          const parentInfo = entity.parent ? ` (属于 \`${entity.parent}\`)` : '';
          lines.push(`- **\`${entity.name}\`**${parentInfo}`);
          lines.push(`  - 类型: ${this.getEntityTypeLabel(entity.type)}`);
          lines.push(`  - 位置: 第 ${entity.startLine} 行 ~ 第 ${entity.endLine} 行`);
          lines.push(`  - 变更: ${this.getChangeTypeLabel(entity.changeType)}`);
          if (entity.signature) {
            lines.push(`  - 签名: \`${entity.signature}\``);
          }
          if (entity.isExported) {
            lines.push(`  - 导出: 是（可能被其他模块引用）`);
          }
          lines.push('');
        }
        lines.push('</details>');
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    return lines;
  }

  /**
   * 生成基础变更描述（无详细分析时使用）
   */
  private generateBasicChangeDescription(changedFiles: Array<{ relativePath: string }>): string[] {
    const lines: string[] = [];

    lines.push('### 变更文件列表');
    lines.push('');
    for (let i = 0; i < changedFiles.length; i++) {
      const file = changedFiles[i];
      lines.push(`${i + 1}. \`${file.relativePath}\``);
    }
    lines.push('');
    lines.push('> 💡 提示：运行 `mcp-e2e change:test --base <ref>` 时添加 `--detailed` 参数可获取更详细的变更分析。');
    lines.push('');

    return lines;
  }

  /**
   * 转换为 kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
  }
}

/**
 * 生成结果
 */
export type GenerateResult = SmallScopeResult | LargeScopeResult;

export interface SmallScopeResult {
  type: 'small-scope';
  filePath: string;
  fileName: string;
  affectedRouteCount: number;
  scenarios: number;
}

export interface LargeScopeResult {
  type: 'large-scope';
  affectedRouteCount: number;
  suggestion: string;
}

/**
 * 导出生成函数
 */
export async function generateChangeTest(
  impactResult: ChangeImpactResult,
  routerAnalysis: RouterAnalysisResult,
  projectRoot?: string,
  baseUrl?: string,
  options?: {
    outputDir?: string;
    existingRule?: DevToolsMCPRule;
  }
): Promise<GenerateResult> {
  const root = projectRoot || process.cwd();
  const url = baseUrl || 'http://localhost:8080';
  const generator = new ChangeTestGenerator(root, url, options?.outputDir);
  return await generator.generate(impactResult, routerAnalysis, options?.existingRule);
}
