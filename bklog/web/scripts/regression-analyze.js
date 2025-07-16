// ====================
// scripts/regression-analyze.js
// ====================

const { AutomatedRegressionTestSystem } = require('../regression-system/vue_regression_system');
const config = require('../regression.config');
const fs = require('fs');
const path = require('path');

async function analyzeRegression() {
  console.log('🔍 开始分析代码变更影响...');

  const system = new AutomatedRegressionTestSystem();

  try {
    // 1. 解析命令行参数
    const args = process.argv.slice(2);
    const commitHash = args.includes('--commit') ? args[args.indexOf('--commit') + 1] : null;
    const analysisType = args.includes('--staged') ? 'STAGED' : 
                        args.includes('--working') ? 'WORKING' : 
                        null; // 默认分析所有变更

    // 2. 初始化系统
    console.log('正在初始化分析系统...');
    const mockData = await system.initialize(config.projectUrl || 'http://localhost:8080');
    console.log('✅ 系统初始化完成');

    // 3. 根据参数选择分析方式
    let report;
    if (commitHash) {
      console.log(`📋 分析指定提交: ${commitHash}`);
      report = await system.analyzeCommit(commitHash, mockData);
    } else if (analysisType === 'STAGED') {
      console.log('📋 分析已 staged 的修改...');
      report = await system.analyzeStagedChanges(mockData);
    } else if (analysisType === 'WORKING') {
      console.log('📋 分析工作目录的所有修改...');
      report = await system.analyzeWorkingChanges(mockData);
    } else {
      console.log('📋 分析当前所有变更（默认）...');
      report = await system.analyzeCommit(undefined, mockData);
    }

    // 4. 保存报告
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(config.test?.outputPath || './reports', `report-${timestamp}`);

    fs.mkdirSync(reportDir, { recursive: true });
    
    // 保存JSON报告
    fs.writeFileSync(path.join(reportDir, 'analysis.json'), report.json);
    
    // 保存HTML报告
    fs.writeFileSync(path.join(reportDir, 'report.html'), report.html);

    // 5. 输出结果
    console.log('\n📊 分析结果:');
    console.log(`风险等级: ${report.summary.riskLevel}`);
    console.log(`分析类型: ${report.summary.overview || '当前变更分析'}`);
    console.log(`影响文件: ${report.summary.keyFindings?.[0] || '无'}`);
    console.log(`功能性影响: ${report.summary.keyFindings?.[1] || '无'}`);
    console.log(`UI影响: ${report.summary.keyFindings?.[2] || '无'}`);
    console.log(`\n📄 详细报告: ${reportDir}/report.html`);

    // 6. 风险检查
    if (report.summary.riskLevel === 'high') {
      console.log('\n🚨 检测到高风险变更！');
      console.log('建议:');
      report.summary.recommendations?.forEach(rec => {
        console.log(`  • ${rec}`);
      });

      if (process.env.CI === 'true') {
        console.log('\n❌ CI环境中检测到高风险变更，构建失败');
        process.exit(1);
      } else {
        console.log('\n⚠️  建议在提交前进行充分测试');
      }
    } else if (report.summary.riskLevel === 'medium') {
      console.log('\n⚠️  检测到中等风险变更，请确保已充分测试');
    } else {
      console.log('\n✅ 风险等级较低，可以安全提交');
    }

    // 7. 输出使用说明
    console.log('\n📖 使用说明:');
    console.log('  • 默认: 分析当前所有变更');
    console.log('  • --staged: 只分析已 staged 的修改');
    console.log('  • --working: 分析工作目录所有修改');
    console.log('  • --commit <hash>: 分析指定提交');

  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    console.error('错误详情:', error.stack);
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
🔍 Vue 回归测试分析工具

用法:
  node regression-analyze.js [选项]

选项:
  --staged          只分析已 staged 的修改
  --working         分析工作目录所有修改（包括 staged 和未 staged）
  --commit <hash>   分析指定提交的变更
  --help            显示此帮助信息

示例:
  node regression-analyze.js                    # 分析当前所有变更
  node regression-analyze.js --staged          # 只分析已 staged 的修改
  node regression-analyze.js --working         # 分析工作目录所有修改
  node regression-analyze.js --commit HEAD~1   # 分析指定提交

环境变量:
  CI=true           在CI环境中，高风险变更会导致构建失败
`);
}

// 检查是否需要显示帮助
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else {
    analyzeRegression().catch(error => {
      console.error('程序执行失败:', error);
      process.exit(1);
    });
  }
}
