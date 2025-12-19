#!/usr/bin/env node

/**
 * 本地 MCP E2E 测试脚本
 * 使用本地 mcp-cli 源码进行测试，无需发布 npm
 */

const path = require('path');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const MCP_CLI_DIR = path.join(ROOT_DIR, 'packages/mcp-cli');
const CONFIG_FILE = path.join(ROOT_DIR, 'mcp-e2e.config.js');

/**
 * 获取基础 URL
 */
function getBaseUrl() {
    // 优先使用环境变量
    if (process.env.MCP_BASE_URL) {
        return process.env.MCP_BASE_URL;
    }
    if (process.env.MCP_DEV_SERVER_URL) {
        return process.env.MCP_DEV_SERVER_URL;
    }

    // 尝试读取配置文件
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = require(CONFIG_FILE);
            if (config.devServer?.url) {
                return config.devServer.url;
            }
        }
    } catch (e) {
        // 忽略配置读取错误
    }

    // 默认值
    return 'http://localhost:8081';
}

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    red: '\x1b[31m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n[${step}] ${message}`, 'blue');
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠ ${message}`, 'yellow');
}

// 检查环境
function checkEnvironment() {
    logStep('1/6', '检查环境');

    // 检查 Node.js 版本
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
        logError(`Node.js 版本过低，需要 18+，当前版本: ${nodeVersion}`);
        process.exit(1);
    }
    logSuccess(`Node.js 版本: ${nodeVersion}`);

    // 检查 mcp-cli 目录
    if (!fs.existsSync(MCP_CLI_DIR)) {
        logError('mcp-cli 目录不存在');
        process.exit(1);
    }
    logSuccess('mcp-cli 目录存在');

    // 检查配置文件
    if (!fs.existsSync(CONFIG_FILE)) {
        logWarning('配置文件不存在，将使用默认配置');
    } else {
        logSuccess('配置文件存在');
    }
}

// 构建 mcp-cli
function buildMcpCli() {
    logStep('2/6', '构建 mcp-cli');

    try {
        process.chdir(MCP_CLI_DIR);

        // 安装依赖
        if (!fs.existsSync(path.join(MCP_CLI_DIR, 'node_modules'))) {
            log('安装依赖...');
            execSync('npm install', { stdio: 'inherit' });
            logSuccess('依赖安装完成');
        } else {
            logSuccess('依赖已存在');
        }

        // 构建
        log('构建 TypeScript...');
        execSync('npm run build', { stdio: 'inherit' });
        logSuccess('构建完成');

        process.chdir(ROOT_DIR);
    } catch (error) {
        logError(`构建失败: ${error.message}`);
        process.exit(1);
    }
}

// 分析组件变更
function analyzeChanges() {
    logStep('3/6', '分析组件变更');

    try {
        const analyzeScript = path.join(MCP_CLI_DIR, 'dist/commands/analyze.js');

        if (!fs.existsSync(analyzeScript)) {
            logError('analyze 命令不存在，请先构建 mcp-cli');
            process.exit(1);
        }

        // 使用 Node.js 直接运行编译后的脚本
        log('正在分析组件依赖...');
        execSync(`node ${analyzeScript}`, {
            stdio: 'inherit',
            cwd: ROOT_DIR,
        });

        logSuccess('分析完成');
    } catch (error) {
        logWarning(`分析失败: ${error.message}`);
        log('将跳过分析步骤，继续执行');
    }
}

// 生成测试流程
function generateTests() {
    logStep('4/6', '生成测试流程');

    try {
        const generateScript = path.join(MCP_CLI_DIR, 'dist/commands/generate.js');

        if (!fs.existsSync(generateScript)) {
            logError('generate 命令不存在，请先构建 mcp-cli');
            process.exit(1);
        }

        log('正在生成测试流程...');
        execSync(`node ${generateScript}`, {
            stdio: 'inherit',
            cwd: ROOT_DIR,
        });

        logSuccess('测试流程生成完成');

        // 列出生成的测试文件
        const generatedDir = path.join(ROOT_DIR, 'tests/mcp/generated');
        if (fs.existsSync(generatedDir)) {
            const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.flow.js'));
            if (files.length > 0) {
                log('\n生成的测试文件:');
                files.forEach(file => log(`  - ${file}`, 'green'));
            }
        }
    } catch (error) {
        logWarning(`生成失败: ${error.message}`);
        log('将使用已有的测试文件');
    }
}

// 启动开发服务器
function startDevServer() {
    logStep('5/6', '启动开发服务器');

    return new Promise((resolve, reject) => {
        log('正在启动开发服务器...');

        const devServer = spawn('npm', ['run', 'dev'], {
            cwd: ROOT_DIR,
            stdio: 'pipe',
            shell: true,
        });

        let started = false;

        devServer.stdout.on('data', (data) => {
            const output = data.toString();
            process.stdout.write(output);

            // 检测服务器启动成功的标志
            if (output.includes('Webpack compiled') || output.includes('Compiled successfully')) {
                if (!started) {
                    started = true;
                    logSuccess('开发服务器已启动');
                    // 等待 2 秒确保完全就绪
                    setTimeout(() => resolve(devServer), 2000);
                }
            }
        });

        devServer.stderr.on('data', (data) => {
            process.stderr.write(data);
        });

        devServer.on('error', (error) => {
            logError(`启动服务器失败: ${error.message}`);
            reject(error);
        });

        // 30 秒超时
        setTimeout(() => {
            if (!started) {
                logWarning('开发服务器启动超时，假设已经在运行');
                resolve(null);
            }
        }, 30000);
    });
}

// 运行测试
async function runTests() {
    logStep('6/6', '运行测试');

    let devServer = null;
    const baseUrl = getBaseUrl();

    try {
        // 先检查开发服务器是否已经在运行
        const checkServer = () => {
            try {
                const http = require('http');
                return new Promise((resolve) => {
                    const req = http.get(baseUrl, (res) => {
                        resolve(true);
                    });
                    req.on('error', () => {
                        resolve(false);
                    });
                    req.setTimeout(2000, () => {
                        req.destroy();
                        resolve(false);
                    });
                });
            } catch {
                return Promise.resolve(false);
            }
        };

        const serverRunning = await checkServer();

        if (!serverRunning) {
            logWarning(`开发服务器 (${baseUrl}) 未运行，正在启动...`);
            devServer = await startDevServer();
        } else {
            logSuccess('开发服务器已在运行');
        }

        // 运行测试
        const runScript = path.join(MCP_CLI_DIR, 'dist/commands/run.js');

        if (!fs.existsSync(runScript)) {
            logError('run 命令不存在，请先构建 mcp-cli');
            process.exit(1);
        }

        log('\n正在执行测试...\n');
        execSync(`node ${runScript}`, {
            stdio: 'inherit',
            cwd: ROOT_DIR,
        });

        logSuccess('\n✓ 所有测试完成！');

        // 显示报告位置
        const reportDir = path.join(ROOT_DIR, 'tests/mcp/reports');
        if (fs.existsSync(reportDir)) {
            log(`\n测试报告位置: ${reportDir}`, 'blue');
        }
    } catch (error) {
        logError(`\n测试执行失败: ${error.message}`);
    } finally {
        // 清理：关闭开发服务器
        if (devServer) {
            log('\n正在关闭开发服务器...');
            devServer.kill();
        }
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'full';

    log('\n=== MCP E2E 本地测试工具 ===\n', 'blue');

    try {
        switch (command) {
            case 'check':
                checkEnvironment();
                break;

            case 'build':
                checkEnvironment();
                buildMcpCli();
                break;

            case 'analyze':
                checkEnvironment();
                buildMcpCli();
                analyzeChanges();
                break;

            case 'generate':
                checkEnvironment();
                buildMcpCli();
                generateTests();
                break;

            case 'test':
                await runTests();
                break;

            case 'full':
            default:
                checkEnvironment();
                buildMcpCli();
                analyzeChanges();
                generateTests();
                await runTests();
                break;
        }

        log('\n✓ 完成！\n', 'green');
    } catch (error) {
        log(`\n✗ 错误: ${error.message}\n`, 'red');
        process.exit(1);
    }
}

// 处理中断信号
process.on('SIGINT', () => {
    log('\n\n测试已取消', 'yellow');
    process.exit(0);
});

// 运行
main();
