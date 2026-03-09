/*
 * Request pool for managing concurrent requests
 */

class RequestPool {
  private pending: Map<string, Promise<any>> = new Map();

  add(key: string, promise: Promise<any>) {
    this.pending.set(key, promise);
    promise.finally(() => this.pending.delete(key));
    return promise;
  }

  get(key: string) {
    return this.pending.get(key);
  }

  clear() {
    this.pending.clear();
  }
}

export const requestPool = new RequestPool();
export default requestPool;
