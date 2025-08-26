/*
* Tencent is pleased to support the open source community by making
* 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
*
* Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
*
* 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
*
* License for 蓝鲸智云PaaS平台 (BlueKing PaaS):
*
* ---------------------------------------------------
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
* documentation files (the "Software"), to deal in the Software without restriction, including without limitation
* the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
* to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of
* the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
* THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
* CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
* IN THE SOFTWARE.
*/
// 长任务设计为​​可中断、可恢复的迭代器模式​​。将任务分解成多个独立的函数块
// 使用 scheduler.yield -> scheduler.postTask 设计任务管理器， 降级采用 setTimeout 和 queueMicrotask 以及 Promise

// TypeScript types and interfaces
type TaskFunction = () => AsyncGenerator<void, any, unknown> | Generator<void, any, unknown>;

interface TaskOptions {
  priority?: 'background' | 'user-blocking' | 'user-visible';
  delay?: number;
  signal?: AbortSignal;
}

// Feature detection and fallback utilities
class SchedulerCompat {
  private static hasScheduler = typeof (globalThis as any).scheduler !== 'undefined';
  private static hasPostTask =
    SchedulerCompat.hasScheduler && typeof (globalThis as any).scheduler.postTask === 'function';
  private static hasYield = SchedulerCompat.hasScheduler && typeof (globalThis as any).scheduler.yield === 'function';

  // Scheduler.yield implementation with fallbacks
  static async yield(): Promise<void> {
    if (SchedulerCompat.hasYield) {
      return (globalThis as any).scheduler.yield();
    }

    // Fallback 1: Use scheduler.postTask if available
    if (SchedulerCompat.hasPostTask) {
      return new Promise<void>(resolve => {
        (globalThis as any).scheduler.postTask(resolve, { priority: 'user-visible' });
      });
    }

    // Fallback 2: Use queueMicrotask
    if (typeof queueMicrotask !== 'undefined') {
      return new Promise<void>(resolve => queueMicrotask(resolve));
    }

    // Fallback 3: Use Promise.resolve()
    return Promise.resolve();
  }

  // Scheduler.postTask implementation with fallbacks
  static postTask(callback: () => void, options: TaskOptions = {}): Promise<void> {
    const { priority = 'user-visible', delay = 0, signal } = options;

    if (signal?.aborted) {
      return Promise.reject(new DOMException('Task was aborted', 'AbortError'));
    }

    if (SchedulerCompat.hasPostTask) {
      return new Promise<void>((resolve, reject) => {
        const abortHandler = () => reject(new DOMException('Task was aborted', 'AbortError'));
        signal?.addEventListener('abort', abortHandler, { once: true });

        (globalThis as any).scheduler.postTask(
          () => {
            signal?.removeEventListener('abort', abortHandler);
            if (!signal?.aborted) {
              callback();
              resolve();
            }
          },
          { priority, delay },
        );
      });
    }

    // Fallback to setTimeout
    return new Promise<void>((resolve, reject) => {
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Task was aborted', 'AbortError'));
      };

      signal?.addEventListener('abort', abortHandler, { once: true });

      const timeoutId = setTimeout(() => {
        signal?.removeEventListener('abort', abortHandler);
        if (!signal?.aborted) {
          callback();
          resolve();
        }
      }, delay);
    });
  }
}

// Task state management
enum TaskState {
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  ERROR = 'error',
  PAUSED = 'paused',
  PENDING = 'pending',
  RUNNING = 'running',
}

// Interruptible task wrapper
class InterruptibleTask {
  private generator: AsyncGenerator<void, any, unknown> | Generator<void, any, unknown>;
  private state: TaskState = TaskState.PENDING;
  private result: any = null;
  private error: Error | null = null;
  private abortController: AbortController;
  private onStateChange?: (state: TaskState) => void;

  constructor(
    taskFunction: TaskFunction,
    private options: TaskOptions = {},
    onStateChange?: (state: TaskState) => void,
  ) {
    this.generator = taskFunction();
    // Link external abort signal
    if (options.signal) {
      options.signal.addEventListener('abort', () => this.cancel());
    }
    this.abortController = new AbortController();
    this.onStateChange = onStateChange;
  }

  async run(): Promise<any> {
    if (this.state !== TaskState.PENDING && this.state !== TaskState.PAUSED) {
      throw new Error(`Cannot run task in state: ${this.state}`);
    }

    this.setState(TaskState.RUNNING);

    try {
      while (true) {
        if (this.abortController.signal.aborted) {
          this.setState(TaskState.CANCELLED);
          throw new DOMException('Task was cancelled', 'AbortError');
        }

        const { value, done } = await this.generator.next();

        if (done) {
          this.result = value;
          this.setState(TaskState.COMPLETED);
          return this.result;
        }

        // Yield control back to the scheduler
        await SchedulerCompat.yield();
      }
    } catch (error) {
      this.error = error as Error;
      this.setState(TaskState.ERROR);
      throw error;
    }
  }

  pause(): void {
    if (this.state === TaskState.RUNNING) {
      this.setState(TaskState.PAUSED);
    }
  }

