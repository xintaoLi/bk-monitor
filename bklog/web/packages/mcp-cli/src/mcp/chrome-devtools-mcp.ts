import { spawn, ChildProcess } from 'child_process';
import { Logger } from '../utils/log.js';

/**
 * Chrome DevTools MCP 客户端
 *
 * 基于 MCP 协议与 chrome-devtools-mcp 服务器通信
 * 支持两种模式：
 * 1. 启动新的 Chrome 实例
 * 2. 连接到已运行的 Chrome（通过 --browserUrl）
 *
 * 参考：https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp
 */

export interface ChromeMCPConfig {
  /** Chrome 可执行路径 */
  executablePath?: string;
  /** 连接到已运行的 Chrome 实例 */
  browserUrl?: string;
  /** 无头模式 */
  headless?: boolean;
  /** 隔离模式（使用临时用户数据目录） */
  isolated?: boolean;
  /** 视口大小 */
  viewport?: string;
  /** 代理服务器 */
  proxyServer?: string;
  /** 接受不安全证书 */
  acceptInsecureCerts?: boolean;
  /** 日志文件路径 */
  logFile?: string;
  /** Chrome 版本通道 */
  channel?: 'stable' | 'beta' | 'dev' | 'canary';
  /** 连接超时（毫秒） */
  timeout?: number;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * JSON-RPC 消息类型
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Chrome DevTools MCP 客户端
 */
export class ChromeDevToolsMCP {
  private config: ChromeMCPConfig;
  private process: ChildProcess | null = null;
  private connected: boolean = false;
  private requestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private buffer: string = '';
  private availableTools: string[] = [];

  constructor(config: ChromeMCPConfig = {}) {
    this.config = {
      headless: false,
      isolated: false,
      viewport: '1920x1080',
      timeout: 30000,
      ...config,
    };
  }

  /**
   * 连接到 Chrome DevTools MCP 服务器
   */
  async connect(): Promise<void> {
    Logger.info('正在启动 Chrome DevTools MCP 服务器...');

    const args = this.buildArgs();
    Logger.info(`命令: npx chrome-devtools-mcp@latest ${args.join(' ')}`);

    try {
      this.process = spawn('npx', ['chrome-devtools-mcp@latest', ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      // 处理 stdout（JSON-RPC 响应）
      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleStdout(data);
      });

      // 处理 stderr（日志输出）
      this.process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          // 检查是否是启动成功的标志
          if (output.includes('ready') || output.includes('listening') || output.includes('connected')) {
            this.connected = true;
          }
          Logger.debug(`[MCP Server] ${output}`);
        }
      });

      this.process.on('error', (error) => {
        Logger.error('MCP Server 进程错误:', error);
        this.connected = false;
      });

      this.process.on('exit', (code) => {
        Logger.info(`MCP Server 进程退出，代码: ${code}`);
        this.connected = false;
      });

      // 等待连接建立
      await this.waitForConnection();

      // 初始化 MCP 会话
      await this.initialize();

