import { RuntimeTask, Step, Signal, Outcome } from './types.js';
import { Logger } from '../utils/log.js';

/**
 * Runtime Task 执行器
 * 这是系统唯一的"测试执行引擎"
 * 不依赖任何传统测试框架
 */
export class TaskExecutor {
  private mcpClient: any; // chrome-devtools-mcp client
  
  constructor(mcpClient: any) {
    this.mcpClient = mcpClient;
  }

  /**
   * 执行单个 Runtime Task
   */
  async execute(task: RuntimeTask): Promise<Outcome> {
    Logger.info(`Executing task: ${task.id}`);
    Logger.info(`Intent: ${task.intent}`);
    
    const startTime = Date.now();
    
    try {
      // 1. 验证 preconditions
      await this.validatePreconditions(task);
      
      // 2. 执行 steps
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        Logger.progress(i + 1, task.steps.length, `Executing step: ${step.type}`);
        
        try {
          await this.executeStep(step);
        } catch (error: any) {
          return {
            status: 'failed',
            failedStep: i,
            reason: this.classifyFailure(error),
            error: error.message,
            duration: Date.now() - startTime
          };
        }
      }
      
      // 3. 验证 signals
      if (task.signals && task.signals.length > 0) {
        for (const signal of task.signals) {
          const met = await this.checkSignal(signal);
          if (!met) {
            return {
              status: 'failed',
              reason: 'signal-not-met',
              error: `Signal not met: ${signal.type}`,
              duration: Date.now() - startTime
            };
          }
        }
      }
      
      return {
        status: 'success',
        duration: Date.now() - startTime
      };
      
    } catch (error: any) {
      return {
        status: 'failed',
        reason: 'precondition-failed',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 执行单个 Step（MCP 原子能力）
   */
  private async executeStep(step: Step): Promise<void> {
    const optional = (step as any).optional || false;
    
    try {
      switch (step.type) {
        case 'navigate':
          await this.mcpClient.navigate(step.url, step.waitUntil);
          break;
          
        case 'click':
          await this.mcpClient.click(step.selector, { timeout: step.timeout });
          break;
          
        case 'wait':
          // 如果没有 selector，则只是简单延迟
          if (!step.selector) {
            await this.delay(step.timeout || 1000);
          } else {
            await this.mcpClient.waitForSelector(step.selector, {
              timeout: step.timeout,
              state: step.state
            });
          }
          break;
          
        case 'type':
          await this.mcpClient.type(step.selector, step.value, {
            delay: step.delay
          });
          break;
          
        case 'evaluate':
          await this.mcpClient.evaluate(step.script, step.args);
          break;
          
        case 'select':
          await this.mcpClient.select(step.selector, step.value);
          break;
          
        case 'hover':
          await this.mcpClient.hover(step.selector);
          break;
          
        default:
          throw new Error(`Unknown step type: ${(step as any).type}`);
      }
    } catch (error) {
      if (optional) {
        Logger.warn(`⚠️  可选步骤失败（已忽略）: ${step.type} - ${(error as Error).message}`);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * 延迟辅助函数
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查 Signal（代替断言）
   */
  private async checkSignal(signal: Signal): Promise<boolean> {
    const timeout = signal.timeout || 5000;
    
    try {
      switch (signal.type) {
        case 'dom-visible':
          return await this.mcpClient.isVisible(signal.selector, timeout);
          
        case 'dom-hidden':
          return !(await this.mcpClient.isVisible(signal.selector, timeout));
          
        case 'route-match':
          const currentRoute = await this.mcpClient.evaluate('window.location.pathname');
          return currentRoute === signal.value;
          
        case 'network-idle':
          await this.mcpClient.waitForNetworkIdle(timeout);
          return true;
          
        case 'no-error-toast':
          const hasError = await this.mcpClient.querySelector('.error-toast, .bk-message-error');
          return !hasError;
          
        case 'api-success':
          // 检查特定 API 是否成功
          return await this.mcpClient.evaluate(`
            window.__API_RESPONSES__?.['${signal.value}']?.success === true
          `);
          
        case 'state-match':
          // 检查应用状态
          const state = await this.mcpClient.evaluate(`
            window.__APP_STATE__?.['${signal.value}']
          `);
          return state === signal.value;
          
        default:
          Logger.warn(`Unknown signal type: ${signal.type}`);
          return false;
      }
    } catch (error) {
      Logger.warn(`Signal check failed: ${signal.type}`, error);
      return false;
    }
  }

  /**
   * 验证前置条件
   */
  private async validatePreconditions(task: RuntimeTask): Promise<void> {
    if (!task.preconditions || task.preconditions.length === 0) {
      return;
    }
    
    for (const precondition of task.preconditions) {
      switch (precondition.type) {
        case 'auth-required':
          // 检查是否已登录
          const isAuthed = await this.mcpClient.evaluate(
            'document.cookie.includes("bk_token")'
          );
          if (!isAuthed) {
            throw new Error('Authentication required');
          }
          break;
          
        case 'data-ready':
          // 检查数据是否就绪
          const dataReady = await this.mcpClient.evaluate(
            'window.__DATA_READY__ === true'
          );
          if (!dataReady) {
            throw new Error('Data not ready');
          }
          break;
          
        case 'service-available':
          // 检查服务是否可用
          const serviceAvailable = await this.mcpClient.evaluate(`
            fetch('${precondition.config?.healthCheckUrl}')
              .then(r => r.ok)
              .catch(() => false)
          `);
          if (!serviceAvailable) {
            throw new Error('Service not available');
          }
          break;
      }
    }
  }

  /**
   * 失败分类（用于 Rule 学习）
   */
  private classifyFailure(error: Error): Outcome['reason'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('selector') || message.includes('not found')) {
      return 'selector-not-found';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('navigation')) {
      return 'navigation-failed';
    }
    if (message.includes('script') || message.includes('evaluate')) {
      return 'script-error';
    }
    if (message.includes('route')) {
      return 'unexpected-route';
    }
    
    return 'selector-not-found'; // 默认
  }
}
