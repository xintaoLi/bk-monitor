#!/usr/bin/env node
import { program } from 'commander';

// 全局选项：工作目录
program
  .name('mcp-e2e')
  .description('AI + MCP + CodeBuddy 自动化测试 CLI（基于 Chrome DevTools MCP）')
  .version('0.1.0')
  .option('--cwd <path>', '指定工作目录')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.cwd) {
      process.chdir(opts.cwd);
    }
  });

// ============ Chrome DevTools MCP 命令 ============

program
  .command('mcp:check')
  .description('检查 Chrome DevTools MCP 环境')
  .action(async () => {
    const { Logger } = await import('./utils/log.js');
    const { checkChromeAvailable, getDefaultChromePath } = await import('./mcp/chrome-devtools-mcp.js');
    const { existsSync } = await import('fs');
    const { execSync } = await import('child_process');

    Logger.header('Chrome DevTools MCP 环境检查');

    // 1. 检查 Node.js 版本
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    Logger.info(`Node.js 版本: ${nodeVersion} ${majorVersion >= 20 ? '✅' : '⚠️ 建议 v20+'}`);

    // 2. 检查 Chrome
    const chromePath = getDefaultChromePath();
    const chromeAvailable = await checkChromeAvailable();
    Logger.info(`Chrome 路径: ${chromePath} ${chromeAvailable ? '✅' : '❌'}`);

    // 3. 检查 npx
    try {
      execSync('npx --version', { stdio: 'pipe' });
      Logger.info('npx: ✅ 可用');
    } catch {
      Logger.error('npx: ❌ 不可用');
    }

    // 4. 检查 chrome-devtools-mcp
    Logger.info('\n正在检查 chrome-devtools-mcp...');
    try {
      const result = execSync('npx chrome-devtools-mcp@latest --version', {
        stdio: 'pipe',
        timeout: 30000,
      });
      Logger.success(`chrome-devtools-mcp: ✅ ${result.toString().trim()}`);
    } catch {
      Logger.warn('chrome-devtools-mcp: ⚠️ 首次运行需要下载');
    }

    // 5. 检查 MCP 配置文件（优先检查 .codebuddy/mcp.json）
    const codebuddyMcpPath = `${process.cwd()}/.codebuddy/mcp.json`;
    const legacyMcpPath = `${process.cwd()}/.mcp/servers.json`;

    if (existsSync(codebuddyMcpPath)) {
      Logger.info(`MCP 配置: ✅ ${codebuddyMcpPath} (CodeBuddy 可识别)`);
    } else if (existsSync(legacyMcpPath)) {
      Logger.warn(`MCP 配置: ⚠️ ${legacyMcpPath} (旧路径，建议重新运行 mcp:init)`);
    } else {
      Logger.warn('MCP 配置: ⚠️ 未找到，运行 mcp-e2e mcp:init 创建');
    }

    Logger.divider();
    Logger.success('环境检查完成！');
  });

program
  .command('mcp:init')
  .description('初始化 Chrome DevTools MCP 配置（自动配置 CodeBuddy 可识别的 MCP 服务）')
  .option('--headless', '默认使用无头模式', false)
  .option('--isolated', '默认使用隔离模式', false)
  .option('--viewport <size>', '默认视口大小', '1920x1080')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { getDefaultChromePath } = await import('./mcp/chrome-devtools-mcp.js');
    const fsExtra = (await import('fs-extra')).default;
    const path = await import('path');

    Logger.header('初始化 Chrome DevTools MCP 配置');

    const chromePath = getDefaultChromePath();
    const args = ['chrome-devtools-mcp@latest'];

    if (chromePath) {
      args.push('--executablePath', chromePath);
    }

    if (options.headless) {
      args.push('--headless');
    }

    if (options.isolated) {
      args.push('--isolated');
    }

    args.push('--viewport', options.viewport);

    const mcpServerConfig = {
      command: 'npx',
      args,
      env: {},
    };

    // 1. 写入 .codebuddy/mcp.json（CodeBuddy 识别的配置文件）
    const codebuddyDir = path.join(process.cwd(), '.codebuddy');
    await fsExtra.ensureDir(codebuddyDir);

    const codebuddyMcpPath = path.join(codebuddyDir, 'mcp.json');
    const codebuddyConfig = {
      mcpServers: {
        'chrome-devtools': mcpServerConfig,
      },
    };
    await fsExtra.writeJson(codebuddyMcpPath, codebuddyConfig, { spaces: 2 });
    Logger.success(`✅ CodeBuddy MCP 配置: ${path.relative(process.cwd(), codebuddyMcpPath)}`);

    // 2. 同时写入 .mcp/servers.json（备用）
    const mcpDir = path.join(process.cwd(), '.mcp');
    await fsExtra.ensureDir(mcpDir);
    const mcpConfigPath = path.join(mcpDir, 'servers.json');
    await fsExtra.writeJson(mcpConfigPath, codebuddyConfig, { spaces: 2 });
    Logger.info(`   备用配置: ${path.relative(process.cwd(), mcpConfigPath)}`);

    Logger.divider();
    Logger.info('配置内容:');
    console.log(JSON.stringify(codebuddyConfig, null, 2));

    Logger.divider();
    Logger.success('🎉 MCP 配置初始化完成！');
    Logger.info('\n下一步操作:');
    Logger.info('  1. 重启 CodeBuddy（或重新打开项目）');
    Logger.info('  2. CodeBuddy 将自动识别 chrome-devtools MCP 服务');
    Logger.info('  3. 运行 mcp-e2e router:generate 生成测试 Rule');
  });

program
  .command('mcp:connect')
  .description('测试连接 Chrome DevTools MCP')
  .option('--browser-url <url>', '连接到已运行的 Chrome 实例')
  .option('--headless', '无头模式', false)
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { ChromeDevToolsMCP } = await import('./mcp/chrome-devtools-mcp.js');

    Logger.header('测试 Chrome DevTools MCP 连接');

    const client = new ChromeDevToolsMCP({
      browserUrl: options.browserUrl,
      headless: options.headless,
    });

    try {
      await client.connect();
      Logger.success('✅ 连接成功！');

      const tools = client.getAvailableTools();
      if (tools.length > 0) {
        Logger.info(`\n可用工具 (${tools.length}个):`);
        tools.forEach(tool => Logger.info(`  - ${tool}`));
      }

      // 测试基本操作
      Logger.info('\n测试导航到 about:blank...');
      await client.navigate('about:blank');
      Logger.success('✅ 导航成功！');

      await client.disconnect();

    } catch (error: any) {
      Logger.error(`❌ 连接失败: ${error.message}`);
    }
  });

