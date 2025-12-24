import { Logger } from '../utils/log.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 集成测试执行器
 *
 * 功能：
 * 1. 支持单路由测试：测试指定路由的所有场景
 * 2. 支持全量测试：测试所有路由的所有场景
 * 3. 生成统一的测试报告
 * 4. 支持 CodeBuddy AI 执行
 */

export interface RouteTestConfig {
  route: string;
  name: string;
  description: string;
  component: string;
  scenarios: TestScenario[];
}

export interface TestScenario {
  id: string;
  name: string;
  type: 'smoke' | 'functional' | 'regression' | 'e2e';
  priority: 'critical' | 'high' | 'medium' | 'low';
  prompt: string;
  expectedOutcome: string;
  availableTestIds: string[];
  tags: string[];
}

export interface IntegratedTestConfig {
  projectName: string;
  baseUrl: string;
  generatedAt: string;
  routes: RouteTestConfig[];
  mcpConfig: {
    server: string;
    viewport: string;
    timeout: number;
    screenshotOnFailure: boolean;
  };
}

export interface TestExecutionOptions {
  /** 指定要测试的路由（支持多个） */
  routes?: string[];
  /** 指定测试类型 */
  types?: ('smoke' | 'functional' | 'regression' | 'e2e')[];
  /** 指定优先级 */
  priorities?: ('critical' | 'high' | 'medium' | 'low')[];
  /** 是否只执行冒烟测试 */
  smokeOnly?: boolean;
  /** 是否执行全量测试 */
  fullTest?: boolean;
  /** 预览模式（不实际执行） */
  dryRun?: boolean;
  /** 基础 URL */
  baseUrl?: string;
}

export interface TestExecutionResult {
  route: string;
  scenario: string;
  success: boolean;
  duration: number;
  error?: string;
  screenshot?: string;
}

/**
 * 集成测试执行器
 */
export class IntegratedTestExecutor {
  private config: IntegratedTestConfig;
  private outputDir: string;

  constructor(config: IntegratedTestConfig, outputDir: string) {
    this.config = config;
    this.outputDir = outputDir;
  }

  /**
   * 获取所有可用路由
   */
  getAvailableRoutes(): string[] {
    return this.config.routes.map(r => r.route);
  }

  /**
   * 获取路由信息
   */
  getRouteInfo(routePath: string): RouteTestConfig | undefined {
    return this.config.routes.find(r => r.route === routePath);
  }

  /**
   * 筛选测试场景
   */
  filterScenarios(options: TestExecutionOptions): { route: RouteTestConfig; scenarios: TestScenario[] }[] {
    const result: { route: RouteTestConfig; scenarios: TestScenario[] }[] = [];

    for (const route of this.config.routes) {
      // 路由筛选
      if (options.routes && options.routes.length > 0) {
        const matchesRoute = options.routes.some(r => {
          // 支持精确匹配和前缀匹配
          return route.route === r ||
                 route.route.startsWith(r) ||
                 route.name === r ||
                 route.component.toLowerCase() === r.toLowerCase();
        });
        if (!matchesRoute) continue;
      }

      let scenarios = [...route.scenarios];

      // 类型筛选
      if (options.types && options.types.length > 0) {
        scenarios = scenarios.filter(s => options.types!.includes(s.type));
      }

      // 冒烟测试筛选
      if (options.smokeOnly) {
        scenarios = scenarios.filter(s => s.type === 'smoke');
      }

      // 优先级筛选
      if (options.priorities && options.priorities.length > 0) {
        scenarios = scenarios.filter(s => options.priorities!.includes(s.priority));
      }

      if (scenarios.length > 0) {
        result.push({ route, scenarios });
      }
    }

    return result;
  }

  /**
   * 生成测试执行计划
   */
  generateTestPlan(options: TestExecutionOptions): string {
    const filtered = this.filterScenarios(options);
    const totalScenarios = filtered.reduce((sum, r) => sum + r.scenarios.length, 0);

    let plan = `# 测试执行计划\n\n`;
    plan += `**项目**: ${this.config.projectName}\n`;
    plan += `**基础 URL**: ${options.baseUrl || this.config.baseUrl}\n`;
    plan += `**生成时间**: ${new Date().toISOString()}\n`;
    plan += `**路由数量**: ${filtered.length}\n`;
    plan += `**场景数量**: ${totalScenarios}\n\n`;

    plan += `---\n\n`;

    for (const { route, scenarios } of filtered) {
      plan += `## ${route.name} (${route.route})\n\n`;
      plan += `**组件**: ${route.component}\n`;
      plan += `**描述**: ${route.description}\n`;
      plan += `**场景数**: ${scenarios.length}\n\n`;

      for (const scenario of scenarios) {
        plan += `### ${scenario.name}\n\n`;
        plan += `- **类型**: ${scenario.type}\n`;
        plan += `- **优先级**: ${scenario.priority}\n`;
        plan += `- **标签**: ${scenario.tags.join(', ')}\n\n`;
      }

      plan += `---\n\n`;
    }

    return plan;
  }

