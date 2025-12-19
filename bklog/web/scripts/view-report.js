#!/usr/bin/env node

/**
 * 查看最新的测试报告
 */

const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log();
  log('='.repeat(60), 'blue');
  log(`  ${title}`, 'blue');
  log('='.repeat(60), 'blue');
  console.log();
}

function main() {
  const reportsDir = path.join(process.cwd(), '.mcp', 'reports');

  if (!fs.existsSync(reportsDir)) {
    log('未找到测试报告目录', 'red');
    return;
  }

  const reportFiles = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('test-report-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (reportFiles.length === 0) {
    log('未找到测试报告', 'yellow');
    return;
  }

  const latestReport = path.join(reportsDir, reportFiles[0]);
  const report = JSON.parse(fs.readFileSync(latestReport, 'utf8'));

  header('最新测试报告');

  log(`📅 时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}`, 'blue');
  log(`📁 文件: ${path.relative(process.cwd(), latestReport)}`, 'blue');
  console.log();

  // 汇总
  log('📊 结果汇总:', 'bold');
  const { summary } = report;
  log(`   ✅ 成功: ${summary.passed}`, 'green');
  log(`   ❌ 失败: ${summary.failed}`, 'red');
  log(`   ⚠️  错误: ${summary.errors}`, 'yellow');
  log(`   📈 总计: ${summary.total}`, 'blue');
  console.log();

  // 详细结果
  if (report.results && report.results.length > 0) {
    log('📋 详细结果:', 'bold');
    console.log();

    report.results.forEach((result, index) => {
      const icon = result.status === 'success' ? '✅' : '❌';
      const color = result.status === 'success' ? 'green' : 'red';

      log(`${index + 1}. ${icon} ${result.task}`, color);
      log(`   Intent: ${result.intent}`, 'reset');
      log(`   Status: ${result.status}`, color);
      log(`   Duration: ${result.duration}ms`, 'reset');

      if (result.reason) {
        log(`   Reason: ${result.reason}`, 'yellow');
      }

      if (result.error) {
        log(`   Error: ${result.error}`, 'red');
      }

      console.log();
    });
  }

  // 成功率
  const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
  const rateColor = successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red';
  log(`📈 成功率: ${successRate}%`, rateColor);

  // 快速链接
  console.log();
  log('🔗 快速操作:', 'bold');
  log(`   查看报告: cat ${path.relative(process.cwd(), latestReport)}`);
  log(`   查看 Rules: cat .codebuddy/rules.json`);
  log(`   查看 Memory: cat .codebuddy/memory.json`);
  log(`   重新运行: npm run test:run`);
  console.log();

  // 历史报告
  if (reportFiles.length > 1) {
    log(`📚 历史报告 (共 ${reportFiles.length} 份):`, 'blue');
    reportFiles.slice(0, 5).forEach((file, index) => {
      const timestamp = file.replace('test-report-', '').replace('.json', '');
      const date = new Date(timestamp.replace(/-/g, ':').replace('T', ' ').replace('Z', ''));
      log(`   ${index + 1}. ${date.toLocaleString('zh-CN')} - ${file}`);
    });

    if (reportFiles.length > 5) {
      log(`   ... 还有 ${reportFiles.length - 5} 份历史报告`);
    }
    console.log();
  }
}

main();
