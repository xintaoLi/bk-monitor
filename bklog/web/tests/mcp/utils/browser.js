/**
 * 浏览器工具函数 - 针对 Vue 2 + BK UI 优化
 * 使用 chrome-devtools-mcp 提供的浏览器能力
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 获取基础 URL
 * @returns {string}
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
        const configPath = path.join(process.cwd(), 'mcp-e2e.config.js');
        if (fs.existsSync(configPath)) {
            const configModule = await import(`file://${configPath}`);
            const config = configModule.default || configModule;
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

/**
 * 打开应用并返回浏览器和页面实例
 * @param {object} ctx - MCP 上下文
 * @param {string} url - 目标 URL（可选，默认使用配置的 baseUrl）
 * @returns {Promise<{browser: object, page: object}>}
 */
export async function openApp(ctx, url = null) {
    const baseUrl = url || ctx.options?.baseUrl || await getBaseUrl();
    console.log(`正在打开应用: ${baseUrl}`);

    // 启动浏览器
    const browser = await ctx.puppeteer.launch({
        headless: ctx.options?.headless !== undefined ? ctx.options.headless : false,
        slowMo: ctx.options?.slowMo || 100,
        defaultViewport: {
            width: 1920,
            height: 1080,
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
        ],
    });

    const page = await browser.newPage();

    // 设置更长的超时时间
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    // 监听控制台输出
    page.on('console', msg => {
        const type = msg.type();
        if (type === 'error') {
            console.error('浏览器控制台错误:', msg.text());
        }
    });

    // 监听页面错误
    page.on('pageerror', error => {
        console.error('页面错误:', error.message);
    });

    await page.goto(baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
    });

    return { browser, page, baseUrl };
}

/**
 * 等待选择器出现
 * @param {object} page - Puppeteer 页面对象
 * @param {string} selector - CSS 选择器
 * @param {object} options - 选项
 */
export async function waitForSelector(page, selector, options = {}) {
    const timeout = options.timeout || 10000;
    console.log(`等待元素: ${selector} (超时: ${timeout}ms)`);

    try {
        await page.waitForSelector(selector, { timeout, ...options });
        console.log(`✓ 元素已找到: ${selector}`);
    } catch (error) {
        console.error(`✗ 元素未找到: ${selector}`);
        throw error;
    }
}

/**
 * 等待文本内容出现
 * @param {object} page - Puppeteer 页面对象
 * @param {string} text - 文本内容
 * @param {object} options - 选项
 */
export async function waitForText(page, text, options = {}) {
    const timeout = options.timeout || 10000;
    console.log(`等待文本: ${text}`);

    await page.waitForFunction(
        (searchText) => {
            return document.body.innerText.includes(searchText);
        },
        { timeout },
        text
    );

    console.log(`✓ 文本已找到: ${text}`);
}

/**
 * 点击元素
 * @param {object} page - Puppeteer 页面对象
 * @param {string} selector - CSS 选择器
 * @param {object} options - 选项
 */
export async function clickElement(page, selector, options = {}) {
    console.log(`点击元素: ${selector}`);

    await waitForSelector(page, selector, options);

    // 等待元素可点击
    await page.waitForFunction(
        (sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        },
        { timeout: 5000 },
        selector
    );

    // BK UI 组件可能需要等待一下
    await page.waitForTimeout(300);

    await page.click(selector);
    console.log(`✓ 已点击: ${selector}`);

    // 点击后等待一下
    await page.waitForTimeout(500);
}

/**
 * 输入文本
 * @param {object} page - Puppeteer 页面对象
 * @param {string} selector - CSS 选择器
 * @param {string} text - 输入的文本
 * @param {object} options - 选项
 */
export async function typeText(page, selector, text, options = {}) {
    console.log(`输入文本到 ${selector}: ${text}`);

    await waitForSelector(page, selector, options);

    // 清空已有内容
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press('Backspace');

    // 输入新内容
    await page.type(selector, text, {
        delay: options.delay || 50,
    });

    console.log(`✓ 文本已输入: ${text}`);
}

/**
 * 选择下拉框选项
 * @param {object} page - Puppeteer 页面对象
 * @param {string} selector - CSS 选择器
 * @param {string} value - 选项值
 */
