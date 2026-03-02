/**
 * index.ts - HTTP 请求层
 * 对齐原 src/api/index.js 核心逻辑：
 * - axios 实例 + 请求/响应拦截器
 * - RequestQueue（取消请求）
 * - CachedPromise（缓存）
 * - 统一错误处理（401 登录、9900403 鉴权弹窗、其他 message 提示）
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type CancelTokenSource } from 'axios';
import type { RequestConfig } from '@/types';
import serviceList from '@/services';
import { useAppStore } from '@/stores/app';
import cachedPromise from './cached-promise';
import requestQueue from './request-queue';

const baseURL = window.AJAX_URL_PREFIX || '/api/v1';

// ==================== axios 实例 ====================
export const axiosInstance: AxiosInstance = axios.create({
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  xsrfCookieName: 'bklog_csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  withCredentials: true,
  baseURL,
});

// ==================== 工具函数 ====================
function generateRequestId(serviceName: string): string {
  return `${serviceName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateTraceparent(): string {
  const traceId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const spanId = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `00-${traceId}-${spanId}-01`;
}

// ==================== 请求拦截器 ====================
axiosInstance.interceptors.request.use(
  (config) => {
    // 外部版自动加 X-Bk-Space-Uid
    if (String(window.IS_EXTERNAL) === 'true') {
      try {
        const appStore = useAppStore();
        if (appStore.spaceUid) {
          config.headers['X-Bk-Space-Uid'] = appStore.spaceUid;
        }
      } catch {
        // store 未初始化时忽略
      }
    }

    // 追踪链路 Traceparent
    config.headers['Traceparent'] = generateTraceparent();

    // 时区信息
    try {
      const appStore = useAppStore();
      if (appStore.timezone) {
        config.headers['X-BKLOG-TIMEZONE'] = appStore.timezone;
      }
    } catch {
      // 忽略
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ==================== 响应拦截器 ====================
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Blob 类型特殊处理
    if (response.config.responseType === 'blob') {
      if (response.status === 200) {
        return response;
      }
      // 非 200 读取 JSON 错误信息
      return readBlobRespToJson(response).then((data) => {
        return Promise.reject(data);
      });
    }
    return handleResponse(response);
  },
  (error) => {
    return handleReject(error);
  },
);

// ==================== 响应处理 ====================
function handleResponse(response: AxiosResponse) {
  const { data } = response;

  if (data.result === false || (data.code !== undefined && data.code !== 0 && data.code !== '00')) {
    return handleReject({ response, message: data.message || '请求失败' });
  }

  return data.data !== undefined ? data.data : data;
}

async function handleReject(error: {
  response?: AxiosResponse;
  message?: string;
  config?: AxiosRequestConfig & { catchIsShowMessage?: boolean };
}) {
  if (axios.isCancel(error)) {
    return Promise.reject(error);
  }

  const status = error?.response?.status;
  const data = error?.response?.data;
  const code = data?.code;

  // 401 登录
  if (status === 401) {
    handleLoginRedirect();
    return Promise.reject(error);
  }

  // 业务鉴权 9900403
  if (code === '9900403' || code === 9900403) {
    try {
      const appStore = useAppStore();
      appStore.setAuthDialogData(data?.permission || {});
    } catch {
      // 忽略
    }
    return Promise.reject(error);
  }

  // 其他错误提示
  const showMessage = (error as { config?: { catchIsShowMessage?: boolean } })?.config?.catchIsShowMessage !== false;
  if (showMessage) {
    const msg = data?.message || error?.message || '请求失败';
    showErrorMessage(msg);
  }

  return Promise.reject(error);
}

function handleLoginRedirect() {
  const loginUrl = window.LOGIN_SERVICE_URL || window.BK_LOGIN_URL;
  if (loginUrl) {
    // 优先使用弹窗登录
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `${loginUrl}?c_url=${currentUrl}`;
  }
}

function showErrorMessage(message: string) {
  // 动态引入避免循环依赖，实际由 app 层注入
  console.error('[BkLog API Error]', message);
  // 通过全局事件总线通知
  window.dispatchEvent(new CustomEvent('bklog:api-error', { detail: { message } }));
}

async function readBlobRespToJson(response: AxiosResponse): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error('Failed to parse blob response'));
      }
    };
    reader.onerror = reject;
    reader.readAsText(response.data);
  });
}

// ==================== 核心 request 方法 ====================
type ServiceKey = string; // 格式: 'domain/apiName'

interface HttpRequestOptions extends RequestConfig {
  query?: Record<string, unknown>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

const http = {
  queue: requestQueue,

  /**
   * 核心请求方法
   * @param serviceName - 服务名 'meta/menu'
   * @param options - 请求参数
   * @param config - 请求控制配置
   */
  request<T = unknown>(
    serviceName: ServiceKey,
    options: HttpRequestOptions = {},
    config: RequestConfig = {},
  ): Promise<T> {
    const service = serviceList[serviceName];
    if (!service) {
      return Promise.reject(new Error(`Service not found: ${serviceName}`));
    }

    const requestId = generateRequestId(serviceName);
    const { fromCache = false, cancelPrevious = false, cancelWhenRouteChange = true, clearCache = false } = config;

    // 清除缓存
    if (clearCache) {
      cachedPromise.clear(serviceName);
    }

    // 从缓存返回
    if (fromCache && cachedPromise.has(serviceName)) {
      return cachedPromise.get<T>(serviceName)!;
    }

    // 取消前一个同名请求
    if (cancelPrevious) {
      requestQueue.cancel(serviceName);
    }

    // 构建取消令牌
    const cancelTokenSource: CancelTokenSource = axios.CancelToken.source();

    requestQueue.add({
      requestId,
      cancelWhenRouteChange,
      cancel: () => cancelTokenSource.cancel(`Request cancelled: ${serviceName}`),
    });

    const { query, data, ...restOptions } = options;
    const axiosConfig: AxiosRequestConfig & { catchIsShowMessage?: boolean } = {
      method: service.method || 'get',
      url: service.url,
      cancelToken: cancelTokenSource.token,
      catchIsShowMessage: config.catchIsShowMessage !== false,
      ...restOptions,
    };

    if (axiosConfig.method?.toLowerCase() === 'get') {
      axiosConfig.params = query;
    } else {
      axiosConfig.data = data;
      axiosConfig.params = query;
    }

    const promise = axiosInstance(axiosConfig)
      .then((res) => res as T)
      .finally(() => {
        requestQueue.remove(requestId);
      });

    if (fromCache) {
      cachedPromise.set(serviceName, promise as Promise<unknown>);
    }

    return promise;
  },

  /**
   * 路由切换时取消所有标记了 cancelWhenRouteChange 的请求
   */
  cancelRouteChangeRequests() {
    requestQueue.cancelByRouteChange();
  },
};

export default http;
