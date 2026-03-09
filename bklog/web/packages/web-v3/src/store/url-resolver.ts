/**
 * URL 解析器
 */

interface RouteLocation {
  query?: Record<string, any>;
  params?: Record<string, any>;
}

interface ResolverOptions {
  route?: RouteLocation;
  resolveFieldList?: string[];
  keyword?: string;
  addition?: any[];
  [key: string]: any;
}

/**
 * 路由 URL 解析器基类
 */
export class RouteUrlResolver {
  protected route?: RouteLocation;
  protected resolveFieldList: string[];
  protected params: Record<string, any>;

  constructor(options: ResolverOptions = {}) {
    this.route = options.route;
    this.resolveFieldList = options.resolveFieldList || [];
    this.params = { ...options };
    delete this.params.route;
    delete this.params.resolveFieldList;
  }

  /**
   * 解析 URL 为对象
   */
  static parseUrl(url: string): Record<string, any> {
    console.log('RouteUrlResolver.parseUrl', url);
    try {
      const urlObj = new URL(url, 'http://localhost');
      const params: Record<string, any> = {};
      urlObj.searchParams.forEach((value, key) => {
        try {
          params[key] = JSON.parse(value);
        } catch {
          params[key] = value;
        }
      });
      return params;
    } catch (e) {
      return {};
    }
  }

  /**
   * 构建 URL 字符串
   */
  static buildUrl(params: Record<string, any>): string {
    console.log('RouteUrlResolver.buildUrl', params);
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    return searchParams.toString();
  }

  /**
   * 将查询参数转换为 store 对象
   */
  convertQueryToStore<T = any>(): T {
    const query = this.route?.query || {};
    const result: Record<string, any> = {};

    this.resolveFieldList.forEach(field => {
      if (query[field] !== undefined) {
        try {
          result[field] = typeof query[field] === 'string' ? JSON.parse(query[field]) : query[field];
        } catch {
          result[field] = query[field];
        }
      }
    });

    return result as T;
  }

  /**
   * 获取默认的 URL 查询参数
   */
  getDefUrlQuery(excludeFields: string[] = []): Record<string, any> {
    const query = this.route?.query || {};
    const result: Record<string, any> = {};

    Object.entries(query).forEach(([key, value]) => {
      if (!excludeFields.includes(key)) {
        result[key] = value;
      }
    });

    return result;
  }
}

/**
 * 检索专用 URL 解析器
 */
export class RetrieveUrlResolver extends RouteUrlResolver {
  constructor(options: ResolverOptions = {}) {
    super(options);
  }

  /**
   * 解析检索 URL
   */
  static parseRetrieveUrl(url: string): Record<string, any> {
    console.log('RetrieveUrlResolver.parseRetrieveUrl', url);
    return this.parseUrl(url);
  }

  /**
   * 将参数解析为 URL 查询对象
   */
  resolveParamsToUrl(): Record<string, any> {
    const result: Record<string, any> = {};

    // 处理 keyword
    if (this.params.keyword !== undefined) {
      result.keyword = this.params.keyword;
    }

    // 处理 addition
    if (this.params.addition !== undefined) {
      result.addition = Array.isArray(this.params.addition) 
        ? JSON.stringify(this.params.addition)
        : this.params.addition;
    }

    // 处理其他参数
    Object.entries(this.params).forEach(([key, value]) => {
      if (key !== 'keyword' && key !== 'addition' && value !== undefined) {
        result[key] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
    });

    return result;
  }

  /**
   * 将 URL 解析为参数对象
   */
  parseUrlToParams(url?: string): Record<string, any> {
    const query = url ? RouteUrlResolver.parseUrl(url) : (this.route?.query || {});
    const result: Record<string, any> = {};

    Object.entries(query).forEach(([key, value]) => {
      try {
        result[key] = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        result[key] = value;
      }
    });

    return result;
  }
}

export default RouteUrlResolver;