export async function selectOption(page, selector, value) {
    console.log(`选择选项 ${selector}: ${value}`);

    await waitForSelector(page, selector);
    await page.select(selector, value);

    console.log(`✓ 已选择: ${value}`);
}

/**
 * 滚动到元素位置
 * @param {object} page - Puppeteer 页面对象
 * @param {string} selector - CSS 选择器
 */
export async function scrollToElement(page, selector) {
    console.log(`滚动到元素: ${selector}`);

    await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, selector);

    await page.waitForTimeout(500);
}

/**
 * 截图
 * @param {object} page - Puppeteer 页面对象
 * @param {string} name - 截图名称
 */
export async function takeScreenshot(page, name) {
    const screenshotDir = path.join(process.cwd(), 'tests/mcp/screenshots');

    // 确保目录存在
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);

    await page.screenshot({
        path: filepath,
        fullPage: false,
    });

    console.log(`✓ 截图已保存: ${filepath}`);

    return filepath;
}

/**
 * 等待 BK Loading 消失
 * @param {object} page - Puppeteer 页面对象
 */
export async function waitForBkLoading(page, timeout = 15000) {
    console.log('等待 BK Loading 消失...');

    try {
        await page.waitForFunction(
            () => {
                const loadings = document.querySelectorAll('.bk-loading, .bk-loading-wrapper, [v-bkloading]');
                return loadings.length === 0 || Array.from(loadings).every(el => el.style.display === 'none');
            },
            { timeout }
        );
        console.log('✓ Loading 已消失');
    } catch (error) {
        console.warn('⚠ Loading 未在规定时间内消失，继续执行');
    }
}

/**
 * 等待网络空闲
 * @param {object} page - Puppeteer 页面对象
 */
export async function waitForNetworkIdle(page, timeout = 5000) {
    console.log('等待网络空闲...');

    try {
        await page.waitForNetworkIdle({ timeout });
        console.log('✓ 网络已空闲');
    } catch (error) {
        console.warn('⚠ 网络未在规定时间内空闲，继续执行');
    }
}

/**
 * 获取元素文本
 * @param {object} page - Puppeteer 页面对象
 * @param {string} selector - CSS 选择器
 * @returns {Promise<string>}
 */
export async function getElementText(page, selector) {
    await waitForSelector(page, selector);

    const text = await page.$eval(selector, el => el.textContent.trim());
    console.log(`获取文本 ${selector}: ${text}`);

    return text;
}

/**
 * 检查元素是否存在
 * @param {object} page - Puppeteer 页面对象
 * @param {string} selector - CSS 选择器
 * @returns {Promise<boolean>}
 */
export async function elementExists(page, selector) {
    const element = await page.$(selector);
    const exists = element !== null;

    console.log(`元素 ${selector} ${exists ? '存在' : '不存在'}`);

    return exists;
}

/**
 * 等待并点击 BK UI 按钮
 * @param {object} page - Puppeteer 页面对象
 * @param {string} text - 按钮文本
 */
export async function clickBkButton(page, text) {
    console.log(`点击 BK 按钮: ${text}`);

    await page.evaluate((buttonText) => {
        const buttons = Array.from(document.querySelectorAll('.bk-button'));
        const button = buttons.find(btn => btn.textContent.trim() === buttonText);
        if (button) {
            button.click();
        } else {
            throw new Error(`未找到按钮: ${buttonText}`);
        }
    }, text);

    await page.waitForTimeout(500);
    console.log(`✓ 已点击按钮: ${text}`);
}

/**
 * 等待 Vue 组件渲染完成
 * @param {object} page - Puppeteer 页面对象
 * @param {string} componentSelector - 组件选择器
 */
export async function waitForVueComponent(page, componentSelector, timeout = 10000) {
    console.log(`等待 Vue 组件渲染: ${componentSelector}`);

    await page.waitForFunction(
        (selector) => {
            const el = document.querySelector(selector);
            return el && el.__vue__;
        },
        { timeout },
        componentSelector
    );

    console.log(`✓ Vue 组件已渲染: ${componentSelector}`);
}

/**
 * 延迟执行
 * @param {number} ms - 延迟毫秒数
 */
export async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
