/**
 * use-resize-observer.ts - ResizeObserver Composable（Vue3）
 * 对齐原 src/hooks/use-resize-observe.ts
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export function useResizeObserver(
  targetRef: Ref<HTMLElement | null | undefined>,
  callback: (entry: ResizeObserverEntry) => void,
) {
  let observer: ResizeObserver | null = null;

  function observe() {
    if (!targetRef.value) return;
    observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => callback(entry));
    });
    observer.observe(targetRef.value);
  }

  function disconnect() {
    observer?.disconnect();
    observer = null;
  }

  onMounted(observe);
  onUnmounted(disconnect);

  return { observe, disconnect };
}

export default useResizeObserver;