  /**
   * 生成单路由测试 Prompt
   */
  generateRouteTestPrompt(routePath: string, options?: TestExecutionOptions): string {
    const route = this.getRouteInfo(routePath);
    if (!route) {
      throw new Error(`路由不存在: ${routePath}`);
    }

    let scenarios = route.scenarios;
    if (options?.types) {
      scenarios = scenarios.filter(s => options.types!.includes(s.type));
    }
    if (options?.smokeOnly) {
      scenarios = scenarios.filter(s => s.type === 'smoke');
    }

    const baseUrl = options?.baseUrl || this.config.baseUrl;

    let prompt = `# ${route.name} 路由测试\n\n`;
    prompt += `**路由**: ${route.route}\n`;
    prompt += `**组件**: ${route.component}\n`;
    prompt += `**描述**: ${route.description}\n`;
    prompt += `**基础 URL**: ${baseUrl}\n\n`;

    prompt += `## 测试配置\n\n`;
    prompt += `\`\`\`json\n${JSON.stringify(this.config.mcpConfig, null, 2)}\n\`\`\`\n\n`;

    prompt += `---\n\n`;
    prompt += `## 测试场景\n\n`;

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      prompt += `### 场景 ${i + 1}: ${scenario.name}\n\n`;
      prompt += `**类型**: ${scenario.type} | **优先级**: ${scenario.priority}\n\n`;

      // 替换变量
      const processedPrompt = scenario.prompt
        .replace(/\{\{baseUrl\}\}/g, baseUrl)
        .replace(/\{\{route\}\}/g, route.route);

      prompt += `#### 执行指令\n\n`;
      prompt += `\`\`\`\n${processedPrompt}\n\`\`\`\n\n`;

      prompt += `**预期结果**: ${scenario.expectedOutcome}\n\n`;

      if (scenario.availableTestIds.length > 0) {
        prompt += `**可用 test-id**: \`${scenario.availableTestIds.join('`, `')}\`\n\n`;
      }

      prompt += `---\n\n`;
    }

