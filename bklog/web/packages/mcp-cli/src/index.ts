#!/usr/bin/env node
import { program } from 'commander';

program
  .name('mcp-e2e')
  .description('AI + MCP + CodeBuddy 自动化测试 CLI')
  .version('0.1.0');

// ============ 基础命令 ============

program
  .command('init')
  .description('Initialize MCP E2E testing environment')
  .action(async () => {
    const { default: init } = await import('./commands/init.js');
    await init();
  });

program
  .command('analyze')
  .description('Analyze component dependencies using AST')
  .action(async () => {
    const { default: analyze } = await import('./commands/analyze.js');
    await analyze();
  });

program
  .command('generate')
  .description('Generate MCP test flows based on changes')
  .action(async () => {
    const { default: generate } = await import('./commands/generate.js');
    await generate();
  });

program
  .command('run')
  .description('Execute automated tests')
  .action(async () => {
    const { default: run } = await import('./commands/run.js');
    await run();
  });

program
  .command('promote')
  .description('Promote generated tests to permanent test assets')
  .action(async () => {
    const { default: promote } = await import('./commands/promote.js');
    await promote();
  });

// ============ CodeBuddy Rule 命令 ============

program
  .command('rule:analyze')
  .description('分析项目结构并生成 CodeBuddy Test Rule')
  .action(async () => {
    const { analyzeProjectAndGenerateRule } = await import('./codebuddy/project-analyzer-rule.js');
    await analyzeProjectAndGenerateRule();
  });

program
  .command('rule:impact')
  .description('分析代码变更影响并生成测试 Rule')
  .option('-b, --base <branch>', '基准分支', 'HEAD~1')
  .action(async (options) => {
    const { analyzeChangeImpact } = await import('./codebuddy/change-impact-analyzer.js');
    await analyzeChangeImpact(process.cwd(), options.base);
  });

