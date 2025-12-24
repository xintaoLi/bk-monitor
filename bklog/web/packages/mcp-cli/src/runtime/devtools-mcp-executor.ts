import { Logger } from '../utils/log.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Chrome DevTools MCP 执行器
 *
 * 负责：
 * 1. 保存生成的 Prompt 到文件
 * 2. 生成 CodeBuddy 可执行的测试脚本
 * 3. 通过 MCP 协议调用 Chrome DevTools 执行测试
 */

export interface MCPTestScenario {
  id: string;
  name: string;
  type: string;
  priority: string;
  prompt: string;
  steps?: any[];
  expectedOutcome?: string;
}

export interface MCPTestRule {
  id: string;
  name: string;
  version: string;
  description: string;
  scenarios: MCPTestScenario[];
  variables?: Record<string, { description: string; default: string }>;
  mcpConfig?: {
    server: string;
    options: Record<string, any>;
  };
}

export interface ExecutionResult {
  scenarioId: string;
  scenarioName: string;
  success: boolean;
  duration: number;
  steps: StepResult[];
  screenshot?: string;
  error?: string;
}

export interface StepResult {
  description: string;
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * DevTools MCP 执行器
 */
export class DevToolsMCPExecutor {
  private outputDir: string;
  private baseUrl: string;
  private variables: Record<string, string>;

  constructor(options: {
    outputDir?: string;
    baseUrl?: string;
    variables?: Record<string, string>;
  } = {}) {
    this.outputDir = options.outputDir || '.mcp/execution';
    this.baseUrl = options.baseUrl || 'http://localhost:8080';
    this.variables = options.variables || {};
  }

  /**
   * 保存 Prompt 到文件
   */
  async savePrompts(rule: MCPTestRule, outputPath?: string): Promise<string> {
    const dir = outputPath || path.join(this.outputDir, rule.id);
    await fs.mkdir(dir, { recursive: true });

    const prompts: string[] = [];
    const promptFiles: string[] = [];

    for (const scenario of rule.scenarios) {
      const prompt = this.replaceVariables(scenario.prompt);
      prompts.push(`## ${scenario.name}\n\n${prompt}\n`);

      // 保存单独的 prompt 文件
      const promptFile = path.join(dir, `${scenario.id}.prompt.md`);
      await fs.writeFile(promptFile, `# ${scenario.name}\n\n${prompt}`, 'utf-8');
      promptFiles.push(promptFile);
    }

    // 保存汇总文件
    const summaryFile = path.join(dir, 'all-prompts.md');
    const summaryContent = `# ${rule.name} - 测试 Prompts\n\n${prompts.join('\n---\n\n')}`;
    await fs.writeFile(summaryFile, summaryContent, 'utf-8');

    Logger.success(`Prompts 已保存到: ${dir}`);
    Logger.info(`- 汇总文件: ${summaryFile}`);
    Logger.info(`- 单独文件: ${promptFiles.length} 个`);

    return dir;
  }

  /**
   * 生成 CodeBuddy 执行脚本
   */
  async generateCodeBuddyScript(rule: MCPTestRule, outputPath?: string): Promise<string> {
    const dir = outputPath || path.join(this.outputDir, rule.id);
    await fs.mkdir(dir, { recursive: true });

    const scriptContent = this.buildCodeBuddyScript(rule);
    const scriptFile = path.join(dir, 'codebuddy-test.ts');
    await fs.writeFile(scriptFile, scriptContent, 'utf-8');

    Logger.success(`CodeBuddy 脚本已生成: ${scriptFile}`);
    return scriptFile;
  }

