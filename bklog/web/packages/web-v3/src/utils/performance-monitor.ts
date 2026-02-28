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

/**
 * 性能监控工具
 * 用于记录和分析关键操作的耗时
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetric {
  /** 指标名称 */
  name: string
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime?: number
  /** 持续时间 */
  duration?: number
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 性能监控摘要接口
 */
export interface PerformanceSummary {
  /** 总耗时 */
  totalTime: number
  /** 慢操作列表 */
  slowOperations: Array<{
    name: string
    duration: number
    metadata?: Record<string, any>
  }>
  /** 平均耗时 */
  averageTime: number
  /** 操作数量 */
  operationCount: number
}

/**
 * 性能监控类
 */
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private enabled: boolean =
    import.meta.env.DEV || window.localStorage.getItem('bklog_perf_monitor') === 'true'

  /**
   * 开始记录性能指标
   * @param name - 指标名称
   * @param metadata - 元数据
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    }
    this.metrics.set(name, metric)
  }

  /**
   * 结束记录性能指标
   * @param name - 指标名称
   * @param metadata - 元数据
   * @returns 持续时间
   */
  end(name: string, metadata?: Record<string, any>): number | undefined {
    if (!this.enabled) return

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`)
      return
    }

    metric.endTime = performance.now()
    metric.duration = metric.endTime - metric.startTime
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata }
    }

    // 如果耗时超过阈值，输出警告
    if (metric.duration > 100) {
      console.warn(`[Performance] ${name} took ${metric.duration.toFixed(2)}ms`, metric.metadata)
    } else {
      console.log(`[Performance] ${name} took ${metric.duration.toFixed(2)}ms`, metric.metadata)
    }

    return metric.duration
  }

  /**
   * 记录一个操作的耗时
   * @param name - 操作名称
   * @param fn - 操作函数
   * @param metadata - 元数据
   * @returns 操作结果
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.enabled) return fn()

    this.start(name, metadata)
    try {
      const result = fn()
      if (result instanceof Promise) {
        return result.then(
          value => {
            this.end(name, metadata)
            return value
          },
          error => {
            this.end(name, { ...metadata, error: error.message })
            throw error
          }
        ) as T
      }
      this.end(name, metadata)
      return result
    } catch (error: any) {
      this.end(name, { ...metadata, error: error?.message })
      throw error
    }
  }

  /**
   * 获取所有指标
   * @returns 指标列表
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.metrics.clear()
  }

  /**
   * 获取特定指标的耗时
   * @param name - 指标名称
   * @returns 耗时
   */
  getDuration(name: string): number | undefined {
    const metric = this.metrics.get(name)
    return metric?.duration
  }

  /**
   * 输出性能报告
   */
  report(): void {
    if (!this.enabled) return

    const metrics = this.getMetrics()
    if (metrics.length === 0) {
      console.log('[Performance] No metrics recorded')
      return
    }

    console.group('[Performance Report]')
    metrics.forEach(metric => {
      if (metric.duration) {
        console.log(`${metric.name}: ${metric.duration.toFixed(2)}ms`, metric.metadata || '')
      }
    })
    const totalTime = metrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    console.log(`Total: ${totalTime.toFixed(2)}ms`)
    console.groupEnd()
  }

  /**
   * 获取性能报告摘要
   * @returns 摘要信息
   */
  getSummary(): PerformanceSummary {
    const metrics = this.getMetrics().filter(m => m.duration)
    const totalTime = metrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    const slowOperations = metrics
      .filter(m => m.duration && m.duration > 100)
      .map(m => ({
        name: m.name,
        duration: m.duration!,
        metadata: m.metadata,
      }))
      .sort((a, b) => b.duration - a.duration)

    return {
      totalTime,
      slowOperations,
      averageTime: metrics.length > 0 ? totalTime / metrics.length : 0,
      operationCount: metrics.length,
    }
  }
}

/**
 * 性能监控器单例
 */
export const performanceMonitor = new PerformanceMonitor()

// 在开发环境下，将性能监控器挂载到 window 对象，方便调试
if (import.meta.env.DEV) {
  ;(window as any).__BKLOG_PERF_MONITOR__ = performanceMonitor
  ;(window as any).__BKLOG_PERF_REPORT__ = () => performanceMonitor.report()
  ;(window as any).__BKLOG_PERF_SUMMARY__ = () => {
    const summary = performanceMonitor.getSummary()
    console.table(summary.slowOperations)
    console.log('Summary:', {
      totalTime: `${summary.totalTime.toFixed(2)}ms`,
      averageTime: `${summary.averageTime.toFixed(2)}ms`,
      operationCount: summary.operationCount,
    })
    return summary
  }
}

/**
 * 开始记录性能指标（便捷函数）
 */
export const perfStart = (name: string, metadata?: Record<string, any>) =>
  performanceMonitor.start(name, metadata)

/**
 * 结束记录性能指标（便捷函数）
 */
export const perfEnd = (name: string, metadata?: Record<string, any>) =>
  performanceMonitor.end(name, metadata)

/**
 * 记录操作耗时（便捷函数）
 */
export const perfMeasure = <T>(name: string, fn: () => T, metadata?: Record<string, any>) =>
  performanceMonitor.measure(name, fn, metadata)
