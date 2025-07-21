#!/usr/bin/env node

/**
 * 完整分析测试脚本
 * 验证整个函数影响分析流程和报告生成
 */

const { CodeImpactAnalyzer, SystemImpactPredictor, ReportGenerator, AutomatedRegressionTestSystem } = require('./vue_regression_system');

async function testCompleteAnalysis() {
  console.log('🧪 开始完整分析测试...\n');
  
  const system = new AutomatedRegressionTestSystem();
  
  try {
    // 1. 初始化系统
    console.log('📊 初始化系统...');
    await system.impactAnalyzer.buildDependencyGraph();
    
    // 2. 创建模拟的变更文件
    console.log('\n🔍 创建模拟变更...');
    
    // 模拟修改了 util.js 文件
    const mockChangedFiles = ['src/common/util.js'];
    
    // 3. 分析变更影响
    console.log('\n🔍 分析变更影响...');
    const impact = await system.impactAnalyzer.analyzeChangeImpact(mockChangedFiles);
    
    console.log('影响分析结果:');
    console.log(`- 风险等级: ${impact.riskLevel}`);
    console.log(`- 受影响函数: ${impact.affectedFunctions.length} 个`);
    console.log(`- 受影响组件: ${impact.affectedComponents.length} 个`);
    console.log(`- 函数级影响: ${impact.functionLevelImpact ? impact.functionLevelImpact.length : 0} 个`);
    
    // 4. 预测系统影响
    console.log('\n🔍 预测系统影响...');
    const prediction = await system.systemPredictor.predictSystemImpact(impact);
    
    console.log('预测结果:');
    console.log(`- 风险等级: ${prediction.overview.riskLevel}`);
    console.log(`- 变更文件: ${prediction.overview.changedFiles} 个`);
    console.log(`- 受影响组件: ${prediction.overview.affectedComponents} 个`);
    console.log(`- 功能性影响: ${prediction.functionalImpacts ? prediction.functionalImpacts.length : 0} 个`);
    
    // 5. 生成报告
    console.log('\n🔍 生成报告...');
    const report = await system.reportGenerator.generateReport(prediction, 'WORKING');
    
    console.log('报告生成结果:');
    console.log(`- HTML报告长度: ${report.html ? report.html.length : 0} 字符`);
    console.log(`- JSON报告长度: ${report.json ? report.json.length : 0} 字符`);
    
    // 6. 验证报告内容
    if (report.json) {
      const reportData = JSON.parse(report.json);
      
      console.log('\n📋 报告内容验证:');
      console.log(`- 功能性影响数量: ${reportData.functional ? reportData.functional.length : 0}`);
      
      if (reportData.functional && reportData.functional.length > 0) {
        console.log('\n功能性影响详情:');
        reportData.functional.forEach((impact, index) => {
          console.log(`${index + 1}. 函数名: ${impact.functionName}`);
          console.log(`   源文件: ${impact.sourceFile}`);
          console.log(`   影响等级: ${impact.impactLevel}`);
          console.log(`   破坏性: ${impact.breaking ? '是' : '否'}`);
          console.log(`   使用次数: ${impact.totalUsages}`);
          console.log(`   受影响组件: ${impact.affectedComponents ? impact.affectedComponents.length : 0} 个`);
        });
      }
    }
    
    // 7. 验证HTML报告
    if (report.html) {
      console.log('\n🔍 验证HTML报告...');
      
      const checks = [
        { name: '包含函数影响表格', test: () => report.html.includes('功能性影响 (函数级)') },
        { name: '包含formatDateNanos函数', test: () => report.html.includes('formatDateNanos') },
        { name: '包含util.js源文件', test: () => report.html.includes('util.js') },
        { name: '包含formatDate函数', test: () => report.html.includes('formatDate') },
        { name: '包含风险等级', test: () => report.html.includes('风险等级') }
      ];
      
      let passedChecks = 0;
      checks.forEach(check => {
        const passed = check.test();
        console.log(`- ${check.name}: ${passed ? '✅' : '❌'}`);
        if (passed) passedChecks++;
      });
      
      console.log(`\n📊 检查结果: ${passedChecks}/${checks.length} 通过`);
      
      if (passedChecks === checks.length) {
        console.log('\n✅ 完整分析测试成功！');
        console.log('所有功能都正常工作：');
        console.log('- 函数影响分析 ✓');
        console.log('- 路径解析 ✓');
        console.log('- 报告生成 ✓');
        console.log('- HTML报告格式 ✓');
      } else {
        console.log('\n❌ 部分功能仍有问题');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈:', error.stack);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testCompleteAnalysis().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testCompleteAnalysis }; 