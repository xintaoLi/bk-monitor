#!/usr/bin/env node
/**
 * MCP E2E 测试助手工具
 * 提供常用的快捷命令和帮助
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function showHelp() {
  console.log();
  log('🚀 MCP E2E 测试助手', colors.cyan);
  console.log();
  log('用法: node scripts/mcp-helper.js <command>', colors.blue);
  console.log();
  log('可用命令:', colors.yellow);
  console.log();
  log('  setup       - 一键设置测试环境', colors.green);
  log('  check       - 检查配置和环境', colors.green);
  log('  analyze     - 分析组件变更', colors.green);
  log('  generate    - 生成测试流程', colors.green);
  log('  run         - 执行测试', colors.green);
  log('  promote     - 提升稳定测试', colors.green);
  log('  full        - 完整测试流程（分析→生成→执行）', colors.green);
  log('  report      - 查看测试报告', colors.green);
  log('  clean       - 清理生成的文件', colors.green);
  log('  help        - 显示此帮助信息', colors.green);
  console.log();
  log('示例:', colors.yellow);
  log('  node scripts/mcp-helper.js setup', colors.cyan);
  log('  node scripts/mcp-helper.js full', colors.cyan);
  console.log();
}

function setup() {
  log('🔧 开始设置 MCP E2E 环境...', colors.blue);
  try {
    execSync('node scripts/setup-mcp-e2e.js', { stdio: 'inherit' });
  } catch (err) {
    log('❌ 设置失败', colors.red);
    process.exit(1);
  }
}

function check() {
  log('🔍 检查配置和环境...', colors.blue);
  console.log();
  
  const checks = [
    {
      name: 'MCP CLI',
      path: 'packages/mcp-cli/package.json',
      required: true
    },
    {
      name: 'MCP 配置',
      path: '.mcp/servers.json',
      required: true
    },
    {
      name: 'CodeBuddy 任务',
      path: '.codebuddy/tasks.json',
      required: true
    },
    {
      name: 'CodeBuddy 规则',
      path: '.codebuddy/rules.json',
      required: true
    },
    {
      name: '测试工具',
      path: 'tests/mcp/utils/browser.js',
      required: true
    },
    {
      name: '项目配置',
      path: 'mcp-e2e.config.js',
      required: false
    },
    {
      name: '分析结果',
      path: '.mcp/analysis.json',
      required: false
    },
    {
      name: '测试报告',
      path: '.mcp/test-report.json',
      required: false
    }
  ];
  
  let allGood = true;
  
  checks.forEach(check => {
    const exists = fs.existsSync(path.join(__dirname, '..', check.path));
    const status = exists ? '✅' : (check.required ? '❌' : '⚠️');
    const color = exists ? colors.green : (check.required ? colors.red : colors.yellow);
    
    log(`${status} ${check.name.padEnd(20)} ${check.path}`, color);
    
    if (!exists && check.required) {
      allGood = false;
    }
  });
  
  console.log();
  
  if (allGood) {
    log('✅ 所有必需配置就绪！', colors.green);
  } else {
    log('❌ 缺少必需配置，请运行: node scripts/mcp-helper.js setup', colors.red);
  }
  
  console.log();
}

function analyze() {
  log('📊 分析组件变更...', colors.blue);
  try {
    execSync('npm run test:analyze', { stdio: 'inherit' });
  } catch (err) {
    log('❌ 分析失败', colors.red);
    process.exit(1);
  }
}

function generate() {
  log('🔨 生成测试流程...', colors.blue);
  try {
    execSync('npm run test:generate', { stdio: 'inherit' });
  } catch (err) {
    log('❌ 生成失败', colors.red);
    process.exit(1);
  }
}

function run() {
  log('🧪 执行测试...', colors.blue);
  try {
    execSync('npm run test:run', { stdio: 'inherit' });
  } catch (err) {
    log('⚠️ 部分测试失败', colors.yellow);
    // 不退出，显示报告
  }
}

function promote() {
  log('⬆️ 提升稳定测试...', colors.blue);
  try {
    execSync('npm run test:promote', { stdio: 'inherit' });
  } catch (err) {
    log('❌ 提升失败', colors.red);
    process.exit(1);
  }
}

function full() {
  log('🚀 执行完整测试流程...', colors.blue);
  console.log();
  
  log('步骤 1/3: 分析组件', colors.cyan);
  analyze();
  console.log();
  
  log('步骤 2/3: 生成测试', colors.cyan);
  generate();
  console.log();
  
  log('步骤 3/3: 执行测试', colors.cyan);
  run();
  console.log();
  
  log('✅ 完整流程执行完毕！', colors.green);
  console.log();
  
  report();
}

function report() {
  const reportPath = path.join(__dirname, '..', '.mcp', 'test-report.json');
  
  if (!fs.existsSync(reportPath)) {
    log('❌ 测试报告不存在，请先运行测试', colors.red);
    return;
  }
  
  log('📊 测试报告:', colors.blue);
  console.log();
  
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const { summary, results } = report;
    
    log(`总计: ${summary.total} | 通过: ${summary.passed} | 失败: ${summary.failed} | 错误: ${summary.errors}`, colors.cyan);
    console.log();
    
    if (results && results.length > 0) {
      log('测试详情:', colors.yellow);
      results.forEach(result => {
        const status = result.status === 'PASS' ? '✅' : '❌';
        const color = result.status === 'PASS' ? colors.green : colors.red;
        log(`${status} ${result.name.padEnd(30)} ${result.duration}ms`, color);
      });
    }
    
    console.log();
    log(`完整报告: .mcp/test-report.json`, colors.blue);
    
  } catch (err) {
    log('❌ 无法读取测试报告', colors.red);
  }
}

function clean() {
  log('🧹 清理生成的文件...', colors.blue);
  
  const pathsToClean = [
    '.mcp/analysis.json',
    '.mcp/test-report.json',
    '.mcp/generated.json',
    'tests/mcp/generated/',
    'tests/mcp/screenshots/'
  ];
  
  pathsToClean.forEach(p => {
    const fullPath = path.join(__dirname, '..', p);
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      log(`✅ 已删除: ${p}`, colors.green);
    }
  });
  
  // 重新创建必要的目录
  fs.mkdirSync(path.join(__dirname, '..', 'tests/mcp/generated'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, '..', 'tests/mcp/screenshots'), { recursive: true });
  
  console.log();
  log('✅ 清理完成！', colors.green);
}

// 主程序
const command = process.argv[2];

switch (command) {
  case 'setup':
    setup();
    break;
  case 'check':
    check();
    break;
  case 'analyze':
    analyze();
    break;
  case 'generate':
    generate();
    break;
  case 'run':
    run();
    break;
  case 'promote':
    promote();
    break;
  case 'full':
    full();
    break;
  case 'report':
    report();
    break;
  case 'clean':
    clean();
    break;
  case 'help':
  default:
    showHelp();
    break;
}