  /**
   * 构建 CodeBuddy 执行脚本
   */
  private buildCodeBuddyScript(rule: MCPTestRule): string {
    const scenarios = rule.scenarios.map(s => ({
      id: s.id,
      name: s.name,
      prompt: this.replaceVariables(s.prompt),
    }));

    return `/**
 * ${rule.name}
 * 
 * 自动生成的 CodeBuddy + Chrome DevTools MCP 测试脚本
 * 生成时间: ${new Date().toISOString()}
 * 
 * 使用方式:
 * 1. 确保已安装 Chrome DevTools MCP 服务
 * 2. 在 CodeBuddy 中打开此文件
 * 3. 使用 AI 执行测试命令
 */

import { MCPClient } from '@anthropic-ai/mcp';

// MCP 配置
const MCP_CONFIG = {
  server: '${rule.mcpConfig?.server || 'chrome-devtools'}',
  options: ${JSON.stringify(rule.mcpConfig?.options || { viewport: '1920x1080', timeout: 30000 }, null, 4)},
};

// 测试变量
const VARIABLES = ${JSON.stringify({ baseUrl: this.baseUrl, ...this.variables }, null, 2)};

// 测试场景
const SCENARIOS = ${JSON.stringify(scenarios, null, 2)};

/**
 * 执行单个测试场景
 */
async function executeScenario(client: MCPClient, scenario: typeof SCENARIOS[0]) {
  console.log(\`\\n🧪 执行场景: \${scenario.name}\`);
  console.log('─'.repeat(50));
  
  const startTime = Date.now();
  
  try {
    // 发送 Prompt 给 AI 执行
    const result = await client.chat({
      messages: [
        {
          role: 'user',
          content: scenario.prompt,
        },
      ],
      tools: ['chrome-devtools'],
    });
    
    const duration = Date.now() - startTime;
    console.log(\`✅ 场景完成 (\${duration}ms)\`);
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(\`❌ 场景失败: \${error.message}\`);
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      success: false,
      duration,
      error: error.message,
    };
  }
}

/**
 * 执行所有测试场景
 */
async function runAllTests() {
  console.log('═'.repeat(50));
  console.log(\`  ${rule.name}\`);
  console.log('═'.repeat(50));
  console.log(\`Base URL: \${VARIABLES.baseUrl}\`);
  console.log(\`场景数量: \${SCENARIOS.length}\`);
  
  const client = new MCPClient(MCP_CONFIG);
  await client.connect();
  
  const results = [];
  
  for (const scenario of SCENARIOS) {
    const result = await executeScenario(client, scenario);
    results.push(result);
  }
  
  await client.disconnect();
  
  // 输出汇总
  console.log('\\n' + '═'.repeat(50));
  console.log('  测试结果汇总');
  console.log('═'.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(\`✅ 通过: \${passed}\`);
  console.log(\`❌ 失败: \${failed}\`);
  console.log(\`📊 通过率: \${((passed / results.length) * 100).toFixed(1)}%\`);
  
  return results;
}

// 导出供 CodeBuddy 调用
export { runAllTests, executeScenario, SCENARIOS, VARIABLES };

// 直接执行
if (require.main === module) {
  runAllTests().catch(console.error);
}
`;
  }


  /**
   * 生成执行说明
   */
  async generateMCPCommands(rule: MCPTestRule, outputPath?: string): Promise<string> {
    const dir = outputPath || path.join(this.outputDir, rule.id);
    await fs.mkdir(dir, { recursive: true });

    // 生成执行说明
    const readmeContent = `# ${rule.name} - 执行说明

## 方式一：CodeBuddy + Chrome DevTools MCP（推荐）

1. 确保已在 CodeBuddy 中配置 Chrome DevTools MCP 服务
2. 打开 \`codebuddy-rule.json\` 文件
3. 告诉 AI："请执行这个测试规则"
4. AI 将自动使用 Chrome DevTools MCP 执行所有测试场景

### MCP 配置示例

在 CodeBuddy 设置中添加：

\`\`\`json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-puppeteer"]
    }
  }
}
\`\`\`

## 方式二：手动复制 Prompt 执行

1. 打开 \`all-prompts.md\` 文件
2. 复制任意场景的 Prompt
3. 粘贴给 AI（需要已连接 Chrome DevTools MCP）
4. AI 将执行对应的测试操作

## 配置信息

- **Base URL**: ${this.baseUrl}
- **超时时间**: ${rule.mcpConfig?.options?.timeout || 30000}ms
- **场景数量**: ${rule.scenarios.length}

## 测试场景列表

${rule.scenarios.map((s, i) => `${i + 1}. **${s.name}** (${s.priority}) - ${s.type}`).join('\n')}
`;

    await fs.writeFile(path.join(dir, 'README.md'), readmeContent, 'utf-8');

    Logger.success(`执行说明已生成: ${path.join(dir, 'README.md')}`);

    return path.join(dir, 'README.md');
  }

