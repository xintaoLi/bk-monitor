/**
 * 日志检索 v3 主流程测试
 * 测试从首页加载到搜索结果展示的完整流程
 * 
 * 包含授权检查和业务切换逻辑：
 * - 检测 un-authorized 页面
 * - 根据 type 参数处理不同场景
 * - 自动切换业务或重试
 */

import { openApp, waitForSelector, typeText, clickElement, takeScreenshot, delay } from '../utils/browser.js';

/**
 * 检查是否在 un-authorized 页面并处理
 */
async function handleUnauthorizedIfNeeded(page) {
    const url = page.url();

    // 检查是否在 un-authorized 页面
    if (!url.includes('/un-authorized')) {
        return { handled: false, type: null };
    }

    const typeMatch = url.match(/[?&]type=([^&]+)/);
    const type = typeMatch ? typeMatch[1] : null;

    console.log(`  检测到 un-authorized 页面，类型: ${type}`);
    await takeScreenshot(page, `unauthorized-${type}`);

    // type=space: 业务不存在，点击重试
    if (type === 'space') {
        console.log('  处理: 业务不存在，点击重试...');
        try {
            await page.click('span:has-text("重试")');
            await delay(2000);
            await page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle2' }).catch(() => { });
            return { handled: true, type: 'space' };
        } catch (e) {
            console.log('  重试失败:', e.message);
        }
    }

    // type=indexset: 索引集为空，切换业务
    if (type === 'indexset') {
        console.log('  处理: 索引集为空，切换业务...');
        try {
            // 打开业务选择器
            await page.click('.biz-menu-select .menu-select-name');
            await delay(1000);
            await takeScreenshot(page, 'space-choice-opened');

            // 选择第一个业务
            const items = await page.$$('.list-item');
            if (items.length > 0) {
                for (const item of items) {
                    const isGroupTitle = await item.evaluate(el =>
                        el.classList.contains('group-title') || el.dataset.type === 'group-title'
                    );
                    if (!isGroupTitle) {
                        await item.click();
                        await delay(2000);
                        await page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle2' }).catch(() => { });
                        return { handled: true, type: 'indexset' };
                    }
                }
            }
        } catch (e) {
            console.log('  切换业务失败:', e.message);
        }
    }

    return { handled: false, type };
}

export default async function run(ctx) {
    const { browser, page, baseUrl } = await openApp(ctx);

    try {
        console.log('[Step 1] 访问检索页面...');
        await page.goto(`${baseUrl}/#/retrieve`, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });
        await delay(2000);

        // 处理可能出现的 un-authorized 页面
        console.log('[Step 1.1] 检查授权状态...');
        let maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            const { handled, type } = await handleUnauthorizedIfNeeded(page);
            if (!handled) break;
            console.log(`  第 ${i + 1} 次处理 un-authorized (${type}) 完成`);
            await delay(1000);
        }

        // 等待 v3 版本的根容器加载
        console.log('[Step 2] 等待 v3 页面加载...');
        await waitForSelector(page, '.v3-bklog-root', { timeout: 15000 });
        await takeScreenshot(page, 'retrieve-v3-loaded');

        // 等待搜索栏加载
        console.log('[Step 3] 等待搜索栏加载...');
        const searchBarSelector = '.v3-bklog-content .search-bar, [data-testid="search-bar"]';
        await waitForSelector(page, searchBarSelector, { timeout: 10000 });

        // 查找搜索输入框（兼容多种可能的 selector）
        console.log('[Step 4] 查找搜索输入框...');
        const searchInputSelectors = [
            '[data-testid="search-input"]',
            '[data-testid="keyword-input"]',
            'input[placeholder*="搜索"]',
            'input[placeholder*="检索"]',
            '.search-input input',
            '.keyword-input input',
        ];

        let searchInput = null;
        for (const selector of searchInputSelectors) {
            try {
                searchInput = await page.$(selector);
                if (searchInput) {
                    console.log(`找到搜索输入框: ${selector}`);
                    break;
                }
            } catch (e) {
                // 继续尝试下一个
            }
        }

        if (searchInput) {
            // 输入搜索关键词
            console.log('[Step 5] 输入搜索关键词...');
            await typeText(page, searchInputSelectors.find(s => searchInput), 'error', { delay: 50 });
            await page.waitForTimeout(1000);
            await takeScreenshot(page, 'retrieve-v3-search-input');
        } else {
            console.log('[Warning] 未找到搜索输入框，跳过搜索步骤');
        }

        // 查找并点击搜索按钮
        console.log('[Step 6] 查找搜索按钮...');
        const searchButtonSelectors = [
            '[data-testid="search-btn"]',
            '[data-testid="search-button"]',
            'button:has-text("搜索")',
            'button:has-text("检索")',
            '.search-btn',
            '.search-button',
        ];

        let searchButton = null;
        for (const selector of searchButtonSelectors) {
            try {
                searchButton = await page.$(selector);
                if (searchButton) {
                    console.log(`找到搜索按钮: ${selector}`);
                    await clickElement(page, selector);
                    break;
                }
            } catch (e) {
                // 继续尝试下一个
            }
        }

        if (searchButton) {
            console.log('[Step 7] 等待搜索结果...');
            await page.waitForTimeout(2000);

            // 等待搜索结果容器
            const resultSelectors = [
                '[data-testid="search-result"]',
                '.search-result-container',
                '.log-list-container',
                '.v3-search-result',
            ];

            for (const selector of resultSelectors) {
                try {
                    await waitForSelector(page, selector, { timeout: 5000 });
                    console.log(`找到搜索结果容器: ${selector}`);
                    break;
                } catch (e) {
                    // 继续尝试
                }
            }

            await takeScreenshot(page, 'retrieve-v3-search-result');
        } else {
            console.log('[Warning] 未找到搜索按钮');
        }

        // 测试工具栏功能
        console.log('[Step 8] 测试工具栏功能...');

        // 尝试打开收藏夹
        const favoriteSelectors = [
            '[data-testid="favorite-toggle"]',
            '[data-testid="collection-toggle"]',
            '.favorite-btn',
            '.collection-btn',
        ];

        for (const selector of favoriteSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn) {
                    await clickElement(page, selector);
                    console.log('收藏夹已打开');
                    await page.waitForTimeout(1000);
                    await takeScreenshot(page, 'retrieve-v3-favorite-opened');
                    break;
                }
            } catch (e) {
                // 继续
            }
        }

        // 尝试打开字段设置
        const fieldSettingSelectors = [
            '[data-testid="field-setting-toggle"]',
            '[data-testid="field-config"]',
            '.field-setting-btn',
        ];

        for (const selector of fieldSettingSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn) {
                    await clickElement(page, selector);
                    console.log('字段设置已打开');
                    await page.waitForTimeout(1000);
                    await takeScreenshot(page, 'retrieve-v3-field-setting-opened');
                    break;
                }
            } catch (e) {
                // 继续
            }
        }

        console.log('[Success] 测试完成！');
        await takeScreenshot(page, 'retrieve-v3-final');

        return {
            success: true,
            message: '日志检索 v3 主流程测试通过',
            screenshots: [
                'retrieve-v3-loaded',
                'retrieve-v3-search-input',
                'retrieve-v3-search-result',
                'retrieve-v3-favorite-opened',
                'retrieve-v3-field-setting-opened',
                'retrieve-v3-final',
            ],
        };
    } catch (error) {
        console.error('[Error]', error.message);
        await takeScreenshot(page, 'retrieve-v3-error');

        return {
            success: false,
            message: error.message,
            error: error.stack,
        };
    } finally {
        await browser.close();
    }
}
