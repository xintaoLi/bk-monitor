#!/usr/bin/env node

/**
 * 快速可视化测试 - 直接运行，无需启动开发服务器
 * 适用于开发服务器已经在运行的情况
 * 
 * 用法:
 *   npm run test:quick                    # 使用配置文件中的 URL
 *   npm run test:quick -- --url=http://localhost:8081  # 指定 URL
 *   MCP_BASE_URL=http://localhost:8081 npm run test:quick  # 环境变量
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

// 检查开发服务器
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
        req.on('error', (err) => {
            if (process.env.DEBUG) {
                console.log(`开发服务器检测错误: ${err.code} - ${err.message}`);
            }
            resolve(false);
        });
        req.setTimeout(3000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    console.clear();
    
    const baseUrl = getBaseUrl();

    log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║         🎬  自动化可视化测试工具  🎬                      ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝\n', 'cyan');

    log('📋 测试说明:', 'bold');
    log('   • Chrome 浏览器将自动打开（可见模式）', 'yellow');
    log('   • 您将实时看到所有操作步骤', 'yellow');
    log('   • 测试完成后浏览器会自动关闭', 'yellow');
    log('   • 测试报告会自动生成\n', 'yellow');
    
    log(`📍 测试服务器: ${baseUrl}`, 'blue');

    // 检查开发服务器
    log(`\n🔍 检查开发服务器 (${baseUrl})...`, 'blue');
    const serverRunning = await checkDevServer(baseUrl);

    if (!serverRunning) {
        log('⚠️  无法连接到开发服务器', 'yellow');
        log('\n可能的原因:', 'yellow');
        log('   1. 开发服务器未启动', 'yellow');
        log('   2. URL 配置错误', 'yellow');
        log('   3. 服务器正在启动中\n', 'yellow');

        log('您可以选择:', 'cyan');
        log('   • 按 Ctrl+C 取消，然后启动开发服务器 (npm run dev)', 'cyan');
        log('   • 或指定其他 URL: npm run test:quick -- --url=http://localhost:8081', 'cyan');
        log('   • 或者跳过检查继续运行\n', 'cyan');

        log('将在 5 秒后继续执行...', 'yellow');
        for (let i = 5; i > 0; i--) {
            process.stdout.write(`   ${i}... `);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('\n');
        log('⚡ 继续执行（跳过服务器检查）\n', 'cyan');
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

    // 倒计时
    log('⏳ 准备启动测试...', 'yellow');
    for (let i = 3; i > 0; i--) {
        process.stdout.write(`   ${i}... `);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');

    log('═'.repeat(60), 'cyan');
    log('  🚀 Chrome 浏览器即将打开', 'bold');
    log('  👀 请注意观察浏览器中的自动操作', 'bold');
    log('  ⏱️  整个过程大约需要 10-30 秒', 'bold');
    log('═'.repeat(60) + '\n', 'cyan');

    // 运行测试
    try {
        const runScript = path.join(MCP_CLI_DIR, 'dist/commands/run.js');

        execSync(`node "${runScript}"`, {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            env: {
                ...process.env,
                USE_PUPPETEER: 'true',
                FORCE_COLOR: '1',
                MCP_BASE_URL: baseUrl
            }
        });

        log('\n');
        log('═'.repeat(60), 'cyan');
        log('  ✅ 测试执行完成！', 'green');
        log('═'.repeat(60), 'cyan');

        log('\n📊 查看测试报告:', 'blue');
        log('   npm run test:report', 'green');

        log('\n💡 提示:', 'yellow');
        log('   • 报告保存在 .mcp/reports/ 目录', 'yellow');

    } catch (error) {
        log('\n❌ 测试执行失败\n', 'red');
        process.exit(1);
    }
}

// 处理中断
process.on('SIGINT', () => {
    log('\n\n⚠️  测试已取消\n', 'yellow');
    process.exit(0);
});

main();