// ============ Router 分析与 MCP Rule 生成命令 ============

program
  .command('router:analyze')
  .description('分析 Router 配置，提取页面组件和交互元素')
  .action(async () => {
    const { Logger } = await import('./utils/log.js');
    const { analyzeRouter } = await import('./analyzer/router-analyzer.js');

    const result = await analyzeRouter(process.cwd());

    Logger.divider();
    Logger.header('Router 分析结果');
    Logger.info(`框架: ${result.framework}`);
    Logger.info(`路由文件: ${result.routerFilePath}`);
    Logger.info(`路由数量: ${result.flatRoutes.length}`);
    Logger.info(`页面组件: ${result.pageComponents.length}`);
    Logger.info(`Layout 组件: ${result.layoutComponents.length}`);
    Logger.info(`路由守卫: ${result.guards.length}`);

    if (result.flatRoutes.length > 0) {
      Logger.divider();
      Logger.info('路由列表:');
      result.flatRoutes.slice(0, 10).forEach(route => {
        Logger.info(`  ${route.fullPath} → ${route.component}`);
      });
      if (result.flatRoutes.length > 10) {
        Logger.info(`  ... 还有 ${result.flatRoutes.length - 10} 个路由`);
      }
    }
  });

program
  .command('router:generate')
  .description('基于 Router 生成 Chrome DevTools MCP 测试 Rule')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--smoke', '只生成冒烟测试', false)
  .option('--e2e', '只生成 E2E 测试', false)
  .option('--output <dir>', '输出目录（默认 .codebuddy/rules）')
  .option('--inject-testid', '自动注入 test-id（跳过询问）')
  .option('--no-inject-testid', '不注入 test-id（跳过询问）')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { analyzeRouter } = await import('./analyzer/router-analyzer.js');
    const { generateDevToolsMCPRule } = await import('./generator/devtools-mcp-rule.js');
    const { promptConfirm } = await import('./utils/prompt.js');
    const { injectTestIdsFromRouter } = await import('./codebuddy/router-testid-injector.js');

    Logger.header('生成 Chrome DevTools MCP 测试 Rule');

    // 1. 分析 Router
    Logger.info('\n📊 Step 1: 分析 Router 配置...');
    const routerAnalysis = await analyzeRouter(process.cwd());

    if (routerAnalysis.flatRoutes.length === 0) {
      Logger.error('未找到有效的路由配置');
      return;
    }

    Logger.info(`  - 框架: ${routerAnalysis.framework}`);
    Logger.info(`  - 路由: ${routerAnalysis.flatRoutes.length}`);
    Logger.info(`  - 组件: ${routerAnalysis.pageComponents.length}`);

    // 2. 询问是否注入 test-id
    let shouldInjectTestId = false;
    let injectionReport: Awaited<ReturnType<typeof injectTestIdsFromRouter>> | null = null;

    if (options.injectTestid === true) {
      // 命令行指定 --inject-testid
      shouldInjectTestId = true;
      Logger.info('\n🏷️  Step 2: 注入 test-id（命令行参数指定）...');
    } else if (options.injectTestid === false) {
      // 命令行指定 --no-inject-testid
      shouldInjectTestId = false;
      Logger.info('\n🏷️  Step 2: 跳过 test-id 注入（命令行参数指定）');
    } else {
      // 交互式询问用户
      Logger.info('');
      Logger.divider();
      Logger.info('💡 test-id 可以提高测试的稳定性和可维护性');
      Logger.info('   注入后，测试将使用 data-testid 属性定位元素，减少不同模型执行结果的差异');
      Logger.divider();

      shouldInjectTestId = await promptConfirm(
        '是否为页面组件注入 test-id 属性？',
        false
      );
    }

    if (shouldInjectTestId) {
      Logger.info('\n🏷️  Step 2: 注入 test-id...');

      injectionReport = await injectTestIdsFromRouter(routerAnalysis, process.cwd(), {
        dryRun: false,
        config: {
          prefix: 'test',
        },
      });

      Logger.success(`  已注入 ${injectionReport.testIdMapping.length} 个 test-id`);

      // 重新分析 Router 以获取最新的 test-id 信息
      Logger.info('  重新分析组件以获取最新 test-id...');
      const updatedAnalysis = await analyzeRouter(process.cwd());
      Object.assign(routerAnalysis, updatedAnalysis);
    } else {
      Logger.info('\n🏷️  Step 2: 跳过 test-id 注入');
    }

    // 3. 生成 MCP Rule（输出到 .codebuddy/rules）
    Logger.info('\n📝 Step 3: 生成 MCP Rule...');
    const outputDir = options.output || '.codebuddy/rules';
    const rule = await generateDevToolsMCPRule(
      routerAnalysis,
      process.cwd(),
      options.baseUrl,
      {
        outputDir,
        injectionReport,
        hasTestIds: shouldInjectTestId,
      }
    );

    const ruleFileName = `${rule.id}.json`;
    const promptsFileName = `${rule.id}-prompts.md`;

    Logger.divider();
    Logger.success('✅ MCP Rule 生成完成！');
    Logger.info(`Rule ID: ${rule.id}`);
    Logger.info(`测试场景: ${rule.scenarios.length}`);
    Logger.info(`Test-ID 映射: ${rule.projectContext.testIdMapping.length}`);

    Logger.divider();
    Logger.header('📁 生成的文件');
    Logger.info(`  - ${outputDir}/${ruleFileName} (完整 Rule)`);
    Logger.info(`  - ${outputDir}/${promptsFileName} (全量测试 Prompts)`);
    Logger.info(`  - ${outputDir}/routes/ (单路由测试文件)`);
    Logger.info(`  - ${outputDir}/route-index.json (路由索引)`);
    Logger.info(`  - ${outputDir}/testid-mapping.json (Test-ID 映射)`);

    Logger.divider();
    Logger.header('🚀 快速使用');
    Logger.info('\n【单路由测试】');
    Logger.info(`  1. 查看 ${outputDir}/routes/ 目录下的文件`);
    Logger.info('  2. 选择需要测试的路由对应的 .md 文件');
    Logger.info('  3. 在 CodeBuddy 中引用: @.codebuddy/rules/routes/<route>.md');

    Logger.info('\n【全量测试】');
    Logger.info(`  在 CodeBuddy 对话中输入: @${outputDir}/${promptsFileName}`);
    Logger.info('  然后告诉 AI 执行其中的测试场景');

    Logger.info('\n【命令行执行】');
    Logger.info(`  mcp-e2e rule:run ${rule.id} --base-url ${options.baseUrl}`);
  });

