/**
 * hooks/use-intersection-observer.ts
 * 封装 IntersectionObserver，用于懒加载渲染
 */
import { onBeforeUnmount } from 'vue';

type ObserverCallback = (entry: IntersectionObserverEntry) => void;

export default function useIntersectionObserver(
  getTarget: () => Element | null | undefined,
  callback: ObserverCallback,
  options?: IntersectionObserverInit,
) {
  let observer: IntersectionObserver | null = null;

  const initObserver = () => {
    const target = getTarget();
    if (!target) return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => callback(entry));
      },
      {
        threshold: 0.01,
        ...options,
      },
    );

    observer.observe(target);
  };

  const destroyObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  // 延迟初始化（等待 DOM 挂载）
  setTimeout(initObserver, 0);

  onBeforeUnmount(destroyObserver);

  return { destroyObserver, initObserver };
}
