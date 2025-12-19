/**
 * 日志检索 v3 - 授权与业务切换流程测试
 * 
 * 测试场景：
 * 1. 当跳转到 un-authorized 路由时，说明当前业务没有索引数据或业务id不存在
 * 2. 根据路由参数 &type=indexset 判定是索引信息不存在还是业务不存在
 * 3. 如果是索引列表为空（type=indexset），则切换其他业务尝试（space-choice组件）
 * 4. 如果是业务为空（type=space），则尝试移除地址参数重新尝试
 * 5. 完成上述流程，能够渲染出检索V3主页面后继续具体的业务测试
 */

import { openApp, waitForSelector, clickElement, takeScreenshot, delay } from '../utils/browser.js';

/**
 * 检查当前是否在 un-authorized 页面
 */
async function isUnauthorizedPage(page) {
    try {
        const url = page.url();
        return url.includes('/un-authorized');
    } catch (e) {
        return false;
    }
}

/**
 * 获取 un-authorized 类型
 * @returns {Promise<'space'|'indexset'|'api'|null>}
 */
async function getUnauthorizedType(page) {
    try {
        const url = page.url();
        const match = url.match(/[?&]type=([^&]+)/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

/**
 * 处理业务不存在的情况（type=space）
 * 点击"重试"按钮，移除业务参数重新加载
 */
async function handleSpaceNotFound(page) {
    console.log('[处理] 业务不存在，尝试点击重试按钮...');

    // 查找重试按钮（根据 un-authorized/index.tsx 第79行）
    const retryButtonSelectors = [
        'span:has-text("重试")',
        '[data-testid="retry-btn"]',
        '.exception-part span[style*="color: #3a84ff"]',
    ];

    for (const selector of retryButtonSelectors) {
        try {
            const btn = await page.$(selector);
            if (btn) {
                console.log(`找到重试按钮: ${selector}`);
                await clickElement(page, selector);
                await delay(2000);

                // 等待页面重新加载
                await page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle2' }).catch(() => { });

                return true;
            }
        } catch (e) {
            console.log(`尝试选择器 ${selector} 失败:`, e.message);
        }
    }

    console.log('[警告] 未找到重试按钮');
    return false;
}

/**
 * 处理索引集为空的情况（type=indexset）
 * 打开业务选择器，切换到有索引的业务
 */
async function handleIndexSetEmpty(page) {
    console.log('[处理] 索引集为空，尝试切换业务...');

    // 1. 查找并点击业务选择器（space-choice 组件）
    const spaceChoiceSelectors = [
        '.biz-menu-select .menu-select-name',
        '[data-testid="space-choice"]',
        '.menu-select .menu-select-name',
        '.biz-menu-select',
    ];

    let spaceChoiceOpened = false;
    for (const selector of spaceChoiceSelectors) {
        try {
            const element = await page.$(selector);
            if (element) {
                console.log(`找到业务选择器: ${selector}`);
                await clickElement(page, selector);
                await delay(1000);
                spaceChoiceOpened = true;
                break;
            }
        } catch (e) {
            console.log(`尝试选择器 ${selector} 失败:`, e.message);
        }
    }

    if (!spaceChoiceOpened) {
        console.log('[警告] 无法打开业务选择器');
        return false;
    }

    await takeScreenshot(page, 'space-choice-opened');

    // 2. 等待业务列表加载
    const bizListSelectors = [
        '.menu-select-list',
        '.biz-list',
        '[data-testid="biz-list"]',
    ];

    let bizList = null;
    for (const selector of bizListSelectors) {
        try {
            bizList = await waitForSelector(page, selector, { timeout: 5000 });
            if (bizList) {
                console.log(`业务列表已加载: ${selector}`);
                break;
            }
        } catch (e) {
            console.log(`等待选择器 ${selector} 超时`);
        }
    }

    if (!bizList) {
        console.log('[警告] 业务列表未加载');
        return false;
    }

    // 3. 选择第一个可用的业务（排除当前业务和分组标题）
    const bizItemSelectors = [
        '.list-item',
        '[data-testid="biz-item"]',
        '.biz-list .list-item',
    ];

    for (const selector of bizItemSelectors) {
        try {
            const items = await page.$$(selector);
            console.log(`找到 ${items.length} 个业务项`);

            if (items.length > 0) {
                // 获取当前 URL 中的业务参数
                const currentUrl = page.url();
                const currentBizMatch = currentUrl.match(/[?&]bizId=([^&]+)/);
                const currentSpaceMatch = currentUrl.match(/[?&]spaceUid=([^&]+)/);
                const currentBizId = currentBizMatch ? currentBizMatch[1] : null;
                const currentSpaceUid = currentSpaceMatch ? currentSpaceMatch[1] : null;

                console.log(`当前业务参数: bizId=${currentBizId}, spaceUid=${currentSpaceUid}`);

                // 选择与当前业务不同的第一个业务（跳过分组标题）
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];

                    // 检查是否是分组标题
                    const isGroupTitle = await item.evaluate(el =>
                        el.classList.contains('group-title') || el.dataset.type === 'group-title'
                    );

                    if (isGroupTitle) {
                        continue;
                    }

                    // 获取业务项的 spaceUid（用于比较）
                    const itemSpaceUid = await item.evaluate(el => {
                        const spaceUidAttr = el.getAttribute('data-space-uid');
                        if (spaceUidAttr) return spaceUidAttr;

                        const childWithSpaceUid = el.querySelector('[data-space-uid]');
                        return childWithSpaceUid ? childWithSpaceUid.getAttribute('data-space-uid') : null;
                    });

                    // 跳过当前业务
                    if (itemSpaceUid && itemSpaceUid === currentSpaceUid) {
                        console.log(`跳过当前业务: spaceUid=${itemSpaceUid}`);
                        continue;
                    }

                    console.log(`选择第 ${i + 1} 个业务 (spaceUid=${itemSpaceUid})`);

                    // 点击前记录 URL
                    const urlBeforeClick = page.url();

                    await item.click();

                    // 等待防抖延迟和路由更新
                    // debounceUpdateRouter 有 60ms 防抖
                    await delay(200);

                    // 检查 URL 是否发生变化（最多等待 5 秒）
                    let urlChanged = false;
                    for (let retry = 0; retry < 25; retry++) {
                        const currentPageUrl = page.url();
                        if (currentPageUrl !== urlBeforeClick && !currentPageUrl.includes('/un-authorized')) {
                            urlChanged = true;
                            console.log(`✓ URL 已变化: ${currentPageUrl}`);
                            break;
                        }
                        await delay(200);
                    }

                    if (urlChanged) {
                        // 等待网络空闲
                        await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => { });
                        await delay(1000);
                        return true;
                    } else {
                        console.log(`⚠ URL 未变化，继续尝试下一个业务`);
                        // 重新打开业务选择器
                        await clickElement(page, '.biz-menu-select .menu-select-name');
                        await delay(1000);
                    }
                }
            }
        } catch (e) {
            console.log(`处理业务列表失败:`, e.message);
        }
    }

    console.log('[警告] 无法选择新业务');
    return false;
}

