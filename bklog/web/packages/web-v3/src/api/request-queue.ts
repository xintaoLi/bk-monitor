/**
 * request-queue.ts - 请求队列管理
 * 对齐原 src/api/request-queue.js 逻辑，升级为 TypeScript
 */

export interface QueueItem {
  requestId: string;
  cancelWhenRouteChange: boolean;
  cancel: () => void;
}

export class RequestQueue {
  private queue: Map<string, QueueItem> = new Map();

  add(item: QueueItem): void {
    this.queue.set(item.requestId, item);
  }

  remove(requestId: string): void {
    this.queue.delete(requestId);
  }

  cancelByRouteChange(): void {
    this.queue.forEach((item) => {
      if (item.cancelWhenRouteChange) {
        item.cancel();
        this.queue.delete(item.requestId);
      }
    });
  }

  cancelAll(): void {
    this.queue.forEach((item) => item.cancel());
    this.queue.clear();
  }

  cancel(requestId: string): void {
    const item = this.queue.get(requestId);
    if (item) {
      item.cancel();
      this.queue.delete(requestId);
    }
  }

  has(requestId: string): boolean {
    return this.queue.has(requestId);
  }
}

export default new RequestQueue();
