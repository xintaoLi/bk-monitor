#!/usr/bin/env node

/**
 * 可视化测试脚本
 * 启动 Chrome 浏览器，显示测试执行过程
 */

const path = require('path');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const MCP_CLI_DIR = path.join(ROOT_DIR, 'packages/mcp-cli');
const CONFIG_FILE = path.join(ROOT_DIR, 'mcp-e2e.config.js');

/**
 * 获取基础 URL
 */
function getBaseUrl() {
  // 优先使用环境变量
  if (process.env.MCP_BASE_URL) {
    return process.env.MCP_BASE_URL;
  }
  if (process.env.MCP_DEV_SERVER_URL) {
    return process.env.MCP_DEV_SERVER_URL;
  }

  // 尝试读取配置文件
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = require(CONFIG_FILE);
      if (config.devServer?.url) {
        return config.devServer.url;
      }
    }
  } catch (e) {
    // 忽略配置读取错误
  }

  // 默认值
  return 'http://localhost:8081';
}

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// 检查开发服务器是否运行
async function checkDevServer() {
  logStep('1/4', '检查开发服务器');
  const baseUrl = getBaseUrl();
  
  return new Promise((resolve) => {
    const req = http.get(baseUrl, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 启动开发服务器
function startDevServer() {
  logStep('2/4', '启动开发服务器');
  
  return new Promise((resolve, reject) => {
    log('正在启动开发服务器，请稍候...');
    
    const devServer = spawn('npm', ['run', 'dev'], {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      shell: true,
    });

    let started = false;

    devServer.stdout.on('data', (data) => {
      const output = data.toString();
      
      // 检测服务器启动成功
      if (output.includes('Webpack compiled') || output.includes('Compiled successfully')) {
        if (!started) {
          started = true;
          logSuccess('开发服务器已启动');
          // 等待 2 秒确保完全就绪
          setTimeout(() => resolve(devServer), 2000);
        }
      }
    });

    devServer.stderr.on('data', (data) => {
      // 忽略警告
    });

    devServer.on('error', (error) => {
      logError(`启动服务器失败: ${error.message}`);
      reject(error);
    });

    // 30 秒超时
    setTimeout(() => {
      if (!started) {
        logWarning('开发服务器启动超时');
        resolve(null);
      }
    }, 30000);
  });
}

// 安装依赖
async function installDependencies() {
  logStep('3/4', '检查依赖');
  
  const puppeteerInstalled = fs.existsSync(
    path.join(MCP_CLI_DIR, 'node_modules', 'puppeteer')
  );
  
  if (!puppeteerInstalled) {
    log('正在安装 Puppeteer (首次运行)...');
    log('这可能需要几分钟时间，请耐心等待...');
    
    try {
      execSync('npm install puppeteer', {
        cwd: MCP_CLI_DIR,
        stdio: 'inherit'
      });
      logSuccess('Puppeteer 安装完成');
    } catch (error) {
      logError('Puppeteer 安装失败');
      throw error;
    }
  } else {
    logSuccess('依赖已就绪');
  }
}

// 构建 mcp-cli
function buildMcpCli() {
  log('正在构建 mcp-cli...');
  
  try {
    execSync('npm run build', {
      cwd: MCP_CLI_DIR,
      stdio: 'inherit'
    });
    logSuccess('构建完成');
  } catch (error) {
    logError('构建失败');
    throw error;
  }
}

// 运行可视化测试
async function runVisualTest() {
  logStep('4/4', '运行可视化测试');
  
  log('\n' + '='.repeat(60));
  log('  🎬 Chrome 浏览器即将打开，您将看到完整的测试过程', 'bold');
  log('  📹 所有操作都会在浏览器中实时展示', 'bold');
  log('  ⏱️  测试完成后浏览器会自动关闭', 'bold');
  log('  💡 提示：请勿关闭或最小化浏览器窗口', 'yellow');
  log('='.repeat(60) + '\n');
  
  log('⏳ 准备启动 Chrome 浏览器...\n', 'yellow');
  
  // 等待 1 秒
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // 运行测试（使用 Puppeteer 模式）
    const runScript = path.join(MCP_CLI_DIR, 'dist/commands/run.js');
    
    log('🚀 正在执行测试任务...\n', 'blue');
    
    execSync(`node ${runScript}`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        USE_PUPPETEER: 'true', // 启用 Puppeteer 模式
        FORCE_COLOR: '1' // 强制彩色输出
      }
    });
    
    log('\n');
    logSuccess('✓ 可视化测试完成！');
    
  } catch (error) {
    log('\n');
    logError('✗ 测试执行失败');
    throw error;
  }
}

// 主函数
async function main() {
  log('\n=== 🎬 可视化测试工具 ===\n', 'blue');
  log('本工具将启动 Chrome 浏览器，实时展示测试执行过程\n', 'yellow');
  
  let devServer = null;
  
  try {
    // 检查开发服务器
    const serverRunning = await checkDevServer();
    
    if (!serverRunning) {
      logWarning('开发服务器未运行');
      devServer = await startDevServer();
    } else {
      logSuccess('开发服务器已在运行');
    }
    
    // 安装依赖
    await installDependencies();
    
    // 构建
    buildMcpCli();
    
    // 运行可视化测试
    await runVisualTest();
    
    // 显示报告位置
    log('\n📊 查看详细报告:', 'blue');
    log('   npm run test:report\n', 'green');
    
  } catch (error) {
    logError(`\n执行失败: ${error.message}`);
    process.exit(1);
  } finally {
    // 清理：关闭开发服务器
    if (devServer) {
      log('\n正在关闭开发服务器...');
      devServer.kill();
    }
  }
  
  log('\n✓ 完成！\n', 'green');
}

// 处理中断信号
process.on('SIGINT', () => {
  log('\n\n测试已取消', 'yellow');
  process.exit(0);
});

// 运行
main();
