// ====================
// scripts/regression-cli.js
// ====================

const path = require('path');
const fs = require('fs');

class RegressionCLI {
  constructor() {
    this.commands = {
      init: {
        description: '初始化回归测试系统',
        script: './regression-init.js',
        aliases: ['i', 'setup']
      },
      analyze: {
        description: '分析代码变更影响',
        script: './regression-analyze.js',
        aliases: ['a', 'check']
      },
      watch: {
        description: '启动实时监控',
        script: './regression-watch.js',
        aliases: ['w', 'monitor']
      },
      record: {
        description: '录制Mock数据',
        script: './regression-record.js',
        aliases: ['r', 'mock']
      },
      test: {
        description: '测试路径解析功能',
        script: './test-path-resolution.js',
        aliases: ['t', 'debug']
      }
    };
  }

  // 主入口
  async run() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    if (args.includes('--version') || args.includes('-v')) {
      this.showVersion();
      return;
    }

    const command = args[0];
    const commandArgs = args.slice(1);

    // 查找命令
    const commandInfo = this.findCommand(command);
    if (!commandInfo) {
      console.error(`❌ 未知命令: ${command}`);
      console.log('💡 使用 --help 查看可用命令');
      process.exit(1);
    }

    // 执行命令
    await this.executeCommand(commandInfo, commandArgs);
  }

  // 查找命令
  findCommand(inputCommand) {
    for (const [name, info] of Object.entries(this.commands)) {
      if (name === inputCommand || info.aliases.includes(inputCommand)) {
        return { name, ...info };
      }
    }
    return null;
  }

  // 执行命令
  async executeCommand(commandInfo, args) {
    const scriptPath = path.resolve(__dirname, commandInfo.script);
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ 脚本文件不存在: ${scriptPath}`);
      process.exit(1);
    }

    console.log(`🚀 执行: ${commandInfo.description}`);
    
    try {
      // 动态导入并执行脚本
      const ScriptClass = require(scriptPath);
      
      if (typeof ScriptClass === 'function') {
        // 如果是类，实例化并调用主方法
        const instance = new ScriptClass();
        const methodName = this.getMainMethod(commandInfo.name);
        
        if (typeof instance[methodName] === 'function') {
          // 修改 process.argv 以传递参数
          const originalArgv = process.argv;
          process.argv = ['node', scriptPath, ...args];
          
          await instance[methodName]();
          
          // 恢复原始 argv
          process.argv = originalArgv;
        } else {
          console.error(`❌ 脚本 ${commandInfo.script} 缺少 ${methodName} 方法`);
          process.exit(1);
        }
      } else {
        // 如果不是类，直接执行（兼容性）
        console.log('使用子进程执行脚本...');
        await this.executeScript(scriptPath, args);
      }
      
    } catch (error) {
      console.error(`❌ 执行失败:`, error.message);
      process.exit(1);
    }
  }

  // 获取主方法名
  getMainMethod(commandName) {
    const methodMap = {
      init: 'initialize',
      analyze: 'analyze', 
      watch: 'startWatching',
      record: 'startRecording',
      test: 'run'
    };
    return methodMap[commandName] || 'run';
  }

  // 使用子进程执行脚本
  executeScript(scriptPath, args) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      
      const proc = spawn('node', [scriptPath, ...args], {
        stdio: 'inherit',
        shell: true
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`脚本执行失败，退出码: ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  // 显示版本信息
  showVersion() {
    const packageJsonPath = path.resolve(__dirname, '../../../package.json');
    let version = '1.0.0';
    
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        version = packageJson.version || '1.0.0';
      }
    } catch (error) {
      // 使用默认版本
    }

    console.log(`Vue 回归测试 CLI v${version}`);
  }

  // 显示帮助信息
  showHelp() {
    console.log(`
🔧 Vue 回归测试 CLI

用法:
  node regression-cli.js <command> [options]

命令:
  init, i, setup        初始化回归测试系统
  analyze, a, check     分析代码变更影响  
  watch, w, monitor     启动实时文件监控
  record, r, mock       录制API Mock数据
  test, t, debug        测试路径解析功能（调试用）

全局选项:
  --help, -h           显示帮助信息
  --version, -v        显示版本信息

示例:
  node regression-cli.js init                    # 初始化系统
  node regression-cli.js analyze --staged       # 分析staged变更
  node regression-cli.js watch --auto-analyze   # 自动分析监控
  node regression-cli.js record --auto-start    # 自动录制

详细用法:
  每个命令都支持 --help 查看详细选项:
  node regression-cli.js analyze --help
  node regression-cli.js watch --help
  node regression-cli.js record --help

快捷方式 (添加到 package.json):
  "scripts": {
    "regression": "node bklog/web/scripts/regression-cli.js",
    "r:init": "npm run regression init",
    "r:analyze": "npm run regression analyze", 
    "r:watch": "npm run regression watch",
    "r:record": "npm run regression record"
  }

更多信息:
  📚 文档: REGRESSION_TESTING.md
  🔧 配置: regression.config.js
  📁 数据: regression-data/
`);
  }
}

// 主入口
if (require.main === module) {
  const cli = new RegressionCLI();
  cli.run().catch(error => {
    console.error('CLI执行失败:', error);
    process.exit(1);
  });
}

module.exports = RegressionCLI; 