/**
 * 等待检索 V3 页面完整加载
 */
async function waitForRetrieveV3Page(page) {
    console.log('[等待] 检索 V3 页面加载...');

    // 等待 v3 根容器
    await waitForSelector(page, '.v3-bklog-root', { timeout: 15000 });

    // 等待搜索栏
    const searchBarSelectors = [
        '.v3-bklog-content .search-bar',
        '[data-testid="search-bar"]',
        '.search-bar',
    ];

    for (const selector of searchBarSelectors) {
        try {
            await waitForSelector(page, selector, { timeout: 10000 });
            console.log(`搜索栏已加载: ${selector}`);
            return true;
        } catch (e) {
            console.log(`等待搜索栏 ${selector} 超时`);
        }
    }

    return false;
}

/**
 * 主测试流程
 */
export default async function run(ctx) {
    const { browser, page, baseUrl } = await openApp(ctx);

    try {
        console.log('========================================');
        console.log('  检索 V3 授权与业务切换流程测试');
        console.log('========================================\n');

        // Step 1: 访问检索页面（可能会跳转到 un-authorized）
        console.log('[Step 1] 访问检索页面...');
        await page.goto(`${baseUrl}/#/retrieve`, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });
        await delay(2000);
        await takeScreenshot(page, 'initial-page');

        // Step 2: 检查是否在 un-authorized 页面
        let maxRetries = 3;
        let currentRetry = 0;

        while (await isUnauthorizedPage(page) && currentRetry < maxRetries) {
            currentRetry++;
            console.log(`\n[Step 2.${currentRetry}] 检测到 un-authorized 页面`);

            const type = await getUnauthorizedType(page);
            console.log(`授权问题类型: ${type || '未知'}`);
            await takeScreenshot(page, `unauthorized-${type}-attempt-${currentRetry}`);

            let handled = false;

            // Step 2a: 处理业务不存在的情况
            if (type === 'space') {
                console.log('\n>>> 场景: 业务不存在 (type=space)');
                handled = await handleSpaceNotFound(page);
            }

            // Step 2b: 处理索引集为空的情况
            else if (type === 'indexset') {
                console.log('\n>>> 场景: 索引集为空 (type=indexset)');
                handled = await handleIndexSetEmpty(page);
            }

            // Step 2c: 未知类型
            else {
                console.log(`\n>>> 场景: 未知授权问题 (type=${type})`);
                await takeScreenshot(page, 'unauthorized-unknown');
                break;
            }

            if (!handled) {
                console.log('[错误] 无法处理授权问题');
                break;
            }

            await delay(2000);
        }

        // Step 3: 验证是否成功进入检索页面
        console.log('\n[Step 3] 验证页面状态...');

        const isStillUnauthorized = await isUnauthorizedPage(page);
        if (isStillUnauthorized) {
            throw new Error(`尝试 ${currentRetry} 次后仍无法离开 un-authorized 页面`);
        }

        console.log('✓ 已成功离开 un-authorized 页面');

        // Step 4: 等待检索 V3 页面完整加载
        console.log('\n[Step 4] 等待检索 V3 页面完整加载...');
        const loaded = await waitForRetrieveV3Page(page);

        if (!loaded) {
            throw new Error('检索 V3 页面未能完整加载');
        }

        console.log('✓ 检索 V3 页面已完整加载');
        await takeScreenshot(page, 'retrieve-v3-loaded-success');

        // Step 5: 验证核心功能组件
        console.log('\n[Step 5] 验证核心功能组件...');

        const components = {
            '索引选择器': ['.index-selector', '[data-testid="index-selector"]'],
            '时间选择器': ['.time-picker', '[data-testid="time-picker"]'],
            '搜索输入框': ['input[placeholder*="搜索"]', 'input[placeholder*="检索"]'],
            '搜索按钮': ['button:has-text("搜索")', '[data-testid="search-btn"]'],
        };

        const verificationResults = {};
        for (const [name, selectors] of Object.entries(components)) {
            let found = false;
            for (const selector of selectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        console.log(`  ✓ ${name}: ${selector}`);
                        verificationResults[name] = true;
                        found = true;
                        break;
                    }
                } catch (e) {
                    // 继续尝试下一个选择器
                }
            }
            if (!found) {
                console.log(`  ✗ ${name}: 未找到`);
                verificationResults[name] = false;
            }
        }

        await takeScreenshot(page, 'retrieve-v3-final-state');

        // 测试结果
        console.log('\n========================================');
        console.log('  测试完成');
        console.log('========================================');
        console.log(`尝试次数: ${currentRetry}`);
        console.log('组件验证:', verificationResults);

        return {
            success: true,
            message: '检索 V3 授权与业务切换流程测试通过',
            details: {
                retries: currentRetry,
                componentVerification: verificationResults,
            },
            screenshots: [
                'initial-page',
                'unauthorized-space-attempt-1',
                'unauthorized-indexset-attempt-1',
                'space-choice-opened',
                'retrieve-v3-loaded-success',
                'retrieve-v3-final-state',
            ],
        };

    } catch (error) {
        console.error('\n[错误] 测试失败:', error.message);
        await takeScreenshot(page, 'test-error');

        return {
            success: false,
            message: error.message,
            error: error.stack,
        };
    } finally {
        await browser.close();
    }
}
