// Type shim for resize-detector
declare module 'resize-detector' {
  export type ResizeCallback = (el: HTMLElement) => void;
  export function addListener(el: HTMLElement, callback: ResizeCallback): void;
  export function removeListener(el: HTMLElement, callback: ResizeCallback): void;
  export function addResizeListener(el: HTMLElement, handler: () => void): void;
  export function removeResizeListener(el: HTMLElement, handler: () => void): void;
}
