// ====================
// scripts/regression-analyze.js
// ====================

const { AutomatedRegressionTestSystem } = require('../regression-system/vue_regression_system');
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
