import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { ChangeImpactResult, AffectedRoute } from '../analyzer/change-analyzer.js';
import { RouterAnalysisResult, PageComponent } from '../analyzer/router-analyzer.js';
import { DevToolsMCPRule, TestScenario, StructuredStep } from './devtools-mcp-rule.js';

/**
 * 变更测试文件生成器
 *
 * 根据变更影响分析结果生成针对性的测试文件
 */
export class ChangeTestGenerator {
  private projectRoot: string;
  private baseUrl: string;
  private outputDir: string;

  constructor(projectRoot: string, baseUrl: string, outputDir?: string) {
    this.projectRoot = projectRoot;
    this.baseUrl = baseUrl;
    this.outputDir = outputDir || '.codebuddy/rules/changes';
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
    lines.push('## 变更概要');
    lines.push('');
    lines.push(`- **分支**: ${impactResult.gitInfo.branch}`);
    lines.push(`- **Commit**: ${impactResult.gitInfo.commitHash}`);
    lines.push(`- **变更文件**: ${impactResult.changedFiles.length} 个`);
    lines.push(`- **影响路由**: ${impactResult.affectedRoutes.length} 个`);
    lines.push(`- **风险等级**: ${this.getRiskLevelText(impactResult.riskLevel)}`);
    lines.push(`- **基础 URL**: ${this.baseUrl}`);
    lines.push('');

    // 变更文件列表
    lines.push('## 变更文件');
    lines.push('');
    for (const file of impactResult.changedFiles) {
      lines.push(`- \`${file.relativePath}\``);
    }
    lines.push('');

    // 影响路由列表
    lines.push('## 影响路由');
    lines.push('');
    lines.push('| 路由 | 组件 | 影响类型 | 优先级 |');
    lines.push('|------|------|----------|--------|');
    for (const route of impactResult.affectedRoutes) {
      const impactText = route.impactType === 'direct' ? '直接影响' : '间接影响';
      const priorityText = this.getPriorityText(route.priority);
      lines.push(`| \`${route.route}\` | ${route.component} | ${impactText} | ${priorityText} |`);
    }
    lines.push('');

    // 测试范围
    lines.push('---');
    lines.push('');
    lines.push('## 测试范围');
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

    // 执行说明
    lines.push('## 执行说明');
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
    lines.push('## 测试通过标准');
    lines.push('');
    lines.push('- [ ] 所有页面能够正常加载');
    lines.push('- [ ] 无 JavaScript 控制台错误');
    lines.push('- [ ] 关键交互功能正常');
    lines.push('- [ ] 页面布局无异常');
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
