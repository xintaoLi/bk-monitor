// ====================
// scripts/regression-watch.js
// ====================

const { AutomatedRegressionTestSystem } = require('../regression-system/vue_regression_system');
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
