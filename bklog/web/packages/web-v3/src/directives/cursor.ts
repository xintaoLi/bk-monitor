/**
 * cursor.ts - v-cursor 指令（Vue3）
 * 对齐原 src/directives/cursor.ts，升级为 Vue3 指令 API
 * 功能：无权限时鼠标悬停显示锁定图标
 */

import type { Directive, DirectiveBinding } from 'vue';

interface CursorOptions {
  active?: boolean;
  offset?: [number, number];
  cls?: string;
}

interface CursorElement extends HTMLElement {
  _cursorElement?: HTMLElement | null;
  _mouseEnterHandler?: () => void;
  _mouseMoveHandler?: (e: MouseEvent) => void;
  _mouseLeaveHandler?: () => void;
}

const DEFAULT_OPTIONS: Required<CursorOptions> = {
  active: true,
  offset: [15, 0],
  cls: 'cursor-element',
};

function init(el: CursorElement, binding: DirectiveBinding<CursorOptions>) {
  const options = { ...DEFAULT_OPTIONS, ...binding.value };

  el._mouseEnterHandler = () => {
    const element = document.createElement('div');
    element.id = 'directive-ele';
    element.style.position = 'absolute';
    element.style.zIndex = '2501';
    el._cursorElement = element;
    document.body.appendChild(element);
    element.classList.add(options.cls);
    el.addEventListener('mousemove', el._mouseMoveHandler!);
  };

  el._mouseMoveHandler = (event: MouseEvent) => {
    const { pageX, pageY } = event;
    const elLeft = pageX + options.offset[0];
    const elTop = pageY + options.offset[1];
    if (el._cursorElement) {
      el._cursorElement.style.left = `${elLeft}px`;
      el._cursorElement.style.top = `${elTop}px`;
    }
  };

  el._mouseLeaveHandler = () => {
    el._cursorElement?.remove();
    el._cursorElement = null;
    el.removeEventListener('mousemove', el._mouseMoveHandler!);
  };

  if (options.active) {
    el.addEventListener('mouseenter', el._mouseEnterHandler);
    el.addEventListener('mouseleave', el._mouseLeaveHandler);
  }
}

function destroy(el: CursorElement) {
  el._cursorElement?.remove();
  el._cursorElement = null;
  if (el._mouseEnterHandler) el.removeEventListener('mouseenter', el._mouseEnterHandler);
  if (el._mouseMoveHandler) el.removeEventListener('mousemove', el._mouseMoveHandler);
  if (el._mouseLeaveHandler) el.removeEventListener('mouseleave', el._mouseLeaveHandler);
}

const cursor: Directive<CursorElement, CursorOptions> = {
  // Vue3: mounted 对应 Vue2 bind
  mounted(el, binding) {
    init(el, binding);
  },
  // Vue3: updated 对应 Vue2 update
  updated(el, binding) {
    destroy(el);
    init(el, binding);
  },
  // Vue3: unmounted 对应 Vue2 unbind
  unmounted(el) {
    destroy(el);
  },
};

export default cursor;