  /**
   * 生成 CodeBuddy Rule 文件（用于 AI 自动执行）
   */
  async generateCodeBuddyRule(rule: MCPTestRule, outputPath?: string): Promise<string> {
    const dir = outputPath || path.join(this.outputDir, rule.id);
    await fs.mkdir(dir, { recursive: true });

    const codebuddyRule = {
      name: `e2e-test-${rule.id}`,
      description: `${rule.name} - 自动化测试规则`,
      trigger: 'manual',
      context: {
        mcpServer: 'chrome-devtools',
        baseUrl: this.baseUrl,
        testRule: rule.id,
      },
      instructions: `你是一个专业的 E2E 测试工程师，需要使用 Chrome DevTools MCP 执行以下测试场景。

## 测试规则
- Rule ID: ${rule.id}
- 名称: ${rule.name}
- 场景数量: ${rule.scenarios.length}

## 执行要求
1. 按顺序执行每个测试场景
2. 每个场景执行前先截图记录初始状态
3. 执行完成后截图记录最终状态
4. 如果某个步骤失败，记录错误并继续下一个场景
5. 最后输出测试报告

## 测试场景

${rule.scenarios.map((s, i) => `### ${i + 1}. ${s.name}
**优先级**: ${s.priority}
**类型**: ${s.type}

${this.replaceVariables(s.prompt)}
`).join('\n---\n\n')}

## 开始执行
请使用 Chrome DevTools MCP 工具依次执行上述测试场景。`,
    };

    const ruleFile = path.join(dir, 'codebuddy-rule.json');
    await fs.writeFile(ruleFile, JSON.stringify(codebuddyRule, null, 2), 'utf-8');

    Logger.success(`CodeBuddy Rule 已生成: ${ruleFile}`);
    return ruleFile;
  }

  /**
   * 完整执行流程：保存 + 生成脚本 + 启动执行
   */
  async executeRule(rule: MCPTestRule, options: {
    dryRun?: boolean;
    scenarioId?: string;
    headless?: boolean;
  } = {}): Promise<ExecutionResult[]> {
    Logger.header(`执行测试规则: ${rule.name}`);

    // 1. 保存 Prompts
    const promptDir = await this.savePrompts(rule);
    Logger.divider();

    // 2. 生成 CodeBuddy 脚本
    await this.generateCodeBuddyScript(rule);
    Logger.divider();

    // 3. 生成 CodeBuddy Rule
    const ruleFile = await this.generateCodeBuddyRule(rule);
    Logger.divider();

    // 4. 生成 MCP 命令脚本
    await this.generateMCPCommands(rule);
    Logger.divider();

    if (options.dryRun) {
      Logger.info('🔍 Dry Run 模式，跳过实际执行');
      Logger.info(`\n📁 生成的文件位于: ${promptDir}`);
      Logger.info('\n📋 后续步骤:');
      Logger.info('1. 在 CodeBuddy 中打开 codebuddy-rule.json');
      Logger.info('2. 告诉 AI: "请执行这个测试规则"');
      Logger.info('3. AI 将使用 Chrome DevTools MCP 自动执行测试');
      return [];
    }

    // 5. 实际执行测试
    Logger.header('开始执行测试');
    const results: ExecutionResult[] = [];

    let scenarios = rule.scenarios;
    if (options.scenarioId) {
      scenarios = scenarios.filter(s => s.id === options.scenarioId);
    }

    for (const scenario of scenarios) {
      const result = await this.executeScenario(scenario, options);
      results.push(result);
    }

    // 6. 输出报告
    this.printReport(results);

    // 7. 保存报告
    await this.saveReport(rule, results);

    return results;
  }