program
  .command('router:inject')
  .description('基于 Router 分析为页面组件注入 test-id')
  .option('--dry-run', '预览模式，不实际修改文件', false)
  .option('--only-pages', '只处理页面组件', false)
  .option('--routes <routes...>', '指定路由路径')
  .option('--prefix <prefix>', 'test-id 前缀', 'test')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { analyzeRouter } = await import('./analyzer/router-analyzer.js');
    const { injectTestIdsFromRouter } = await import('./codebuddy/router-testid-injector.js');

    Logger.header('基于 Router 注入 Test-ID');

    // 1. 分析 Router
    Logger.info('\n📊 Step 1: 分析 Router 配置...');
    const routerAnalysis = await analyzeRouter(process.cwd());

    if (routerAnalysis.pageComponents.length === 0) {
      Logger.error('未找到页面组件');
      return;
    }

    // 2. 注入 test-id
    Logger.info('\n🏷️  Step 2: 注入 test-id...');
    await injectTestIdsFromRouter(routerAnalysis, process.cwd(), {
      dryRun: options.dryRun !== false, // 默认 dry-run
      onlyPages: options.onlyPages,
      routes: options.routes,
      config: {
        prefix: options.prefix,
      },
    });
  });

program
  .command('router:full')
  .description('完整流程：分析 Router → 注入 test-id → 生成 MCP Rule')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--inject', '实际注入 test-id（默认预览）', false)
  .option('--prefix <prefix>', 'test-id 前缀', 'test')
  .option('--output <dir>', '输出目录（默认 .codebuddy/rules）')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { analyzeRouter } = await import('./analyzer/router-analyzer.js');
    const { injectTestIdsFromRouter } = await import('./codebuddy/router-testid-injector.js');
    const { generateDevToolsMCPRule } = await import('./generator/devtools-mcp-rule.js');

    Logger.header('🚀 Router 完整测试工作流');

    // Step 1: 分析 Router
    Logger.info('\n📊 Step 1: 分析 Router 配置...');
    const routerAnalysis = await analyzeRouter(process.cwd());

    if (routerAnalysis.flatRoutes.length === 0) {
      Logger.error('未找到有效的路由配置');
      return;
    }

    Logger.info(`  - 框架: ${routerAnalysis.framework}`);
    Logger.info(`  - 路由: ${routerAnalysis.flatRoutes.length}`);
    Logger.info(`  - 组件: ${routerAnalysis.pageComponents.length}`);

    // Step 2: 注入 test-id
    Logger.info('\n🏷️  Step 2: 分析/注入 test-id...');
    const injectionReport = await injectTestIdsFromRouter(routerAnalysis, process.cwd(), {
      dryRun: !options.inject,
      config: {
        prefix: options.prefix,
      },
    });

    // Step 3: 生成 MCP Rule
    Logger.info('\n📝 Step 3: 生成 MCP Rule...');
    const outputDir = options.output || '.codebuddy/rules';
    const rule = await generateDevToolsMCPRule(
      routerAnalysis,
      process.cwd(),
      options.baseUrl,
      { outputDir }
    );

    // 总结
    Logger.divider();
    Logger.header('工作流完成');
    Logger.info(`路由分析: ${routerAnalysis.flatRoutes.length} 个路由`);
    Logger.info(`Test-ID: ${injectionReport.testIdMapping.length} 个映射`);
    Logger.info(`测试场景: ${rule.scenarios.length} 个`);

    Logger.divider();
    Logger.header('📁 生成的文件');
    Logger.info(`  - ${outputDir}/${rule.id}.json (完整 Rule)`);
    Logger.info(`  - ${outputDir}/${rule.id}-prompts.md (全量测试 Prompts)`);
    Logger.info(`  - ${outputDir}/routes/ (单路由测试文件)`);
    Logger.info(`  - ${outputDir}/route-index.json (路由索引)`);
    Logger.info(`  - ${outputDir}/testid-mapping.json (Test-ID 映射)`);

    if (!options.inject) {
      Logger.info(`\n💡 提示: 添加 --inject 参数实际注入 test-id`);
    }

    Logger.divider();
    Logger.header('🚀 快速使用');
    Logger.info('\n【单路由测试】查看 routes/ 目录，选择对应的 .md 文件');
    Logger.info(`【全量测试】@${outputDir}/${rule.id}-prompts.md`);
    Logger.info(`【查看索引】${outputDir}/route-index.json`);

    Logger.success('\n✅ 完成！现在可以使用 MCP Rule 执行测试');
  });

// ============ Rule 执行命令 ============

program
  .command('rule:run')
  .description('执行 MCP Rule JSON 文件（Chrome DevTools MCP 格式）')
  .argument('<ruleId>', 'Rule ID 或 JSON 文件路径')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--scenario <id>', '只执行指定场景')
  .option('--dry-run', '预览模式，生成执行文件但不实际执行', false)
  .option('--save-prompts', '保存 Prompts 到文件', true)
  .action(async (ruleId, options) => {
    const { Logger } = await import('./utils/log.js');
    const fs = await import('fs/promises');
    const path = await import('path');

    Logger.header('执行 MCP Rule');

    // 辅助函数：检查文件是否存在
    const pathExists = async (p: string) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    };

    // 查找 Rule 文件（优先从 .codebuddy/rules 查找）
    let rulePath = ruleId;
    if (!rulePath.endsWith('.json')) {
      const possiblePaths = [
        // 优先 .codebuddy/rules（CodeBuddy 识别的路径）
        path.join(process.cwd(), '.codebuddy', 'rules', `${ruleId}.json`),
        path.join(process.cwd(), '.codebuddy', 'rules', ruleId, 'rule.json'),
        // 兼容旧路径 .mcp/rules
        path.join(process.cwd(), '.mcp', 'rules', `${ruleId}.json`),
        path.join(process.cwd(), '.mcp', 'rules', ruleId, 'rule.json'),
        // 直接路径
        path.join(process.cwd(), ruleId),
      ];
      for (const p of possiblePaths) {
        if (await pathExists(p)) {
          rulePath = p;
          break;
        }
      }
    }

    if (!await pathExists(rulePath)) {
      Logger.error(`Rule 文件不存在: ${rulePath}`);
      Logger.info('请检查以下目录:');
      Logger.info('  - .codebuddy/rules/');
      Logger.info('  - .mcp/rules/');
      return;
    }

    Logger.info(`Rule 文件: ${rulePath}`);

    // 使用 DevTools MCP 执行器
    const { createDevToolsMCPExecutor } = await import('./runtime/devtools-mcp-executor.js');

    const ruleContent = await fs.readFile(rulePath, 'utf-8');
    const rule = JSON.parse(ruleContent);

    const baseUrl = options.baseUrl || rule.variables?.baseUrl?.default || 'http://localhost:8080';

    const executor = createDevToolsMCPExecutor({
      baseUrl,
      outputDir: path.join(path.dirname(rulePath), '..', 'execution'),
      variables: {
        indexId: rule.variables?.indexId?.default || '1',
      },
    });

    // 执行规则
    await executor.executeRule(rule, {
      dryRun: options.dryRun,
      scenarioId: options.scenario,
    });
  });

