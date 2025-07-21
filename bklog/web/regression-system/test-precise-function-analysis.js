#!/usr/bin/env node

/**
 * 精确函数修改检测和风险评估测试脚本
 * 验证系统能否精确定位修改的函数并分析其风险和缺陷
 */

const { CodeImpactAnalyzer } = require('./vue_regression_system');

async function testPreciseFunctionAnalysis() {
  console.log('🧪 开始精确函数修改检测和风险评估测试...\n');
  
  const analyzer = new CodeImpactAnalyzer();
  
  try {
    // 1. 构建依赖关系图
    console.log('📊 构建依赖关系图...');
    await analyzer.buildDependencyGraph();
    
    // 2. 测试精确的函数修改检测
    console.log('\n🔍 测试精确的函数修改检测...');
    
    const testFile = '../src/common/util.js';
    console.log(`分析文件: ${testFile}`);
    
    // 获取修改的函数
    const modifiedFunctions = await analyzer.getModifiedFunctions(testFile);
    console.log(`\n检测到的修改函数: ${modifiedFunctions.join(', ')}`);
    
    if (modifiedFunctions.length === 0) {
      console.log('⚠️  没有检测到修改的函数，可能原因:');
      console.log('1. 文件没有实际修改');
      console.log('2. 修改不在git diff中');
      console.log('3. 函数定义模式不匹配');
      
      // 模拟一个修改的函数进行测试
      console.log('\n🔧 模拟测试：假设 formatDateNanos 函数被修改');
      const mockModifiedFunction = 'formatDateNanos';
      
      await testFunctionRiskAnalysis(analyzer, mockModifiedFunction, testFile);
    } else {
      // 对每个修改的函数进行风险分析
      for (const funcName of modifiedFunctions) {
        await testFunctionRiskAnalysis(analyzer, funcName, testFile);
      }
    }
    
    // 3. 测试函数调用链分析
    console.log('\n🔍 测试函数调用链分析...');
    const testFunction = 'formatDateNanos';
    const callChainDepth = await analyzer.analyzeCallChainDepth(testFunction);
    console.log(`${testFunction} 函数的调用链深度: ${callChainDepth} 层`);
    
    // 4. 测试函数使用频率分析
    console.log('\n🔍 测试函数使用频率分析...');
    const usageCount = await analyzer.getFunctionUsageCount(testFunction);
    console.log(`${testFunction} 函数的使用次数: ${usageCount} 次`);
    
    // 5. 测试函数类型分类
    console.log('\n🔍 测试函数类型分类...');
    const functionType = analyzer.classifyFunctionType(testFunction, {});
    console.log(`${testFunction} 函数的类型: ${functionType}`);
    
    // 6. 测试完整的风险评估
    console.log('\n🔍 测试完整的风险评估...');
    const riskAnalysis = await analyzer.analyzeFunctionChangeRisks(testFunction, testFile);
    
    console.log('\n📊 风险评估结果:');
    console.log(`函数类型: ${riskAnalysis.functionType}`);
    console.log(`使用次数: ${riskAnalysis.usageCount}`);
    console.log(`调用链深度: ${riskAnalysis.callChainDepth}`);
    
    console.log('\n⚠️  识别到的风险:');
    riskAnalysis.risks.forEach((risk, index) => {
      console.log(`${index + 1}. [${risk.severity.toUpperCase()}] ${risk.type}: ${risk.description}`);
      console.log(`   影响: ${risk.impact.join(', ')}`);
    });
    
    console.log('\n💡 建议措施:');
    riskAnalysis.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    // 7. 测试函数详细信息获取
    console.log('\n🔍 测试函数详细信息获取...');
    const functionDetails = await analyzer.getFunctionDetails(testFunction, testFile);
    console.log(`${testFunction} 函数详情:`, functionDetails);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈:', error.stack);
  }
}

async function testFunctionRiskAnalysis(analyzer, functionName, filePath) {
  console.log(`\n🎯 分析函数 ${functionName} 的风险...`);
  
  try {
    // 获取函数调用者
    const callers = await analyzer.findFunctionCallersDetailed(functionName);
    console.log(`调用者数量: ${callers.length}`);
    
    if (callers.length > 0) {
      console.log('主要调用者:');
      callers.slice(0, 5).forEach((caller, index) => {
        console.log(`  ${index + 1}. ${caller.file} (${caller.calls} 次调用)`);
      });
    }
    
    // 获取函数导入者
    const importers = await analyzer.findFunctionImporters(functionName, filePath);
    console.log(`导入者数量: ${importers.length}`);
    
    // 进行风险评估
    const riskAnalysis = await analyzer.analyzeFunctionChangeRisks(functionName, filePath);
    
    console.log(`\n📊 ${functionName} 风险评估:`);
    console.log(`- 函数类型: ${riskAnalysis.functionType}`);
    console.log(`- 使用次数: ${riskAnalysis.usageCount}`);
    console.log(`- 调用链深度: ${riskAnalysis.callChainDepth}`);
    console.log(`- 风险数量: ${riskAnalysis.risks.length}`);
    
    if (riskAnalysis.risks.length > 0) {
      console.log('\n⚠️  主要风险:');
      riskAnalysis.risks.forEach((risk, index) => {
        console.log(`  ${index + 1}. [${risk.severity}] ${risk.description}`);
      });
    }
    
    if (riskAnalysis.recommendations.length > 0) {
      console.log('\n💡 建议措施:');
      riskAnalysis.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
    
  } catch (error) {
    console.error(`分析函数 ${functionName} 失败:`, error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testPreciseFunctionAnalysis().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testPreciseFunctionAnalysis }; 