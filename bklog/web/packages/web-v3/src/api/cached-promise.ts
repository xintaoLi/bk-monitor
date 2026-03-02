/**
 * cached-promise.ts - Promise 缓存管理
 * 对齐原 src/api/cached-promise.js 逻辑
 */

export class CachedPromise {
  private cache: Map<string, Promise<unknown>> = new Map();

  get<T>(requestId: string): Promise<T> | undefined {
    return this.cache.get(requestId) as Promise<T> | undefined;
  }

  set<T>(requestId: string, promise: Promise<T>): void {
    this.cache.set(requestId, promise as Promise<unknown>);
    // 请求完成后自动清除缓存
    promise.finally(() => {
      // 延迟清除，允许同一时间的重复请求复用缓存
      setTimeout(() => {
        this.cache.delete(requestId);
      }, 0);
    });
  }

  clear(requestId?: string): void {
    if (requestId) {
      this.cache.delete(requestId);
    } else {
      this.cache.clear();
    }
  }

  has(requestId: string): boolean {
    return this.cache.has(requestId);
  }
}

export default new CachedPromise();