// ============ Test-ID 命令 ============

program
  .command('testid:analyze')
  .description('分析组件并预览 test-id 注入')
  .option('-f, --files <files...>', '指定目标文件')
  .action(async (options) => {
    const { injectTestIds } = await import('./codebuddy/testid-injector.js');
    await injectTestIds(process.cwd(), {
      dryRun: true,
      targetFiles: options.files,
    });
  });

program
  .command('testid:inject')
  .description('为组件注入 test-id')
  .option('-f, --files <files...>', '指定目标文件')
  .option('--prefix <prefix>', 'test-id 前缀', 'test')
  .action(async (options) => {
    const { injectTestIds } = await import('./codebuddy/testid-injector.js');
    await injectTestIds(process.cwd(), {
      dryRun: false,
      targetFiles: options.files,
      config: {
        prefix: options.prefix,
      },
    });
  });

program
  .command('testid:mapping')
  .description('查看 test-id 映射表')
  .action(async () => {
    const { getTestIdMapping } = await import('./codebuddy/testid-injector.js');
    const mappings = await getTestIdMapping();

    if (mappings.length === 0) {
      console.log('未找到 test-id 映射。请先运行 testid:analyze 或 testid:inject');
      return;
    }

    console.table(mappings.map(m => ({
      'Test ID': m.testId,
      '组件': m.componentName,
      '类型': m.elementType,
      '选择器': m.selector,
    })));
  });

// ============ 测试 Prompt 生成命令 ============

program
  .command('test:list')
  .description('列出所有可测试的路由')
  .option('--rule <path>', 'Rule 文件路径')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { loadTestConfig, findRulePath } = await import('./runtime/cli-test-executor.js');

    const rulePath = await findRulePath(options.rule);
    if (!rulePath) {
      Logger.error('未找到 Rule 文件，请先运行 router:generate 生成 Rule');
      return;
    }

    const config = await loadTestConfig(rulePath);

    Logger.header('可测试的路由列表');
    Logger.info(`项目: ${config.projectName}`);
    Logger.info(`基础 URL: ${config.baseUrl}`);
    Logger.info(`共 ${config.routes.length} 个路由\n`);

    config.routes.forEach((route, index) => {
      const scenarioCount = route.scenarios.length;
      const types = [...new Set(route.scenarios.map(s => s.type))].join(', ');
      Logger.info(`${String(index + 1).padStart(3)}. ${route.route} - ${route.name} (${scenarioCount} 个场景: ${types})`);
    });

    Logger.divider();
    Logger.info('\n生成测试 Prompt:');
    Logger.info('  mcp-e2e test:gen --route /retrieve      单路由测试 Prompt');
    Logger.info('  mcp-e2e test:gen --type smoke           冒烟测试 Prompt');
    Logger.info('  mcp-e2e test:gen --all                  全量测试 Prompt');
    Logger.info('\n在 CodeBuddy 中执行:');
    Logger.info('  引用生成的 Prompt 文件: @.codebuddy/prompts/xxx.md');
  });

program
  .command('test:gen')
  .description('生成测试 Prompt 文件（供 CodeBuddy 执行）')
  .option('--rule <path>', 'Rule 文件路径')
  .option('--base-url <url>', '测试服务器地址')
  .option('--route <route>', '指定要测试的路由')
  .option('--type <type>', '指定测试类型 (smoke/functional/e2e)')
  .option('--priority <priority>', '指定优先级 (critical/high/medium/low)')
  .option('--all', '生成全量测试 Prompt', false)
  .option('--output <dir>', '输出目录', '.codebuddy/prompts')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { generateTestPromptFiles, findRulePath } = await import('./runtime/cli-test-executor.js');

    const rulePath = await findRulePath(options.rule);
    if (!rulePath) {
      Logger.error('未找到 Rule 文件，请先运行 router:generate 生成 Rule');
      return;
    }

    await generateTestPromptFiles(rulePath, {
      baseUrl: options.baseUrl,
      route: options.route,
      type: options.type,
      priority: options.priority,
      all: options.all,
      outputDir: options.output,
    });
  });

program
  .command('test:smoke')
  .description('生成冒烟测试 Prompt（快捷命令）')
  .option('--rule <path>', 'Rule 文件路径')
  .option('--base-url <url>', '测试服务器地址')
  .option('--output <dir>', '输出目录', '.codebuddy/prompts')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { generateTestPromptFiles, findRulePath } = await import('./runtime/cli-test-executor.js');

    const rulePath = await findRulePath(options.rule);
    if (!rulePath) {
      Logger.error('未找到 Rule 文件，请先运行 router:generate 生成 Rule');
      return;
    }

    await generateTestPromptFiles(rulePath, {
      baseUrl: options.baseUrl,
      type: 'smoke',
      all: true,
      outputDir: options.output,
    });
  });

program
  .command('test:critical')
  .description('生成关键测试 Prompt（快捷命令）')
  .option('--rule <path>', 'Rule 文件路径')
  .option('--base-url <url>', '测试服务器地址')
  .option('--output <dir>', '输出目录', '.codebuddy/prompts')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { generateTestPromptFiles, findRulePath } = await import('./runtime/cli-test-executor.js');

    const rulePath = await findRulePath(options.rule);
    if (!rulePath) {
      Logger.error('未找到 Rule 文件，请先运行 router:generate 生成 Rule');
      return;
    }

    await generateTestPromptFiles(rulePath, {
      baseUrl: options.baseUrl,
      priority: 'critical',
      all: true,
      outputDir: options.output,
    });
  });

// ============ 自动执行 MCP 测试命令 ============

