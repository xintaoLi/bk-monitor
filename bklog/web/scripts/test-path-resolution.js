// ====================
// scripts/test-path-resolution.js
// ====================

const { CodeImpactAnalyzer } = require('../regression-system/vue_regression_system');

class PathResolutionTester {
  constructor() {
    this.analyzer = null;
  }

  async testPathResolution() {
    console.log('🧪 测试路径解析功能...\n');
    
    this.analyzer = new CodeImpactAnalyzer();
    
    // 1. 测试配置文件读取
    console.log('📋 配置文件读取测试:');
    try {
      const config = this.analyzer.loadConfig();
      if (config) {
        console.log(`  ✅ 配置文件加载成功`);
        console.log(`  📦 项目名称: ${config.project?.name || '未设置'}`);
        console.log(`  📁 配置的根目录: ${config.project?.root || '未设置'}`);
        console.log(`  🌐 项目URL: ${config.project?.url || '未设置'}`);
      } else {
        console.log('  ⚠️ 未找到配置文件，使用默认设置');
      }
    } catch (error) {
      console.log(`  ❌ 配置文件读取失败: ${error.message}`);
    }
    
    // 2. 测试工作目录检测
    console.log('\n📁 工作目录检测:');
    console.log(`  CLI运行目录: ${process.cwd()}`);
    console.log(`  项目根目录: ${this.analyzer.findProjectRoot()}`);
    console.log(`  分析根目录: ${this.analyzer.workingDirectory}`);
    
    // 检查目录关系
    const cwd = process.cwd();
    const projectRoot = this.analyzer.findProjectRoot();
    const analysisRoot = this.analyzer.workingDirectory;
    console.log('\n🔍 目录关系分析:');
    console.log(`  CLI运行目录是否为项目根: ${cwd === projectRoot ? '✅' : '❌'}`);
    console.log(`  分析目录是否为项目根: ${analysisRoot === projectRoot ? '✅' : '❌'}`);
    console.log(`  配置文件检测: ${this.analyzer.loadConfig() ? '✅ 存在' : '❌ 不存在'}`);
    
    // 3. 测试路径标准化
    console.log('\n🔧 路径标准化测试:');
    const testPaths = [
      'src/components/Button.vue',
      'bklog/web/src/views/Dashboard.vue',
      'bklog/web/scripts/regression-analyze.js',
      '../regression-data/mock.json',
      'regression-data/reports/test.html'
    ];
    
    testPaths.forEach(testPath => {
      const normalized = this.analyzer.normalizePath(testPath);
      console.log(`  ${testPath} -> ${normalized}`);
    });
    
    // 4. 测试排除功能
    console.log('\n🚫 排除功能测试:');
    const testExcludePaths = [
      'src/components/Button.vue',
      'bklog/web/src/views/Dashboard.vue',
      'bklog/web/scripts/regression-analyze.js',
      'regression-data/mock.json',
      'node_modules/vue/dist/vue.js',
      '.git/config',
      'dist/app.js'
    ];
    
    testExcludePaths.forEach(testPath => {
      const shouldExclude = this.analyzer.shouldExcludeFile(testPath);
      const status = shouldExclude ? '❌ 排除' : '✅ 包含';
      console.log(`  ${testPath} -> ${status}`);
    });
    
    // 5. 测试文件扫描
    console.log('\n📂 文件扫描测试:');
    try {
      const sourceFiles = await this.analyzer.scanSourceFiles();
      console.log(`  发现源文件: ${sourceFiles.length} 个`);
      
      if (sourceFiles.length > 0) {
        console.log('  前5个文件:');
        sourceFiles.slice(0, 5).forEach(file => {
          console.log(`    ${file}`);
        });
      }
    } catch (error) {
      console.log(`  扫描失败: ${error.message}`);
    }
    
    // 6. 测试变更文件获取
    console.log('\n📋 变更文件获取测试:');
    try {
      const changedFiles = await this.analyzer.getChangedFiles('WORKING');
      console.log(`  变更文件: ${changedFiles.length} 个`);
      
      if (changedFiles.length > 0) {
        console.log('  变更文件列表:');
        changedFiles.forEach(file => {
          console.log(`    ${file}`);
        });
      } else {
        console.log('  没有检测到变更文件');
      }
    } catch (error) {
      console.log(`  获取变更文件失败: ${error.message}`);
    }
    
    // 7. 显示统计信息
    console.log('\n📊 系统统计:');
    const stats = this.analyzer.getAnalysisStats();
    console.log(`  排除模式: ${stats.excludePatterns.length} 个`);
    console.log('  排除模式列表:');
    stats.excludePatterns.forEach(pattern => {
      console.log(`    ${pattern}`);
    });
    
    console.log('\n✅ 路径解析测试完成');
  }

