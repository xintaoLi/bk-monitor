#!/usr/bin/env node

/**
 * 实时监控测试状态脚本
 */

const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '..', '.mcp', 'test-report.json');

console.log('🔍 监控测试报告...\n');
console.log(`文件位置: ${REPORT_PATH}\n`);

let lastModified = null;

function checkReport() {
  try {
    if (!fs.existsSync(REPORT_PATH)) {
      console.log('⏳ 等待测试报告生成...');
      return;
    }

    const stats = fs.statSync(REPORT_PATH);
    
    // 只在文件更新时显示
    if (!lastModified || stats.mtime > lastModified) {
      lastModified = stats.mtime;
      
      const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
      
      console.clear();
      console.log('📊 测试报告 (实时)\n');
      console.log(`更新时间: ${new Date(report.timestamp).toLocaleString()}\n`);
      
      // 显示汇总
      const { summary } = report;
      console.log('📈 汇总统计:');
      console.log(`  ✅ 通过: ${summary.passed}`);
      console.log(`  ❌ 失败: ${summary.failed}`);
      console.log(`  ⚠️  错误: ${summary.errors}`);
      console.log(`  📝 总数: ${summary.total}\n`);
      
      // 显示每个测试的结果
      console.log('📋 测试详情:');
      report.results.forEach((result, index) => {
        const icon = result.status === 'PASS' ? '✅' : 
                     result.status === 'FAIL' ? '❌' : '⚠️';
        const duration = (result.duration / 1000).toFixed(2);
        
        console.log(`  ${icon} [${index + 1}] ${result.name}`);
        console.log(`      状态: ${result.status} | 耗时: ${duration}s`);
        
        if (result.error) {
          console.log(`      错误: ${result.error}`);
        }
      });
      
      console.log('\n---');
      console.log('按 Ctrl+C 退出监控');
    }
  } catch (error) {
    console.error('❌ 读取报告失败:', error.message);
  }
}

// 每 2 秒检查一次
setInterval(checkReport, 2000);
checkReport(); // 立即执行一次

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 监控已停止');
  process.exit(0);
});