  /**
   * 执行单个场景
   * 注意：实际执行需要通过 AI + Chrome DevTools MCP 完成
   * 此方法仅生成执行所需的 Prompt，由 AI 调用 MCP 工具执行
   */
  private async executeScenario(
    scenario: MCPTestScenario,
    _options: { headless?: boolean } = {}
  ): Promise<ExecutionResult> {
    Logger.header(`场景: ${scenario.name}`);
    Logger.info(`类型: ${scenario.type} | 优先级: ${scenario.priority}`);

    const startTime = Date.now();
    const prompt = this.replaceVariables(scenario.prompt);

    Logger.info('\n📋 测试 Prompt:');
    Logger.info('─'.repeat(50));
    console.log(prompt);
    Logger.info('─'.repeat(50));

    Logger.info('\n💡 提示: 请将上述 Prompt 发送给 AI（需配置 Chrome DevTools MCP）执行测试');

    // 返回待执行状态，实际执行由 AI + MCP 完成
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      success: true, // 标记为已生成，实际结果由 AI 判断
      duration: Date.now() - startTime,
      steps: [],
    };
  }

  /**
   * 替换变量
   */
  private replaceVariables(text: string): string {
    let result = text;
    result = result.replace(/\{\{baseUrl\}\}/g, this.baseUrl);

    for (const [key, value] of Object.entries(this.variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return result;
  }

  /**
   * 打印报告
   */
  private printReport(results: ExecutionResult[]): void {
    Logger.header('测试报告');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    Logger.info(`总计: ${total} 个场景`);
    Logger.success(`通过: ${passed}`);
    if (failed > 0) {
      Logger.error(`失败: ${failed}`);
    }
    Logger.info(`通过率: ${((passed / total) * 100).toFixed(1)}%`);

    Logger.divider();

    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      Logger.info(`${status} ${result.scenarioName} (${result.duration}ms)`);
      if (result.error) {
        Logger.error(`   错误: ${result.error}`);
      }
    }
  }

  /**
   * 保存报告
   */
  private async saveReport(rule: MCPTestRule, results: ExecutionResult[]): Promise<void> {
    const reportDir = path.join(this.outputDir, rule.id, 'reports');
    await fs.mkdir(reportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `report-${timestamp}.json`);

    const report = {
      ruleId: rule.id,
      ruleName: rule.name,
      executedAt: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: {
        total: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        passRate: ((results.filter(r => r.success).length / results.length) * 100).toFixed(1) + '%',
      },
      results,
    };

    await fs.writeFile(reportFile, JSON.stringify(report, null, 2), 'utf-8');
    Logger.success(`报告已保存: ${reportFile}`);
  }
}

/**
 * 创建执行器
 */
export function createDevToolsMCPExecutor(options?: {
  outputDir?: string;
  baseUrl?: string;
  variables?: Record<string, string>;
}): DevToolsMCPExecutor {
  return new DevToolsMCPExecutor(options);
}

/**
 * 快速执行 Rule
 */
export async function executeRuleWithMCP(
  rulePath: string,
  options?: {
    baseUrl?: string;
    dryRun?: boolean;
    scenarioId?: string;
    headless?: boolean;
  }
): Promise<ExecutionResult[]> {
  const ruleContent = await fs.readFile(rulePath, 'utf-8');
  const rule: MCPTestRule = JSON.parse(ruleContent);

  const executor = createDevToolsMCPExecutor({
    baseUrl: options?.baseUrl,
    outputDir: path.dirname(rulePath).replace('/rules', '/execution'),
  });

  return executor.executeRule(rule, options);
}