program
  .command('test:run')
  .description('自动执行 MCP 测试（直接调用 Chrome DevTools MCP）')
  .option('--rule <path>', 'Rule 文件路径')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--route <route>', '指定要测试的路由')
  .option('--type <type>', '指定测试类型 (smoke/functional/e2e)')
  .option('--priority <priority>', '指定优先级 (critical/high/medium/low)')
  .option('--scenario <id>', '指定场景 ID')
  .option('--headless', '无头模式运行', false)
  .option('--continue-on-error', '遇到错误继续执行', true)
  .option('--delay <ms>', '步骤间延迟（毫秒）', '500')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { findRulePath } = await import('./runtime/cli-test-executor.js');
    const { autoExecuteTests } = await import('./runtime/mcp-auto-executor.js');

    const rulePath = await findRulePath(options.rule);
    if (!rulePath) {
      Logger.error('未找到 Rule 文件，请先运行 router:generate 生成 Rule');
      return;
    }

    Logger.header('MCP 自动测试执行器');
    Logger.info(`Rule 文件: ${rulePath}`);
    Logger.info(`基础 URL: ${options.baseUrl}`);
    Logger.info(`无头模式: ${options.headless ? '是' : '否'}`);

    if (options.route) Logger.info(`路由筛选: ${options.route}`);
    if (options.type) Logger.info(`类型筛选: ${options.type}`);
    if (options.priority) Logger.info(`优先级筛选: ${options.priority}`);
    if (options.scenario) Logger.info(`场景筛选: ${options.scenario}`);

    Logger.divider();

    try {
      const results = await autoExecuteTests(rulePath, {
        baseUrl: options.baseUrl,
        headless: options.headless,
        route: options.route,
        type: options.type,
        priority: options.priority,
        scenarioId: options.scenario,
      });

      // 根据测试结果设置退出码
      const failed = results.filter(r => !r.success).length;
      if (failed > 0) {
        process.exitCode = 1;
      }

    } catch (error: any) {
      Logger.error(`测试执行失败: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('test:run-prompt')
  .description('从 Prompt 文件自动执行 MCP 测试')
  .argument('<promptFile>', 'Prompt 文件路径')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--headless', '无头模式运行', false)
  .action(async (promptFile, options) => {
    const { Logger } = await import('./utils/log.js');
    const { createMCPAutoExecutor, parsePromptToSteps } = await import('./runtime/mcp-auto-executor.js');
    const fs = await import('fs/promises');
    const path = await import('path');

    // 读取 Prompt 文件
    const promptPath = path.resolve(process.cwd(), promptFile);
    let promptContent: string;

    try {
      promptContent = await fs.readFile(promptPath, 'utf-8');
    } catch {
      Logger.error(`无法读取 Prompt 文件: ${promptPath}`);
      return;
    }

    Logger.header('从 Prompt 文件执行 MCP 测试');
    Logger.info(`Prompt 文件: ${promptFile}`);
    Logger.info(`基础 URL: ${options.baseUrl}`);

    // 解析步骤
    const steps = parsePromptToSteps(promptContent, options.baseUrl);

    if (steps.length === 0) {
      Logger.warn('Prompt 文件中没有可执行的步骤');
      Logger.info('\n支持的指令格式:');
      Logger.info('  - 导航到 {{baseUrl}}/path');
      Logger.info('  - 点击 [data-test-id="xxx"]');
      Logger.info('  - 输入 "value" 到 [data-test-id="xxx"]');
      Logger.info('  - 等待 [data-test-id="xxx"]');
      Logger.info('  - 截图');
      Logger.info('  - 验证 页面包含 "text"');
      return;
    }

    Logger.info(`解析到 ${steps.length} 个步骤:`);
    steps.forEach((step, i) => {
      Logger.info(`  ${i + 1}. ${step.action}: ${step.target || step.value || ''}`);
    });

    Logger.divider();

    const executor = createMCPAutoExecutor({
      baseUrl: options.baseUrl,
      headless: options.headless,
    });

    try {
      await executor.connect();

      const result = await executor.executeScenario({
        id: 'prompt-test',
        name: path.basename(promptFile, '.md'),
        type: 'manual',
        priority: 'medium',
        route: '/',
        steps,
      });

      Logger.divider();

      if (result.success) {
        Logger.success(`\n✅ 测试通过 (${result.duration}ms)`);
      } else {
        Logger.error(`\n❌ 测试失败: ${result.error}`);
        process.exitCode = 1;
      }

    } catch (error: any) {
      Logger.error(`测试执行失败: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await executor.disconnect();
    }
  });

// ============ 变更影响分析命令 ============

program
  .command('change:analyze')
  .description('分析代码变更的影响范围')
  .option('--base <ref>', 'Git 基准引用（默认 HEAD~1）')
  .option('--threshold <n>', '路由阈值，超过视为大范围变更', '5')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { analyzeRouter } = await import('./analyzer/router-analyzer.js');
    const { analyzeChanges } = await import('./analyzer/change-analyzer.js');

    Logger.header('变更影响分析');

    // 1. 分析 Router
    Logger.info('\n📊 Step 1: 分析 Router 配置...');
    const routerAnalysis = await analyzeRouter(process.cwd());

    if (routerAnalysis.flatRoutes.length === 0) {
      Logger.error('未找到有效的路由配置');
      return;
    }

    // 2. 分析变更影响
    Logger.info('\n🔍 Step 2: 分析变更影响...');
    const impactResult = await analyzeChanges(routerAnalysis, process.cwd(), {
      base: options.base,
      threshold: parseInt(options.threshold, 10),
    });

    // 输出结果
    Logger.divider();
    Logger.header('分析结果');

    if (impactResult.changedFiles.length === 0) {
      Logger.warn('未检测到变更文件');
      return;
    }

    Logger.info(`\n变更文件 (${impactResult.changedFiles.length}):`);
    impactResult.changedFiles.forEach(f => {
      Logger.info(`  - ${f.relativePath}`);
    });

    Logger.info(`\n影响路由 (${impactResult.affectedRoutes.length}):`);
    impactResult.affectedRoutes.forEach(r => {
      const badge = r.impactType === 'direct' ? '🔴' : '🟡';
      Logger.info(`  ${badge} ${r.route} - ${r.name} (${r.reason})`);
    });

    Logger.divider();
    Logger.info(`影响范围: ${impactResult.impactScope === 'small' ? '小范围' : '大范围'}`);
    Logger.info(`风险等级: ${impactResult.riskLevel}`);

    if (impactResult.impactScope === 'large') {
      Logger.warn('\n⚠️  变更影响范围较大，建议执行全量测试');
      Logger.info('运行: mcp-e2e test:smoke --base-url <url>');
    } else {
      Logger.info('\n💡 运行以下命令生成针对性测试:');
      Logger.info(`   mcp-e2e change:test --base-url <url>`);
    }
  });