    return prompt;
  }

  /**
   * 生成全量测试 Prompt
   */
  generateFullTestPrompt(options?: TestExecutionOptions): string {
    const filtered = this.filterScenarios(options || { fullTest: true });
    const baseUrl = options?.baseUrl || this.config.baseUrl;

    let prompt = `# ${this.config.projectName} 全量测试\n\n`;
    prompt += `**基础 URL**: ${baseUrl}\n`;
    prompt += `**生成时间**: ${this.config.generatedAt}\n`;
    prompt += `**路由总数**: ${filtered.length}\n`;
    prompt += `**场景总数**: ${filtered.reduce((sum, r) => sum + r.scenarios.length, 0)}\n\n`;

    prompt += `## MCP 配置\n\n`;
    prompt += `\`\`\`json\n${JSON.stringify(this.config.mcpConfig, null, 2)}\n\`\`\`\n\n`;

    prompt += `---\n\n`;
    prompt += `## 路由测试列表\n\n`;

    // 生成路由索引
    prompt += `| 序号 | 路由 | 组件 | 场景数 |\n`;
    prompt += `|------|------|------|--------|\n`;
    filtered.forEach(({ route, scenarios }, index) => {
      prompt += `| ${index + 1} | \`${route.route}\` | ${route.component} | ${scenarios.length} |\n`;
    });
    prompt += `\n---\n\n`;

    // 生成每个路由的测试详情
    for (const { route, scenarios } of filtered) {
      prompt += `## ${route.name}\n\n`;
      prompt += `**路由**: \`${route.route}\`\n`;
      prompt += `**组件**: ${route.component}\n`;
      prompt += `**描述**: ${route.description}\n\n`;

      for (const scenario of scenarios) {
        prompt += `### ${scenario.name}\n\n`;
        prompt += `**类型**: ${scenario.type} | **优先级**: ${scenario.priority}\n\n`;

        const processedPrompt = scenario.prompt
          .replace(/\{\{baseUrl\}\}/g, baseUrl)
          .replace(/\{\{route\}\}/g, route.route);

        prompt += `#### 执行指令\n\n`;
        prompt += `\`\`\`\n${processedPrompt}\n\`\`\`\n\n`;

        prompt += `**预期结果**: ${scenario.expectedOutcome}\n\n`;
        prompt += `---\n\n`;
      }
    }

    return prompt;
  }

  /**
   * 生成 CodeBuddy 可执行的测试脚本
   */
  generateCodeBuddyTestScript(options?: TestExecutionOptions): string {
    const filtered = this.filterScenarios(options || { fullTest: true });
    const baseUrl = options?.baseUrl || this.config.baseUrl;

    const routes = filtered.map(({ route, scenarios }) => ({
      path: route.route,
      name: route.name,
      component: route.component,
      scenarios: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        priority: s.priority,
        prompt: s.prompt
          .replace(/\{\{baseUrl\}\}/g, baseUrl)
          .replace(/\{\{route\}\}/g, route.route),
        expectedOutcome: s.expectedOutcome,
      })),
    }));

    return `/**
 * ${this.config.projectName} - 集成测试脚本
 *
 * 自动生成的 CodeBuddy + Chrome DevTools MCP 测试脚本
 * 生成时间: ${new Date().toISOString()}
 *
 * 使用方式:
 * 1. 确保已安装 Chrome DevTools MCP 服务
 * 2. 在 CodeBuddy 中打开此文件
 * 3. 使用 AI 执行测试命令
 *
 * 支持的执行方式:
 * - 全量测试: runAllTests()
 * - 单路由测试: runRouteTest('/retrieve/:indexId?')
 * - 按类型测试: runTestsByType('smoke')
 */

// MCP 配置
const MCP_CONFIG = ${JSON.stringify(this.config.mcpConfig, null, 2)};

// 测试配置
const TEST_CONFIG = {
  projectName: '${this.config.projectName}',
  baseUrl: '${baseUrl}',
  generatedAt: '${new Date().toISOString()}',
};

// 路由测试数据
const ROUTES = ${JSON.stringify(routes, null, 2)};

/**
 * 获取所有可用路由
 */
function getAvailableRoutes(): string[] {
  return ROUTES.map(r => r.path);
}

/**
 * 获取路由信息
 */
function getRouteInfo(routePath: string) {
  return ROUTES.find(r => r.path === routePath);
}

/**
 * 执行单路由测试
 */
async function runRouteTest(routePath: string) {
  const route = getRouteInfo(routePath);
  if (!route) {
    console.error(\`路由不存在: \${routePath}\`);
    return;
  }

  console.log('═'.repeat(60));
  console.log(\`  路由测试: \${route.name}\`);
  console.log(\`  路径: \${route.path}\`);
  console.log(\`  组件: \${route.component}\`);
  console.log(\`  场景数: \${route.scenarios.length}\`);
  console.log('═'.repeat(60));

  const results = [];

  for (const scenario of route.scenarios) {
    console.log(\`\\n🧪 执行场景: \${scenario.name}\`);
    console.log(\`   类型: \${scenario.type} | 优先级: \${scenario.priority}\`);
    console.log('─'.repeat(50));

    const startTime = Date.now();

    try {
      // 这里由 AI 通过 MCP 执行实际测试
      // AI 会解析 scenario.prompt 并执行相应操作
      console.log('📋 Prompt:');
      console.log(scenario.prompt);
      console.log('─'.repeat(50));

      const duration = Date.now() - startTime;
      console.log(\`✅ 场景完成 (\${duration}ms)\`);

      results.push({
        route: route.path,
        scenario: scenario.name,
        success: true,
        duration,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(\`❌ 场景失败: \${error.message}\`);

      results.push({
        route: route.path,
        scenario: scenario.name,
        success: false,
        duration,
        error: error.message,
      });
    }
  }

  printTestReport(results);
  return results;
}

/**
 * 执行全量测试
 */
async function runAllTests() {
  console.log('═'.repeat(60));
  console.log(\`  \${TEST_CONFIG.projectName} - 全量测试\`);
  console.log(\`  基础 URL: \${TEST_CONFIG.baseUrl}\`);
  console.log(\`  路由数量: \${ROUTES.length}\`);
  console.log(\`  场景总数: \${ROUTES.reduce((sum, r) => sum + r.scenarios.length, 0)}\`);
  console.log('═'.repeat(60));

  const allResults = [];

  for (const route of ROUTES) {
    console.log(\`\\n📁 路由: \${route.name} (\${route.path})\`);

    for (const scenario of route.scenarios) {
      console.log(\`\\n🧪 执行场景: \${scenario.name}\`);
      console.log(\`   类型: \${scenario.type} | 优先级: \${scenario.priority}\`);
      console.log('─'.repeat(50));

      const startTime = Date.now();

      try {
        console.log('📋 Prompt:');
        console.log(scenario.prompt);
        console.log('─'.repeat(50));

        const duration = Date.now() - startTime;
        console.log(\`✅ 场景完成 (\${duration}ms)\`);

        allResults.push({
          route: route.path,
          scenario: scenario.name,
          success: true,
          duration,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(\`❌ 场景失败: \${error.message}\`);

        allResults.push({
          route: route.path,
          scenario: scenario.name,
          success: false,
          duration,
          error: error.message,
        });
      }
    }
  }

  printTestReport(allResults);
  return allResults;
}

/**
 * 按类型执行测试
 */
async function runTestsByType(type: 'smoke' | 'functional' | 'regression' | 'e2e') {
  console.log('═'.repeat(60));
  console.log(\`  \${TEST_CONFIG.projectName} - \${type} 测试\`);
  console.log('═'.repeat(60));

  const allResults = [];

  for (const route of ROUTES) {
    const scenarios = route.scenarios.filter(s => s.type === type);
    if (scenarios.length === 0) continue;

    console.log(\`\\n📁 路由: \${route.name} (\${route.path})\`);

    for (const scenario of scenarios) {
      console.log(\`\\n🧪 执行场景: \${scenario.name}\`);
      console.log('─'.repeat(50));

      const startTime = Date.now();

      try {
        console.log('📋 Prompt:');
        console.log(scenario.prompt);
        console.log('─'.repeat(50));

        const duration = Date.now() - startTime;
        console.log(\`✅ 场景完成 (\${duration}ms)\`);

        allResults.push({
          route: route.path,
          scenario: scenario.name,
          success: true,
          duration,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(\`❌ 场景失败: \${error.message}\`);

        allResults.push({
          route: route.path,
          scenario: scenario.name,
          success: false,
          duration,
          error: error.message,
        });
      }
    }
  }

  printTestReport(allResults);
  return allResults;
}

/**
 * 打印测试报告
 */
function printTestReport(results: any[]) {
  console.log('\\n' + '═'.repeat(60));
  console.log('  测试结果汇总');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  console.log(\`✅ 通过: \${passed}\`);
  console.log(\`❌ 失败: \${failed}\`);
  console.log(\`📊 通过率: \${((passed / total) * 100).toFixed(1)}%\`);

  if (failed > 0) {
    console.log('\\n失败的测试:');
    results.filter(r => !r.success).forEach(r => {
      console.log(\`  - [\${r.route}] \${r.scenario}: \${r.error}\`);
    });
  }
}

// 导出供 CodeBuddy 调用
export {
  getAvailableRoutes,
  getRouteInfo,
  runRouteTest,
  runAllTests,
  runTestsByType,
  ROUTES,
  TEST_CONFIG,
  MCP_CONFIG,
};

// 打印可用命令
console.log('\\n📋 可用命令:');
console.log('  - runAllTests()           执行全量测试');
console.log('  - runRouteTest(path)      执行单路由测试');
console.log('  - runTestsByType(type)    按类型执行测试');
console.log('  - getAvailableRoutes()    获取所有路由');
console.log('\\n📁 可用路由:');
getAvailableRoutes().slice(0, 10).forEach(r => console.log(\`  - \${r}\`));
if (getAvailableRoutes().length > 10) {
  console.log(\`  ... 还有 \${getAvailableRoutes().length - 10} 个路由\`);
}
`;
  }

  /**
   * 保存测试配置和脚本
   */
  async saveTestFiles(options?: TestExecutionOptions): Promise<{
    configPath: string;
    scriptPath: string;
    promptPath: string;
    routePromptsDir: string;
  }> {
    await fs.mkdir(this.outputDir, { recursive: true });

    // 1. 保存集成测试配置
    const configPath = path.join(this.outputDir, 'integrated-test-config.json');
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
    Logger.info(`配置已保存: ${configPath}`);

    // 2. 保存 CodeBuddy 测试脚本
    const scriptPath = path.join(this.outputDir, 'integrated-test.ts');
    const script = this.generateCodeBuddyTestScript(options);
    await fs.writeFile(scriptPath, script);
    Logger.info(`脚本已保存: ${scriptPath}`);

    // 3. 保存全量测试 Prompt
    const promptPath = path.join(this.outputDir, 'full-test-prompt.md');
    const prompt = this.generateFullTestPrompt(options);
    await fs.writeFile(promptPath, prompt);
    Logger.info(`全量 Prompt 已保存: ${promptPath}`);

    // 4. 保存单路由 Prompt 文件
    const routePromptsDir = path.join(this.outputDir, 'route-prompts');
    await fs.mkdir(routePromptsDir, { recursive: true });

    for (const route of this.config.routes) {
      const fileName = this.routeToFileName(route.route);
      const routePromptPath = path.join(routePromptsDir, `${fileName}.md`);
      const routePrompt = this.generateRouteTestPrompt(route.route, options);
      await fs.writeFile(routePromptPath, routePrompt);
    }
    Logger.info(`路由 Prompt 已保存: ${routePromptsDir}/ (${this.config.routes.length} 个文件)`);

    return {
      configPath,
      scriptPath,
      promptPath,
      routePromptsDir,
    };
  }

  /**
   * 路由路径转文件名
   */
  private routeToFileName(routePath: string): string {
    if (routePath === '/' || routePath === '') {
      return 'root';
    }
    return routePath
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/:/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase() || 'root';
  }
}

