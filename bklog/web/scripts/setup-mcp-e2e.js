#!/usr/bin/env node
/**
 * MCP E2E 自动化测试环境一键设置脚本
 * 用于快速初始化和配置 bklog/web 项目的 E2E 测试环境
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title) {
  console.log();
  log('='.repeat(60), colors.blue);
  log(`  ${title}`, colors.bright + colors.blue);
  log('='.repeat(60), colors.blue);
  console.log();
}

function step(num, total, message) {
  log(`[${num}/${total}] ${message}`, colors.blue);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function warn(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

async function main() {
  header('Blueking-Log MCP E2E 测试环境设置');

  const projectRoot = path.resolve(__dirname, '..');
  const mcpCliPath = path.join(projectRoot, 'packages', 'mcp-cli');

  try {
    // 步骤 1: 检查目录结构
    step(1, 6, '检查项目结构...');
    
    if (!fs.existsSync(mcpCliPath)) {
      error('packages/mcp-cli 目录不存在');
      log('请确保已按照文档创建 MCP CLI 包', colors.yellow);
      process.exit(1);
    }
    
    success('项目结构检查通过');

    // 步骤 2: 安装 MCP CLI 依赖
    step(2, 6, '安装 MCP CLI 依赖...');
    
    try {
      process.chdir(mcpCliPath);
      execSync('npm install', { stdio: 'inherit' });
      success('MCP CLI 依赖安装完成');
    } catch (err) {
      error('依赖安装失败');
      throw err;
    }

    // 步骤 3: 构建 MCP CLI
    step(3, 6, '构建 MCP CLI...');
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
      success('MCP CLI 构建完成');
    } catch (err) {
      error('构建失败');
      throw err;
    }

    // 返回项目根目录
    process.chdir(projectRoot);

    // 步骤 4: 创建必要的目录
    step(4, 6, '创建测试目录结构...');
    
    const directories = [
      'tests/mcp/flows',
      'tests/mcp/generated',
      'tests/mcp/utils',
      'tests/mcp/screenshots',
      '.mcp',
      '.codebuddy'
    ];

    for (const dir of directories) {
      const dirPath = path.join(projectRoot, dir);
      await fs.ensureDir(dirPath);
    }
    
    success('目录结构创建完成');

    // 步骤 5: 验证配置文件
    step(5, 6, '验证配置文件...');
    
    const configFiles = [
      '.mcp/servers.json',
      '.codebuddy/tasks.json',
      '.codebuddy/rules.json',
      'tests/mcp/utils/browser.js',
      'mcp-e2e.config.js'
    ];

    let missingFiles = [];
    for (const file of configFiles) {
      const filePath = path.join(projectRoot, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      warn('以下配置文件缺失：');
      missingFiles.forEach(file => log(`  - ${file}`, colors.yellow));
      log('请按照文档手动创建这些文件', colors.yellow);
    } else {
      success('所有配置文件就绪');
    }

    // 步骤 6: 创建示例测试
    step(6, 6, '检查示例测试...');
    
    const exampleTests = [
      'tests/mcp/flows/dashboard.flow.js',
      'tests/mcp/flows/authorization.flow.js'
    ];

    let hasExamples = exampleTests.every(test => 
      fs.existsSync(path.join(projectRoot, test))
    );

    if (hasExamples) {
      success('示例测试已就绪');
    } else {
      warn('部分示例测试缺失，请查看文档创建');
    }

    // 完成
    console.log();
    header('🎉 设置完成！');
    
    log('接下来的步骤：', colors.bright);
    console.log();
    log('1. 确保开发服务器正在运行:', colors.blue);
    log('   npm run dev', colors.yellow);
    console.log();
    
    log('2. 为关键组件添加 data-testid 属性:', colors.blue);
    log('   参考: tests/mcp/README.md', colors.yellow);
    console.log();
    
    log('3. 执行测试:', colors.blue);
    log('   npm run test:analyze   # 分析组件', colors.yellow);
    log('   npm run test:generate  # 生成测试', colors.yellow);
    log('   npm run test:run       # 执行测试', colors.yellow);
    log('   npm run test:e2e       # 完整流程', colors.yellow);
    console.log();
    
    log('4. 查看文档:', colors.blue);
    log('   cat tests/mcp/README.md', colors.yellow);
    console.log();
    
    success('祝测试顺利！🚀');
    console.log();

  } catch (err) {
    console.log();
    error('设置过程中出现错误：');
    console.error(err);
    process.exit(1);
  }
}

main();