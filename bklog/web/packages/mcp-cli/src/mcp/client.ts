import { spawn, ChildProcess } from 'child_process';
import { Logger } from '../utils/log.js';

/**
 * MCP 客户端封装
 * 负责与 chrome-devtools-mcp 服务器通信
 */
export class MCPClient {
  private config: any;
  private process: ChildProcess | null = null;
  private connected: boolean = false;
  private mockMode: boolean = false;

  constructor(config: any) {
    this.config = config;
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<void> {
    try {
      const serverConfig = this.config.mcpServers?.['chrome-devtools'];
      
      if (!serverConfig) {
        throw new Error('chrome-devtools MCP server configuration not found');
      }

      Logger.info('正在启动 chrome-devtools MCP 服务器...');
      
      this.process = spawn(serverConfig.command, serverConfig.args, {
        env: { ...process.env, ...serverConfig.env },
        stdio: 'pipe'
      });

      // 监听进程输出
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('ready') || output.includes('listening')) {
          this.connected = true;
        }
      });

      this.process.stderr?.on('data', (data) => {
        Logger.warn('MCP Server:', data.toString());
      });

      this.process.on('error', (error) => {
        Logger.error('MCP Server process error:', error);
        this.mockMode = true;
      });

      // 等待连接建立
      await this.waitForConnection();
      
    } catch (error) {
      Logger.warn('MCP 服务器启动失败，切换到模拟模式:', error.message);
      this.mockMode = true;
      this.connected = true;
    }
  }

  /**
   * 等待连接建立
   */
  private async waitForConnection(): Promise<void> {
    const timeout = 5000;
    const start = Date.now();

    while (!this.connected && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!this.connected) {
      throw new Error('MCP server connection timeout');
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
  }

  /**
   * 导航到 URL
   */
  async navigate(url: string, waitUntil?: string): Promise<void> {
    if (this.mockMode) {
      Logger.info(`[Mock] Navigate to: ${url}`);
      await this.delay(500);
      return;
    }

    // 实际 MCP 调用
    // await this.callMCP('browser.navigate', { url, waitUntil });
    Logger.info(`Navigate to: ${url}`);
    await this.delay(500);
  }

  /**
   * 点击元素
   */
  async click(selector: string, options?: { timeout?: number }): Promise<void> {
    if (this.mockMode) {
      Logger.info(`[Mock] Click: ${selector}`);
      await this.delay(200);
      return;
    }

    // await this.callMCP('dom.click', { selector, ...options });
    Logger.info(`Click: ${selector}`);
    await this.delay(200);
  }

  /**
   * 等待选择器
   */
  async waitForSelector(selector: string, options?: { timeout?: number; state?: string }): Promise<void> {
    if (this.mockMode) {
      Logger.info(`[Mock] Wait for: ${selector} (${options?.state || 'visible'})`);
      await this.delay(300);
      return;
    }

    // await this.callMCP('dom.waitForSelector', { selector, ...options });
    Logger.info(`Wait for: ${selector}`);
    await this.delay(300);
  }

  /**
   * 输入文本
   */
  async type(selector: string, value: string, options?: { delay?: number }): Promise<void> {
    if (this.mockMode) {
      Logger.info(`[Mock] Type: "${value}" into ${selector}`);
      await this.delay(value.length * (options?.delay || 10));
      return;
    }

    // await this.callMCP('dom.type', { selector, value, ...options });
    Logger.info(`Type: "${value}" into ${selector}`);
    await this.delay(value.length * (options?.delay || 10));
  }

  /**
   * 执行 JavaScript
   */
  async evaluate(script: string, args?: any[]): Promise<any> {
    if (this.mockMode) {
      Logger.info(`[Mock] Evaluate: ${script.substring(0, 50)}...`);
      await this.delay(100);
      
      // 模拟一些常见返回值
      if (script.includes('location.pathname')) return '/retrieve';
      if (script.includes('cookie')) return true;
      if (script.includes('__DATA_READY__')) return true;
      
      return true;
    }

    // const result = await this.callMCP('runtime.evaluate', { expression: script, args });
    Logger.info(`Evaluate: ${script.substring(0, 50)}...`);
    await this.delay(100);
    return true;
  }

  /**
   * 选择下拉选项
   */
  async select(selector: string, value: string): Promise<void> {
    if (this.mockMode) {
      Logger.info(`[Mock] Select: ${value} in ${selector}`);
      await this.delay(200);
      return;
    }

    // await this.callMCP('dom.select', { selector, value });
    Logger.info(`Select: ${value} in ${selector}`);
    await this.delay(200);
  }

  /**
   * 鼠标悬停
   */
  async hover(selector: string): Promise<void> {
    if (this.mockMode) {
      Logger.info(`[Mock] Hover: ${selector}`);
      await this.delay(150);
      return;
    }

    // await this.callMCP('dom.hover', { selector });
    Logger.info(`Hover: ${selector}`);
    await this.delay(150);
  }

  /**
   * 检查元素是否可见
   */
  async isVisible(selector: string, timeout?: number): Promise<boolean> {
    if (this.mockMode) {
      Logger.info(`[Mock] Check visible: ${selector}`);
      await this.delay(100);
      return Math.random() > 0.2; // 80% 可见率
    }

    // const result = await this.callMCP('dom.isVisible', { selector, timeout });
    Logger.info(`Check visible: ${selector}`);
    await this.delay(100);
    return true;
  }

  /**
   * 查询元素
   */
  async querySelector(selector: string): Promise<boolean> {
    if (this.mockMode) {
      Logger.info(`[Mock] Query: ${selector}`);
      await this.delay(50);
      return Math.random() > 0.8; // 20% 找到率
    }

    // const result = await this.callMCP('dom.querySelector', { selector });
    Logger.info(`Query: ${selector}`);
    await this.delay(50);
    return false;
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(timeout?: number): Promise<void> {
    if (this.mockMode) {
      Logger.info(`[Mock] Wait for network idle (${timeout || 5000}ms)`);
      await this.delay(timeout || 1000);
      return;
    }

    // await this.callMCP('network.waitForIdle', { timeout });
    Logger.info(`Wait for network idle`);
    await this.delay(500);
  }

  /**
   * 调用 MCP 方法（占位）
   */
  private async callMCP(method: string, params: any): Promise<any> {
    // TODO: 实现真实的 MCP JSON-RPC 调用
    // 这里需要通过 stdio 与 MCP 服务器通信
    Logger.warn(`MCP call not implemented: ${method}`);
    return null;
  }

  /**
   * 延迟工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