program
  .command('change:test')
  .description('分析变更并生成针对性测试文件（包含详细变更描述）')
  .option('--base <ref>', 'Git 基准引用（默认自动检测）')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--threshold <n>', '路由阈值，超过视为大范围变更', '5')
  .option('--force', '强制生成，即使是大范围变更', false)
  .option('--output <dir>', '输出目录', '.codebuddy/rules/changes')
  .option('--detailed', '输出详细的代码变更分析（函数名、行号等）', true)
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { analyzeRouter } = await import('./analyzer/router-analyzer.js');
    const { analyzeChanges } = await import('./analyzer/change-analyzer.js');
    const { ChangeTestGenerator } = await import('./generator/change-test-generator.js');
    const { analyzeChangeDetails } = await import('./analyzer/change-detail-analyzer.js');

    Logger.header('变更影响测试生成');

    // 1. 分析 Router
    Logger.info('\n📊 Step 1: 分析 Router 配置...');
    const routerAnalysis = await analyzeRouter(process.cwd());

    if (routerAnalysis.flatRoutes.length === 0) {
      Logger.error('未找到有效的路由配置');
      return;
    }

    Logger.info(`  - 框架: ${routerAnalysis.framework}`);
    Logger.info(`  - 路由: ${routerAnalysis.flatRoutes.length}`);

    // 2. 分析变更影响
    Logger.info('\n🔍 Step 2: 分析变更影响...');
    const impactResult = await analyzeChanges(routerAnalysis, process.cwd(), {
      base: options.base,
      threshold: parseInt(options.threshold, 10),
    });

    if (impactResult.changedFiles.length === 0) {
      Logger.warn('未检测到变更文件');
      Logger.info('\n提示:');
      Logger.info('  - 确保有未提交的变更，或指定 --base 参数');
      Logger.info('  - 示例: mcp-e2e change:test --base main');
      return;
    }

    Logger.info(`  - 变更文件: ${impactResult.changedFiles.length}`);
    Logger.info(`  - 影响路由: ${impactResult.affectedRoutes.length}`);
    Logger.info(`  - 风险等级: ${impactResult.riskLevel}`);

    // 3. 详细变更分析（获取行号、函数名等）
    let detailedAnalysis = null;
    if (options.detailed !== false) {
      Logger.info('\n🔬 Step 3: 详细变更分析...');
      try {
        detailedAnalysis = await analyzeChangeDetails(process.cwd(), options.base);
        Logger.info(`  - 分析完成: ${detailedAnalysis.changes.length} 个文件`);
        Logger.info(`  - 受影响函数: ${detailedAnalysis.summary.affectedFunctions}`);
        Logger.info(`  - 受影响组件: ${detailedAnalysis.summary.affectedComponents}`);
      } catch (error: any) {
        Logger.warn(`  详细分析失败: ${error.message}`);
        Logger.info('  将使用基础变更信息生成');
      }
    }

    // 4. 生成测试文件
    Logger.info('\n📝 Step 4: 生成测试文件...');

    // 如果是大范围变更且没有 --force，只输出建议
    if (impactResult.impactScope === 'large' && !options.force) {
      Logger.divider();
      Logger.warn(`⚠️  本次变更影响范围较大（${impactResult.affectedRoutes.length} 个路由）`);
      Logger.info('建议执行全量冒烟测试：');
      Logger.info('');
      Logger.info(`  mcp-e2e test:smoke --base-url ${options.baseUrl}`);
      Logger.info('');
      Logger.info('或在 CodeBuddy 中引用全量测试 Prompt：');
      Logger.info('  @.codebuddy/rules/<rule-id>-prompts.md');
      Logger.info('');
      Logger.info('如需强制生成测试文件，添加 --force 参数');
      return;
    }

    // 创建生成器并设置详细分析结果
    const generator = new ChangeTestGenerator(
      process.cwd(),
      options.baseUrl,
      options.output
    );

    if (detailedAnalysis) {
      generator.setDetailedAnalysis(detailedAnalysis);
    }

    const result = await generator.generate(impactResult, routerAnalysis);

    // 输出结果
    Logger.divider();

    if (result.type === 'small-scope') {
      Logger.success('✅ 测试文件生成完成！');
      Logger.info('');
      Logger.info(`📄 文件: ${result.filePath}`);
      Logger.info(`📊 覆盖路由: ${result.affectedRouteCount}`);
      Logger.info(`🧪 测试场景: ${result.scenarios}`);

      if (detailedAnalysis) {
        Logger.info(`📝 变更详情: 包含 ${detailedAnalysis.summary.affectedFunctions} 个函数、${detailedAnalysis.summary.affectedComponents} 个组件的详细描述`);
      }

      Logger.divider();
      Logger.header('🚀 使用方式');
      Logger.info('');
      Logger.info('【在 CodeBuddy 中使用】（推荐）');
      Logger.info(`  直接引用: @${result.filePath}`);
      Logger.info('  AI 会自动读取文档并按指引执行分析和测试');
      Logger.info('  ✨ 无需额外说明，一键开始！');
      Logger.info('');
      Logger.info('【命令行执行】');
      Logger.info(`  mcp-e2e test:run-prompt ${result.filePath} --base-url ${options.baseUrl}`);
    } else {
      Logger.info(result.suggestion);
    }
  });

// ============ 影响预测命令（新增） ============

