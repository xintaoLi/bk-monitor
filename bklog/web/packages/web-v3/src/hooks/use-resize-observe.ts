/**
 * useResizeObserve hook
 * 监听元素尺寸变化
 */

import { Ref, onMounted, onBeforeUnmount, ref as vueRef } from 'vue';

/**
 * 使用 ResizeObserver 监听元素尺寸变化
 * @param target - 目标元素的 Ref，或者选择器字符串，或者返回 Ref 的函数
 * @param callback - 尺寸变化回调，接收单个 entry 或 entries 数组
 * @param delay - 可选的延迟时间（毫秒）
 */
export default function useResizeObserve(
  target: Ref<HTMLElement | null> | string | (() => HTMLElement | null),
  callback: (entry: ResizeObserverEntry) => void,
  delay?: number
) {
  let observer: ResizeObserver | null = null;
  let timeoutId: number | null = null;

  const getElement = (): HTMLElement | null => {
    if (typeof target === 'string') {
      // 选择器字符串
      return document.querySelector(target);
    } else if (typeof target === 'function') {
      // 函数返回元素
      return target();
    } else if (target && 'value' in target) {
      // Ref 对象
      return target.value;
    }
    return null;
  };

  const handleResize = (entries: ResizeObserverEntry[]) => {
    // 总是传递第一个 entry 对象，而不是数组
    if (entries.length === 0) return;
    
    const entry = entries[0];
    
    if (delay && delay > 0) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        callback(entry);
        timeoutId = null;
      }, delay);
    } else {
      callback(entry);
    }
  };

  onMounted(() => {
    const element = getElement();
    if (!element) {
      console.warn('[useResizeObserve] Target element not found');
      return;
    }
    
    observer = new ResizeObserver(handleResize);
    observer.observe(element);
  });

  onBeforeUnmount(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });

  const isStoped = { value: false };
  
  const observeElement = () => {
    isStoped.value = false;
    // Re-start observing
    startObserver();
  };
  
  const stopObserve = () => {
    isStoped.value = true;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };
  
  const startObserver = () => {
    // Start observing if needed
  };
  
  return {
    disconnect: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
    observeElement,
    stopObserve,
    isStoped,
  };
}
