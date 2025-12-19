#!/usr/bin/env node

/**
 * 直接运行测试 - 跳过所有检查
 * 适用于：开发服务器已确认在运行，想立即执行测试
 */

const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const MCP_CLI_DIR = path.join(ROOT_DIR, 'packages/mcp-cli');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  cyan: '\x1b[96m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  console.clear();
  
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║           🚀  直接运行可视化测试  🚀                      ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'cyan');
  
  log('⚡ 跳过所有检查，直接运行测试\n', 'yellow');
  
  // 构建
  log('🔨 构建测试工具...', 'blue');
  try {
    execSync('npm run build', {
      cwd: MCP_CLI_DIR,
      stdio: 'pipe'
    });
    log('✅ 构建完成\n', 'green');
  } catch (error) {
    log('❌ 构建失败\n', 'red');
    log('请手动构建: cd packages/mcp-cli && npm run build\n', 'yellow');
    process.exit(1);
  }
  
  // 倒计时
  log('⏳ 准备启动测试...', 'yellow');
  for (let i = 3; i > 0; i--) {
    process.stdout.write(`   ${i}... `);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n');
  
  log('═'.repeat(60), 'cyan');
  log('  🎬 Chrome 浏览器即将打开', 'bold');
  log('  👀 请注意观察浏览器中的自动操作', 'bold');
  log('═'.repeat(60) + '\n', 'cyan');
  
  // 运行测试
  try {
    const runScript = path.join(MCP_CLI_DIR, 'bin/run-visual.js');
    
    execSync(`node "${runScript}"`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        USE_PUPPETEER: 'true',
        FORCE_COLOR: '1'
      }
    });
    
    log('\n');
    log('═'.repeat(60), 'cyan');
    log('  ✅ 测试执行完成！', 'green');
    log('═'.repeat(60), 'cyan');
    
    log('\n📊 查看测试报告:', 'blue');
    log('   npm run test:report\n', 'green');
    
  } catch (error) {
    log('\n❌ 测试执行失败\n', 'red');
    
    log('💡 常见问题:', 'yellow');
    log('   1. 开发服务器未运行? 运行: npm run dev', 'yellow');
    log('   2. 端口被占用? 检查端口 7002', 'yellow');
    log('   3. Puppeteer 未安装? 运行: cd packages/mcp-cli && npm install\n', 'yellow');
    
    process.exit(1);
  }
}

// 处理中断
process.on('SIGINT', () => {
  log('\n\n⚠️  测试已取消\n', 'yellow');
  process.exit(0);
});

main();
