// ====================
// scripts/regression-record.js
// ====================

const { AutomatedRegressionTestSystem } = require('../regression-system/vue_regression_system');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

class MockDataRecorder {
  constructor() {
    this.config = this.loadConfig();
    this.system = null;
    this.serverProcess = null;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      uniqueEndpoints: new Set(),
      startTime: null
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
      project: {
        name: "Vue Project",
        url: "http://localhost:8080",
        serveCommand: "npm run serve"
      },
      mock: {
        outputPath: "./regression-data/mock",
        apiTimeout: 30000,
        routes: ["/", "/dashboard"]
      }
    };
  }

  // 解析命令行参数
  parseArguments() {
    const args = process.argv.slice(2);
    
    return {
      autoStart: args.includes('--auto-start') || args.includes('-a'),
      verbose: args.includes('--verbose') || args.includes('-v'),
      silent: args.includes('--silent') || args.includes('-s'),
      skipServer: args.includes('--skip-server'),
      timeout: this.getArgValue(args, '--timeout') || 60000,
      routes: this.getArrayArg(args, '--route') || this.config.mock?.routes || ['/'],
      outputDir: this.getArgValue(args, '--output') || this.config.mock?.outputPath || './regression-data/mock',
      serverUrl: this.getArgValue(args, '--url') || this.config.project?.url || 'http://localhost:8080',
      concurrency: this.getArgValue(args, '--concurrency') || 1,
      delay: this.getArgValue(args, '--delay') || 1000,
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
    
    return values.length > 0 ? values : null;
  }

  // 主录制方法
  async startRecording() {
    const options = this.parseArguments();
    
    if (options.help) {
      this.showHelp();
      return;
    }

    this.stats.startTime = performance.now();

    try {
      console.log('📹 开始录制Mock数据...');
      
      // 设置日志级别
      if (options.silent) {
        console.log = () => {};
      }

      if (options.verbose) {
        console.log('📋 录制参数:', JSON.stringify(options, null, 2));
      }

      // 初始化系统
      this.system = new AutomatedRegressionTestSystem();

      // 1. 启动开发服务器（如果需要）
      if (!options.skipServer) {
        await this.startDevServer(options);
      }

      // 2. 等待服务器启动
      await this.waitForServer(options.serverUrl, options.timeout);

      // 3. 创建输出目录
      this.ensureOutputDirectory(options.outputDir);

      // 4. 录制Mock数据
      const mockData = await this.recordMockData(options);

      // 5. 保存和处理数据
      await this.saveMockData(mockData, options);

      // 6. 显示统计信息
      this.displayRecordingStats(options);

      // 7. 清理资源
      await this.cleanup();

      console.log('✅ Mock数据录制完成！');

    } catch (error) {
      console.error('❌ Mock数据录制失败:', error.message);
      if (options.verbose) {
        console.error('错误详情:', error.stack);
      }
      await this.cleanup();
      process.exit(1);
    }
  }

  // 启动开发服务器
  async startDevServer(options) {
    if (options.autoStart) {
      console.log('🚀 启动开发服务器...');
      
      const command = this.config.project?.serveCommand || 'npm run serve';
      const [cmd, ...cmdArgs] = command.split(' ');
      
      this.serverProcess = spawn(cmd, cmdArgs, {
        stdio: options.verbose ? 'inherit' : 'pipe',
        detached: true,
        shell: true
      });

      this.serverProcess.on('error', (error) => {
        console.error('❌ 服务器启动失败:', error.message);
        throw error;
      });

      // 给服务器一些启动时间
      console.log('⏳ 等待服务器启动...');
      await this.sleep(5000);
    } else {
      console.log('📝 请确保开发服务器已在 ' + options.serverUrl + ' 运行');
      console.log('💡 提示: 使用 --auto-start 参数可以自动启动服务器');
    }
  }

  // 等待服务器启动
  async waitForServer(url, timeout = 60000) {
    console.log(`🔍 检查服务器连接: ${url}`);
    
    const start = Date.now();
    
    return new Promise((resolve, reject) => {
      const check = () => {
        const req = http.get(url, (res) => {
          console.log('✅ 服务器连接成功');
          resolve();
        });

        req.on('error', () => {
          if (Date.now() - start > timeout) {
            reject(new Error(`服务器连接超时 (${timeout}ms)`));
          } else {
            setTimeout(check, 1000);
          }
        });

        req.setTimeout(5000, () => {
          req.destroy();
        });
      };

      check();
    });
  }

  // 确保输出目录存在
  ensureOutputDirectory(outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 创建输出目录: ${outputDir}`);
    }
  }

  // 录制Mock数据
  async recordMockData(options) {
    console.log('🎬 开始录制API数据...');
    console.log(`📍 目标路由: ${options.routes.join(', ')}`);

    let allMockData = {};

    if (options.concurrency > 1) {
      // 并行录制
      allMockData = await this.recordParallel(options);
    } else {
      // 串行录制
      allMockData = await this.recordSequential(options);
    }

    return allMockData;
  }

  // 串行录制
  async recordSequential(options) {
    let allMockData = {};

    for (let i = 0; i < options.routes.length; i++) {
      const route = options.routes[i];
      
      console.log(`\n📄 录制路由 ${i + 1}/${options.routes.length}: ${route}`);
      
      try {
        const routeMockData = await this.recordSingleRoute(route, options);
        allMockData = { ...allMockData, ...routeMockData };
        
        console.log(`✅ 路由 ${route} 录制完成，获得 ${Object.keys(routeMockData).length} 个API`);
        
        // 添加延迟
        if (i < options.routes.length - 1 && options.delay > 0) {
          console.log(`⏳ 等待 ${options.delay}ms...`);
          await this.sleep(options.delay);
        }
        
      } catch (error) {
        console.warn(`⚠️ 路由 ${route} 录制失败:`, error.message);
        continue;
      }
    }

    return allMockData;
  }

  // 并行录制
  async recordParallel(options) {
    console.log(`🚀 使用 ${options.concurrency} 个并发进程录制...`);
    
    const chunks = this.chunkArray(options.routes, options.concurrency);
    let allMockData = {};

    for (const chunk of chunks) {
      const promises = chunk.map(route => this.recordSingleRoute(route, options));
      
      try {
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allMockData = { ...allMockData, ...result.value };
            console.log(`✅ 路由 ${chunk[index]} 录制完成`);
          } else {
            console.warn(`⚠️ 路由 ${chunk[index]} 录制失败:`, result.reason.message);
          }
        });
        
      } catch (error) {
        console.error('❌ 并行录制出错:', error.message);
      }
    }

    return allMockData;
  }

  // 录制单个路由
  async recordSingleRoute(route, options) {
    const routeUrl = `${options.serverUrl}${route}`;
    
    try {
      // 使用系统的Mock数据生成器
      const mockData = await this.system.mockGenerator.startRecording(routeUrl);
      
      // 更新统计信息
      this.updateStats(mockData);
      
      return mockData;
      
    } catch (error) {
      console.warn(`录制路由 ${route} 失败:`, error.message);
      return {};
    }
  }

  // 更新统计信息
  updateStats(mockData) {
    const requestCount = Object.keys(mockData).length;
    this.stats.totalRequests += requestCount;
    this.stats.successfulRequests += requestCount;
    
    Object.keys(mockData).forEach(key => {
      const url = mockData[key].request?.url;
      if (url) {
        this.stats.uniqueEndpoints.add(url);
      }
    });
  }

  // 保存Mock数据
  async saveMockData(mockData, options) {
    const outputPath = path.resolve(options.outputDir);
    
    // 主Mock数据文件
    const mainFilePath = path.join(outputPath, 'mock-data.json');
    fs.writeFileSync(mainFilePath, JSON.stringify(mockData, null, 2));
    console.log(`💾 主文件已保存: ${mainFilePath}`);

    // 按API分类保存
    await this.saveByCategory(mockData, outputPath, options);

    // 生成索引文件
    await this.generateIndex(mockData, outputPath, options);

    // 生成统计报告
    await this.generateReport(mockData, outputPath, options);
  }

  // 按分类保存
  async saveByCategory(mockData, outputPath, options) {
    const categories = {
      GET: {},
      POST: {},
      PUT: {},
      DELETE: {},
      other: {}
    };

    Object.entries(mockData).forEach(([key, data]) => {
      const method = data.request?.method || 'other';
      const category = categories[method] || categories.other;
      category[key] = data;
    });

    // 保存各个分类
    for (const [method, data] of Object.entries(categories)) {
      if (Object.keys(data).length > 0) {
        const filePath = path.join(outputPath, `mock-${method.toLowerCase()}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        if (options.verbose) {
          console.log(`📝 ${method} 请求已保存: ${filePath} (${Object.keys(data).length} 个)`);
        }
      }
    }
  }

  // 生成索引文件
  async generateIndex(mockData, outputPath, options) {
    const index = {
      generated: new Date().toISOString(),
      totalApis: Object.keys(mockData).length,
      uniqueEndpoints: Array.from(this.stats.uniqueEndpoints),
      routes: options.routes,
      summary: {}
    };

    // 按HTTP方法分组统计
    const methods = {};
    Object.values(mockData).forEach(data => {
      const method = data.request?.method || 'unknown';
      methods[method] = (methods[method] || 0) + 1;
    });
    index.summary.methods = methods;

    // 按状态码分组统计
    const statusCodes = {};
    Object.values(mockData).forEach(data => {
      const status = data.response?.status || 'unknown';
      statusCodes[status] = (statusCodes[status] || 0) + 1;
    });
    index.summary.statusCodes = statusCodes;

    const indexPath = path.join(outputPath, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    if (options.verbose) {
      console.log(`📋 索引文件已生成: ${indexPath}`);
    }
  }

  // 生成报告
  async generateReport(mockData, outputPath, options) {
    const reportPath = path.join(outputPath, 'recording-report.md');
    const duration = performance.now() - this.stats.startTime;
    
    const report = `# Mock数据录制报告

## 基本信息

- **录制时间**: ${new Date().toLocaleString()}
- **耗时**: ${Math.round(duration)}ms
- **录制路由**: ${options.routes.length} 个
- **总API数**: ${Object.keys(mockData).length} 个
- **唯一端点**: ${this.stats.uniqueEndpoints.size} 个

## 路由列表

${options.routes.map(route => `- ${route}`).join('\n')}

## API统计

### 按HTTP方法分类

${this.generateMethodStats(mockData)}

### 按状态码分类

${this.generateStatusStats(mockData)}

## 文件结构

\`\`\`
${options.outputDir}/
├── mock-data.json          # 主文件
├── index.json              # 索引文件
├── recording-report.md     # 此报告
├── mock-get.json          # GET请求
├── mock-post.json         # POST请求
└── ...                    # 其他HTTP方法
\`\`\`

---
*由 Vue 回归测试系统生成 • ${new Date().toLocaleString()}*
`;

    fs.writeFileSync(reportPath, report);
    console.log(`📊 报告已生成: ${reportPath}`);
  }

  // 生成方法统计
  generateMethodStats(mockData) {
    const methods = {};
    Object.values(mockData).forEach(data => {
      const method = data.request?.method || 'unknown';
      methods[method] = (methods[method] || 0) + 1;
    });

    return Object.entries(methods)
      .map(([method, count]) => `- **${method}**: ${count} 个`)
      .join('\n');
  }

  // 生成状态码统计
  generateStatusStats(mockData) {
    const statusCodes = {};
    Object.values(mockData).forEach(data => {
      const status = data.response?.status || 'unknown';
      statusCodes[status] = (statusCodes[status] || 0) + 1;
    });

    return Object.entries(statusCodes)
      .map(([status, count]) => `- **${status}**: ${count} 个`)
      .join('\n');
  }

  // 显示录制统计
  displayRecordingStats(options) {
    const duration = Math.round(performance.now() - this.stats.startTime);
    
    console.log('\n📊 录制统计:');
    console.log(`⏱️ 总耗时: ${duration}ms`);
    console.log(`📍 录制路由: ${options.routes.length} 个`);
    console.log(`📡 总API数: ${this.stats.totalRequests} 个`);
    console.log(`✅ 成功录制: ${this.stats.successfulRequests} 个`);
    console.log(`❌ 失败录制: ${this.stats.failedRequests} 个`);
    console.log(`🌐 唯一端点: ${this.stats.uniqueEndpoints.size} 个`);
    
    if (this.stats.uniqueEndpoints.size > 0 && options.verbose) {
      console.log('\n🔗 录制的端点:');
      Array.from(this.stats.uniqueEndpoints).forEach(endpoint => {
        console.log(`  • ${endpoint}`);
      });
    }
  }

  // 清理资源
  async cleanup() {
    if (this.serverProcess && !this.serverProcess.killed) {
      console.log('🧹 关闭开发服务器...');
      
      // 优雅关闭
      this.serverProcess.kill('SIGTERM');
      
      // 等待一段时间后强制关闭
      setTimeout(() => {
        if (!this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  // 工具方法
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 显示帮助信息
  showHelp() {
    console.log(`
📹 Vue Mock数据录制工具 v2.0

用法:
  node regression-record.js [选项]

基本选项:
  --auto-start, -a      自动启动开发服务器
  --verbose, -v         显示详细信息
  --silent, -s          静默模式
  --skip-server         跳过服务器启动检查
  --help, -h            显示此帮助信息

录制选项:
  --route <path>        指定要录制的路由（可多次使用）
  --url <url>           服务器URL（默认: http://localhost:8080）
  --timeout <ms>        服务器连接超时（默认: 60000ms）
  --delay <ms>          路由间延迟（默认: 1000ms）
  --concurrency <n>     并发录制数（默认: 1）

输出选项:
  --output <dir>        输出目录（默认: ./regression-data/mock）

示例:
  node regression-record.js                                    # 基本录制
  node regression-record.js --auto-start --verbose            # 自动启动服务器，显示详细信息
  node regression-record.js --route / --route /dashboard      # 录制特定路由
  node regression-record.js --concurrency 3 --delay 500      # 并发录制，500ms延迟
  node regression-record.js --url http://localhost:3000       # 指定服务器URL

功能特性:
  ✅ 自动服务器管理，无需手动启动
  ✅ 多路由并发录制，提高效率
  ✅ 智能分类保存，便于管理
  ✅ 详细统计报告，了解录制情况
  ✅ 灵活配置选项，适应不同需求
  ✅ 优雅错误处理，确保资源清理
`);
  }
}

// 主入口
if (require.main === module) {
  const recorder = new MockDataRecorder();
  recorder.startRecording().catch(error => {
    console.error('录制程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = MockDataRecorder;