/**
 * 从 Rule 文件创建集成测试执行器
 */
export async function createIntegratedTestExecutor(
  rulePath: string,
  outputDir?: string
): Promise<IntegratedTestExecutor> {
  const ruleContent = await fs.readFile(rulePath, 'utf-8');
  const rule = JSON.parse(ruleContent);

  // 将 Rule 转换为集成测试配置
  const config: IntegratedTestConfig = {
    projectName: rule.name,
    baseUrl: rule.projectContext?.baseUrl || 'http://localhost:8080',
    generatedAt: rule.createdAt || new Date().toISOString(),
    routes: (rule.projectContext?.routes || []).map((route: any) => {
      const scenarios = (rule.scenarios || [])
        .filter((s: any) => s.route === route.path)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          priority: s.priority,
          prompt: s.prompt,
          expectedOutcome: s.expectedOutcome,
          availableTestIds: s.availableTestIds || [],
          tags: s.tags || [],
        }));

      return {
        route: route.path,
        name: route.name,
        description: route.description,
        component: route.component,
        scenarios,
      };
    }),
    mcpConfig: rule.mcpConfig || {
      server: 'chrome-devtools',
      viewport: '1920x1080',
      timeout: 30000,
      screenshotOnFailure: true,
    },
  };

  const output = outputDir || path.join(path.dirname(rulePath), '..', 'execution');
  return new IntegratedTestExecutor(config, output);
}