program
  .command('impact:predict')
  .description('预测代码变更的影响范围（模式一：生成 AI 分析 Prompt）')
  .option('--base <ref>', 'Git 基准引用（默认 HEAD~1）')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--output <dir>', '输出目录', '.codebuddy/rules/impact')
  .option('--max-depth <n>', '最大追踪深度', '5')
  .option('--no-transitive', '不包含传递影响')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { predictImpact } = await import('./analyzer/impact-predictor.js');
    const { generateImpactPrompt } = await import('./generator/impact-prompt-generator.js');

    Logger.header('变更影响预测');

    try {
      // 1. 预测影响
      const prediction = await predictImpact(process.cwd(), {
        baseRef: options.base,
        includeTransitive: options.transitive !== false,
        maxDepth: parseInt(options.maxDepth, 10),
      });

      if (prediction.changedFiles.length === 0) {
        Logger.warn('未检测到变更文件');
        Logger.info('\n提示:');
        Logger.info('  - 确保有未提交的变更，或指定 --base 参数');
        Logger.info('  - 示例: mcp-e2e impact:predict --base main');
        return;
      }

      // 2. 生成 AI 分析 Prompt
      const result = await generateImpactPrompt(
        prediction,
        {
          mode: 'ai-analysis',
          baseUrl: options.baseUrl,
          outputDir: options.output,
        },
        undefined,
        process.cwd()
      );

      // 输出结果
      Logger.divider();
      Logger.success('✅ 影响预测完成！');
      Logger.info('');
      Logger.info(`📄 文件: ${result.filePath}`);
      Logger.info(`📊 变更文件: ${result.stats.changedFiles}`);
      Logger.info(`📦 受影响模块: ${result.stats.affectedModules}`);
      Logger.info(`🧪 测试建议: ${result.stats.testSuggestions}`);
      Logger.info('');
      Logger.info(`🎯 影响范围: ${prediction.impactScope.level}`);
      Logger.info(`⚠️  风险等级: ${prediction.riskAssessment.overallRisk} (${prediction.riskAssessment.riskScore}/100)`);

      Logger.divider();
      Logger.header('🚀 使用方式');
      Logger.info('');
      Logger.info('【在 CodeBuddy 中使用】（推荐）');
      Logger.info(`  直接引用: @${result.filePath}`);
      Logger.info('  AI 会自动分析变更影响并给出测试和排查建议');
      Logger.info('');
      Logger.info('【进一步分析】');
      Logger.info('  使用 AST 深度分析: mcp-e2e impact:analyze --base ' + (options.base || 'HEAD~1'));
      Logger.info('  生成可执行测试: mcp-e2e impact:test --base ' + (options.base || 'HEAD~1'));

    } catch (error: any) {
      Logger.error(`影响预测失败: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('impact:analyze')
  .description('基于 AST 深度分析变更影响（模式二：详细代码分析）')
  .option('--base <ref>', 'Git 基准引用（默认 HEAD~1）')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--output <dir>', '输出目录', '.codebuddy/rules/impact')
  .option('--max-files <n>', '最大分析文件数', '20')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { predictImpact } = await import('./analyzer/impact-predictor.js');
    const { analyzeChangeDetails } = await import('./analyzer/change-detail-analyzer.js');
    const { analyzeASTImpact } = await import('./analyzer/ast-impact-analyzer.js');
    const { generateImpactPrompt } = await import('./generator/impact-prompt-generator.js');

    Logger.header('AST 深度影响分析');

    try {
      // 1. 预测影响
      Logger.info('\n📊 Step 1: 预测影响范围...');
      const prediction = await predictImpact(process.cwd(), {
        baseRef: options.base,
        includeTransitive: true,
      });

      if (prediction.changedFiles.length === 0) {
        Logger.warn('未检测到变更文件');
        return;
      }

      Logger.info(`  - 变更文件: ${prediction.changedFiles.length}`);
      Logger.info(`  - 影响范围: ${prediction.impactScope.level}`);

      // 2. 获取详细变更
      Logger.info('\n🔬 Step 2: 获取详细变更...');
      const detailedAnalysis = await analyzeChangeDetails(process.cwd(), options.base);
      Logger.info(`  - 分析文件: ${detailedAnalysis.changes.length}`);

      // 3. AST 深度分析
      Logger.info('\n🌳 Step 3: AST 深度分析...');
      const astAnalysis = await analyzeASTImpact(detailedAnalysis.changes, process.cwd());
      Logger.info(`  - 调用链: ${astAnalysis.callChains.length}`);
      Logger.info(`  - 组件树节点: ${astAnalysis.componentTree.totalNodes}`);
      Logger.info(`  - 副作用: ${astAnalysis.sideEffects.length}`);
      Logger.info(`  - 测试路径: ${astAnalysis.testPathSuggestions.length}`);

      // 4. 生成详细分析文档
      Logger.info('\n📝 Step 4: 生成分析文档...');
      const result = await generateImpactPrompt(
        prediction,
        {
          mode: 'detailed-ast',
          baseUrl: options.baseUrl,
          outputDir: options.output,
          maxFiles: parseInt(options.maxFiles, 10),
        },
        astAnalysis,
        process.cwd()
      );

      // 输出结果
      Logger.divider();
      Logger.success('✅ AST 深度分析完成！');
      Logger.info('');
      Logger.info(`📄 文件: ${result.filePath}`);
      Logger.info(`📊 分析文件: ${astAnalysis.fileAnalyses.length}`);
      Logger.info(`🔗 调用链: ${astAnalysis.callChains.length}`);
      Logger.info(`🌳 组件树: ${astAnalysis.componentTree.totalNodes} 个节点`);
      Logger.info(`⚡ 副作用: ${astAnalysis.sideEffects.length}`);
      Logger.info(`🧪 测试路径: ${astAnalysis.testPathSuggestions.length}`);

      Logger.divider();
      Logger.header('🚀 使用方式');
      Logger.info('');
      Logger.info('【在 CodeBuddy 中使用】');
      Logger.info(`  直接引用: @${result.filePath}`);
      Logger.info('  包含函数调用链、组件依赖树、副作用分析等详细信息');
      Logger.info('');
      Logger.info('【生成可执行测试】');
      Logger.info('  mcp-e2e impact:test --base ' + (options.base || 'HEAD~1'));

    } catch (error: any) {
      Logger.error(`AST 分析失败: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('impact:test')
  .description('生成可执行的影响测试 Prompt（模式三：测试执行）')
  .option('--base <ref>', 'Git 基准引用（默认 HEAD~1）')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--output <dir>', '输出目录', '.codebuddy/rules/impact')
  .option('--ast', '包含 AST 深度分析', false)
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { predictImpact } = await import('./analyzer/impact-predictor.js');
    const { analyzeChangeDetails } = await import('./analyzer/change-detail-analyzer.js');
    const { analyzeASTImpact } = await import('./analyzer/ast-impact-analyzer.js');
    const { generateImpactPrompt } = await import('./generator/impact-prompt-generator.js');

    Logger.header('生成影响测试 Prompt');

    try {
      // 1. 预测影响
      Logger.info('\n📊 Step 1: 预测影响范围...');
      const prediction = await predictImpact(process.cwd(), {
        baseRef: options.base,
        includeTransitive: true,
      });

      if (prediction.changedFiles.length === 0) {
        Logger.warn('未检测到变更文件');
        return;
      }

      Logger.info(`  - 变更文件: ${prediction.changedFiles.length}`);
      Logger.info(`  - 受影响组件: ${prediction.affectedComponents.length}`);

      // 2. 可选的 AST 分析
      let astAnalysis = undefined;
      if (options.ast) {
        Logger.info('\n🌳 Step 2: AST 深度分析...');
        const detailedAnalysis = await analyzeChangeDetails(process.cwd(), options.base);
        astAnalysis = await analyzeASTImpact(detailedAnalysis.changes, process.cwd());
        Logger.info(`  - 测试路径: ${astAnalysis.testPathSuggestions.length}`);
      }

      // 3. 生成测试 Prompt
      Logger.info('\n📝 Step 3: 生成测试 Prompt...');
      const result = await generateImpactPrompt(
        prediction,
        {
          mode: 'test-execution',
          baseUrl: options.baseUrl,
          outputDir: options.output,
        },
        astAnalysis,
        process.cwd()
      );

      // 输出结果
      Logger.divider();
      Logger.success('✅ 测试 Prompt 生成完成！');
      Logger.info('');
      Logger.info(`📄 文件: ${result.filePath}`);
      Logger.info(`🧪 测试建议: ${result.stats.testSuggestions}`);

      Logger.divider();
      Logger.header('🚀 使用方式');
      Logger.info('');
      Logger.info('【在 CodeBuddy 中执行】（推荐）');
      Logger.info(`  直接引用: @${result.filePath}`);
      Logger.info('  AI 会按照测试步骤执行 Chrome DevTools MCP 测试');
      Logger.info('');
      Logger.info('【命令行执行】');
      Logger.info(`  mcp-e2e test:run-prompt ${result.filePath} --base-url ${options.baseUrl}`);

    } catch (error: any) {
      Logger.error(`生成测试失败: ${error.message}`);
      process.exitCode = 1;
    }
  });

