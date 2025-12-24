/**
 * CLI 测试 Prompt 生成器
 *
 * 生成测试 Prompt 文件，供 CodeBuddy 执行：
 * - 单路由测试 Prompt
 * - 全量测试 Prompt
 * - 按类型/优先级筛选
 */

import { Logger } from '../utils/log.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============ 类型定义 ============

export interface TestScenario {
  id: string;
  name: string;
  type: 'smoke' | 'functional' | 'regression' | 'e2e';
  priority: 'critical' | 'high' | 'medium' | 'low';
  prompt: string;
  expectedOutcome: string;
  availableTestIds?: string[];
  tags?: string[];
}

export interface RouteTestConfig {
  route: string;
  name: string;
  description: string;
  component: string;
  scenarios: TestScenario[];
}

export interface TestConfig {
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

export interface TestRunOptions {
  baseUrl?: string;
  route?: string;
  type?: 'smoke' | 'functional' | 'regression' | 'e2e';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  scenarioId?: string;
  all?: boolean;
  outputDir?: string;
}

// ============ 工具函数 ============

/**
 * 查找 Rule 文件路径
 */
export async function findRulePath(customPath?: string): Promise<string | null> {
  if (customPath) {
    try {
      await fs.access(customPath);
      return customPath;
    } catch {
      return null;
    }
  }

  // 搜索默认位置
  const searchPaths = [
    path.join(process.cwd(), '.codebuddy', 'rules'),
    path.join(process.cwd(), '.mcp', 'rules'),
  ];

  for (const dir of searchPaths) {
    try {
      const files = await fs.readdir(dir);
      const ruleFile = files.find(f => f.endsWith('.json') && f.startsWith('devtools-mcp-rule'));
      if (ruleFile) {
        return path.join(dir, ruleFile);
      }
    } catch {
      // 目录不存在，继续搜索
    }
  }

  return null;
}

/**
 * 加载测试配置
 */
export async function loadTestConfig(rulePath: string): Promise<TestConfig> {
  const ruleContent = await fs.readFile(rulePath, 'utf-8');
  const rule = JSON.parse(ruleContent);

  // 将 Rule 转换为测试配置
  const config: TestConfig = {
    projectName: rule.name || 'Unknown Project',
    baseUrl: rule.projectContext?.baseUrl || rule.variables?.baseUrl?.default || 'http://localhost:8080',
    generatedAt: rule.createdAt || new Date().toISOString(),
    routes: [],
    mcpConfig: rule.mcpConfig || {
      server: 'chrome-devtools',
      viewport: '1920x1080',
      timeout: 30000,
      screenshotOnFailure: true,
    },
  };

  // 从 scenarios 构建路由配置
  const routeMap = new Map<string, RouteTestConfig>();

  for (const scenario of rule.scenarios || []) {
    const routePath = scenario.route || '/';
    if (!routeMap.has(routePath)) {
      // 从 projectContext.routes 获取路由信息
      const routeInfo = (rule.projectContext?.routes || []).find((r: any) => r.path === routePath);
      routeMap.set(routePath, {
        route: routePath,
        name: routeInfo?.name || routePath,
        description: routeInfo?.description || '',
        component: routeInfo?.component || 'Unknown',
        scenarios: [],
      });
    }

    routeMap.get(routePath)!.scenarios.push({
      id: scenario.id,
      name: scenario.name,
      type: scenario.type || 'functional',
      priority: scenario.priority || 'medium',
      prompt: scenario.prompt,
      expectedOutcome: scenario.expectedOutcome || '',
      availableTestIds: scenario.availableTestIds || [],
      tags: scenario.tags || [],
    });
  }

  config.routes = Array.from(routeMap.values());
  return config;
}

/**
 * 筛选测试场景
 */
export function filterScenarios(
  config: TestConfig,
  options: TestRunOptions
): { route: RouteTestConfig; scenario: TestScenario }[] {
  const results: { route: RouteTestConfig; scenario: TestScenario }[] = [];

  for (const route of config.routes) {
    // 路由筛选
    if (options.route) {
      const matchesRoute =
        route.route === options.route ||
        route.route.includes(options.route) ||
        options.route.includes(route.route) ||
        route.name.toLowerCase().includes(options.route.toLowerCase()) ||
        route.component.toLowerCase().includes(options.route.toLowerCase());

      if (!matchesRoute) continue;
    }

    for (const scenario of route.scenarios) {
      // 场景 ID 筛选
      if (options.scenarioId && scenario.id !== options.scenarioId) {
        continue;
      }

      // 类型筛选
      if (options.type && scenario.type !== options.type) {
        continue;
      }

      // 优先级筛选
      if (options.priority && scenario.priority !== options.priority) {
        continue;
      }

      results.push({ route, scenario });
    }
  }

  return results;
}

// ============ Prompt 生成 ============

/**
 * 生成单个测试 Prompt 内容
 */
function generatePromptContent(
  config: TestConfig,
  scenarios: { route: RouteTestConfig; scenario: TestScenario }[],
  baseUrl: string,
  title: string
): string {
  let prompt = `# ${title}\n\n`;
  prompt += `> 请使用 Chrome DevTools MCP 执行以下测试场景\n\n`;
  prompt += `**项目**: ${config.projectName}\n`;
  prompt += `**基础 URL**: ${baseUrl}\n`;
  prompt += `**生成时间**: ${new Date().toISOString()}\n`;
  prompt += `**测试场景**: ${scenarios.length} 个\n\n`;

  prompt += `## MCP 配置\n\n`;
  prompt += '使用 `chrome-devtools` MCP 服务执行测试。\n\n';
  prompt += '```json\n';
  prompt += JSON.stringify(config.mcpConfig, null, 2);
  prompt += '\n```\n\n';

  prompt += `---\n\n`;

  // 按路由分组
  const routeGroups = new Map<string, { route: RouteTestConfig; scenarios: TestScenario[] }>();
  for (const { route, scenario } of scenarios) {
    if (!routeGroups.has(route.route)) {
      routeGroups.set(route.route, { route, scenarios: [] });
    }
    routeGroups.get(route.route)!.scenarios.push(scenario);
  }

  let scenarioIndex = 1;
  for (const [, { route, scenarios: routeScenarios }] of routeGroups) {
    prompt += `## ${route.name}\n\n`;
    prompt += `**路由**: \`${route.route}\`\n`;
    prompt += `**组件**: ${route.component}\n`;
    if (route.description) {
      prompt += `**描述**: ${route.description}\n`;
    }
    prompt += '\n';

    for (const scenario of routeScenarios) {
      prompt += `### 场景 ${scenarioIndex}: ${scenario.name}\n\n`;
      prompt += `| 属性 | 值 |\n`;
      prompt += `|------|----|\n`;
      prompt += `| 类型 | ${scenario.type} |\n`;
      prompt += `| 优先级 | ${scenario.priority} |\n`;
      prompt += `| ID | ${scenario.id} |\n\n`;

      const processedPrompt = scenario.prompt
        .replace(/\{\{baseUrl\}\}/g, baseUrl)
        .replace(/\{\{route\}\}/g, route.route);

      prompt += '**执行步骤**:\n\n';
      prompt += processedPrompt;
      prompt += '\n\n';

      prompt += `**预期结果**: ${scenario.expectedOutcome}\n\n`;

      if (scenario.availableTestIds && scenario.availableTestIds.length > 0) {
        prompt += `**可用选择器 (test-id)**:\n`;
        scenario.availableTestIds.slice(0, 10).forEach(id => {
          prompt += `- \`[data-test-id="${id}"]\`\n`;
        });
        if (scenario.availableTestIds.length > 10) {
          prompt += `- ... 还有 ${scenario.availableTestIds.length - 10} 个\n`;
        }
        prompt += '\n';
      }

      prompt += `---\n\n`;
      scenarioIndex++;
    }
  }

  prompt += `## 执行说明\n\n`;
  prompt += `1. 确保 Chrome DevTools MCP 服务已启动\n`;
  prompt += `2. 确保测试服务器 ${baseUrl} 可访问\n`;
  prompt += `3. 按顺序执行上述测试场景\n`;
  prompt += `4. 每个场景执行后截图记录结果\n`;
  prompt += `5. 如遇到错误，记录错误信息并继续下一个场景\n`;

  return prompt;
}

/**
 * 路由路径转文件名
 */
function routeToFileName(routePath: string): string {
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

/**
 * 生成测试 Prompt 文件
 */
export async function generateTestPromptFiles(
  rulePath: string,
  options: TestRunOptions
): Promise<void> {
  const config = await loadTestConfig(rulePath);
  const baseUrl = options.baseUrl || config.baseUrl;
  const outputDir = options.outputDir || '.codebuddy/prompts';

  Logger.header('生成测试 Prompt 文件');
  Logger.info(`项目: ${config.projectName}`);
  Logger.info(`基础 URL: ${baseUrl}`);
  Logger.info(`输出目录: ${outputDir}`);

  // 确保输出目录存在
  await fs.mkdir(path.join(process.cwd(), outputDir), { recursive: true });

  const scenarios = filterScenarios(config, options);

  if (scenarios.length === 0) {
    Logger.warn('没有匹配的测试场景');
    Logger.info('\n可用路由:');
    config.routes.slice(0, 10).forEach(r => Logger.info(`  - ${r.route} (${r.name})`));
    return;
  }

  Logger.info(`匹配场景: ${scenarios.length} 个`);
  Logger.divider();

  const generatedFiles: string[] = [];

  // 生成主 Prompt 文件
  let mainFileName: string;
  let mainTitle: string;

  if (options.route) {
    // 单路由测试
    const routeName = routeToFileName(options.route);
    mainFileName = `test-${routeName}.md`;
    mainTitle = `${config.projectName} - ${options.route} 路由测试`;
  } else if (options.type) {
    // 按类型测试
    mainFileName = `test-${options.type}.md`;
    mainTitle = `${config.projectName} - ${options.type} 测试`;
  } else if (options.priority) {
    // 按优先级测试
    mainFileName = `test-${options.priority}.md`;
    mainTitle = `${config.projectName} - ${options.priority} 优先级测试`;
  } else {
    // 全量测试
    mainFileName = 'test-all.md';
    mainTitle = `${config.projectName} - 全量 E2E 测试`;
  }

  const mainPrompt = generatePromptContent(config, scenarios, baseUrl, mainTitle);
  const mainFilePath = path.join(process.cwd(), outputDir, mainFileName);
  await fs.writeFile(mainFilePath, mainPrompt);
  generatedFiles.push(mainFileName);

  // 如果是全量测试，同时生成单路由文件
  if (options.all && !options.route) {
    const routeDir = path.join(process.cwd(), outputDir, 'routes');
    await fs.mkdir(routeDir, { recursive: true });

    for (const route of config.routes) {
      const routeScenarios = scenarios.filter(s => s.route.route === route.route);
      if (routeScenarios.length === 0) continue;

      const routeFileName = `${routeToFileName(route.route)}.md`;
      const routeTitle = `${config.projectName} - ${route.name} 测试`;
      const routePrompt = generatePromptContent(config, routeScenarios, baseUrl, routeTitle);
      const routeFilePath = path.join(routeDir, routeFileName);
      await fs.writeFile(routeFilePath, routePrompt);
      generatedFiles.push(`routes/${routeFileName}`);
    }
  }

  // 生成索引文件
  const indexContent = {
    generatedAt: new Date().toISOString(),
    projectName: config.projectName,
    baseUrl,
    totalScenarios: scenarios.length,
    files: generatedFiles,
    usage: {
      codebuddy: `在 CodeBuddy 对话中输入: @${outputDir}/${mainFileName}`,
      description: '引用 Prompt 文件后，CodeBuddy 将使用 Chrome DevTools MCP 执行测试',
    },
  };

  const indexPath = path.join(process.cwd(), outputDir, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(indexContent, null, 2));

  Logger.divider();
  Logger.success('Prompt 文件生成完成！');
  Logger.info(`\n📁 生成的文件:`);
  generatedFiles.forEach(f => Logger.info(`  - ${outputDir}/${f}`));
  Logger.info(`  - ${outputDir}/index.json`);

  Logger.divider();
  Logger.header('在 CodeBuddy 中执行测试');
  Logger.info(`\n1. 打开 CodeBuddy 对话`);
  Logger.info(`2. 输入: @${outputDir}/${mainFileName}`);
  Logger.info(`3. 发送消息，CodeBuddy 将自动执行测试`);

  if (options.all && !options.route) {
    Logger.info(`\n单路由测试:`);
    Logger.info(`  @${outputDir}/routes/<route>.md`);
  }
}