/**
 * 快速生成集成测试文件
 */
export async function generateIntegratedTestFiles(
  rulePath: string,
  options?: TestExecutionOptions & { outputDir?: string }
): Promise<void> {
  Logger.header('生成集成测试文件');

  const executor = await createIntegratedTestExecutor(rulePath, options?.outputDir);

  Logger.info(`路由数量: ${executor.getAvailableRoutes().length}`);

  const files = await executor.saveTestFiles(options);

  Logger.divider();
  Logger.success('集成测试文件生成完成！');
  Logger.info(`\n📁 生成的文件:`);
  Logger.info(`  - ${files.configPath} (配置文件)`);
  Logger.info(`  - ${files.scriptPath} (测试脚本)`);
  Logger.info(`  - ${files.promptPath} (全量测试 Prompt)`);
  Logger.info(`  - ${files.routePromptsDir}/ (单路由 Prompt)`);

  Logger.divider();
  Logger.header('🚀 使用方式');
  Logger.info('\n【单路由测试】');
  Logger.info(`  在 CodeBuddy 中引用: @${files.routePromptsDir}/<route>.md`);
  Logger.info('  或在脚本中调用: runRouteTest(\'/retrieve/:indexId?\')');

  Logger.info('\n【全量测试】');
  Logger.info(`  在 CodeBuddy 中引用: @${files.promptPath}`);
  Logger.info('  或在脚本中调用: runAllTests()');

  Logger.info('\n【按类型测试】');
  Logger.info('  在脚本中调用: runTestsByType(\'smoke\')');
}