program
  .command('rule:execute')
  .description('执行 CodeBuddy Rule')
  .argument('<ruleId>', 'Rule ID 或文件路径')
  .option('--headless', '无头模式运行', false)
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8081')
  .action(async (ruleId, options) => {
    const { executeRule } = await import('./runtime/rule-executor.js');
    await executeRule(ruleId, process.cwd(), {
      headless: options.headless,
      baseUrl: options.baseUrl,
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

    // 5. 检查 MCP 配置文件
    const configPath = `${process.cwd()}/.mcp/servers.json`;
    if (existsSync(configPath)) {
      Logger.info(`MCP 配置: ✅ ${configPath}`);
    } else {
      Logger.warn('MCP 配置: ⚠️ 未找到，运行 mcp-e2e mcp:init 创建');
    }

    Logger.divider();
    Logger.success('环境检查完成！');
  });

program
  .command('mcp:init')
  .description('初始化 Chrome DevTools MCP 配置')
  .option('--headless', '默认使用无头模式', false)
  .option('--isolated', '默认使用隔离模式', false)
  .option('--viewport <size>', '默认视口大小', '1920x1080')
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { getDefaultChromePath } = await import('./mcp/chrome-devtools-mcp.js');
    const fs = await import('fs-extra');
    const path = await import('path');

    Logger.header('初始化 Chrome DevTools MCP 配置');

    const configDir = path.join(process.cwd(), '.mcp');
    await fs.ensureDir(configDir);

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

    const config = {
      mcpServers: {
        'chrome-devtools': {
          command: 'npx',
          args,
          env: {},
        },
      },
    };

    const configPath = path.join(configDir, 'servers.json');
    await fs.writeJson(configPath, config, { spaces: 2 });

    Logger.success(`✅ 配置已保存: ${configPath}`);
    Logger.info('\n配置内容:');
    console.log(JSON.stringify(config, null, 2));
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

// ============ 自然语言测试命令 ============

program
  .command('nl:run')
  .description('执行自然语言测试指令')
  .argument('<instruction>', '自然语言测试指令')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8081')
  .option('--headless', '无头模式', false)
  .action(async (instruction, options) => {
    const { Logger } = await import('./utils/log.js');
    const { executeNLTest } = await import('./runtime/natural-language-executor.js');

    Logger.header('自然语言测试执行');
    Logger.info(`指令: ${instruction}`);

    const result = await executeNLTest(instruction, {
      baseUrl: options.baseUrl,
      headless: options.headless,
    });

    Logger.divider();
    Logger.info(`状态: ${result.success ? '✅ 通过' : '❌ 失败'}`);
    Logger.info(`耗时: ${result.duration}ms`);
    Logger.info(`步骤: ${result.steps.length}`);

    if (result.error) {
      Logger.error(`错误: ${result.error}`);
    }
  });

program
  .command('nl:parse')
  .description('解析自然语言测试指令（预览模式）')
  .argument('<instruction>', '自然语言测试指令')
  .action(async (instruction) => {
    const { Logger } = await import('./utils/log.js');
    const { createNLParser } = await import('./runtime/natural-language-executor.js');

    Logger.header('自然语言解析');
    Logger.info(`指令: ${instruction}`);

    const parser = createNLParser();
    const steps = parser.parse(instruction);

    Logger.divider();
    Logger.info(`解析出 ${steps.length} 个步骤:`);

    steps.forEach((step, i) => {
      Logger.info(`\n[${i + 1}] ${step.action.toUpperCase()}`);
      Logger.info(`    描述: ${step.description}`);
      if (step.target) Logger.info(`    目标: ${step.target}`);
      if (step.value) Logger.info(`    值: ${step.value}`);
    });
  });

// ============ 工作流命令 ============

program
  .command('workflow:full')
  .description('执行完整测试工作流：分析 → 生成 Rule → 注入 test-id → 执行测试')
  .option('--headless', '无头模式运行', false)
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:8081')
  .option('--skip-inject', '跳过 test-id 注入', false)
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');

    Logger.header('🚀 完整测试工作流');

    // Step 1: 分析代码变更
    Logger.info('\n📊 Step 1: 分析代码变更影响...');
    const { analyzeChangeImpact } = await import('./codebuddy/change-impact-analyzer.js');
    const impactRule = await analyzeChangeImpact();

    // Step 2: 生成项目 Rule
    Logger.info('\n📝 Step 2: 生成项目测试 Rule...');
    const { analyzeProjectAndGenerateRule } = await import('./codebuddy/project-analyzer-rule.js');
    const projectRule = await analyzeProjectAndGenerateRule();

    // Step 3: 注入 test-id（可选）
    if (!options.skipInject) {
      Logger.info('\n🏷️  Step 3: 分析 test-id...');
      const { injectTestIds } = await import('./codebuddy/testid-injector.js');
      await injectTestIds(process.cwd(), { dryRun: true });
    }

    // Step 4: 执行测试
    Logger.info('\n🧪 Step 4: 执行测试...');
    const { executeRule } = await import('./runtime/rule-executor.js');

    // 优先执行变更影响测试
    if (impactRule.tests && impactRule.tests.length > 0) {
      Logger.info('执行变更影响测试...');
      await executeRule(impactRule.id, process.cwd(), {
        headless: options.headless,
        baseUrl: options.baseUrl,
      });
    }

    // 执行项目测试
    if (projectRule.flows && projectRule.flows.length > 0) {
      Logger.info('执行项目测试...');
      await executeRule(projectRule.id, process.cwd(), {
        headless: options.headless,
        baseUrl: options.baseUrl,
      });
    }

    Logger.success('\n✅ 工作流执行完成！');
  });

program
  .command('workflow:ecommerce')
  .description('电商支付流程测试（参考文章案例）')
  .option('--base-url <url>', '测试服务器地址', 'http://localhost:3000')
  .option('--headless', '无头模式', false)
  .action(async (options) => {
    const { Logger } = await import('./utils/log.js');
    const { executeNLTest } = await import('./runtime/natural-language-executor.js');

    Logger.header('🛒 电商支付流程测试');

    const instruction = `
      1. 打开首页
      2. 找到商品列表，点击第一个商品的"加入购物车"按钮
      3. 点击购物车图标打开购物车
      4. 验证购物车中有商品
      5. 点击"去结算"按钮
      6. 在支付表单中输入测试卡号 4242424242424242
      7. 输入有效期 12/25
      8. 输入 CVV 123
      9. 点击"确认支付"按钮
      10. 验证出现"支付成功"提示
    `;

    const result = await executeNLTest(instruction, {
      baseUrl: options.baseUrl,
      headless: options.headless,
    });

    Logger.divider();
    Logger.header('测试报告');
    Logger.info(`状态: ${result.success ? '✅ 通过' : '❌ 失败'}`);
    Logger.info(`耗时: ${result.duration}ms`);
    Logger.info(`通过步骤: ${result.steps.filter(s => s.success).length}/${result.steps.length}`);

    if (result.error) {
      Logger.error(`\n错误: ${result.error}`);
    }
  });

program.parse();
