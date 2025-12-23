#!/usr/bin/env node

/**
 * 组件级测试脚本
 * 用于单独测试各个组件的功能
 * 
 * 用法:
 *   npm run test:component                     # 运行所有组件测试
 *   npm run test:component -- space            # 只测试业务切换组件
 *   npm run test:component -- index            # 只测试索引选择组件
 *   npm run test:component -- search           # 只测试检索框组件
 */

const path = require('path');
const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const MCP_CLI_DIR = path.join(ROOT_DIR, 'packages/mcp-cli');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    red: '\x1b[31m',
    bold: '\x1b[1m',
    cyan: '\x1b[96m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 组件测试配置
 */
const COMPONENT_TESTS = {
    space: {
        name: '业务切换组件 (bk-space-choice)',
        task: 'space-choice-component',
        description: '测试业务选择、搜索、类型筛选、键盘导航等功能',
    },
};

/**
 * 获取测试基础 URL
 */
function getBaseUrl() {
    // 1. 命令行参数 --url=xxx
    const urlArg = process.argv.find(arg => arg.startsWith('--url='));
    if (urlArg) {
        return urlArg.split('=')[1];
    }

    // 2. 环境变量
    if (process.env.MCP_BASE_URL) {
        return process.env.MCP_BASE_URL;
    }

    // 3. 读取配置文件
    try {
        const config = require(path.join(ROOT_DIR, 'mcp-e2e.config.js'));
        if (config?.devServer?.url) {
            return config.devServer.url;
        }
    } catch (e) {
        // 配置文件不存在
    }

    // 4. 默认值
    return 'http://localhost:8081';
}

/**
 * 检查开发服务器
 */
async function checkDevServer(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

/**
 * 运行单个组件测试
 */
async function runComponentTest(componentKey, baseUrl) {
    const component = COMPONENT_TESTS[componentKey];

    log('\n' + '═'.repeat(60), 'cyan');
    log(`  📦 ${component.name}`, 'bold');
    log(`  ${component.description}`, 'yellow');
    log('═'.repeat(60) + '\n', 'cyan');

    try {
        // 使用 mcp-cli 运行 task
        const runScript = path.join(MCP_CLI_DIR, 'dist/commands/run.js');

        // 临时只保留该组件的 task 文件
        const tasksDir = path.join(ROOT_DIR, '.mcp/tasks');
        const allTasks = require('fs').readdirSync(tasksDir).filter(f => f.endsWith('.task.json'));
        const targetTask = `${component.task}.task.json`;

        // 备份其他 task
        const backupDir = path.join(tasksDir, '.backup');
        if (!require('fs').existsSync(backupDir)) {
            require('fs').mkdirSync(backupDir, { recursive: true });
        }

        for (const task of allTasks) {
            if (task !== targetTask) {
                require('fs').renameSync(
                    path.join(tasksDir, task),
                    path.join(backupDir, task)
                );
            }
        }

        try {
            execSync(`node "${runScript}"`, {
                cwd: ROOT_DIR,
                stdio: 'inherit',
                env: {
                    ...process.env,
                    USE_PUPPETEER: 'true',
                    MCP_BASE_URL: baseUrl,
                }
            });
        } finally {
            // 恢复其他 task
            for (const task of allTasks) {
                if (task !== targetTask) {
                    const backupPath = path.join(backupDir, task);
                    if (require('fs').existsSync(backupPath)) {
                        require('fs').renameSync(backupPath, path.join(tasksDir, task));
                    }
                }
            }
        }

        log(`\n✅ ${component.name} 测试通过\n`, 'green');
        return true;
    } catch (error) {
        log(`\n❌ ${component.name} 测试失败\n`, 'red');
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    console.clear();

    const baseUrl = getBaseUrl();

    // 获取要测试的组件
    const componentArg = process.argv.find(arg =>
        !arg.startsWith('--') &&
        !arg.includes('node') &&
        !arg.includes('.js') &&
        arg !== 'test:component'
    );

    let componentsToTest = [];

    if (componentArg) {
        // 测试指定组件
        const component = Object.keys(COMPONENT_TESTS).find(key =>
            key.startsWith(componentArg.toLowerCase())
        );

        if (component) {
            componentsToTest = [component];
        } else {
            log(`❌ 未找到组件: ${componentArg}`, 'red');
            log('\n可用的组件:', 'yellow');
            Object.entries(COMPONENT_TESTS).forEach(([key, config]) => {
                log(`  • ${key} - ${config.name}`, 'cyan');
            });
            process.exit(1);
        }
    } else {
        // 测试所有组件
        componentsToTest = Object.keys(COMPONENT_TESTS);
    }

    log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║         🧩  组件级自动化测试工具  🧩                      ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝\n', 'cyan');

    log('📋 测试说明:', 'bold');
    log('   • 专门针对单个组件的功能测试', 'yellow');
    log('   • 避免长流程导致的冗余测试', 'yellow');
    log('   • 测试更加精准和快速\n', 'yellow');

    log(`📍 测试服务器: ${baseUrl}`, 'blue');
    log(`📦 测试组件数: ${componentsToTest.length}`, 'blue');

    componentsToTest.forEach(key => {
        log(`   • ${COMPONENT_TESTS[key].name}`, 'cyan');
    });

    // 检查开发服务器
    log(`\n🔍 检查开发服务器 (${baseUrl})...`, 'blue');
    const serverRunning = await checkDevServer(baseUrl);

    if (!serverRunning) {
        log('⚠️  无法连接到开发服务器', 'yellow');
        log('\n可能的原因:', 'yellow');
        log('   1. 开发服务器未启动', 'yellow');
        log('   2. URL 配置错误', 'yellow');
        log('   3. 服务器正在启动中\n', 'yellow');

        log('将在 5 秒后继续执行...', 'yellow');
        for (let i = 5; i > 0; i--) {
            process.stdout.write(`   ${i}... `);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('\n');
    } else {
        log('✅ 开发服务器运行正常\n', 'green');
    }

    // 构建
    log('🔨 构建测试工具...', 'blue');
    try {
        execSync('npm run build', {
            cwd: MCP_CLI_DIR,
            stdio: 'pipe'
        });
        log('✅ 构建完成\n', 'green');
    } catch (error) {
        log('❌ 构建失败\n', 'red');
        process.exit(1);
    }

    // 运行测试
    const results = [];
    for (const componentKey of componentsToTest) {
        const success = await runComponentTest(componentKey, baseUrl);
        results.push({
            component: COMPONENT_TESTS[componentKey].name,
            success
        });
    }

    // 汇总结果
    log('\n' + '═'.repeat(60), 'cyan');
    log('  📊 测试结果汇总', 'bold');
    log('═'.repeat(60), 'cyan');

    const passCount = results.filter(r => r.success).length;
    const failCount = results.length - passCount;

    results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const color = result.success ? 'green' : 'red';
        log(`  ${icon} ${result.component}`, color);
    });

    log('\n' + '═'.repeat(60), 'cyan');
    log(`  总计: ${results.length} | 通过: ${passCount} | 失败: ${failCount}`, 'bold');
    log('═'.repeat(60) + '\n', 'cyan');

    log('📊 查看测试报告:', 'blue');
    log('   npm run test:report', 'green');

    if (failCount > 0) {
        process.exit(1);
    }
}

// 处理中断
process.on('SIGINT', () => {
    log('\n\n⚠️  测试已取消\n', 'yellow');
    process.exit(0);
});

main();