  // 测试模块路径解析
  async testModuleResolution() {
    console.log('\n🔗 模块路径解析测试:');
    
    const testCases = [
      { module: './Button.vue', currentFile: 'src/components/Dialog.vue' },
      { module: '../utils/helper.js', currentFile: 'src/components/Button.vue' },
      { module: '@/views/Dashboard.vue', currentFile: 'src/components/Button.vue' },
      { module: '@/api/user.js', currentFile: 'src/views/Login.vue' },
      { module: 'common/util.js', currentFile: 'src/views/Login.vue' },
      { module: 'lodash', currentFile: 'src/utils/helper.js' }
    ];
    
    testCases.forEach(({ module, currentFile }) => {
      try {
        const resolved = this.analyzer.resolveModulePath(module, currentFile);
        console.log(`  ${module} (from ${currentFile}) -> ${resolved || 'null'}`);
      } catch (error) {
        console.log(`  ${module} (from ${currentFile}) -> 错误: ${error.message}`);
      }
    });
  }

  // 新增：测试源码目录解析
  async testSrcPathResolution() {
    console.log('\n📁 源码目录解析测试 (@/ 别名):');
    
    const testPaths = [
      'views/Dashboard.vue',
      'components/Button.vue',
      'api/user.js',
      'utils/helper.js',
      'assets/logo.png'
    ];
    
    testPaths.forEach(testPath => {
      try {
        const resolved = this.analyzer.resolveSrcPath(testPath);
        console.log(`  @/${testPath} -> ${resolved || 'null'}`);
      } catch (error) {
        console.log(`  @/${testPath} -> 错误: ${error.message}`);
      }
    });
  }

  // 新增：测试项目路径解析
  async testProjectPathResolution() {
    console.log('\n🏗️ 项目路径解析测试:');
    
    const testPaths = [
      'package.json',
      'vue.config.js',
      'README.md',
      'src/main.js',
      'public/index.html'
    ];
    
    testPaths.forEach(testPath => {
      try {
        const resolved = this.analyzer.resolveProjectPath(testPath);
        console.log(`  ${testPath} -> ${resolved || 'null'}`);
      } catch (error) {
        console.log(`  ${testPath} -> 错误: ${error.message}`);
      }
    });
  }

  // 测试文件存在性
  async testFileExistence() {
    console.log('\n📂 文件存在性测试:');
    
    const fs = require('fs');
    const path = require('path');
    
    // 首先显示一些调试信息
    console.log('\n🔍 调试信息:');
    const projectRoot = this.analyzer.findProjectRoot();
    const workingDir = this.analyzer.workingDirectory;
    const currentDirRelativePath = path.relative(projectRoot, workingDir);
    console.log(`  项目根目录: ${projectRoot}`);
    console.log(`  工作目录: ${workingDir}`);
    console.log(`  相对路径: ${currentDirRelativePath}`);
    console.log(`  标准化相对路径: ${currentDirRelativePath.replace(/\\/g, '/')}`);
    
    // 测试之前出错的文件路径
    const problemFiles = [
      'bklog/web/src/common/util.js',
      'src/common/util.js',
      'common/util.js',
      'regression-system/vue_regression_system.js'
    ];
    
    problemFiles.forEach(filePath => {
      try {
        console.log(`\n  测试文件: ${filePath}`);
        
        // 检查是否包含当前工作目录的相对路径
        const normalizedRelativePath = currentDirRelativePath.replace(/\\/g, '/');
        const containsRelativePath = filePath.startsWith(normalizedRelativePath + '/') || 
          (normalizedRelativePath && filePath.includes(normalizedRelativePath + '/'));
        console.log(`    包含相对路径 (${normalizedRelativePath}): ${containsRelativePath}`);
        
        // 使用分析器的新路径解析逻辑
        const resolvedPath = this.analyzer.resolveFilePath(filePath);
        const exists = resolvedPath && fs.existsSync(resolvedPath);
        
        console.log(`    解析结果: ${exists ? '✅ 存在' : '❌ 不存在'}`);
        
        if (resolvedPath) {
          console.log(`    解析路径: ${resolvedPath}`);
        }
        
        // 测试不同的模块路径解析
        if (filePath.includes('/')) {
          const asModulePath = this.analyzer.resolveProjectPath(filePath);
          console.log(`    作为模块路径: ${asModulePath || 'null'}`);
        }
        
        // 如果路径看起来应该相对于上级目录，手动测试
        if (filePath.startsWith('bklog/web/')) {
          const parentDir = path.dirname(projectRoot);
          const manualPath = path.resolve(parentDir, filePath);
          const manualExists = fs.existsSync(manualPath);
          console.log(`    手动解析 (${parentDir}): ${manualPath} ${manualExists ? '✅' : '❌'}`);
        }
      } catch (error) {
        console.log(`    ${filePath} -> 错误: ${error.message}`);
      }
    });
  }

