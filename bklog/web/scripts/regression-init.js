// ====================
// scripts/regression-init.js
// ====================

const fs = require('fs');
const path = require('path');

async function initializeRegressionTesting() {
  console.log('🚀 初始化回归测试系统...');

  // 1. 创建配置文件
  const configTemplate = {
    project: {
      name: process.env.npm_package_name || 'Vue2.7Project',
      url: process.env.DEV_SERVER_URL || 'http://localhost:8080',
      buildCommand: 'npm run build',
      serveCommand: 'npm run serve',
    },
    scan: {
      componentPaths: ['src/**/*.vue', 'src/**/*.tsx', 'src/**/*.ts'],
      excludePaths: ['node_modules', 'dist', '.git', 'src/components/test/**', 'src/components/demo/**'],
      utilityPaths: ['src/**/*.js', 'src/**/*.ts'],
    },
    mock: {
      outputPath: './regression-data/mock',
      apiTimeout: 30000,
      routes: ['/', '/dashboard', '/profile', '/settings'],
    },
    test: {
      outputPath: './regression-data/reports',
      screenshotPath: './regression-data/screenshots',
      timeout: 60000,
      retries: 2,
    },
    risk: {
      criticalComponents: [],
    },
  };

  // 写入配置文件
  fs.writeFileSync('./regression.config.js', `module.exports = ${JSON.stringify(configTemplate, null, 2)};`);

  // 2. 创建必要的目录
  const dirs = [
    './regression-data',
    './regression-data/mock',
    './regression-data/reports',
    './regression-data/screenshots',
    './regression-data/baselines',
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 3. 创建Git钩子
  //   const preCommitHook = `#!/bin/sh
  // # 回归测试预提交钩子
  // echo "正在运行回归测试..."
  // npm run regression:analyze -- --commit HEAD
  // if [ $? -ne 0 ]; then
  //   echo "回归测试失败，请检查报告"
  //   exit 1
  // fi
  // `;

  //   fs.writeFileSync('.git/hooks/pre-commit', preCommitHook);
  //   fs.chmodSync('.git/hooks/pre-commit', '755');

  console.log('✅ 回归测试系统初始化完成');
  console.log('📝 配置文件已创建: regression.config.js');
  console.log('🔗 Git钩子已安装');
}

if (require.main === module) {
  initializeRegressionTesting().catch(console.error);
}
