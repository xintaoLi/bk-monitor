// ====================
// 实际项目集成示例
// ====================

// package.json 添加的脚本
const packageJsonScripts = {
  scripts: {
    'regression:init': 'node scripts/regression-init.js',
    'regression:record': 'node scripts/regression-record.js',
    'regression:analyze': 'node scripts/regression-analyze.js',
    'regression:watch': 'node scripts/regression-watch.js',
    'test:regression': 'npm run regression:record && npm run regression:analyze',
  },
};

// ====================
// scripts/regression-init.js
// ====================

const fs = require('fs');
const path = require('path');
const { AutomatedRegressionTestSystem } = require('../lib/regression-system');

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
      componentPaths: ['src/components/**/*.vue', 'src/views/**/*.vue', 'src/pages/**/*.vue'],
      excludePaths: ['node_modules', 'dist', '.git', 'src/components/test/**', 'src/components/demo/**'],
      utilityPaths: ['src/utils/**/*.js', 'src/helpers/**/*.js', 'src/services/**/*.js'],
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
      criticalComponents: [
        'src/components/Login.vue',
        'src/components/UserProfile.vue',
        'src/components/PaymentForm.vue',
      ],
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
  const preCommitHook = `#!/bin/sh
# 回归测试预提交钩子
echo "正在运行回归测试..."
npm run regression:analyze -- --commit HEAD
if [ $? -ne 0 ]; then
  echo "回归测试失败，请检查报告"
  exit 1
fi
`;

  fs.writeFileSync('.git/hooks/pre-commit', preCommitHook);
  fs.chmodSync('.git/hooks/pre-commit', '755');

  console.log('✅ 回归测试系统初始化完成');
  console.log('📝 配置文件已创建: regression.config.js');
  console.log('🔗 Git钩子已安装');
}

if (require.main === module) {
  initializeRegressionTesting().catch(console.error);
}

// ====================
// scripts/regression-record.js
// ====================

const { AutomatedRegressionTestSystem } = require('../lib/regression-system');
const config = require('../regression.config');

async function recordMockData() {
  console.log('📹 开始录制Mock数据...');

  const system = new AutomatedRegressionTestSystem(config);

  try {
    // 1. 启动开发服务器
    const { spawn } = require('child_process');
    const server = spawn('npm', ['run', 'serve'], {
      stdio: 'inherit',
      detached: true,
    });

    // 等待服务器启动
    await waitForServer(config.project.url);
    console.log('✅ 开发服务器已启动');

    // 2. 录制Mock数据
    const mockData = await system.mockGenerator.startRecording(config.project.url);

    // 3. 保存Mock数据
    const fs = require('fs');
    fs.writeFileSync(`${config.mock.outputPath}/mock-data.json`, JSON.stringify(mockData, null, 2));

    console.log(`✅ Mock数据录制完成，共${Object.keys(mockData).length}个API`);

    // 4. 关闭服务器
    process.kill(-server.pid);
  } catch (error) {
    console.error('❌ Mock数据录制失败:', error.message);
    process.exit(1);
  }
}

async function waitForServer(url, timeout = 60000) {
  const http = require('http');
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, res => {
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('服务器启动超时'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };

    check();
  });
}

if (require.main === module) {
  recordMockData().catch(console.error);
}

// ====================
// scripts/regression-analyze.js
// ====================

const { AutomatedRegressionTestSystem } = require('../lib/regression-system');
const config = require('../regression.config');
const fs = require('fs');

async function analyzeRegression() {
  console.log('🔍 开始分析代码变更影响...');

  const system = new AutomatedRegressionTestSystem(config);

  try {
    // 1. 获取提交信息
    const commitHash = process.argv.includes('--commit') ? process.argv[process.argv.indexOf('--commit') + 1] : 'HEAD';

    // 2. 加载Mock数据
    const mockDataPath = `${config.mock.outputPath}/mock-data.json`;
    if (!fs.existsSync(mockDataPath)) {
      console.log('⚠️  未找到Mock数据，请先运行: npm run regression:record');
      process.exit(1);
    }

    const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

    // 3. 分析影响
    const report = await system.analyzeCommit(commitHash, mockData);

    // 4. 保存报告
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `${config.test.outputPath}/report-${timestamp}`;

    fs.mkdirSync(reportPath, { recursive: true });
    fs.writeFileSync(`${reportPath}/analysis.json`, report.json);
    fs.writeFileSync(`${reportPath}/report.html`, report.html);

    // 5. 输出结果
    console.log('\n📊 分析结果:');
    console.log(`风险等级: ${report.summary.riskLevel}`);
    console.log(`影响组件: ${report.summary.overview}`);
    console.log(`\n📄 详细报告: ${reportPath}/report.html`);

    // 6. 风险检查
    if (report.summary.riskLevel === 'high') {
      console.log('\n🚨 检测到高风险变更！');
      console.log('建议:');
      report.summary.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });

      if (process.env.CI === 'true') {
        process.exit(1); // 在CI环境中失败
      }
    }
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeRegression().catch(console.error);
}

// ====================
// scripts/regression-watch.js
// ====================

const { AutomatedRegressionTestSystem } = require('../lib/regression-system');
const config = require('../regression.config');
const chokidar = require('chokidar');

async function watchForChanges() {
  console.log('👁️  启动回归测试监控...');

  const system = new AutomatedRegressionTestSystem(config);

  // 监听文件变化
  const watcher = chokidar.watch([...config.scan.componentPaths, ...config.scan.utilityPaths], {
    ignored: config.scan.excludePaths,
    persistent: true,
  });

  let analyzing = false;

  watcher.on('change', async filePath => {
    if (analyzing) return;

    console.log(`\n📝 检测到文件变化: ${filePath}`);

    try {
      analyzing = true;

      // 快速影响分析
      const impact = await system.impactAnalyzer.analyzeFileImpact(filePath);

      if (impact.affectedComponents.length > 0) {
        console.log(`⚠️  影响组件: ${impact.affectedComponents.length}个`);

        // 可选：自动运行完整分析
        if (process.argv.includes('--auto-analyze')) {
          console.log('🔍 运行完整分析...');
          await system.analyzeCommit('HEAD', {});
        }
      }
    } catch (error) {
      console.error('❌ 分析失败:', error.message);
    } finally {
      analyzing = false;
    }
  });

  console.log('✅ 监控已启动，按 Ctrl+C 停止');

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n👋 停止监控...');
    watcher.close();
    process.exit(0);
  });
}

if (require.main === module) {
  watchForChanges().catch(console.error);
}