  // 新增：测试配置适应性
  async testConfigAdaptability() {
    console.log('\n⚙️ 配置适应性测试:');
    
    const path = require('path'); // 添加path模块导入
    
    // 显示当前配置影响的路径解析
    const config = this.analyzer.loadConfig();
    const workingDir = this.analyzer.workingDirectory;
    const projectRoot = this.analyzer.findProjectRoot();
    
    console.log(`  项目根目录: ${projectRoot}`);
    console.log(`  配置根目录: ${config?.project?.root || '未设置'}`);
    console.log(`  实际工作目录: ${workingDir}`);
    
    // 测试在不同配置下的路径解析差异
    const testScenarios = [
      { description: '当前配置', root: config?.project?.root || './' },
      { description: '根目录配置', root: './' },
      { description: '源码目录配置', root: './src' },
      { description: '嵌套配置', root: './web' }
    ];
    
    console.log('\n  不同 root 配置下的路径解析预览:');
    testScenarios.forEach(scenario => {
      console.log(`    ${scenario.description} (root: ${scenario.root}):`);
      
      // 模拟在该配置下 @/components/Button.vue 的解析
      const mockPath = 'components/Button.vue';
      try {
        // 这里只是示例性地展示不同配置可能的影响
        let expectedPath;
        if (scenario.root === './') {
          expectedPath = path.resolve(projectRoot, 'src', mockPath);
        } else if (scenario.root === './src') {
          expectedPath = path.resolve(projectRoot, 'src', mockPath);
        } else if (scenario.root === './web') {
          expectedPath = path.resolve(projectRoot, 'web/src', mockPath);
        }
        
        console.log(`      @/${mockPath} -> ${expectedPath || '动态解析'}`);
      } catch (error) {
        console.log(`      解析失败: ${error.message}`);
      }
    });
  }

  // 新增：测试文件扩展名解析
  async testFileExtensionResolution() {
    console.log('\n🔧 文件扩展名解析测试:');
    
    const fs = require('fs');
    
    // 测试无扩展名文件的解析
    const testFiles = [
      'package',      // 应该解析为 package.json
      'vue.config',   // 应该解析为 vue.config.js
      'src/main',     // 应该解析为 src/main.js
      'src/App'       // 应该解析为 src/App.vue
    ];
    
    testFiles.forEach(testFile => {
      try {
        const resolved = this.analyzer.resolveFilePath(testFile);
        const exists = resolved && fs.existsSync(resolved);
        
        console.log(`  ${testFile} -> ${resolved || 'null'} ${exists ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`  ${testFile} -> 错误: ${error.message}`);
      }
    });
  }

  // 执行所有测试
  async run() {
    try {
      await this.testPathResolution();
      await this.testModuleResolution();
      await this.testSrcPathResolution();
      await this.testProjectPathResolution();
      await this.testFileExistence();
      await this.testConfigAdaptability();
      await this.testFileExtensionResolution();
    } catch (error) {
      console.error('测试执行失败:', error);
      throw error;
    }
  }
}

// 主入口
if (require.main === module) {
  const tester = new PathResolutionTester();
  tester.run().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}

module.exports = PathResolutionTester; 