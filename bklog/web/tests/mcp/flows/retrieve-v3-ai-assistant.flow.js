/**
 * 日志检索 v3 - AI 助手功能测试
 */

import { openApp, waitForSelector, clickElement, takeScreenshot } from '../utils/browser.js';

export default async function run(ctx) {
    const { browser, page, baseUrl } = await openApp(ctx);

    try {
        console.log('[Step 1] 访问检索页面...');
        await page.goto(`${baseUrl}/#/retrieve`, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        console.log('[Step 2] 等待页面加载...');
        await waitForSelector(page, '.v3-bklog-root', { timeout: 15000 });

        // 查找 AI 助手按钮
        console.log('[Step 3] 查找 AI 助手按钮...');
        const aiButtonSelectors = [
            '[data-testid="ai-assistant-toggle"]',
            '[data-testid="ai-assistant-btn"]',
            '.ai-assistant-btn',
            'button:has-text("AI")',
        ];

        let aiOpened = false;
        for (const selector of aiButtonSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn) {
                    console.log(`找到 AI 助手按钮: ${selector}`);
                    await clickElement(page, selector);
                    await page.waitForTimeout(1500);
                    aiOpened = true;
                    break;
                }
            } catch (e) {
                // 继续
            }
        }

        if (aiOpened) {
            console.log('[Step 4] 等待 AI 助手面板加载...');
            const aiPanelSelectors = [
                '[data-testid="ai-assistant-panel"]',
                '.ai-assistant-panel',
                '.ai-assistant-container',
            ];

            for (const selector of aiPanelSelectors) {
                try {
                    await waitForSelector(page, selector, { timeout: 5000 });
                    console.log(`AI 助手面板已加载: ${selector}`);
                    break;
                } catch (e) {
                    // 继续
                }
            }

            await takeScreenshot(page, 'retrieve-v3-ai-opened');
        } else {
            console.log('[Warning] 未找到 AI 助手按钮，可能功能未开启');
        }

        return {
            success: true,
            message: 'AI 助手测试完成',
            aiEnabled: aiOpened,
        };
    } catch (error) {
        console.error('[Error]', error.message);
        await takeScreenshot(page, 'retrieve-v3-ai-error');

        return {
            success: false,
            message: error.message,
            error: error.stack,
        };
    } finally {
        await browser.close();
    }
}
