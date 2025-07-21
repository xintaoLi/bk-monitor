// ====================
// scripts/regression-watch.js
// ====================

const { AutomatedRegressionTestSystem } = require('../regression-system/vue_regression_system');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

class RegressionWatcher {
  constructor() {
    this.config = this.loadConfig();
    this.system = null;
    this.watcher = null;
    this.analyzing = false;
    this.pendingFiles = new Set();
    this.debounceTimer = null;
    this.stats = {
      totalChanges: 0,
      analyzedChanges: 0,
      highRiskChanges: 0,
      startTime: Date.now()
    };
  }

  // 加载配置
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
      scan: {
        componentPaths: ['src/**/*.vue', 'src/**/*.js', 'src/**/*.ts'],
        excludePaths: ['node_modules', 'dist', '.git', '**/regression-data/**', '**/bklog/web/scripts/**'],
        utilityPaths: ['src/**/*.js', 'src/**/*.ts']
      }
    };
  }

  // 解析命令行参数
  parseArguments() {
    const args = process.argv.slice(2);
    
    return {
      autoAnalyze: args.includes('--auto-analyze') || args.includes('-a'),
      verbose: args.includes('--verbose') || args.includes('-v'),
      silent: args.includes('--silent') || args.includes('-s'),
      debounceMs: this.getArgValue(args, '--debounce') || 1000,
      batchSize: this.getArgValue(args, '--batch-size') || 5,
      reportOnExit: args.includes('--report-on-exit'),
      ignoreInitial: args.includes('--ignore-initial'),
      help: args.includes('--help') || args.includes('-h')
    };
  }

  // 获取参数值
  getArgValue(args, flag) {
    const index = args.indexOf(flag);
    return index !== -1 && args[index + 1] ? parseInt(args[index + 1]) || args[index + 1] : null;
  }

  // 主监控方法
  async startWatching() {
    const options = this.parseArguments();
    
    if (options.help) {
      this.showHelp();
      return;
    }

    try {
      console.log('👁️ 启动回归测试监控...');
      
      // 初始化系统
      this.system = new AutomatedRegressionTestSystem();
      
      // 设置日志级别
      if (options.silent) {
        console.log = () => {};
      }

      if (options.verbose) {
        console.log('📋 监控参数:', JSON.stringify(options, null, 2));
        console.log('📋 扫描路径:', this.config.scan.componentPaths);
        console.log('📋 排除路径:', this.config.scan.excludePaths);
      }

      // 启动文件监控
      this.initializeWatcher(options);

      // 设置信号处理
      this.setupSignalHandlers(options);

      // 显示状态
      this.displayStatus(options);

      // 定期显示统计信息
      if (options.verbose) {
        setInterval(() => this.displayStats(), 30000);
      }

    } catch (error) {
      console.error('❌ 监控启动失败:', error.message);
      process.exit(1);
    }
  }

  // 初始化文件监控器
  initializeWatcher(options) {
    const watchPaths = [
      ...this.config.scan.componentPaths,
      ...this.config.scan.utilityPaths
    ];

    this.watcher = chokidar.watch(watchPaths, {
      ignored: this.config.scan.excludePaths.concat([
        '**/.git/**',
        '**/node_modules/**',
        '**/regression-data/**',
        '**/bklog/web/scripts/**',
        '**/dist/**',
        '**/build/**'
      ]),
      persistent: true,
      ignoreInitial: options.ignoreInitial,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      }
    });

    // 监听各种文件事件
    this.watcher.on('change', (filePath) => this.handleFileChange(filePath, 'change', options));
    this.watcher.on('add', (filePath) => this.handleFileChange(filePath, 'add', options));
    this.watcher.on('unlink', (filePath) => this.handleFileChange(filePath, 'delete', options));
    
    this.watcher.on('ready', () => {
      console.log('✅ 文件监控已启动');
      this.displayWatchedFiles(options);
    });

    this.watcher.on('error', (error) => {
      console.error('❌ 文件监控错误:', error.message);
    });
  }

  // 处理文件变更
  async handleFileChange(filePath, eventType, options) {
    this.stats.totalChanges++;
    
    if (!options.silent) {
      const emoji = this.getEventEmoji(eventType);
      console.log(`\n${emoji} 检测到文件${eventType === 'change' ? '变更' : eventType === 'add' ? '新增' : '删除'}: ${filePath}`);
    }

    // 添加到待处理队列
    this.pendingFiles.add({ filePath, eventType, timestamp: Date.now() });

    // 使用防抖机制
    this.debounceAnalysis(options);
  }

  // 防抖分析
  debounceAnalysis(options) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.processPendingChanges(options);
    }, options.debounceMs);
  }

  // 处理待处理的变更
  async processPendingChanges(options) {
    if (this.analyzing || this.pendingFiles.size === 0) {
      return;
    }

    const pendingChanges = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    if (options.verbose) {
      console.log(`\n🔍 处理 ${pendingChanges.length} 个待分析的文件变更...`);
    }

    this.analyzing = true;

    try {
      // 批量分析
      const batches = this.createBatches(pendingChanges, options.batchSize);
      
      for (const batch of batches) {
        await this.analyzeBatch(batch, options);
      }

    } catch (error) {
      console.error('❌ 批量分析失败:', error.message);
    } finally {
      this.analyzing = false;
    }
  }

  // 创建批次
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // 分析批次
  async analyzeBatch(batch, options) {
    const startTime = performance.now();
    
    try {
      // 获取唯一的文件路径
      const uniqueFiles = [...new Set(batch.map(item => item.filePath))];
      
      if (options.verbose) {
        console.log(`📊 分析批次: ${uniqueFiles.length} 个文件`);
      }

      // 并行分析文件影响
      const analysisPromises = uniqueFiles.map(async (filePath) => {
        try {
          const fileImpact = await this.system.impactAnalyzer.checkFileImpact(filePath);
          return { filePath, impact: fileImpact };
        } catch (error) {
          console.warn(`⚠️ 分析文件 ${filePath} 失败:`, error.message);
          return { filePath, impact: null };
        }
      });

      const results = await Promise.all(analysisPromises);
      
      // 处理分析结果
      await this.processAnalysisResults(results, options);

      const endTime = performance.now();
      this.stats.analyzedChanges += uniqueFiles.length;

      if (options.verbose) {
        console.log(`✅ 批次分析完成，耗时: ${Math.round(endTime - startTime)}ms`);
      }

    } catch (error) {
      console.error('❌ 批次分析失败:', error.message);
    }
  }

  // 处理分析结果
  async processAnalysisResults(results, options) {
    for (const result of results) {
      if (!result.impact) continue;

      const { filePath, impact } = result;

      if (impact.excluded) {
        if (options.verbose) {
          console.log(`🚫 文件已排除: ${filePath} (${impact.reason})`);
        }
        continue;
      }

      // 显示影响信息
      if (impact.impact && impact.impact.affectedComponents) {
        const componentCount = impact.impact.affectedComponents.length;
        if (componentCount > 0) {
          console.log(`⚠️ 影响组件: ${componentCount} 个`);
          
          if (options.verbose) {
            impact.impact.affectedComponents.forEach(comp => {
              console.log(`   • ${comp.component || comp}`);
            });
          }
        }
      }

      // 检查风险等级
      if (impact.riskLevel === 'high' || impact.riskLevel === 'critical') {
        this.stats.highRiskChanges++;
        console.log(`🚨 检测到${impact.riskLevel === 'critical' ? '关键' : '高'}风险变更: ${filePath}`);
        
        // 如果启用了自动分析，运行完整分析
        if (options.autoAnalyze) {
          console.log('🔍 启动完整影响分析...');
          await this.runFullAnalysis(options);
        }
      }
    }
  }

  // 运行完整分析
  async runFullAnalysis(options) {
    try {
      const quickResult = await this.system.impactAnalyzer.quickAnalyzeCurrentChanges();
      
      if (quickResult.hasChanges) {
        console.log('📋 快速分析结果:');
        console.log(`  风险等级: ${quickResult.riskLevel}`);
        console.log(`  变更文件: ${quickResult.changedFilesCount} 个`);
        console.log(`  排除文件: ${quickResult.excludedFilesCount} 个`);
        
        if (quickResult.summary && quickResult.summary.recommendations) {
          console.log('💡 建议:');
          quickResult.summary.recommendations.forEach(rec => {
            console.log(`  • ${rec}`);
          });
        }
      }
    } catch (error) {
      console.error('❌ 完整分析失败:', error.message);
    }
  }

  // 获取事件图标
  getEventEmoji(eventType) {
    const emojis = {
      change: '📝',
      add: '➕',
      delete: '➖'
    };
    return emojis[eventType] || '📁';
  }

  // 显示监控的文件
  displayWatchedFiles(options) {
    if (options.verbose) {
      const watchedPaths = this.watcher.getWatched();
      const fileCount = Object.values(watchedPaths).reduce((sum, files) => sum + files.length, 0);
      console.log(`👀 正在监控 ${fileCount} 个文件`);
    }
  }

  // 显示状态
  displayStatus(options) {
    console.log('\n📊 监控状态:');
    console.log(`✅ 监控已启动`);
    
    if (options.autoAnalyze) {
      console.log('🤖 自动完整分析: 已启用');
    }
    
    console.log(`⏱️ 防抖延迟: ${options.debounceMs}ms`);
    console.log(`📦 批处理大小: ${options.batchSize}`);
    console.log('\n💡 提示:');
    console.log('  • 按 Ctrl+C 停止监控');
    console.log('  • 按 s 显示统计信息');
    console.log('  • 按 h 显示帮助');
    
    // 设置交互式命令
    this.setupInteractiveCommands(options);
  }

  // 设置交互式命令
  setupInteractiveCommands(options) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      switch (key) {
        case 's':
          this.displayStats();
          break;
        case 'h':
          this.displayInteractiveHelp();
          break;
        case 'c':
          this.clearStats();
          break;
        case 'a':
          if (!this.analyzing) {
            console.log('\n🔍 手动触发完整分析...');
            this.runFullAnalysis(options);
          } else {
            console.log('\n⚠️ 分析正在进行中，请稍后再试');
          }
          break;
        case '\u0003': // Ctrl+C
          this.gracefulShutdown(options);
          break;
      }
    });
  }

  // 显示交互式帮助
  displayInteractiveHelp() {
    console.log('\n🔧 交互式命令:');
    console.log('  s - 显示统计信息');
    console.log('  c - 清除统计信息');
    console.log('  a - 手动触发完整分析');
    console.log('  h - 显示此帮助');
    console.log('  Ctrl+C - 退出监控');
  }

  // 显示统计信息
  displayStats() {
    const uptime = Math.round((Date.now() - this.stats.startTime) / 1000);
    
    console.log('\n📈 监控统计:');
    console.log(`⏱️ 运行时间: ${this.formatUptime(uptime)}`);
    console.log(`📁 文件变更: ${this.stats.totalChanges} 次`);
    console.log(`🔍 已分析: ${this.stats.analyzedChanges} 个文件`);
    console.log(`🚨 高风险变更: ${this.stats.highRiskChanges} 次`);
    console.log(`📊 待处理队列: ${this.pendingFiles.size} 个文件`);
    console.log(`🔄 分析状态: ${this.analyzing ? '进行中' : '空闲'}`);
    
    // 显示系统统计
    if (this.system && this.system.impactAnalyzer) {
      const systemStats = this.system.impactAnalyzer.getAnalysisStats();
      console.log(`💾 缓存条目: ${systemStats.cacheSize}`);
      console.log(`🏗️ 依赖图: ${systemStats.dependencyGraphSize} 个文件`);
    }
  }

  // 格式化运行时间
  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // 清除统计信息
  clearStats() {
    this.stats = {
      totalChanges: 0,
      analyzedChanges: 0,
      highRiskChanges: 0,
      startTime: Date.now()
    };
    console.log('\n🗑️ 统计信息已清除');
  }

  // 设置信号处理
  setupSignalHandlers(options) {
    process.on('SIGINT', () => this.gracefulShutdown(options));
    process.on('SIGTERM', () => this.gracefulShutdown(options));
    
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('\n❌ 未捕获异常:', error.message);
      this.gracefulShutdown(options);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('\n❌ 未处理的Promise拒绝:', reason);
    });
  }

  // 优雅关闭
  async gracefulShutdown(options) {
    console.log('\n👋 正在停止监控...');
    
    // 显示最终统计
    if (options.reportOnExit) {
      this.displayStats();
    }
    
    // 关闭监控器
    if (this.watcher) {
      await this.watcher.close();
      console.log('✅ 文件监控已停止');
    }
    
    // 清理定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    console.log('👍 监控已安全退出');
    process.exit(0);
  }

  // 显示帮助信息
  showHelp() {
    console.log(`
👁️ Vue 回归测试监控工具 v2.0

用法:
  node regression-watch.js [选项]

基本选项:
  --auto-analyze, -a    检测到高风险变更时自动运行完整分析
  --verbose, -v         显示详细信息
  --silent, -s          静默模式
  --help, -h            显示此帮助信息

高级选项:
  --debounce <ms>       防抖延迟（默认: 1000ms）
  --batch-size <n>      批处理大小（默认: 5）
  --ignore-initial      忽略初始扫描的文件
  --report-on-exit      退出时显示统计报告

交互式命令（运行时可用）:
  s                     显示统计信息
  c                     清除统计信息
  a                     手动触发完整分析
  h                     显示交互式帮助
  Ctrl+C                退出监控

示例:
  node regression-watch.js                          # 基本监控
  node regression-watch.js --auto-analyze --verbose # 自动分析模式，显示详细信息
  node regression-watch.js --debounce 2000          # 设置2秒防抖延迟
  node regression-watch.js --batch-size 10          # 设置批处理大小为10

功能特性:
  ✅ 智能文件监控，自动排除无关文件
  ✅ 防抖机制，避免频繁触发分析
  ✅ 批量处理，提高分析效率
  ✅ 实时风险评估和提醒
  ✅ 交互式命令，方便调试
  ✅ 详细统计信息，监控性能
`);
  }
}

// 主入口
if (require.main === module) {
  const watcher = new RegressionWatcher();
  watcher.startWatching().catch(error => {
    console.error('监控程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = RegressionWatcher;
