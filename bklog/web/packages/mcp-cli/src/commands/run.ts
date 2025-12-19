import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { TaskExecutor } from '../runtime/task-executor.js';
import { RuleEngine } from '../runtime/rule-engine.js';
import { RuntimeTask, Outcome } from '../runtime/types.js';
import { MCPClient } from '../mcp/client.js';
import { PuppeteerClient } from '../mcp/puppeteer-client.js';

// 默认基础 URL
const DEFAULT_BASE_URL = 'http://localhost:8081';

export default async function run(): Promise<void> {
  Logger.header('AI + MCP + CodeBuddy 自动化测试系统');
  
  const projectRoot = process.cwd();
  const tasksDir = path.join(projectRoot, '.mcp', 'tasks');
  
  Logger.step(1, 5, '检查 Runtime Tasks...');
  
  try {
    // 加载项目配置获取 baseUrl
    const baseUrl = await getBaseUrl(projectRoot);
    Logger.info(`📍 测试服务器: ${baseUrl}`);
    
    // 检查是否有 Runtime Tasks
    if (!await fs.pathExists(tasksDir)) {
      Logger.error('未找到 Runtime Tasks。请先运行 "npm run test:generate" 生成测试任务。');
      process.exit(1);
    }
    
    const taskFiles = (await fs.readdir(tasksDir))
      .filter(f => f.endsWith('.task.json'))
      .map(f => path.join(tasksDir, f));
    
    if (taskFiles.length === 0) {
      Logger.warn('未找到任何 Runtime Task 文件。');
      return;
    }
    
    Logger.info(`发现 ${taskFiles.length} 个 Runtime Task`);
    
    Logger.step(2, 5, '初始化 Rule Engine...');
    
    // 初始化 Rule Engine
    const ruleEngine = new RuleEngine(projectRoot);
    await ruleEngine.load();
    
    Logger.step(3, 5, '初始化浏览器客户端...');
    
    // 加载配置
    const mcpConfig = await loadMCPConfig(projectRoot);
    
    // 判断使用 Puppeteer 还是 MCP
    const usePuppeteer = process.env.USE_PUPPETEER !== 'false'; // 默认使用 Puppeteer
    
    let mcpClient: any;
    
    if (usePuppeteer) {
      Logger.info('使用 Puppeteer 可视化模式');
      mcpClient = new PuppeteerClient(mcpConfig);
    } else {
      Logger.info('使用 MCP 模式');
      mcpClient = new MCPClient(mcpConfig);
    }
    
    try {
      await mcpClient.connect();
      Logger.success('浏览器客户端连接成功');
    } catch (error) {
      Logger.error('浏览器客户端连接失败:', error);
      
      if (usePuppeteer) {
        Logger.error('Puppeteer 启动失败，请确保已安装: npm install puppeteer');
        process.exit(1);
      } else {
        Logger.warn('将使用模拟模式继续执行（仅用于演示）');
      }
    }
    
    Logger.step(4, 5, '执行 Runtime Tasks...');
    
    // 初始化执行引擎
    const executor = new TaskExecutor(mcpClient);
    
    const results: Array<{
      task: string;
      intent: string;
      status: string;
      duration: number;
      reason?: string;
      error?: string;
    }> = [];
    
    // 逐个执行任务
    for (let i = 0; i < taskFiles.length; i++) {
      const taskFile = taskFiles[i];
      const taskName = path.basename(taskFile, '.task.json');
      
      Logger.divider();
      Logger.info(`[${i + 1}/${taskFiles.length}] 执行任务: ${taskName}`);
      
      try {
        // 加载 Runtime Task
        let task: RuntimeTask = await fs.readJson(taskFile);
        
        // 替换任务中的 URL 为配置的 baseUrl
        task = replaceTaskUrls(task, baseUrl);
        
        Logger.info(`📋 Intent: ${task.intent}`);
        Logger.info(`📍 Context: ${task.context.component || 'N/A'}`);
        Logger.info(`📊 Steps: ${task.steps.length}`);
        
        // 执行任务
        Logger.info('\n🚀 开始执行...\n');
        const outcome: Outcome = await executor.execute(task);
        
        // 记录结果
        results.push({
          task: taskName,
          intent: task.intent,
          status: outcome.status,
          duration: outcome.duration,
          reason: outcome.reason,
          error: outcome.error
        });
        
        // 显示执行结果
        if (outcome.status === 'success') {
          Logger.success(`✅ 任务成功 (${outcome.duration}ms)`);
        } else {
          Logger.error(`❌ 任务失败 (${outcome.duration}ms)`);
          Logger.error(`   原因: ${outcome.reason}`);
          if (outcome.error) {
            Logger.error(`   错误: ${outcome.error}`);
          }
          if (outcome.failedStep !== undefined) {
            Logger.error(`   失败步骤: Step ${outcome.failedStep + 1}/${task.steps.length}`);
          }
        }
        
        // Rule 学习反馈
        if (outcome.status === 'failed') {
          Logger.info('\n🧠 Rule Engine 学习中...');
          await ruleEngine.handleFailure(task, outcome);
          Logger.info('   权重已更新');
        }
        
      } catch (error) {
        Logger.error(`执行任务失败: ${error.message}`);
        results.push({
          task: taskName,
          intent: 'Unknown',
          status: 'ERROR',
          duration: 0,
          error: error.message
        });
      }
    }
    
    // 断开 MCP 连接
    await mcpClient.disconnect();
    
    Logger.step(5, 5, '生成测试报告...');
    
    const passed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'ERROR').length;
    
    Logger.divider();
    Logger.header('测试执行完成');
    
    // 显示汇总
    Logger.info(`\n📊 结果汇总:`);
    Logger.info(`   ✅ 成功: ${passed}`);
    Logger.info(`   ❌ 失败: ${failed}`);
    Logger.info(`   ⚠️  错误: ${errors}`);
    Logger.info(`   📈 总计: ${results.length}`);
    
    // 显示详细结果表格
    if (results.length > 0) {
      Logger.info('\n📋 详细结果:');
      Logger.table(results);
    }
    
    // 保存测试报告
    const reportDir = path.join(projectRoot, '.mcp', 'reports');
    await fs.ensureDir(reportDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `test-report-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl,
      summary: { passed, failed, errors, total: results.length },
      results
    };
    
    await fs.writeJson(reportPath, report, { spaces: 2 });
    
    Logger.success(`\n📄 测试报告已保存: ${path.relative(projectRoot, reportPath)}`);
    
    Logger.info('💾 Rule Engine 状态已保存');
    
    if (failed > 0 || errors > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    Logger.error('测试执行失败:', error);
    process.exit(1);
  }
}

/**
 * 获取测试基础 URL
 * 优先级: 环境变量 > 配置文件 > 默认值
 */
async function getBaseUrl(projectRoot: string): Promise<string> {
  // 1. 环境变量优先
  if (process.env.MCP_BASE_URL) {
    return process.env.MCP_BASE_URL;
  }
  
  // 2. 读取项目配置文件
  const configPath = path.join(projectRoot, 'mcp-e2e.config.js');
  if (await fs.pathExists(configPath)) {
    try {
      // 动态导入配置文件
      const configModule = await import(`file://${configPath}`);
      const config = configModule.default || configModule;
      if (config?.devServer?.url) {
        return config.devServer.url;
      }
    } catch (e) {
      // 配置文件读取失败，使用默认值
    }
  }
  
  // 3. 默认值
  return DEFAULT_BASE_URL;
}

/**
 * 替换任务中的 URL
 * 支持两种格式：
 * 1. {{baseUrl}} 占位符
 * 2. 硬编码的 http://xxx 地址
 */
function replaceTaskUrls(task: RuntimeTask, baseUrl: string): RuntimeTask {
  // 深拷贝任务
  const newTask = JSON.parse(JSON.stringify(task));
  
  // 替换 steps 中的 URL
  for (const step of newTask.steps) {
    if (step.url && typeof step.url === 'string') {
      // 替换 {{baseUrl}} 占位符
      step.url = step.url.replace(/\{\{baseUrl\}\}/g, baseUrl);
      // 兼容：替换硬编码的 URL（保留路径部分）
      step.url = step.url.replace(/^https?:\/\/[^\/]+/, baseUrl);
    }
  }
  
  return newTask;
}

async function loadMCPConfig(projectRoot: string) {
  const configPath = path.join(projectRoot, '.mcp', 'servers.json');
  
  if (await fs.pathExists(configPath)) {
    return await fs.readJson(configPath);
  }
  
  // 默认配置
  return {
    mcpServers: {
      'chrome-devtools': {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-chrome-devtools'],
        env: {}
      }
    }
  };
}

// 直接执行
run().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});