#!/usr/bin/env node

/**
 * 报告生成修复测试脚本
 * 验证函数名和源文件路径是否正确显示
 */

const { CodeImpactAnalyzer, SystemImpactPredictor, ReportGenerator } = require('./vue_regression_system');

async function testReportFix() {
  console.log('🧪 开始报告生成修复测试...\n');
  
  const analyzer = new CodeImpactAnalyzer();
  const predictor = new SystemImpactPredictor();
  const reportGenerator = new ReportGenerator();
  
  try {
    // 1. 构建依赖关系图
    console.log('📊 构建依赖关系图...');
    await analyzer.buildDependencyGraph();
    
    // 2. 创建模拟的函数影响数据
    console.log('\n🔍 创建模拟的函数影响数据...');
    
    const mockFunctionImpact = [
      {
        function: 'formatDateNanos',
        file: 'src/common/util.js',
        callers: [
          { file: 'src/views/retrieve-v2/mixins/result-table-mixin.js', calls: 5 },
          { file: 'src/mixins/result-table-mixin.js', calls: 5 }
        ],
        importers: [
          { file: 'src/views/retrieve-core/base.ts', importType: 'named' }
        ],
        totalUsages: 10,
        impact: 'high',
        isModified: true
      },
      {
        function: 'formatDate',
        file: 'src/common/util.js',
        callers: [
          { file: 'src/components/log-view/highlight-html.js', calls: 3 }
        ],
        importers: [],
        totalUsages: 3,
        impact: 'medium',
        isModified: false
      }
    ];
    
    // 3. 创建模拟的预测结果
    const mockPrediction = {
      overview: {
        changedFiles: 2,
        affectedComponents: 3,
        affectedPages: 2,
        riskLevel: 'high'
      },
      functionLevelImpact: mockFunctionImpact,
      functionalImpacts: mockFunctionImpact,
      componentImpacts: [],
      pageImpacts: [],
      uiImpacts: [],
      riskAssessment: {
        score: 85,
        level: 'high',
        factors: ['函数修改', '高使用率'],
        recommendations: ['建议全面测试', '重点关注时间格式化']
      }
    };
    
    // 4. 测试功能性影响分析
    console.log('\n🔍 测试功能性影响分析...');
    const functionalImpacts = await predictor.analyzeFunctionalImpact(mockPrediction);
    
    console.log('功能性影响分析结果:');
    functionalImpacts.forEach((impact, index) => {
      console.log(`${index + 1}. 函数: ${impact.functionName}`);
      console.log(`   源文件: ${impact.sourceFile}`);
      console.log(`   影响等级: ${impact.impactLevel}`);
      console.log(`   破坏性: ${impact.breaking ? '是' : '否'}`);
      console.log(`   使用次数: ${impact.totalUsages}`);
      console.log(`   受影响组件: ${impact.affectedComponents.length} 个`);
    });
    
    // 5. 测试报告生成
    console.log('\n🔍 测试报告生成...');
    const report = await reportGenerator.generateReport(mockPrediction, 'WORKING');
    
    console.log('报告生成结果:');
    console.log(`- 功能性影响数量: ${report.json ? JSON.parse(report.json).functional.length : 0}`);
    
    if (report.json) {
      const reportData = JSON.parse(report.json);
      console.log('\n功能性影响详情:');
      reportData.functional.forEach((impact, index) => {
        console.log(`${index + 1}. 函数名: ${impact.functionName}`);
        console.log(`   源文件: ${impact.sourceFile}`);
        console.log(`   影响等级: ${impact.impactLevel}`);
        console.log(`   破坏性: ${impact.breaking ? '是' : '否'}`);
        console.log(`   使用次数: ${impact.totalUsages}`);
      });
    }
    
    // 6. 验证HTML报告
    console.log('\n🔍 验证HTML报告...');
    if (report.html) {
      const hasFunctionTable = report.html.includes('功能性影响 (函数级)');
      const hasFormatDateNanos = report.html.includes('formatDateNanos');
      const hasUtilJs = report.html.includes('util.js');
      
      console.log(`- 包含函数影响表格: ${hasFunctionTable ? '✅' : '❌'}`);
      console.log(`- 包含formatDateNanos函数: ${hasFormatDateNanos ? '✅' : '❌'}`);
      console.log(`- 包含util.js源文件: ${hasUtilJs ? '✅' : '❌'}`);
      
      if (hasFunctionTable && hasFormatDateNanos && hasUtilJs) {
        console.log('\n✅ 报告生成修复成功！');
      } else {
        console.log('\n❌ 报告生成仍有问题');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈:', error.stack);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testReportFix().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testReportFix }; 