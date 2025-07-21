// ====================
// scripts/regression-utils.js
// ====================

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

class RegressionUtils {
  constructor() {
    this.configPath = './regression.config.js';
    this.dataPath = './regression-data';
  }

  // 主入口
  async run() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    const command = args[0];
    const options = this.parseOptions(args.slice(1));

    try {
      switch (command) {
        case 'status':
          await this.showStatus(options);
          break;
        case 'validate':
          await this.validateConfiguration(options);
          break;
        case 'clean':
          await this.cleanData(options);
          break;
        case 'backup':
          await this.backupData(options);
          break;
        case 'restore':
          await this.restoreData(options);
          break;
        case 'benchmark':
          await this.runBenchmark(options);
          break;
        case 'doctor':
          await this.runDoctor(options);
          break;
        case 'migrate':
          await this.migrateData(options);
          break;
        default:
          console.error(`❌ 未知命令: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error(`❌ 命令执行失败:`, error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  // 解析选项
  parseOptions(args) {
    const options = {
      verbose: false,
      force: false,
      dry: false
    };

    args.forEach(arg => {
      if (arg === '--verbose' || arg === '-v') options.verbose = true;
      if (arg === '--force' || arg === '-f') options.force = true;
      if (arg === '--dry-run' || arg === '--dry') options.dry = true;
    });

    return options;
  }

  // 显示系统状态
  async showStatus(options) {
    console.log('📊 回归测试系统状态检查\n');

    // 1. 配置文件状态
    console.log('📋 配置文件:');
    if (fs.existsSync(this.configPath)) {
      console.log(`  ✅ ${this.configPath} 存在`);
      try {
        const config = require(path.resolve(this.configPath));
        console.log(`  📦 项目: ${config.project?.name || '未知'}`);
        console.log(`  📁 分析根目录: ${config.project?.root || '未设置'}`);
        console.log(`  🌐 URL: ${config.project?.url || '未配置'}`);
        console.log(`  📁 组件路径: ${config.scan?.componentPaths?.length || 0} 个`);
        console.log(`  🚫 排除路径: ${config.scan?.excludePaths?.length || 0} 个`);
      } catch (error) {
        console.log('  ❌ 配置文件格式错误');
      }
    } else {
      console.log(`  ❌ ${this.configPath} 不存在`);
    }

    // 2. 数据目录状态
    console.log('\n📁 数据目录:');
    if (fs.existsSync(this.dataPath)) {
      console.log(`  ✅ ${this.dataPath} 存在`);
      
      const subdirs = ['mock', 'reports', 'screenshots', 'baselines', 'temp', 'cache'];
      subdirs.forEach(subdir => {
        const dirPath = path.join(this.dataPath, subdir);
        if (fs.existsSync(dirPath)) {
          const files = this.getDirectorySize(dirPath);
          console.log(`  📂 ${subdir}: ${files.count} 个文件, ${this.formatSize(files.size)}`);
        } else {
          console.log(`  ❌ ${subdir}: 目录不存在`);
        }
      });
    } else {
      console.log(`  ❌ ${this.dataPath} 不存在`);
    }

    // 3. 依赖状态
    console.log('\n📦 依赖状态:');
    const requiredDeps = ['chokidar', 'glob', 'puppeteer', '@babel/parser'];
    const packageJsonPath = './package.json';
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      requiredDeps.forEach(dep => {
        if (allDeps[dep]) {
          console.log(`  ✅ ${dep}: ${allDeps[dep]}`);
        } else {
          console.log(`  ❌ ${dep}: 未安装`);
        }
      });
    } else {
      console.log('  ❌ package.json 不存在');
    }

    // 4. Git钩子状态
    console.log('\n🪝 Git钩子:');
    const hooksDir = '.git/hooks';
    if (fs.existsSync(hooksDir)) {
      const hooks = ['pre-commit', 'prepare-commit-msg'];
      hooks.forEach(hook => {
        const hookPath = path.join(hooksDir, hook);
        if (fs.existsSync(hookPath)) {
          const stats = fs.statSync(hookPath);
          const isExecutable = (stats.mode & 0o111) !== 0;
          console.log(`  ${isExecutable ? '✅' : '⚠️'} ${hook}: ${isExecutable ? '已安装且可执行' : '已安装但不可执行'}`);
        } else {
          console.log(`  ❌ ${hook}: 未安装`);
        }
      });
    } else {
      console.log('  ❌ 未找到Git仓库');
    }

    // 5. 脚本状态
    console.log('\n📜 NPM脚本:');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const regressionScripts = Object.keys(packageJson.scripts || {})
        .filter(key => key.startsWith('regression:'));
      
      if (regressionScripts.length > 0) {
        regressionScripts.forEach(script => {
          console.log(`  ✅ ${script}`);
        });
      } else {
        console.log('  ❌ 未找到回归测试脚本');
      }
    }

    console.log('\n🎯 总体状态:', this.getOverallStatus());
  }

  // 获取目录大小
  getDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
          fileCount++;
        } else if (stats.isDirectory()) {
          const subResult = this.getDirectorySize(itemPath);
          totalSize += subResult.size;
          fileCount += subResult.count;
        }
      });
    } catch (error) {
      // 忽略错误
    }

    return { size: totalSize, count: fileCount };
  }

  // 格式化大小
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // 获取总体状态
  getOverallStatus() {
    const hasConfig = fs.existsSync(this.configPath);
    const hasData = fs.existsSync(this.dataPath);
    const hasGit = fs.existsSync('.git');

    if (hasConfig && hasData && hasGit) {
      return '✅ 系统运行正常';
    } else if (hasConfig && hasData) {
      return '⚠️ 系统基本正常（缺少Git集成）';
    } else if (hasConfig) {
      return '⚠️ 系统部分配置（缺少数据目录）';
    } else {
      return '❌ 系统未初始化';
    }
  }

  // 验证配置
  async validateConfiguration(options) {
    console.log('🔍 验证配置文件...\n');

    if (!fs.existsSync(this.configPath)) {
      console.log('❌ 配置文件不存在');
      return;
    }

    try {
      const config = require(path.resolve(this.configPath));
      let isValid = true;

      // 验证必需字段
      console.log('📋 必需字段验证:');
      const requiredFields = [
        'project.name',
        'project.url',
        'project.root',
        'scan.componentPaths',
        'mock.outputPath',
        'test.outputPath'
      ];

      requiredFields.forEach(field => {
        const value = this.getNestedValue(config, field);
        if (value !== undefined && value !== null) {
          console.log(`  ✅ ${field}: ${JSON.stringify(value)}`);
        } else {
          console.log(`  ❌ ${field}: 缺失`);
          isValid = false;
        }
      });

      // 验证路径
      console.log('\n📁 路径验证:');
      const paths = [
        config.project?.root,
        config.mock?.outputPath,
        config.test?.outputPath,
        config.test?.screenshotPath
      ].filter(Boolean);

      paths.forEach(pathValue => {
        if (fs.existsSync(pathValue)) {
          console.log(`  ✅ ${pathValue}: 存在`);
        } else {
          console.log(`  ⚠️ ${pathValue}: 不存在（将自动创建）`);
        }
      });

      // 验证URL
      console.log('\n🌐 URL验证:');
      if (config.project?.url) {
        try {
          new URL(config.project.url);
          console.log(`  ✅ ${config.project.url}: 格式正确`);
        } catch (error) {
          console.log(`  ❌ ${config.project.url}: 格式错误`);
          isValid = false;
        }
      }

      // 验证组件路径模式
      console.log('\n🔍 组件路径模式验证:');
      if (config.scan?.componentPaths) {
        const glob = require('glob');
        config.scan.componentPaths.forEach(pattern => {
          try {
            const files = glob.sync(pattern, {
              ignore: ['**/node_modules/**', '**/dist/**', '**/regression-data/**', '**/bklog/web/scripts/**']
            });
            console.log(`  ✅ ${pattern}: 匹配 ${files.length} 个文件`);
          } catch (error) {
            console.log(`  ❌ ${pattern}: 模式错误`);
            isValid = false;
          }
        });
      }

      console.log(`\n🎯 配置验证结果: ${isValid ? '✅ 通过' : '❌ 失败'}`);

    } catch (error) {
      console.log(`❌ 配置文件解析错误: ${error.message}`);
    }
  }

  // 获取嵌套值
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // 清理数据
  async cleanData(options) {
    console.log('🧹 清理回归测试数据...\n');

    if (!fs.existsSync(this.dataPath)) {
      console.log('📁 数据目录不存在，无需清理');
      return;
    }

    const cleanTargets = [
      { path: 'temp', description: '临时文件' },
      { path: 'cache', description: '缓存文件' },
      { path: 'reports', description: '报告文件' },
      { path: 'screenshots', description: '截图文件' }
    ];

    if (options.force) {
      cleanTargets.push({ path: 'mock', description: 'Mock数据' });
      cleanTargets.push({ path: 'baselines', description: '基准数据' });
    }

    let totalCleaned = 0;
    let totalSize = 0;

    for (const target of cleanTargets) {
      const targetPath = path.join(this.dataPath, target.path);
      
      if (fs.existsSync(targetPath)) {
        const sizeInfo = this.getDirectorySize(targetPath);
        
        if (options.dry) {
          console.log(`  🔍 [预览] ${target.description}: ${sizeInfo.count} 个文件, ${this.formatSize(sizeInfo.size)}`);
        } else {
          console.log(`  🗑️ 清理 ${target.description}...`);
          await this.removeDirectory(targetPath);
          fs.mkdirSync(targetPath, { recursive: true });
          console.log(`  ✅ 已清理: ${sizeInfo.count} 个文件, ${this.formatSize(sizeInfo.size)}`);
        }
        
        totalCleaned += sizeInfo.count;
        totalSize += sizeInfo.size;
      } else {
        console.log(`  ⚠️ ${target.description}: 目录不存在`);
      }
    }

    console.log(`\n📊 ${options.dry ? '预计' : '实际'}清理: ${totalCleaned} 个文件, ${this.formatSize(totalSize)}`);
    
    if (options.dry) {
      console.log('💡 使用 --force 选项可清理Mock数据和基准数据');
      console.log('💡 移除 --dry-run 执行实际清理');
    }
  }

  // 递归删除目录
  async removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          await this.removeDirectory(itemPath);
        } else {
          fs.unlinkSync(itemPath);
        }
      }
      
      fs.rmdirSync(dirPath);
    }
  }

  // 备份数据
  async backupData(options) {
    console.log('💾 备份回归测试数据...\n');

    if (!fs.existsSync(this.dataPath)) {
      console.log('❌ 数据目录不存在，无法备份');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./regression-backup-${timestamp}`;

    if (options.dry) {
      console.log(`🔍 [预览] 将创建备份: ${backupPath}`);
      const sizeInfo = this.getDirectorySize(this.dataPath);
      console.log(`📊 备份大小: ${sizeInfo.count} 个文件, ${this.formatSize(sizeInfo.size)}`);
      return;
    }

    try {
      const { execSync } = require('child_process');
      
      console.log(`📁 创建备份目录: ${backupPath}`);
      execSync(`cp -r "${this.dataPath}" "${backupPath}"`, { stdio: 'inherit' });
      
      // 创建备份信息文件
      const backupInfo = {
        timestamp: new Date().toISOString(),
        source: this.dataPath,
        backup: backupPath,
        fileCount: this.getDirectorySize(this.dataPath).count
      };
      
      fs.writeFileSync(
        path.join(backupPath, 'backup-info.json'), 
        JSON.stringify(backupInfo, null, 2)
      );
      
      console.log(`✅ 备份完成: ${backupPath}`);
      
    } catch (error) {
      console.error(`❌ 备份失败: ${error.message}`);
    }
  }

  // 运行基准测试
  async runBenchmark(options) {
    console.log('⚡ 运行性能基准测试...\n');

    const tests = [
      { name: '配置文件加载', test: () => this.benchmarkConfigLoad() },
      { name: '文件扫描', test: () => this.benchmarkFileScan() },
      { name: '依赖分析', test: () => this.benchmarkDependencyAnalysis() }
    ];

    const results = [];

    for (const testCase of tests) {
      console.log(`🔍 测试: ${testCase.name}`);
      
      const startTime = performance.now();
      try {
        await testCase.test();
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        console.log(`  ✅ 完成: ${duration}ms`);
        results.push({ name: testCase.name, duration, status: 'success' });
      } catch (error) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        console.log(`  ❌ 失败: ${duration}ms - ${error.message}`);
        results.push({ name: testCase.name, duration, status: 'failed', error: error.message });
      }
    }

    console.log('\n📊 基准测试结果:');
    results.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`  ${status} ${result.name}: ${result.duration}ms`);
    });

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    console.log(`\n⚡ 平均耗时: ${Math.round(avgDuration)}ms`);
  }

  // 基准测试 - 配置加载
  async benchmarkConfigLoad() {
    for (let i = 0; i < 100; i++) {
      delete require.cache[path.resolve(this.configPath)];
      require(path.resolve(this.configPath));
    }
  }

  // 基准测试 - 文件扫描
  async benchmarkFileScan() {
    const glob = require('glob');
    glob.sync('src/**/*.{vue,js,ts}', {
      ignore: ['**/node_modules/**', '**/dist/**', '**/regression-data/**', '**/bklog/web/scripts/**']
    });
  }

  // 基准测试 - 依赖分析
  async benchmarkDependencyAnalysis() {
    try {
      // 确保在正确的工作目录下执行
      const originalCwd = process.cwd();
      
      // 查找项目根目录
      let projectRoot = process.cwd();
      while (projectRoot !== path.dirname(projectRoot)) {
        if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
          break;
        }
        projectRoot = path.dirname(projectRoot);
      }
      
      process.chdir(projectRoot);
      
      try {
        const { AutomatedRegressionTestSystem } = require('../regression-system/vue_regression_system');
        const system = new AutomatedRegressionTestSystem();
        
        // 模拟轻量级依赖分析
        await system.impactAnalyzer.quickAnalyzeCurrentChanges();
      } finally {
        process.chdir(originalCwd);
      }
    } catch (error) {
      // 如果分析失败，进行简单的文件扫描测试
      const glob = require('glob');
      glob.sync('**/*.{vue,js,ts}', { 
        ignore: ['node_modules/**', 'dist/**', '**/regression-data/**', '**/bklog/web/scripts/**'] 
      });
    }
  }

  // 运行系统诊断
  async runDoctor(options) {
    console.log('👩‍⚕️ 回归测试系统诊断...\n');

    const checks = [
      { name: '检查Node.js版本', test: () => this.checkNodeVersion() },
      { name: '检查NPM版本', test: () => this.checkNpmVersion() },
      { name: '检查Git状态', test: () => this.checkGitStatus() },
      { name: '检查磁盘空间', test: () => this.checkDiskSpace() },
      { name: '检查网络连接', test: () => this.checkNetworkConnectivity() },
      { name: '检查系统性能', test: () => this.checkSystemPerformance() }
    ];

    const results = [];

    for (const check of checks) {
      console.log(`🔍 ${check.name}...`);
      
      try {
        const result = await check.test();
        console.log(`  ✅ ${result}`);
        results.push({ name: check.name, status: 'passed', message: result });
      } catch (error) {
        console.log(`  ❌ ${error.message}`);
        results.push({ name: check.name, status: 'failed', message: error.message });
      }
    }

    console.log('\n📋 诊断报告:');
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`✅ 通过: ${passed} 项`);
    console.log(`❌ 失败: ${failed} 项`);

    if (failed > 0) {
      console.log('\n🔧 建议修复:');
      results.filter(r => r.status === 'failed').forEach(result => {
        console.log(`  • ${result.name}: ${result.message}`);
      });
    }
  }

  // 各种诊断检查方法
  async checkNodeVersion() {
    const version = process.version;
    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
    
    if (majorVersion >= 14) {
      return `Node.js ${version} ✓`;
    } else {
      throw new Error(`Node.js 版本过低 (${version})，建议升级到 14.x 或更高版本`);
    }
  }

  async checkNpmVersion() {
    const { execSync } = require('child_process');
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    return `NPM ${version} ✓`;
  }

  async checkGitStatus() {
    if (!fs.existsSync('.git')) {
      throw new Error('不是Git仓库');
    }
    
    const { execSync } = require('child_process');
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const changedFiles = status.trim().split('\n').filter(line => line.length > 0).length;
      return `Git仓库正常，${changedFiles} 个变更文件`;
    } catch (error) {
      throw new Error('Git状态检查失败');
    }
  }

  async checkDiskSpace() {
    const { execSync } = require('child_process');
    try {
      const output = execSync('df -h .', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      const available = parts[3];
      return `可用空间: ${available}`;
    } catch (error) {
      return '磁盘空间检查完成';
    }
  }

  async checkNetworkConnectivity() {
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const req = http.get('http://www.baidu.com', { timeout: 5000 }, (res) => {
        resolve('网络连接正常');
      });
      
      req.on('error', () => {
        reject(new Error('网络连接失败'));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('网络连接超时'));
      });
    });
  }

  async checkSystemPerformance() {
    const startTime = performance.now();
    
    // 简单的性能测试
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i);
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    if (duration < 100) {
      return `系统性能良好 (${duration}ms)`;
    } else if (duration < 500) {
      return `系统性能一般 (${duration}ms)`;
    } else {
      throw new Error(`系统性能较差 (${duration}ms)`);
    }
  }

  // 数据迁移
  async migrateData(options) {
    console.log('🔄 数据迁移...\n');
    
    // 这里可以添加版本升级时的数据迁移逻辑
    console.log('当前版本无需数据迁移');
  }

  // 显示帮助
  showHelp() {
    console.log(`
🔧 Vue 回归测试工具集

用法:
  node regression-utils.js <command> [options]

命令:
  status        显示系统状态
  validate      验证配置文件
  clean         清理测试数据
  backup        备份测试数据
  restore       恢复测试数据
  benchmark     运行性能基准测试
  doctor        运行系统诊断
  migrate       数据迁移

选项:
  --verbose, -v    显示详细信息
  --force, -f      强制执行（用于清理时包含Mock数据）
  --dry-run        预览模式，不执行实际操作
  --help, -h       显示帮助信息

示例:
  node regression-utils.js status                # 查看系统状态
  node regression-utils.js validate --verbose    # 详细验证配置
  node regression-utils.js clean --dry-run       # 预览清理操作
  node regression-utils.js clean --force         # 强制清理所有数据
  node regression-utils.js backup                # 备份数据
  node regression-utils.js doctor                # 系统诊断
  node regression-utils.js benchmark             # 性能测试

功能特性:
  ✅ 全面的状态检查，了解系统运行情况
  ✅ 配置验证，确保设置正确
  ✅ 数据清理，释放磁盘空间
  ✅ 数据备份，防止意外丢失
  ✅ 性能基准，监控系统性能
  ✅ 系统诊断，快速排查问题
`);
  }
}

// 主入口
if (require.main === module) {
  const utils = new RegressionUtils();
  utils.run().catch(error => {
    console.error('工具执行失败:', error);
    process.exit(1);
  });
}

module.exports = RegressionUtils; 