// ====================
// scripts/regression-init.js
// ====================

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

class RegressionInitializer {
  constructor() {
    this.projectInfo = {};
    this.rl = null;
  }

  // 主初始化方法
  async initialize() {
    const options = this.parseArguments();
    
    if (options.help) {
      this.showHelp();
      return;
    }

    try {
      console.log('🚀 初始化 Vue 回归测试系统...');
      
      // 1. 检查项目环境
      await this.checkProjectEnvironment();
      
      // 2. 收集项目信息
      if (!options.skipWizard) {
        await this.runConfigurationWizard();
      } else {
        this.projectInfo = this.getDefaultProjectInfo();
      }
      
      // 3. 创建配置文件
      await this.createConfigurationFile(options);
      
      // 4. 创建目录结构
      await this.createDirectoryStructure();
      
      // 5. 安装依赖
      if (!options.skipDeps) {
        await this.installDependencies(options);
      }
      
      // 6. 创建脚本文件
      await this.createScriptFiles(options);
      
      // 7. 设置Git钩子
      if (!options.skipHooks && this.hasGitRepo()) {
        await this.setupGitHooks(options);
      }
      
      // 8. 生成使用文档
      await this.generateDocumentation();
      
      // 9. 显示完成信息
      this.displayCompletionInfo();
      
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      process.exit(1);
    } finally {
      if (this.rl) {
        this.rl.close();
      }
    }
  }

  // 解析命令行参数
  parseArguments() {
    const args = process.argv.slice(2);
    
    return {
      skipWizard: args.includes('--skip-wizard'),
      skipDeps: args.includes('--skip-deps'),
      skipHooks: args.includes('--skip-hooks'),
      force: args.includes('--force'),
      verbose: args.includes('--verbose') || args.includes('-v'),
      help: args.includes('--help') || args.includes('-h')
    };
  }

  // 检查项目环境
  async checkProjectEnvironment() {
    console.log('🔍 检查项目环境...');
    
    // 检查是否在正确的目录
    const packageJsonPath = path.resolve('./package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('未找到 package.json，请在项目根目录运行此脚本');
    }
    
    // 读取项目信息
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    this.projectInfo.name = packageJson.name || 'unknown-project';
    this.projectInfo.version = packageJson.version || '1.0.0';
    
    // 检查Vue版本
    const vueVersion = this.detectVueVersion(packageJson);
    this.projectInfo.vueVersion = vueVersion;
    
    console.log(`✅ 项目: ${this.projectInfo.name} (Vue ${vueVersion})`);
    
    // 检查现有配置
    if (fs.existsSync('./regression.config.js')) {
      console.log('⚠️ 发现现有配置文件 regression.config.js');
    }
    
    // 检查现有目录
    if (fs.existsSync('./regression-data')) {
      console.log('⚠️ 发现现有数据目录 regression-data');
    }
  }

  // 检测Vue版本
  detectVueVersion(packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.vue) {
      const vueVersion = deps.vue;
      if (vueVersion.includes('2.7') || vueVersion.includes('^2.7')) {
        return '2.7';
      } else if (vueVersion.includes('2.')) {
        return '2.x';
      } else if (vueVersion.includes('3.')) {
        return '3.x';
      }
    }
    