program
  .command('impact:full')
  .description('完整影响分析流程（预测 + AST 分析 + 测试生成）')
  .option('--base <ref>', 'Git 基准引用（默认 HEAD~1）')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8080')
  .option('--output <dir>', '输出目录', '.codebuddy/rules/impact')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { predictImpact } = await import('./analyzer/impact-predictor.js');
    const { analyzeChangeDetails } = await import('./analyzer/change-detail-analyzer.js');
    const { analyzeASTImpact } = await import('./analyzer/ast-impact-analyzer.js');
    const { generateImpactPrompt } = await import('./generator/impact-prompt-generator.js');

    Logger.header('完整影响分析流程');

    try {
      // 1. 预测影响
      Logger.info('\n📊 Step 1: 预测影响范围...');
      const prediction = await predictImpact(process.cwd(), {
        baseRef: options.base,
        includeTransitive: true,
      });

      if (prediction.changedFiles.length === 0) {
        Logger.warn('未检测到变更文件');
        Logger.info('\n提示:');
        Logger.info('  - 确保有未提交的变更，或指定 --base 参数');
        Logger.info('  - 示例: mcp-e2e impact:full --base main');
        return;
      }

      Logger.info(`  - 变更文件: ${prediction.changedFiles.length}`);
      Logger.info(`  - 影响范围: ${prediction.impactScope.level}`);
      Logger.info(`  - 风险等级: ${prediction.riskAssessment.overallRisk}`);

      // 2. 详细变更分析
      Logger.info('\n🔬 Step 2: 详细变更分析...');
      const detailedAnalysis = await analyzeChangeDetails(process.cwd(), options.base);
      Logger.info(`  - 分析文件: ${detailedAnalysis.changes.length}`);
      Logger.info(`  - 受影响函数: ${detailedAnalysis.summary.affectedFunctions}`);

      // 3. AST 深度分析
      Logger.info('\n🌳 Step 3: AST 深度分析...');
      const astAnalysis = await analyzeASTImpact(detailedAnalysis.changes, process.cwd());
      Logger.info(`  - 调用链: ${astAnalysis.callChains.length}`);
      Logger.info(`  - 组件树: ${astAnalysis.componentTree.totalNodes} 个节点`);
      Logger.info(`  - 副作用: ${astAnalysis.sideEffects.length}`);

      // 4. 生成所有类型的 Prompt
      Logger.info('\n📝 Step 4: 生成分析文档...');

      // 4.1 AI 分析 Prompt
      const aiPrompt = await generateImpactPrompt(
        prediction,
        { mode: 'ai-analysis', baseUrl: options.baseUrl, outputDir: options.output },
        undefined,
        process.cwd()
      );
      Logger.info(`  - AI 分析: ${aiPrompt.fileName}`);

      // 4.2 AST 详细分析
      const astPrompt = await generateImpactPrompt(
        prediction,
        { mode: 'detailed-ast', baseUrl: options.baseUrl, outputDir: options.output },
        astAnalysis,
        process.cwd()
      );
      Logger.info(`  - AST 分析: ${astPrompt.fileName}`);

      // 4.3 测试执行 Prompt
      const testPrompt = await generateImpactPrompt(
        prediction,
        { mode: 'test-execution', baseUrl: options.baseUrl, outputDir: options.output },
        astAnalysis,
        process.cwd()
      );
      Logger.info(`  - 测试执行: ${testPrompt.fileName}`);

      // 输出结果
      Logger.divider();
      Logger.success('✅ 完整影响分析完成！');
      Logger.info('');
      Logger.header('📁 生成的文件');
      Logger.info('');
      Logger.info(`  1. ${aiPrompt.filePath}`);
      Logger.info('     → AI 分析 Prompt，用于理解变更影响');
      Logger.info('');
      Logger.info(`  2. ${astPrompt.filePath}`);
      Logger.info('     → AST 详细分析，包含调用链和组件树');
      Logger.info('');
      Logger.info(`  3. ${testPrompt.filePath}`);
      Logger.info('     → 可执行测试 Prompt，用于 MCP 测试');
      Logger.info('');

      Logger.divider();
      Logger.header('📊 分析摘要');
      Logger.info('');
      Logger.info(`  变更文件: ${prediction.changedFiles.length}`);
      Logger.info(`  受影响模块: ${prediction.affectedModules.length}`);
      Logger.info(`  受影响组件: ${prediction.affectedComponents.length}`);
      Logger.info(`  调用链: ${astAnalysis.callChains.length}`);
      Logger.info(`  副作用: ${astAnalysis.sideEffects.length}`);
      Logger.info(`  测试建议: ${astAnalysis.testPathSuggestions.length}`);
      Logger.info('');
      Logger.info(`  影响范围: ${prediction.impactScope.level} (${prediction.impactScope.totalImpact} 个文件)`);
      Logger.info(`  风险等级: ${prediction.riskAssessment.overallRisk} (${prediction.riskAssessment.riskScore}/100)`);

      Logger.divider();
      Logger.header('🚀 推荐使用方式');
      Logger.info('');
      Logger.info('【快速理解变更】');
      Logger.info(`  @${aiPrompt.filePath}`);
      Logger.info('');
      Logger.info('【深入分析代码】');
      Logger.info(`  @${astPrompt.filePath}`);
      Logger.info('');
      Logger.info('【执行测试】');
      Logger.info(`  @${testPrompt.filePath}`);

    } catch (error: any) {
      Logger.error(`影响分析失败: ${error.message}`);
      process.exitCode = 1;
    }
  });

program.parse();
