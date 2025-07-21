// ====================
// scripts/regression-analyze.js
// ====================

const { AutomatedRegressionTestSystem } = require('../regression-system/vue_regression_system');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class RegressionAnalyzer {
  constructor() {
    this.config = this.loadConfig();
    this.system = null;
    this.startTime = null;
  }

  // 加载配置文件
  loadConfig() {
    try {
      const configPath = path.resolve('./regression.config.js');
      if (fs.existsSync(configPath)) {
        return require(configPath);
      } else {
        console.warn('⚠️ 未找到配置文件，使用默认配置');
        return this.getDefaultConfig();
      }
    } catch (error) {
      console.error('❌ 配置文件加载失败:', error.message);
      return this.getDefaultConfig();
    }
  }

  // 默认配置
  getDefaultConfig() {
    return {
      project: {
        name: "Vue Project",
        url: "http://appdev.woa.com:8001/",
      },
      test: {
        outputPath: "./regression-data/reports",
      }
    };
  }

  // 解析命令行参数
  parseArguments() {
    const args = process.argv.slice(2);
    
    return {
      commitHash: this.getArgValue(args, '--commit'),
      analysisType: this.getAnalysisType(args),
      outputFormat: this.getArgValue(args, '--format') || 'html',
      verbose: args.includes('--verbose') || args.includes('-v'),
      silent: args.includes('--silent') || args.includes('-s'),
      dryRun: args.includes('--dry-run'),
      profile: args.includes('--profile'),
      exclude: this.getArrayArg(args, '--exclude'),
      include: this.getArrayArg(args, '--include'),
      maxRisk: this.getArgValue(args, '--max-risk') || 'high',
      outputDir: this.getArgValue(args, '--output'),
      help: args.includes('--help') || args.includes('-h')
    };
  }

  // 获取参数值
  getArgValue(args, flag) {
    const index = args.indexOf(flag);
    return index !== -1 && args[index + 1] ? args[index + 1] : null;
  }

  // 获取数组参数
  getArrayArg(args, flag) {
    const values = [];
    let index = args.indexOf(flag);
    
    while (index !== -1) {
      if (args[index + 1] && !args[index + 1].startsWith('--')) {
        values.push(args[index + 1]);
      }
      index = args.indexOf(flag, index + 1);
    }
    
    return values;
  }

  // 获取分析类型
  getAnalysisType(args) {
    if (args.includes('--staged')) return 'STAGED';
    if (args.includes('--working')) return 'WORKING';
    if (args.includes('--current')) return 'CURRENT';
    return null; // 默认分析
  }

  // 主分析方法
  async analyze() {
    const options = this.parseArguments();
    
    if (options.help) {
      this.showHelp();
      return;
    }

    this.startTime = performance.now();
    
    try {
      this.system = new AutomatedRegressionTestSystem();
      
      // 设置日志级别
      if (options.silent) {
        console.log = () => {};
      }

      console.log('🔍 开始分析代码变更影响...');
      
      if (options.verbose) {
        console.log('📋 分析参数:', JSON.stringify(options, null, 2));
      }

      // 预检查
      if (options.dryRun) {
        return await this.dryRunAnalysis(options);
      }

      // 1. 初始化系统
      console.log('🚀 正在初始化分析系统...');
      const mockData = await this.initializeSystem(options);
      console.log('✅ 系统初始化完成');

      // 2. 快速预检
      const preview = await this.quickPreview(options);
      console.log(`📊 预览: 将分析 ${preview.validFiles} 个文件，排除 ${preview.excludedFiles} 个文件`);

      if (preview.validFiles === 0) {
        console.log('ℹ️ 没有需要分析的文件，分析结束');
        return;
      }

      // 3. 执行分析
      const report = await this.performAnalysis(options, mockData);

      // 4. 处理结果
      await this.processResults(report, options);

      // 5. 性能统计
      if (options.profile) {
        this.showPerformanceStats();
      }

    } catch (error) {
      console.error('❌ 分析失败:', error.message);
      if (options.verbose) {
        console.error('错误详情:', error.stack);
      }
      process.exit(1);
    }
  }

  // 初始化系统
  async initializeSystem(options) {
    const projectUrl = this.config.project?.url || 'http://localhost:8080';
    
    try {
      // 检查是否需要完整初始化
      if (options.analysisType === 'quick' || options.dryRun) {
        return {}; // 快速模式不需要 Mock 数据
      }
      
      const mockData = await this.system.initialize(projectUrl);
      return mockData;
    } catch (error) {
      console.warn('⚠️ 完整初始化失败，使用简化模式:', error.message);
      return {};
    }
  }

  // 快速预览
  async quickPreview(options) {
    const changedFiles = await this.getChangedFiles(options);
    return this.system.impactAnalyzer.previewAnalysis(changedFiles);
  }

  // 获取变更文件
  async getChangedFiles(options) {
    if (options.commitHash) {
      return await this.system.impactAnalyzer.getChangedFiles(options.commitHash);
    } else if (options.analysisType) {
      return await this.system.impactAnalyzer.getChangedFiles(options.analysisType);
    } else {
      return await this.system.impactAnalyzer.getChangedFiles('WORKING');
    }
  }

  // 干运行分析
  async dryRunAnalysis(options) {
    console.log('🔍 干运行模式 - 预览分析结果...');
    
    const changedFiles = await this.getChangedFiles(options);
    const preview = this.system.impactAnalyzer.previewAnalysis(changedFiles);
    
    console.log('\n📊 预览结果:');
    console.log(`总文件数: ${preview.totalFiles}`);
    console.log(`有效文件: ${preview.validFiles}`);
    console.log(`排除文件: ${preview.excludedFiles}`);
    console.log(`预估风险: ${preview.estimatedRisk}`);
    
    if (preview.excludedList.length > 0 && options.verbose) {
      console.log('\n🚫 排除的文件:');
      preview.excludedList.forEach(file => console.log(`  - ${file}`));
    }
    
    console.log('\n💡 提示: 移除 --dry-run 参数执行实际分析');
  }

  // 执行分析
  async performAnalysis(options, mockData) {
    let report;
    
    if (options.commitHash) {
      console.log(`📋 分析指定提交: ${options.commitHash}`);
      report = await this.system.analyzeCommit(options.commitHash, mockData);
    } else if (options.analysisType === 'STAGED') {
      console.log('📋 分析已 staged 的修改...');
      report = await this.system.analyzeStagedChanges(mockData);
    } else if (options.analysisType === 'WORKING') {
      console.log('📋 分析工作目录的所有修改...');
      report = await this.system.analyzeWorkingChanges(mockData);
    } else {
      console.log('📋 分析当前所有变更（默认）...');
      // 使用优化后的快速分析
      const quickResult = await this.system.impactAnalyzer.quickAnalyzeCurrentChanges();
      if (!quickResult.hasChanges) {
        console.log('ℹ️ 没有检测到变更或所有变更都被排除');
        return { summary: { riskLevel: 'none', message: quickResult.message } };
      }
      report = await this.system.analyzeCommit(undefined, mockData);
    }

    return report;
  }

  // 处理分析结果
  async processResults(report, options) {
    // 生成报告
    await this.generateReports(report, options);
    
    // 显示结果摘要
    this.displaySummary(report, options);
    
    // 风险检查
    await this.performRiskCheck(report, options);
    
    // 输出统计信息
    if (options.verbose) {
      this.displayDetailedStats(report);
    }
  }

  // 生成报告
  async generateReports(report, options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = options.outputDir || 
                     path.join(this.config.test?.outputPath || './regression-data/reports', `report-${timestamp}`);

    fs.mkdirSync(outputDir, { recursive: true });
    
    // 保存JSON报告
    const jsonPath = path.join(outputDir, 'analysis.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // 根据格式生成报告
    if (options.outputFormat === 'html' || options.outputFormat === 'all') {
      const htmlPath = path.join(outputDir, 'report.html');
      fs.writeFileSync(htmlPath, report.html || this.generateSimpleHtml(report));
      console.log(`📄 HTML报告: ${htmlPath}`);
    }
    
    if (options.outputFormat === 'md' || options.outputFormat === 'all') {
      const mdPath = path.join(outputDir, 'report.md');
      fs.writeFileSync(mdPath, this.generateMarkdown(report));
      console.log(`📄 Markdown报告: ${mdPath}`);
    }
    
    console.log(`📄 JSON报告: ${jsonPath}`);
  }

  // 显示结果摘要
  displaySummary(report, options) {
    const summary = report.summary;
    
    console.log('\n📊 分析结果摘要:');
    console.log(`🎯 风险等级: ${this.formatRiskLevel(summary.riskLevel)}`);
    
    if (summary.overview) {
      console.log(`📋 概述: ${summary.overview}`);
    }
    
    if (summary.keyFindings && summary.keyFindings.length > 0) {
      console.log('🔍 关键发现:');
      summary.keyFindings.forEach(finding => {
        console.log(`  • ${finding}`);
      });
    }
    
    if (summary.recommendations && summary.recommendations.length > 0) {
      console.log('💡 建议:');
      summary.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  }

  // 格式化风险等级
  formatRiskLevel(level) {
    const levels = {
      none: '✨ 无风险',
      low: '🟢 低风险',
      medium: '🟡 中等风险',
      high: '🔴 高风险',
      critical: '🚨 关键风险'
    };
    return levels[level] || level;
  }

  // 风险检查
  async performRiskCheck(report, options) {
    const riskLevel = report.summary.riskLevel;
    const maxRisk = options.maxRisk;
    
    const riskLevels = ['none', 'low', 'medium', 'high', 'critical'];
    const currentRiskIndex = riskLevels.indexOf(riskLevel);
    const maxRiskIndex = riskLevels.indexOf(maxRisk);
    
    if (currentRiskIndex > maxRiskIndex) {
      console.log(`\n🚨 风险等级 ${riskLevel} 超过了允许的最大风险 ${maxRisk}！`);
      
      if (process.env.CI === 'true') {
        console.log('❌ CI环境中检测到超限风险，构建失败');
        process.exit(1);
      } else {
        console.log('⚠️ 建议在提交前进行充分测试');
      }
    } else if (riskLevel === 'high' || riskLevel === 'critical') {
      console.log(`\n⚠️ 检测到${riskLevel === 'critical' ? '关键' : '高'}风险变更！`);
      console.log('建议进行全面测试后再提交');
    } else if (riskLevel === 'medium') {
      console.log('\n⚡ 检测到中等风险变更，请确保已充分测试相关功能');
    } else if (riskLevel === 'low') {
      console.log('\n✅ 风险等级较低，可以安全提交');
    } else {
      console.log('\n✨ 无风险：所有变更都在排除范围内');
    }
  }

  // 显示详细统计
  displayDetailedStats(report) {
    if (this.system && this.system.impactAnalyzer) {
      const stats = this.system.impactAnalyzer.getAnalysisStats();
      
      console.log('\n📈 详细统计:');
      console.log(`依赖图大小: ${stats.dependencyGraphSize}`);
      console.log(`函数调用图: ${stats.functionCallGraphSize}`);
      console.log(`模块注册表: ${stats.moduleRegistrySize}`);
      console.log(`缓存条目: ${stats.cacheSize}`);
      
      if (stats.lastAnalysisTime) {
        const lastAnalysis = new Date(stats.lastAnalysisTime);
        console.log(`上次分析: ${lastAnalysis.toLocaleString()}`);
      }
    }
  }

  // 性能统计
  showPerformanceStats() {
    if (this.startTime) {
      const endTime = performance.now();
      const duration = Math.round(endTime - this.startTime);
      
      console.log('\n⚡ 性能统计:');
      console.log(`总耗时: ${duration}ms`);
      console.log(`内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    }
  }

  // 生成简单HTML
  generateSimpleHtml(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>回归测试分析报告</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .risk-none { color: #28a745; }
        .risk-low { color: #28a745; }
        .risk-medium { color: #ffc107; }
        .risk-high { color: #dc3545; }
        .risk-critical { color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .finding { margin: 10px 0; padding: 10px; background: #fff; border-left: 4px solid #007bff; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>回归测试分析报告</h1>
    <div class="summary">
        <h2>概要信息</h2>
        <p><strong>风险等级:</strong> <span class="risk-${report.summary.riskLevel}">${report.summary.riskLevel}</span></p>
        <p><strong>分析时间:</strong> ${new Date().toLocaleString()}</p>
        ${report.summary.overview ? `<p><strong>概述:</strong> ${report.summary.overview}</p>` : ''}
    </div>
    
    ${report.summary.keyFindings && report.summary.keyFindings.length > 0 ? `
    <h2>关键发现</h2>
    ${report.summary.keyFindings.map(finding => `<div class="finding">${finding}</div>`).join('')}
    ` : ''}
    
    ${report.summary.recommendations && report.summary.recommendations.length > 0 ? `
    <h2>建议</h2>
    <ul>
        ${report.summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
    ` : ''}
    
    <h2>详细数据</h2>
    <pre>${JSON.stringify(report, null, 2)}</pre>
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
        <p>由 Vue 回归测试系统生成 • ${new Date().toLocaleString()}</p>
    </footer>
</body>
</html>`;
  }

  // 生成Markdown报告
  generateMarkdown(report) {
    const riskEmojis = {
      none: '✨',
      low: '🟢',
      medium: '🟡',
      high: '🔴',
      critical: '🚨'
    };

    return `# 回归测试分析报告

## 概要信息

- **风险等级**: ${riskEmojis[report.summary.riskLevel] || ''} ${report.summary.riskLevel}
- **分析时间**: ${new Date().toLocaleString()}
${report.summary.overview ? `- **概述**: ${report.summary.overview}` : ''}

${report.summary.keyFindings && report.summary.keyFindings.length > 0 ? `
## 关键发现

${report.summary.keyFindings.map(finding => `- ${finding}`).join('\n')}
` : ''}

${report.summary.recommendations && report.summary.recommendations.length > 0 ? `
## 建议

${report.summary.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

## 详细数据

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`

---
*由 Vue 回归测试系统生成 • ${new Date().toLocaleString()}*
`;
  }

  // 显示帮助信息
  showHelp() {
    console.log(`
🔍 Vue 回归测试分析工具 v2.0

用法:
  node regression-analyze.js [选项]

分析选项:
  --staged              只分析已 staged 的修改
  --working             分析工作目录所有修改（包括 staged 和未 staged）
  --current             分析当前所有变更（默认）
  --commit <hash>       分析指定提交的变更

输出选项:
  --format <format>     输出格式: html, md, json, all（默认: html）
  --output <dir>        指定输出目录
  --verbose, -v         显示详细信息
  --silent, -s          静默模式
  --profile             显示性能统计

过滤选项:
  --exclude <pattern>   排除文件模式（可多次使用）
  --include <pattern>   包含文件模式（可多次使用）
  --max-risk <level>    最大允许风险等级（none, low, medium, high, critical）

调试选项:
  --dry-run             预览模式，不执行实际分析
  --help, -h            显示此帮助信息

示例:
  node regression-analyze.js                                    # 分析当前所有变更
  node regression-analyze.js --staged                          # 只分析已 staged 的修改
  node regression-analyze.js --working --verbose               # 分析工作目录所有修改，显示详细信息
  node regression-analyze.js --commit HEAD~1 --format all     # 分析指定提交，输出所有格式
  node regression-analyze.js --dry-run                         # 预览分析结果
  node regression-analyze.js --max-risk medium                 # 设置最大风险等级

环境变量:
  CI=true               在CI环境中，超限风险会导致构建失败
`);
  }
}

// 主入口
if (require.main === module) {
  const analyzer = new RegressionAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = RegressionAnalyzer;