    return 'unknown';
  }

  // 运行配置向导
  async runConfigurationWizard() {
    console.log('\n📋 配置向导 - 请回答以下问题设置回归测试:');
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // 项目URL
    this.projectInfo.url = await this.askQuestion(
      '🌐 开发服务器URL (默认: http://localhost:8080): ',
      'http://localhost:8080'
    );
    
    // 构建命令
    this.projectInfo.buildCommand = await this.askQuestion(
      '🔨 构建命令 (默认: npm run build): ',
      'npm run build'
    );
    
    // 启动命令
    this.projectInfo.serveCommand = await this.askQuestion(
      '🚀 启动命令 (默认: npm run serve): ',
      'npm run serve'
    );
    
    // 组件路径
    const componentPaths = await this.askQuestion(
      '📁 组件扫描路径 (默认: src/**/*.vue): ',
      'src/**/*.vue'
    );
    this.projectInfo.componentPaths = componentPaths.split(',').map(p => p.trim());
    
    // 排除路径
    const excludePaths = await this.askQuestion(
      '🚫 排除路径 (默认: node_modules,dist,.git,bklog/web/scripts): ',
      'node_modules,dist,.git,bklog/web/scripts'
    );
    this.projectInfo.excludePaths = excludePaths.split(',').map(p => p.trim());
    
    // 测试路由
    const routes = await this.askQuestion(
      '🛣️ 要测试的路由 (默认: /,/dashboard): ',
      '/,/dashboard'
    );
    this.projectInfo.routes = routes.split(',').map(r => r.trim());
    
    // 关键组件
    const criticalComponents = await this.askQuestion(
      '🎯 关键组件路径 (可选，用逗号分隔): ',
      ''
    );
    this.projectInfo.criticalComponents = criticalComponents ? 
      criticalComponents.split(',').map(c => c.trim()) : [];
    
    // 分析根目录
    this.projectInfo.root = await this.askQuestion(
      '📁 分析根目录 (默认: ./): ',
      './'
    );
    
    console.log('\n✅ 配置收集完成！');
  }

  // 询问问题
  askQuestion(question, defaultValue) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  // 获取默认项目信息
  getDefaultProjectInfo() {
    return {
      name: this.projectInfo.name || 'vue-project',
      url: 'http://localhost:8080',
      buildCommand: 'npm run build',
      serveCommand: 'npm run serve',
      componentPaths: ['src/**/*.vue', 'src/**/*.jsx', 'src/**/*.tsx'],
      excludePaths: ['node_modules', 'dist', '.git', 'regression-data', 'bklog/web/scripts'],
      routes: ['/'],
      criticalComponents: [],
      root: '../../',
    };
  }

  // 创建配置文件
  async createConfigurationFile(options) {
    console.log('📝 创建配置文件...');
    
    const configTemplate = {
      project: {
        name: this.projectInfo.name,
        version: this.projectInfo.version,
        vueVersion: this.projectInfo.vueVersion,
        url: this.projectInfo.url,
        buildCommand: this.projectInfo.buildCommand,
        serveCommand: this.projectInfo.serveCommand,
        root: this.projectInfo.root || './' // 分析根目录，默认为当前目录
    },
    scan: {
        componentPaths: this.projectInfo.componentPaths,
        excludePaths: [
          ...this.projectInfo.excludePaths,
          '**/regression-data/**',
          '**/bklog/web/scripts/**',
          '**/.git/**',
          '**/node_modules/**'
        ],
      utilityPaths: ['src/**/*.js', 'src/**/*.ts'],
    },
    mock: {
      outputPath: './regression-data/mock',
      apiTimeout: 30000,
        routes: this.projectInfo.routes,
        maxRetries: 3,
        recordingOptions: {
          includeHeaders: true,
          includeBody: true,
          filterSensitiveData: true
        }
    },
    test: {
      outputPath: './regression-data/reports',
      screenshotPath: './regression-data/screenshots',
      timeout: 60000,
      retries: 2,
        thresholds: {
          imageDifference: 0.1,
          performanceBudget: 5000
        }
      },
      analysis: {
        riskThresholds: {
          high: 50,
          medium: 20,
          low: 10
        },
        excludePatterns: [
          '**/regression-data/**',
          '**/test/**',
          '**/tests/**',
          '**/*.spec.js',
          '**/*.test.js'
        ]
    },
    risk: {
        criticalComponents: this.projectInfo.criticalComponents,
        highRiskFiles: [],
        monitoredDirectories: ['src/components', 'src/views', 'src/utils']
      },
      hooks: {
        preCommit: true,
        prePush: false,
        maxRiskLevel: 'high'
      }
    };

    const configPath = './regression.config.js';
    const configContent = `module.exports = ${JSON.stringify(configTemplate, null, 2)};`;
    
    if (fs.existsSync(configPath) && !options.force) {
      console.log('⚠️ 配置文件已存在，使用 --force 覆盖');
    } else {
      fs.writeFileSync(configPath, configContent);
      console.log('✅ 配置文件已创建: regression.config.js');
    }
  }

  // 创建目录结构
  async createDirectoryStructure() {
    console.log('📁 创建目录结构...');
    
  const dirs = [
    './regression-data',
    './regression-data/mock',
    './regression-data/reports',
    './regression-data/screenshots',
    './regression-data/baselines',
      './regression-data/temp',
      './regression-data/cache'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✅ 创建目录: ${dir}`);
      } else {
        console.log(`  📁 目录已存在: ${dir}`);
      }
    });

    // 创建 .gitignore 规则
    await this.updateGitignore();
  }

  // 更新 .gitignore
  async updateGitignore() {
    const gitignoreRules = [
      '# 回归测试数据',
      'regression-data/temp/',
      'regression-data/cache/',
      'regression-data/reports/',
      'regression-data/screenshots/',
      '# 但保留Mock数据',
      '!regression-data/mock/',
      ''
    ];

    const gitignorePath = './.gitignore';
    let existingContent = '';
    
    if (fs.existsSync(gitignorePath)) {
      existingContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    if (!existingContent.includes('regression-data')) {
      const newContent = existingContent + '\n' + gitignoreRules.join('\n');
      fs.writeFileSync(gitignorePath, newContent);
      console.log('  ✅ 更新 .gitignore');
    }
  }

  // 安装依赖
  async installDependencies(options) {
    console.log('📦 检查并安装依赖...');
    
    const requiredDeps = [
      'chokidar',
      'glob',
      'puppeteer'
    ];

    const devDeps = [
      '@babel/parser',
      '@babel/traverse',
      '@babel/types'
    ];

    // 检查现有依赖
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const missingDeps = requiredDeps.filter(dep => !allDeps[dep]);
    const missingDevDeps = devDeps.filter(dep => !allDeps[dep]);

    if (missingDeps.length === 0 && missingDevDeps.length === 0) {
      console.log('✅ 所有依赖已安装');
      return;
    }

    console.log('🔧 安装缺失的依赖...');
    
    // 安装生产依赖
    if (missingDeps.length > 0) {
      console.log(`安装依赖: ${missingDeps.join(', ')}`);
      await this.runCommand('npm', ['install', ...missingDeps], options.verbose);
    }
    
    // 安装开发依赖
    if (missingDevDeps.length > 0) {
      console.log(`安装开发依赖: ${missingDevDeps.join(', ')}`);
      await this.runCommand('npm', ['install', '--save-dev', ...missingDevDeps], options.verbose);
    }
    
    console.log('✅ 依赖安装完成');
  }

  // 运行命令
  runCommand(command, args, verbose = false) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: verbose ? 'inherit' : 'pipe',
        shell: true
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`命令执行失败: ${command} ${args.join(' ')}`));
        }
      });

      proc.on('error', reject);
    });
  }

  // 创建脚本文件
  async createScriptFiles(options) {
    console.log('📜 创建快捷脚本...');
    
    // 更新 package.json 脚本
    const packageJsonPath = './package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const scripts = {
      'regression:analyze': 'node bklog/web/scripts/regression-analyze.js',
      'regression:watch': 'node bklog/web/scripts/regression-watch.js',
      'regression:record': 'node bklog/web/scripts/regression-record.js',
      'regression:analyze:staged': 'node bklog/web/scripts/regression-analyze.js --staged',
      'regression:analyze:verbose': 'node bklog/web/scripts/regression-analyze.js --verbose',
      'regression:watch:auto': 'node bklog/web/scripts/regression-watch.js --auto-analyze',
      'regression:record:auto': 'node bklog/web/scripts/regression-record.js --auto-start'
    };

    let scriptsAdded = 0;
    Object.entries(scripts).forEach(([name, command]) => {
      if (!packageJson.scripts[name] || options.force) {
        packageJson.scripts[name] = command;
        scriptsAdded++;
      }
    });

    if (scriptsAdded > 0) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(`✅ 添加了 ${scriptsAdded} 个脚本到 package.json`);
    } else {
      console.log('📜 脚本已存在');
    }
  }

  // 检查是否有Git仓库
  hasGitRepo() {
    return fs.existsSync('./.git');
  }

  // 设置Git钩子
  async setupGitHooks(options) {
    console.log('🪝 设置Git钩子...');
    
    if (!this.hasGitRepo()) {
      console.log('⚠️ 未找到Git仓库，跳过钩子设置');
      return;
    }

    const hooksDir = './.git/hooks';
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Pre-commit 钩子
    const preCommitHook = `#!/bin/sh
# Vue 回归测试预提交钩子
echo "🔍 运行回归测试分析..."

# 运行staged分析
npm run regression:analyze:staged

# 检查退出码
if [ $? -ne 0 ]; then
  echo "❌ 回归测试检测到高风险变更"
  echo "💡 运行 'npm run regression:analyze:staged' 查看详情"
  echo "🚫 使用 'git commit --no-verify' 跳过检查"
  exit 1
fi

echo "✅ 回归测试通过"
`;

    const preCommitPath = path.join(hooksDir, 'pre-commit');
    
    if (!fs.existsSync(preCommitPath) || options.force) {
      fs.writeFileSync(preCommitPath, preCommitHook);
      fs.chmodSync(preCommitPath, '755');
      console.log('✅ Pre-commit 钩子已安装');
    } else {
      console.log('⚠️ Pre-commit 钩子已存在');
    }

    // Prepare-commit-msg 钩子 (添加风险信息到提交消息)
    const prepareCommitHook = `#!/bin/sh
# 添加回归测试信息到提交消息

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# 只在普通提交时运行
if [ "$COMMIT_SOURCE" = "" ] || [ "$COMMIT_SOURCE" = "template" ]; then
  # 运行快速分析
  RISK_LEVEL=$(npm run regression:analyze:staged --silent 2>/dev/null | grep "风险等级" | cut -d: -f2 | xargs)
  
  if [ ! -z "$RISK_LEVEL" ]; then
    echo "" >> "$COMMIT_MSG_FILE"
    echo "Regression-Test: $RISK_LEVEL" >> "$COMMIT_MSG_FILE"
  fi
fi
`;

    const prepareCommitPath = path.join(hooksDir, 'prepare-commit-msg');
    
    if (!fs.existsSync(prepareCommitPath) || options.force) {
      fs.writeFileSync(prepareCommitPath, prepareCommitHook);
      fs.chmodSync(prepareCommitPath, '755');
      console.log('✅ Prepare-commit-msg 钩子已安装');
    }
  }

  // 生成使用文档
  async generateDocumentation() {
    console.log('📚 生成使用文档...');
    
    const documentation = `# Vue 回归测试系统使用指南

## 快速开始

### 1. 基本分析
\`\`\`bash
# 分析当前所有变更
npm run regression:analyze

# 只分析已staged的修改
npm run regression:analyze:staged

# 显示详细信息
npm run regression:analyze:verbose
\`\`\`

### 2. 实时监控
\`\`\`bash
# 启动文件监控
npm run regression:watch

# 自动分析模式
npm run regression:watch:auto
\`\`\`

### 3. Mock数据录制
\`\`\`bash
# 录制Mock数据
npm run regression:record

# 自动启动服务器录制
npm run regression:record:auto
\`\`\`

## 高级用法

### 命令行选项

#### 分析工具
- \`--staged\`: 只分析已staged的修改
- \`--working\`: 分析工作目录所有修改
- \`--commit <hash>\`: 分析指定提交
- \`--verbose\`: 显示详细信息
- \`--dry-run\`: 预览模式
- \`--format <type>\`: 输出格式 (html, md, json, all)
- \`--max-risk <level>\`: 最大风险等级

#### 监控工具
- \`--auto-analyze\`: 自动完整分析
- \`--debounce <ms>\`: 防抖延迟
- \`--batch-size <n>\`: 批处理大小
- \`--verbose\`: 显示详细信息

#### 录制工具
- \`--auto-start\`: 自动启动服务器
- \`--route <path>\`: 指定录制路由
- \`--concurrency <n>\`: 并发录制数
- \`--timeout <ms>\`: 连接超时

### 配置文件

配置文件位于 \`regression.config.js\`，包含以下主要配置：

- \`project\`: 项目基本信息
  - \`root\`: 🆕 分析根目录（默认: ./）
- \`scan\`: 扫描路径和排除规则
- \`mock\`: Mock数据录制配置
- \`test\`: 测试相关配置
- \`analysis\`: 分析算法配置
- \`risk\`: 风险评估配置

### 根目录配置

可以通过 \`project.root\` 配置项指定分析的根目录：

\`\`\`javascript
// regression.config.js
module.exports = {
  project: {
    root: "./",     // 当前目录（默认）
    // root: "./src",  // src目录  
    // root: "../",    // 上级目录
  }
};
\`\`\`

### Git集成

系统已自动设置Git钩子：

- **Pre-commit**: 在提交前自动运行回归分析
- **Prepare-commit-msg**: 在提交消息中添加风险等级信息

跳过检查：
\`\`\`bash
git commit --no-verify
\`\`\`

### 输出文件

- \`regression-data/reports/\`: 分析报告
- \`regression-data/mock/\`: Mock数据
- \`regression-data/screenshots/\`: 截图对比
- \`regression-data/baselines/\`: 基准数据

## 最佳实践

1. **提交前检查**: 使用 \`npm run regression:analyze:staged\` 检查staged变更
2. **开发时监控**: 使用 \`npm run regression:watch:auto\` 实时监控
3. **定期录制**: 定期更新Mock数据以保持准确性
4. **关键组件**: 在配置中标记关键组件，获得更精确的风险评估

## 故障排除

### 常见问题

1. **依赖缺失**: 运行 \`npm install\` 安装所需依赖
2. **权限错误**: 确保Git钩子有执行权限
3. **路径问题**: 检查配置文件中的路径设置
4. **服务器连接**: 确保开发服务器正常运行

### 调试模式

使用 \`--verbose\` 参数获得详细的调试信息：
\`\`\`bash
npm run regression:analyze:verbose
\`\`\`

## 更多信息

- 配置文件: \`regression.config.js\`
- 脚本目录: \`bklog/web/scripts/\`
- 系统核心: \`bklog/web/regression-system/\`

---
*由 Vue 回归测试系统生成 • ${new Date().toLocaleString()}*
`;

    const docPath = './REGRESSION_TESTING.md';
    fs.writeFileSync(docPath, documentation);
    console.log('✅ 使用文档已生成: REGRESSION_TESTING.md');
  }

  // 显示完成信息
  displayCompletionInfo() {
    console.log('\n🎉 Vue 回归测试系统初始化完成！');
    
    console.log('\n📋 已完成的设置:');
    console.log('  ✅ 配置文件: regression.config.js');
    console.log('  ✅ 目录结构: regression-data/');
    console.log('  ✅ NPM脚本: package.json');
    console.log('  ✅ Git钩子: .git/hooks/');
    console.log('  ✅ 使用文档: REGRESSION_TESTING.md');
    
    console.log('\n🚀 快速开始:');
    console.log('  # 分析当前变更');
    console.log('  npm run regression:analyze');
    console.log('');
    console.log('  # 启动实时监控');
    console.log('  npm run regression:watch');
    console.log('');
    console.log('  # 录制Mock数据');
    console.log('  npm run regression:record');
    
    console.log('\n📚 更多信息请查看: REGRESSION_TESTING.md');
    console.log('\n💡 提示: Git提交时会自动运行回归测试检查');
  }

  // 显示帮助信息
  showHelp() {
    console.log(`
🚀 Vue 回归测试系统初始化工具

用法:
  node regression-init.js [选项]

选项:
  --skip-wizard     跳过配置向导，使用默认配置
  --skip-deps       跳过依赖安装
  --skip-hooks      跳过Git钩子设置
  --force           强制覆盖现有文件
  --verbose, -v     显示详细信息
  --help, -h        显示此帮助信息

功能:
  ✅ 智能项目检测，自适应Vue版本
  ✅ 交互式配置向导，个性化设置
  ✅ 自动依赖管理，一键安装所需包
  ✅ Git钩子集成，无缝CI/CD流程
  ✅ 完整文档生成，快速上手指南

示例:
  node regression-init.js                    # 完整初始化（推荐）
  node regression-init.js --skip-wizard     # 快速初始化，使用默认配置
  node regression-init.js --force           # 强制重新初始化
  node regression-init.js --verbose         # 显示详细过程
`);
  }
}

// 主入口
if (require.main === module) {
  const initializer = new RegressionInitializer();
  initializer.initialize().catch(error => {
    console.error('初始化程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = RegressionInitializer;
