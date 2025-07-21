#!/usr/bin/env node

/**
 * 函数影响分析测试脚本
 * 专门测试 formatDateNanos 等函数的影响检测能力
 */

const { CodeImpactAnalyzer } = require('./vue_regression_system');

async function testFunctionImpactAnalysis() {
  console.log('🧪 开始函数影响分析测试...\n');
  
  const analyzer = new CodeImpactAnalyzer();
  
  try {
    // 1. 构建依赖关系图
    console.log('📊 构建依赖关系图...');
    await analyzer.buildDependencyGraph();
    
    // 2. 测试特定函数的影响分析
    console.log('\n🔍 测试 formatDateNanos 函数影响分析...');
    
    const utilFile = '../src/common/util.js';  // 使用正确的相对路径
    console.log(`\n分析文件: ${utilFile}`);
    
    // 测试工具函数影响分析
    const utilityImpact = await analyzer.analyzeUtilityImpact(utilFile);
    
    if (utilityImpact.length > 0) {
      console.log(`\n✅ 发现 ${utilityImpact.length} 个函数的影响分析结果:`);
      
      utilityImpact.forEach((funcImpact, index) => {
        console.log(`\n${index + 1}. 函数: ${funcImpact.function}`);
        console.log(`   影响等级: ${funcImpact.impact}`);
        console.log(`   总使用次数: ${funcImpact.totalUsages}`);
        console.log(`   是否被修改: ${funcImpact.isModified ? '✅' : '❌'}`);
        console.log(`   调用者数量: ${funcImpact.callers.length}`);
        console.log(`   导入者数量: ${funcImpact.importers.length}`);
        
        if (funcImpact.callers.length > 0) {
          console.log(`   调用者文件:`);
          funcImpact.callers.slice(0, 5).forEach(caller => {
            console.log(`     - ${caller.file} (${caller.calls} 次调用)`);
          });
          if (funcImpact.callers.length > 5) {
            console.log(`     ... 还有 ${funcImpact.callers.length - 5} 个文件`);
          }
        }
        
        if (funcImpact.importers.length > 0) {
          console.log(`   导入者文件:`);
          funcImpact.importers.slice(0, 5).forEach(importer => {
            console.log(`     - ${importer.file} (${importer.importType})`);
          });
        }
        
        // 特别关注 formatDateNanos
        if (funcImpact.function === 'formatDateNanos') {
          console.log(`\n   🎯 formatDateNanos 函数特别分析:`);
          console.log(`      这是一个关键的日期格式化函数，影响纳秒级时间显示`);
          console.log(`      受影响的组件类型分析:`);
          
          const componentCallers = funcImpact.callers.filter(caller => 
            analyzer.getFileType(caller.file) === 'component'
          );
          const mixinCallers = funcImpact.callers.filter(caller => 
            caller.file.includes('mixin')
          );
          
          console.log(`      - Vue组件: ${componentCallers.length} 个`);
          console.log(`      - Mixin文件: ${mixinCallers.length} 个`);
          console.log(`      - 其他调用: ${funcImpact.callers.length - componentCallers.length - mixinCallers.length} 个`);
        }
      });
      
      // 专门查找 formatDateNanos 函数
      const formatDateNanosImpact = utilityImpact.find(f => f.function === 'formatDateNanos');
      if (formatDateNanosImpact) {
        console.log(`\n🎯 formatDateNanos 函数详细影响分析:`);
        console.log(`影响等级: ${formatDateNanosImpact.impact}`);
        console.log(`总使用次数: ${formatDateNanosImpact.totalUsages}`);
        
        if (formatDateNanosImpact.totalUsages > 0) {
          console.log(`\n📋 建议测试的关键页面和组件:`);
          console.log('1. 所有包含日志列表的页面（检查时间列显示）');
          console.log('2. 日志详情页面（检查时间字段格式）');
          console.log('3. 时间筛选和搜索功能');
          console.log('4. 导出功能中的时间格式');
          console.log('5. 任何显示 date_nanos 字段的组件');
          
          console.log(`\n⚠️  潜在风险:`);
          console.log('- 纳秒精度时间可能显示异常');
          console.log('- 时间格式不一致');
          console.log('- 微秒/纳秒部分丢失或错误');
          console.log('- 时区处理问题');
        }
      } else {
        console.log(`\n❌ 未找到 formatDateNanos 函数的影响分析`);
        console.log('可能原因:');
        console.log('1. 函数未被修改');
        console.log('2. 函数名称匹配问题');
        console.log('3. 依赖关系图构建不完整');
      }
    } else {
      console.log(`\n❌ 没有发现任何函数影响分析结果`);
      console.log('可能原因:');
      console.log('1. 文件不存在或无法读取');
      console.log('2. 没有检测到函数修改');
      console.log('3. 依赖关系分析失败');
    }
    
    // 3. 测试具体函数的调用者查找
    console.log(`\n🔍 直接测试 formatDateNanos 函数调用者查找...`);
    const callers = await analyzer.findFunctionCallersDetailed('formatDateNanos');
    
    if (callers.length > 0) {
      console.log(`✅ 找到 ${callers.length} 个调用 formatDateNanos 的文件:`);
      callers.forEach((caller, index) => {
        console.log(`${index + 1}. ${caller.file} - ${caller.calls} 次调用`);
        caller.callDetails.slice(0, 3).forEach(detail => {
          console.log(`   第${detail.lineNumber}行: ${detail.context.trim()}`);
        });
      });
    } else {
      console.log(`❌ 没有找到调用 formatDateNanos 的文件`);
    }
    
    // 4. 测试导入者查找
    console.log(`\n🔍 测试 formatDateNanos 函数导入者查找...`);
    const importers = await analyzer.findFunctionImporters('formatDateNanos', utilFile);
    
    if (importers.length > 0) {
      console.log(`✅ 找到 ${importers.length} 个导入 formatDateNanos 的文件:`);
      importers.forEach((importer, index) => {
        console.log(`${index + 1}. ${importer.file} - ${importer.importType} from ${importer.importSource}`);
      });
    } else {
      console.log(`❌ 没有找到导入 formatDateNanos 的文件`);
    }
    
    // 5. 测试完整的变更影响分析
    console.log(`\n🔍 测试完整的变更影响分析...`);
    const changedFiles = await analyzer.getChangedFiles('WORKING');
    
    if (changedFiles.length > 0) {
      console.log(`发现 ${changedFiles.length} 个变更文件:`, changedFiles);
      
      const impact = await analyzer.analyzeChangeImpact(changedFiles);
      
      console.log(`\n📊 变更影响分析结果:`);
      console.log(`风险等级: ${impact.riskLevel}`);
      console.log(`受影响函数: ${impact.affectedFunctions.length} 个`);
      console.log(`受影响组件: ${impact.affectedComponents.length} 个`);
      
      if (impact.functionLevelImpact && impact.functionLevelImpact.length > 0) {
        const formatDateFunctions = impact.functionLevelImpact.filter(f => 
          f.function.includes('formatDate')
        );
        
        if (formatDateFunctions.length > 0) {
          console.log(`\n📅 发现日期格式化函数修改:`);
          formatDateFunctions.forEach(func => {
            console.log(`- ${func.function}: 影响等级 ${func.impact}, 使用 ${func.totalUsages} 次`);
          });
        }
      }
    } else {
      console.log(`没有发现变更文件`);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈:', error.stack);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testFunctionImpactAnalysis().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testFunctionImpactAnalysis }; 