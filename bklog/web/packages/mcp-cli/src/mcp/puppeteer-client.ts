import puppeteer, { Browser, Page } from 'puppeteer';
import { Logger } from '../utils/log.js';

/**
 * Puppeteer 可视化客户端
 * 替代 MCP，直接使用 Puppeteer 实现可视化测试
 */
export class PuppeteerClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private headless: boolean;

  constructor(config: any) {
    // 默认有界面模式，可以看到浏览器操作
    this.headless = config.config?.headless !== undefined 
      ? config.config.headless 
      : false;
  }

  /**
   * 启动浏览器并连接
   */
  async connect(): Promise<void> {
    try {
      Logger.info('正在启动 Chrome 浏览器...');
      
      this.browser = await puppeteer.launch({
        headless: this.headless,
        devtools: false,
        defaultViewport: null, // 关键：设为 null 让视口自适应窗口大小
        args: [
          '--start-maximized',           // 最大化窗口
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
        slowMo: 200
      });

      // 获取所有页面，使用第一个（避免 about:blank）
      const pages = await this.browser.pages();
      this.page = pages[0] || await this.browser.newPage();
      
      // 设置默认超时
      this.page.setDefaultTimeout(30000);
      
      // 监听控制台输出
      this.page.on('console', msg => {
        const type = msg.type();
        if (type === 'error') {
          Logger.warn(`[Browser Console] ${msg.text()}`);
        }
      });

      // 监听页面错误
      this.page.on('pageerror', (error: Error) => {
        Logger.warn(`[Browser Error] ${error.message}`);
      });

      Logger.success(`✅ Chrome 浏览器已启动 (${this.headless ? '无头模式' : '可视化模式'})`);
      
    } catch (error) {
      Logger.error('浏览器启动失败:', error);
      throw error;
    }
  }

  /**
   * 断开连接并关闭浏览器
   */
  async disconnect(): Promise<void> {
    // 等待一段时间让用户看到最终状态
    Logger.info('⏳ 等待 5 秒后关闭浏览器...');
    await this.delay(5000);
    
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      Logger.info('浏览器已关闭');
    }
  }

  /**
   * 导航到 URL
   */
  async navigate(url: string, waitUntil?: string): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');
    
    Logger.info(`🌐 导航到: ${url}`);
    
    const waitUntilOption = (waitUntil || 'networkidle2') as any;
    await this.page.goto(url, { 
      waitUntil: waitUntilOption,
      timeout: 30000 
    });
    
    // 等待页面稳定
    await this.delay(500);
  }

  /**
   * 点击元素（支持逗号分隔的多选择器）
   */
  async click(selector: string, options?: { timeout?: number }): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');
    
    const timeout = options?.timeout || 5000;
    const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
    
    Logger.info(`🖱️  点击: ${selectors.length > 1 ? selectors.join(' | ') : selector}`);
    
    try {
      // 尝试找到第一个匹配的选择器
      let foundElement: any = null;
      let foundSelector: string | null = null;
      
      for (const sel of selectors) {
        try {
          const element = await this.page.$(sel);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              foundElement = element;
              foundSelector = sel;
              break;
            }
          }
        } catch {
          // 继续尝试下一个
        }
      }
      
      if (!foundElement) {
        // 等待任意一个选择器出现
        await this.waitForSelector(selector, { timeout });
        
        // 再次查找
        for (const sel of selectors) {
          const element = await this.page.$(sel);
          if (element) {
            foundElement = element;
            foundSelector = sel;
            break;
          }
        }
      }
      
      if (foundElement) {
        // 滚动到元素可见
        await foundElement.scrollIntoViewIfNeeded();
        await this.delay(100);
        
        // 使用 evaluate 触发完整的鼠标事件（包括 mousedown）
        await this.page.evaluate((sel: string) => {
          const el = document.querySelector(sel);
          if (el) {
            // 触发 mousedown 事件（某些组件只监听 mousedown）
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            // 触发 mouseup 事件
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            // 触发 click 事件
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          }
        }, foundSelector);
        
        await this.delay(300);
      } else {
        throw new Error(`Element not found: ${selector}`);
      }
      
    } catch (error) {
      Logger.error(`点击失败: ${selector}`);
      throw error;
    }
  }

  /**
   * 等待选择器（支持逗号分隔的多选择器）
   */
  async waitForSelector(selector: string, options?: { timeout?: number; state?: string }): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');
    
    const state = options?.state || 'visible';
    const timeout = options?.timeout || 5000;
    
    // 处理逗号分隔的多选择器
    const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
    
    if (selectors.length > 1) {
      Logger.info(`⏳ 等待元素（多选择器）: ${selectors.join(' | ')} (${state})`);
      
      // 逐个尝试选择器，找到第一个成功的
      let found = false;
      const startTime = Date.now();
      
      while (!found && (Date.now() - startTime) < timeout) {
        for (const sel of selectors) {
          try {
            const element = await this.page!.$(sel);
            if (element) {
              if (state === 'visible') {
                const isVisible = await element.isVisible();
                if (isVisible) {
                  found = true;
                  break;
                }
              } else {
                found = true;
                break;
              }
            }
          } catch {
            // 继续尝试
          }
        }
        if (!found) {
          await this.delay(200);
        }
      }
      
      if (!found) {
        throw new Error(`Waiting for selector \`${selector}\` failed`);
      }
    } else {
      Logger.info(`⏳ 等待元素: ${selector} (${state})`);
      await this.waitForSingleSelector(selector, state, timeout);
    }
  }

  /**
   * 等待单个选择器
   */
  private async waitForSingleSelector(selector: string, state: string, timeout: number): Promise<boolean> {
    try {
      if (state === 'visible') {
        await this.page!.waitForSelector(selector, { visible: true, timeout });
      } else if (state === 'hidden') {
        await this.page!.waitForSelector(selector, { hidden: true, timeout });
      } else {
        await this.page!.waitForSelector(selector, { timeout });
      }
      return true;
    } catch (error) {
      Logger.warn(`选择器未找到: ${selector}`);
      throw error;
    }
  }

  /**
   * 输入文本（支持逗号分隔的多选择器）
   */
  async type(selector: string, value: string, options?: { delay?: number }): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');
    
    const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
    Logger.info(`⌨️  输入: "${value}" 到 ${selectors.length > 1 ? selectors.join(' | ') : selector}`);
    
    try {
      // 找到第一个可用的选择器
      let foundSelector: string | null = null;
      
      for (const sel of selectors) {
        try {
          const element = await this.page.$(sel);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              foundSelector = sel;
              break;
            }
          }
        } catch {
          // 继续尝试
        }
      }
      
      if (!foundSelector) {
        await this.page.waitForSelector(selectors[0], { visible: true, timeout: 5000 });
        foundSelector = selectors[0];
      }
      
      await this.page.click(foundSelector);
      await this.page.type(foundSelector, value, { delay: options?.delay || 50 });
      await this.delay(200);
    } catch (error) {
      Logger.error(`输入失败: ${selector}`);
      throw error;
    }
  }

  /**
   * 执行 JavaScript
   */
  async evaluate(script: string, args?: any[]): Promise<any> {
    if (!this.page) throw new Error('Browser not connected');
    
    Logger.info(`📜 执行脚本: ${script.substring(0, 50)}...`);
    
    try {
      const result = await this.page.evaluate(script);
      return result;
    } catch (error) {
      Logger.error(`脚本执行失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 选择下拉选项
   */
  async select(selector: string, value: string): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');
    
    Logger.info(`🔽 选择: ${value} 在 ${selector}`);
    
    try {
      await this.page.waitForSelector(selector, { visible: true, timeout: 5000 });
      await this.page.select(selector, value);
      await this.delay(200);
    } catch (error) {
      Logger.error(`选择失败: ${selector}`);
      throw error;
    }
  }

  /**
   * 鼠标悬停
   */
  async hover(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');
    
    Logger.info(`👆 悬停: ${selector}`);
    
    try {
      await this.page.waitForSelector(selector, { visible: true, timeout: 5000 });
      await this.page.hover(selector);
      await this.delay(150);
    } catch (error) {
      Logger.error(`悬停失败: ${selector}`);
      throw error;
    }
  }

  /**
   * 检查元素是否可见（支持逗号分隔的多选择器）
   */
  async isVisible(selector: string, timeout?: number): Promise<boolean> {
    if (!this.page) throw new Error('Browser not connected');
    
    const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
    Logger.info(`👁️  检查可见性: ${selectors.length > 1 ? selectors.join(' | ') : selector}`);
    
    // 尝试找到任意一个可见的选择器
    for (const sel of selectors) {
      try {
        await this.page.waitForSelector(sel, { 
          visible: true, 
          timeout: Math.min(timeout || 5000, 2000) 
        });
        return true;
      } catch {
        // 继续尝试下一个
      }
    }
    
    return false;
  }

  /**
   * 查询元素
   */
  async querySelector(selector: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not connected');
    
    Logger.info(`🔍 查询元素: ${selector}`);
    
    try {
      const element = await this.page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(timeout?: number): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');
    
    Logger.info(`🌐 等待网络空闲...`);
    
    try {
      await this.page.waitForNetworkIdle({ 
        timeout: timeout || 5000,
        idleTime: 500 
      });
    } catch (error) {
      Logger.warn('网络空闲等待超时（可能正常）');
    }
  }

  /**
   * 截图
   */
  async screenshot(path: string): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');
    
    Logger.info(`📸 截图保存到: ${path}`);
    
    await this.page.screenshot({ 
      path, 
      fullPage: true 
    });
  }

  /**
   * 获取当前页面实例（用于高级操作）
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * 延迟工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
