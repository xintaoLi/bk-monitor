/*
 * Vite compatibility shim for scrollparent@2.x.
 * The package only ships a UMD/CJS file, while vue-virtual-scroller imports it as ESM default.
 */
function isScrolling(node: Element) {
  const overflow = getComputedStyle(node, null).getPropertyValue('overflow');
  return overflow.includes('scroll') || overflow.includes('auto');
}

export default function scrollParent(node: Element) {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
    return undefined;
  }

  let current = node.parentNode as Element | null;
  while (current?.parentNode) {
    if (isScrolling(current)) {
      return current;
    }
    current = current.parentNode as Element | null;
  }

  return document.scrollingElement || document.documentElement;
}
