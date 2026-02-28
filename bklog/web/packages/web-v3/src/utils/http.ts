import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { ApiResponse } from '@/types';
import { MessagePlugin } from 'tdesign-vue-next';

/**
 * HTTP 请求配置
 */
export interface HttpRequestConfig extends AxiosRequestConfig {
  skipErrorHandler?: boolean; // 跳过全局错误处理
  showMessage?: boolean; // 是否显示错误消息
  cancelToken?: any; // 取消令牌
}

/**
 * HTTP 请求类
 */
class HttpRequest {
  private instance: AxiosInstance;
  private pendingRequests: Map<string, AbortController>;

  constructor() {
    this.pendingRequests = new Map();
    
    // 创建 axios 实例
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 添加请求唯一标识
        const requestKey = this.getRequestKey(config);
        
        // 检查是否存在相同的pending请求
        if (this.pendingRequests.has(requestKey)) {
          const controller = this.pendingRequests.get(requestKey);
          controller?.abort('Duplicate request cancelled');
        }

        // 创建新的 AbortController
        const controller = new AbortController();
        config.signal = controller.signal;
        this.pendingRequests.set(requestKey, controller);

        // 添加 CSRF Token
        const csrfToken = this.getCookie('bklog_csrftoken');
        if (csrfToken) {
          config.headers['X-CSRFToken'] = csrfToken;
        }

        // 添加空间和业务信息（从store或路由获取）
        const spaceUid = this.getSpaceUid();
        const bizId = this.getBizId();
        
        if (spaceUid && config.params) {
          config.params.space_uid = spaceUid;
        }
        
        if (bizId && config.params) {
          config.params.bk_biz_id = bizId;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const requestKey = this.getRequestKey(response.config);
        this.pendingRequests.delete(requestKey);

        const { data } = response;

        // 处理 API 响应格式
        if (data && typeof data === 'object' && 'result' in data) {
          if (data.result === false) {
            // 业务错误
            return this.handleBusinessError(data, response.config);
          }
          return data.data;
        }

        return data;
      },
      (error: AxiosError) => {
        const config = error.config as HttpRequestConfig;
        if (config) {
          const requestKey = this.getRequestKey(config);
          this.pendingRequests.delete(requestKey);
        }

        // 处理网络错误
        return this.handleNetworkError(error, config);
      }
    );
  }

  /**
   * 获取请求唯一标识
   */
  private getRequestKey(config: AxiosRequestConfig): string {
    const { method, url, params, data } = config;
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }

  /**
   * 获取 Cookie
   */
  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  /**
   * 获取空间 UID（从路由或 store）
   */
  private getSpaceUid(): string | null {
    // TODO: 从路由或 store 获取
    return null;
  }

  /**
   * 获取业务 ID（从路由或 store）
   */
  private getBizId(): number | null {
    // TODO: 从路由或 store 获取
    return null;
  }

  /**
   * 处理业务错误
   */
  private handleBusinessError(data: ApiResponse, config: AxiosRequestConfig): Promise<never> {
    const httpConfig = config as HttpRequestConfig;
    
    if (!httpConfig.skipErrorHandler && httpConfig.showMessage !== false) {
      // 处理权限错误
      if (data.code === 9900403) {
        this.handlePermissionError(data);
      } else {
        MessagePlugin.error(data.message || '请求失败');
      }
    }

    return Promise.reject(data);
  }

  /**
   * 处理网络错误
   */
  private handleNetworkError(error: AxiosError, config?: HttpRequestConfig): Promise<never> {
    if (axios.isCancel(error)) {
      // 请求被取消
      return Promise.reject(error);
    }

    if (!config?.skipErrorHandler && config?.showMessage !== false) {
      if (error.response) {
        // 服务器返回错误状态码
        const { status } = error.response;
        switch (status) {
          case 401:
            this.handleUnauthorized();
            break;
          case 403:
            MessagePlugin.error('没有权限访问该资源');
            break;
          case 404:
            MessagePlugin.error('请求的资源不存在');
            break;
          case 500:
            MessagePlugin.error('服务器内部错误');
            break;
          default:
            MessagePlugin.error('网络请求失败');
        }
      } else if (error.request) {
        // 请求已发出但没有收到响应
        MessagePlugin.error('网络连接失败，请检查网络');
      } else {
        MessagePlugin.error('请求配置错误');
      }
    }

    return Promise.reject(error);
  }

  /**
   * 处理未授权
   */
  private handleUnauthorized(): void {
    const loginUrl = window.LOGIN_SERVICE_URL || window.BK_LOGIN_URL;
    if (loginUrl) {
      window.location.href = `${loginUrl}?c_url=${encodeURIComponent(window.location.href)}`;
    } else {
      MessagePlugin.error('登录已过期，请重新登录');
    }
  }

  /**
   * 处理权限错误
   */
  private handlePermissionError(data: ApiResponse): void {
    if (data.permission) {
      // TODO: 显示权限申请弹窗
      console.warn('Permission required:', data.permission);
    }
    MessagePlugin.error(data.message || '没有权限执行此操作');
  }

  /**
   * 取消所有 pending 请求
   */
  public cancelAllPending(): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort('Route changed, all pending requests cancelled');
    });
    this.pendingRequests.clear();
  }

  /**
   * 取消特定请求
   */
  public cancelRequest(config: AxiosRequestConfig): void {
    const requestKey = this.getRequestKey(config);
    const controller = this.pendingRequests.get(requestKey);
    if (controller) {
      controller.abort('Request cancelled');
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * GET 请求
   */
  public get<T = any>(url: string, params?: any, config?: HttpRequestConfig): Promise<T> {
    return this.instance.get(url, { params, ...config });
  }

  /**
   * POST 请求
   */
  public post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  /**
   * PUT 请求
   */
  public put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  /**
   * DELETE 请求
   */
  public delete<T = any>(url: string, params?: any, config?: HttpRequestConfig): Promise<T> {
    return this.instance.delete(url, { params, ...config });
  }

  /**
   * PATCH 请求
   */
  public patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  /**
   * 原始请求方法
   */
  public request<T = any>(config: HttpRequestConfig): Promise<T> {
    return this.instance.request(config);
  }
}

// 导出单例
export const http = new HttpRequest();
export default http;
