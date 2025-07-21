#!/usr/bin/env node

/**
 * 路径解析测试脚本
 * 验证路径解析逻辑是否正确
 */

const { CodeImpactAnalyzer } = require('./vue_regression_system');

async function testPathResolution() {
  console.log('🧪 开始路径解析测试...\n');
  
  const analyzer = new CodeImpactAnalyzer();
  
  console.log('📊 当前工作目录:', process.cwd());
  console.log('📊 项目根目录:', analyzer.workingDirectory);
  console.log('📊 配置文件路径:', analyzer.findConfigFile());
  
  // 测试一些文件路径
  const testPaths = [
    '../src/common/util.js',  // 正确的相对路径
    'bklog/web/src/common/util.js',
    'bklog/web/regression-system/vue_regression_system.js',
    'vue_regression_system.js',
    './src/common/util.js',
    '../src/common/util.js',
    '../../src/common/util.js'
  ];
  
  console.log('\n🔍 测试路径解析:');
  testPaths.forEach(testPath => {
    const resolved = analyzer.resolveFilePath(testPath);
    console.log(`- ${testPath} -> ${resolved}`);
  });
  
  // 测试文件读取
  console.log('\n🔍 测试文件读取:');
  const testFile = '../src/common/util.js';  // 使用正确的路径
  const content = await analyzer.readFileContent(testFile);
  console.log(`- ${testFile} 读取结果: ${content ? '成功' : '失败'}`);
  
  // 测试变更文件分析
  console.log('\n🔍 测试变更文件分析:');
  const changedFiles = ['../src/common/util.js'];  // 使用正确的路径
  const impact = await analyzer.analyzeChangeImpact(changedFiles);
  console.log(`- 分析结果: ${impact ? '成功' : '失败'}`);
  if (impact) {
    console.log(`- 风险等级: ${impact.riskLevel}`);
    console.log(`- 受影响函数: ${impact.affectedFunctions.length} 个`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testPathResolution().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testPathResolution }; 