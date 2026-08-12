export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  }
  return node;
}

export function clearChildren(node: HTMLElement) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function text(node: HTMLElement, value: string) {
  node.textContent = value;
}

export function on<K extends keyof HTMLElementEventMap>(
  node: EventTarget,
  type: K,
  listener: (ev: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
) {
  node.addEventListener(type, listener as EventListener, options);
  return () => node.removeEventListener(type, listener as EventListener, options);
}

export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 200) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