  resume(): Promise<any> {
    if (this.state === TaskState.PAUSED) {
      return this.run();
    }
    throw new Error(`Cannot resume task in state: ${this.state}`);
  }

  cancel(): void {
    this.abortController.abort();
    this.setState(TaskState.CANCELLED);
  }

  getState(): TaskState {
    return this.state;
  }

  getResult(): any {
    return this.result;
  }

  getError(): Error | null {
    return this.error;
  }

  private setState(newState: TaskState): void {
    this.state = newState;
    this.onStateChange?.(newState);
  }
}

// Main task scheduler
class TaskScheduler {
  private tasks: Map<string, InterruptibleTask> = new Map();
  private runningTasks: Set<string> = new Set();
  private maxConcurrentTasks: number;

  constructor(maxConcurrentTasks = 3) {
    this.maxConcurrentTasks = maxConcurrentTasks;
  }

  // Schedule a new task
  scheduleTask(id: string, taskFunction: TaskFunction, options: TaskOptions = {}): InterruptibleTask {
    if (this.tasks.has(id)) {
      throw new Error(`Task with id "${id}" already exists`);
    }

    const task = new InterruptibleTask(taskFunction, options, state => this.handleTaskStateChange(id, state));

    this.tasks.set(id, task);
    return task;
  }

  // Run a scheduled task
  async runTask(id: string): Promise<any> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id "${id}" not found`);
    }

    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      throw new Error('Maximum concurrent tasks limit reached');
    }

    this.runningTasks.add(id);

    try {
      const result = await task.run();
      return result;
    } finally {
      this.runningTasks.delete(id);
    }
  }

  // Run task with automatic scheduling
  async runTaskWithScheduling(id: string, taskFunction: TaskFunction, options: TaskOptions = {}): Promise<any> {
    this.scheduleTask(id, taskFunction, options);
    return this.runTask(id);
  }

  // Pause a running task
  pauseTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.pause();
    }
  }

  // Resume a paused task
  async resumeTask(id: string): Promise<any> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id "${id}" not found`);
    }

    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      throw new Error('Maximum concurrent tasks limit reached');
    }

    this.runningTasks.add(id);

    try {
      const result = await task.resume();
      return result;
    } finally {
      this.runningTasks.delete(id);
    }
  }

  // Cancel a task
  cancelTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.cancel();
      this.runningTasks.delete(id);
    }
  }

  // Get task status
  getTaskState(id: string): TaskState | null {
    const task = this.tasks.get(id);
    return task ? task.getState() : null;
  }

  // Clean up completed/cancelled tasks
  cleanup(): void {
    for (const [id, task] of this.tasks.entries()) {
      const state = task.getState();
      if (state === TaskState.COMPLETED || state === TaskState.CANCELLED || state === TaskState.ERROR) {
        this.tasks.delete(id);
        this.runningTasks.delete(id);
      }
    }
  }

  // Get all task states
  getAllTaskStates(): Record<string, TaskState> {
    const states: Record<string, TaskState> = {};
    for (const [id, task] of this.tasks.entries()) {
      states[id] = task.getState();
    }
    return states;
  }

  private handleTaskStateChange(id: string, state: TaskState): void {
    if (state === TaskState.COMPLETED || state === TaskState.CANCELLED || state === TaskState.ERROR) {
      this.runningTasks.delete(id);
    }
  }
}

// Utility functions for creating interruptible tasks
export function* createInterruptibleTask<T>(
  items: T[],
  processor: (item: T, index: number) => void,
  batchSize = 10,
): Generator<void, T[], unknown> {
  const results: T[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    for (let j = 0; j < batch.length; j++) {
      processor(batch[j], i + j);
      results.push(batch[j]);
    }

    // Yield control after each batch
    if (i + batchSize < items.length) {
      yield;
    }
  }

  return results;
}

export async function* createAsyncInterruptibleTask<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize = 5,
): AsyncGenerator<void, R[], unknown> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Process batch items in parallel
    const batchPromises = batch.map((item, j) => processor(item, i + j));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Yield control after each batch
    if (i + batchSize < items.length) {
      yield;
    }
  }

  return results;
}

// Export main classes and utilities
export { TaskScheduler, InterruptibleTask, SchedulerCompat, TaskState, type TaskFunction, type TaskOptions };

// Create default scheduler instance
export const defaultScheduler = new TaskScheduler();

// Example usage functions
export function createDataProcessingTask(data: any[], batchSize = 100) {
  return function* () {
    const results = [];
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      // Process batch
      const processedBatch = batch.map(item => {
        // Your processing logic here
        return { ...item, processed: true };
      });

      results.push(...processedBatch);

      // Yield after each batch
      yield;
    }
    return results;
  };
}

export function createAsyncDataFetchTask(urls: string[], batchSize = 5) {
  return async function* () {
    const results = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);

      // Fetch batch in parallel
      const promises = batch.map(url => fetch(url).then(r => r.json()));
      const batchResults = await Promise.all(promises);

      results.push(...batchResults);

      // Yield after each batch
      yield;
    }
    return results;
  };
}