      Logger.success('✅ Chrome DevTools MCP 已连接');

    } catch (error: any) {
      Logger.error('Chrome DevTools MCP 启动失败:', error.message);
      throw error;
    }
  }

  /**
   * 构建启动参数
   */
  private buildArgs(): string[] {
    const args: string[] = [];

    if (this.config.browserUrl) {
      args.push('--browserUrl', this.config.browserUrl);
    }

    if (this.config.executablePath) {
      args.push('--executablePath', this.config.executablePath);
    }

    if (this.config.headless) {
      args.push('--headless');
    }

    if (this.config.isolated) {
      args.push('--isolated');
    }

    if (this.config.viewport) {
      args.push('--viewport', this.config.viewport);
    }

    if (this.config.proxyServer) {
      args.push('--proxyServer', this.config.proxyServer);
    }

    if (this.config.acceptInsecureCerts) {
      args.push('--acceptInsecureCerts');
    }

    if (this.config.logFile) {
      args.push('--logFile', this.config.logFile);
    }

    if (this.config.channel) {
      args.push('--channel', this.config.channel);
    }

    return args;
  }

  /**
   * 等待连接建立
   */
  private async waitForConnection(): Promise<void> {
    const timeout = this.config.timeout || 30000;
    const start = Date.now();

    while (!this.connected && Date.now() - start < timeout) {
      await this.delay(100);
    }

    // 即使没有收到 ready 信号，也尝试继续（某些版本可能不输出）
    if (!this.connected) {
      Logger.warn('未收到 ready 信号，尝试继续...');
      this.connected = true;
    }
  }

  /**
   * 处理 stdout 数据
   */
  private handleStdout(data: Buffer): void {
    this.buffer += data.toString();

    // 尝试解析完整的 JSON-RPC 消息
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response: JsonRpcResponse = JSON.parse(line);
          this.handleResponse(response);
        } catch {
          // 可能是普通日志输出
          Logger.debug(`[MCP] ${line}`);
        }
      }
    }
  }

  /**
   * 处理 JSON-RPC 响应
   */
  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(response.error.message));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  /**
   * 发送 JSON-RPC 请求
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('MCP Server 未连接');
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`请求超时: ${method}`));
      }, this.config.timeout || 30000);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      const message = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(message);
    });
  }

  /**
   * 初始化 MCP 会话
   */
  private async initialize(): Promise<void> {
    try {
      // 发送初始化请求
      const initResult = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'mcp-e2e-cli',
          version: '0.1.0',
        },
      });

      Logger.info('MCP 初始化成功:', initResult?.serverInfo?.name || 'chrome-devtools-mcp');

      // 获取可用工具列表
      const toolsResult = await this.sendRequest('tools/list', {});
      this.availableTools = toolsResult?.tools?.map((t: any) => t.name) || [];

      Logger.info(`可用工具: ${this.availableTools.length} 个`);

    } catch (error: any) {
      Logger.warn('MCP 初始化失败（可能是旧版本）:', error.message);
      // 继续执行，某些版本可能不支持标准初始化
    }
  }

  /**
   * 调用 MCP 工具
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<MCPToolResult> {
    Logger.info(`🔧 调用工具: ${name}`);
    Logger.debug(`参数: ${JSON.stringify(args)}`);

    try {
      const result = await this.sendRequest('tools/call', {
        name,
        arguments: args,
      });

      return {
        success: true,
        result,
      };

    } catch (error: any) {
      Logger.error(`工具调用失败: ${name}`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============ 导航工具 ============

  /**
   * 导航到 URL
   */
  async navigate(url: string, waitUntil?: string): Promise<void> {
    Logger.info(`🌐 导航到: ${url}`);

    const result = await this.callTool('navigate_page', {
      url,
      waitUntil: waitUntil || 'networkidle2',
    });

    if (!result.success) {
      throw new Error(`导航失败: ${result.error}`);
    }

    await this.delay(500);
  }

  /**
   * 创建新页面
   */
  async newPage(url?: string): Promise<void> {
    const result = await this.callTool('new_page', { url });
    if (!result.success) {
      throw new Error(`创建页面失败: ${result.error}`);
    }
  }

  /**
   * 关闭当前页面
   */
  async closePage(): Promise<void> {
    await this.callTool('close_page', {});
  }

  /**
   * 页面历史导航
   */
  async goBack(): Promise<void> {
    await this.callTool('navigate_page_history', { direction: 'back' });
  }

  async goForward(): Promise<void> {
    await this.callTool('navigate_page_history', { direction: 'forward' });
  }

  // ============ 输入工具 ============

  /**
   * 点击元素
   */
  async click(selector: string, options?: { timeout?: number }): Promise<void> {
    Logger.info(`🖱️  点击: ${selector}`);

    // 先等待元素出现
    await this.waitForSelector(selector, { timeout: options?.timeout || 5000 });

    const result = await this.callTool('click', { selector });

    if (!result.success) {
      throw new Error(`点击失败: ${result.error}`);
    }

    await this.delay(300);
  }

  /**
   * 输入文本
   */
  async type(selector: string, value: string, options?: { delay?: number }): Promise<void> {
    Logger.info(`⌨️  输入: "${value}" 到 ${selector}`);

    const result = await this.callTool('fill', {
      selector,
      value,
    });

    if (!result.success) {
      throw new Error(`输入失败: ${result.error}`);
    }

    await this.delay(200);
  }

  /**
   * 填写表单
   */
  async fillForm(fields: Record<string, string>): Promise<void> {
    Logger.info(`📝 填写表单: ${Object.keys(fields).length} 个字段`);

    const result = await this.callTool('fill_form', { fields });

    if (!result.success) {
      throw new Error(`填写表单失败: ${result.error}`);
    }
  }

  /**
   * 鼠标悬停
   */
  async hover(selector: string): Promise<void> {
    Logger.info(`👆 悬停: ${selector}`);

    const result = await this.callTool('hover', { selector });

    if (!result.success) {
      throw new Error(`悬停失败: ${result.error}`);
    }

    await this.delay(150);
  }

  /**
   * 拖拽
   */
  async drag(from: string, to: string): Promise<void> {
    Logger.info(`🔄 拖拽: ${from} → ${to}`);

    const result = await this.callTool('drag', {
      sourceSelector: from,
      targetSelector: to,
    });

    if (!result.success) {
      throw new Error(`拖拽失败: ${result.error}`);
    }
  }

  /**
   * 选择下拉选项
   */
  async select(selector: string, value: string): Promise<void> {
    Logger.info(`🔽 选择: ${value} 在 ${selector}`);

    // Chrome DevTools MCP 可能不直接支持 select，使用 click + 选项
    await this.click(selector);
    await this.delay(200);
    await this.click(`${selector} option[value="${value}"]`);
  }

  /**
   * 上传文件
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    Logger.info(`📤 上传文件: ${filePath}`);

    const result = await this.callTool('upload_file', {
      selector,
      filePath,
    });

    if (!result.success) {
      throw new Error(`上传失败: ${result.error}`);
    }
  }

  /**
   * 处理对话框
   */
  async handleDialog(action: 'accept' | 'dismiss', promptText?: string): Promise<void> {
    Logger.info(`💬 处理对话框: ${action}`);

    const result = await this.callTool('handle_dialog', {
      action,
      promptText,
    });

    if (!result.success) {
      throw new Error(`处理对话框失败: ${result.error}`);
    }
  }

  // ============ 等待工具 ============

  /**
   * 等待选择器
   */
  async waitForSelector(selector: string, options?: { timeout?: number; state?: string }): Promise<void> {
    Logger.info(`⏳ 等待元素: ${selector}`);

    const result = await this.callTool('wait_for', {
      selector,
      state: options?.state || 'visible',
      timeout: options?.timeout || 5000,
    });

    if (!result.success) {
      throw new Error(`等待元素失败: ${result.error}`);
    }
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(timeout?: number): Promise<void> {
    Logger.info('🌐 等待网络空闲...');

    const result = await this.callTool('wait_for', {
      event: 'networkidle',
      timeout: timeout || 5000,
    });

    if (!result.success) {
      Logger.warn('网络空闲等待超时（可能正常）');
    }
  }

  // ============ 检查工具 ============

  /**
   * 检查元素是否可见
   */
  async isVisible(selector: string, timeout?: number): Promise<boolean> {
    Logger.info(`👁️  检查可见性: ${selector}`);

    try {
      await this.waitForSelector(selector, { timeout: timeout || 2000, state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 查询元素
   */
  async querySelector(selector: string): Promise<boolean> {
    Logger.info(`🔍 查询元素: ${selector}`);

    const result = await this.callTool('evaluate_script', {
      script: `document.querySelector('${selector}') !== null`,
    });

    return result.success && result.result === true;
  }

  // ============ 脚本执行 ============

  /**
   * 执行 JavaScript
   */
  async evaluate(script: string): Promise<any> {
    Logger.info(`📜 执行脚本: ${script.substring(0, 50)}...`);

    const result = await this.callTool('evaluate_script', { script });

    if (!result.success) {
      throw new Error(`脚本执行失败: ${result.error}`);
    }

    return result.result;
  }

  // ============ 截图与快照 ============

  /**
   * 截图
   */
  async screenshot(path?: string): Promise<string> {
    Logger.info(`📸 截图${path ? `: ${path}` : ''}`);

    const result = await this.callTool('take_screenshot', {
      path,
      fullPage: true,
    });

    if (!result.success) {
      throw new Error(`截图失败: ${result.error}`);
    }

    return result.result?.path || path || '';
  }

  /**
   * 创建页面快照
   */
  async snapshot(): Promise<any> {
    const result = await this.callTool('take_snapshot', {});
    return result.result;
  }

  // ============ 性能分析 ============

  /**
   * 开始性能追踪
   */
  async startPerformanceTrace(): Promise<void> {
    await this.callTool('performance_start_trace', {});
  }

  /**
   * 停止性能追踪
   */
  async stopPerformanceTrace(): Promise<any> {
    const result = await this.callTool('performance_stop_trace', {});
    return result.result;
  }

  /**
   * 获取性能洞察
   */
  async getPerformanceInsight(): Promise<any> {
    const result = await this.callTool('performance_analyze_insight', {});
    return result.result;
  }

  // ============ 网络监控 ============

  /**
   * 获取网络请求列表
   */
  async listNetworkRequests(): Promise<any[]> {
    const result = await this.callTool('list_network_requests', {});
    return result.result || [];
  }

  /**
   * 获取网络请求详情
   */
  async getNetworkRequest(requestId: string): Promise<any> {
    const result = await this.callTool('get_network_request', { requestId });
    return result.result;
  }

  // ============ 控制台 ============

  /**
   * 获取控制台消息
   */
  async getConsoleMessages(): Promise<any[]> {
    const result = await this.callTool('list_console_messages', {});
    return result.result || [];
  }

  // ============ 设备仿真 ============

  /**
   * 调整页面尺寸
   */
  async resizePage(width: number, height: number): Promise<void> {
    await this.callTool('resize_page', { width, height });
  }

  /**
   * 仿真网络条件
   */
  async emulateNetwork(preset: 'slow3g' | 'fast3g' | '4g' | 'offline'): Promise<void> {
    await this.callTool('emulate_network', { preset });
  }

  /**
   * 仿真 CPU 性能
   */
  async emulateCPU(slowdownFactor: number): Promise<void> {
    await this.callTool('emulate_cpu', { slowdownFactor });
  }

  // ============ 生命周期 ============

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    Logger.info('⏳ 等待 3 秒后关闭...');
    await this.delay(3000);

    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    this.connected = false;
    this.pendingRequests.clear();

    Logger.info('Chrome DevTools MCP 已断开');
  }

  /**
   * 获取可用工具列表
   */
  getAvailableTools(): string[] {
    return this.availableTools;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 延迟工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建 Chrome DevTools MCP 客户端
 */
export function createChromeMCP(config?: ChromeMCPConfig): ChromeDevToolsMCP {
  return new ChromeDevToolsMCP(config);
}

/**
 * 获取默认 Chrome 路径
 */
export function getDefaultChromePath(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    return '/usr/bin/google-chrome';
  }
}

/**
 * 检查 Chrome 是否可用
 */
export async function checkChromeAvailable(): Promise<boolean> {
  const { existsSync } = await import('fs');
  const chromePath = getDefaultChromePath();
  return existsSync(chromePath);
}
