/**
 * log-drag.ts - v-log-drag 指令（Vue3）
 * 对齐原 src/directives/log-drag.ts
 * 功能：日志表格列宽拖拽调整
 */

import type { Directive } from 'vue';

interface DragElement extends HTMLElement {
  _dragHandler?: (e: MouseEvent) => void;
  _dragStartHandler?: (e: MouseEvent) => void;
  _dragEndHandler?: () => void;
}

const logDrag: Directive<DragElement> = {
  mounted(el) {
    let startX = 0;
    let startWidth = 0;
    let isDragging = false;
    let targetEl: HTMLElement | null = null;

    el._dragStartHandler = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      targetEl = (e.target as HTMLElement).closest('[data-drag-col]') as HTMLElement;
      if (targetEl) {
        startWidth = targetEl.offsetWidth;
      }
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    el._dragHandler = (e: MouseEvent) => {
      if (!isDragging || !targetEl) return;
      const diffX = e.clientX - startX;
      const newWidth = Math.max(startWidth + diffX, 60);
      targetEl.style.width = `${newWidth}px`;
      // 触发自定义事件通知外部
      el.dispatchEvent(
        new CustomEvent('col-resize', {
          detail: { el: targetEl, width: newWidth },
          bubbles: true,
        }),
      );
    };

    el._dragEndHandler = () => {
      isDragging = false;
      targetEl = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    el.addEventListener('mousedown', el._dragStartHandler);
    document.addEventListener('mousemove', el._dragHandler);
    document.addEventListener('mouseup', el._dragEndHandler);
  },

  unmounted(el) {
    if (el._dragStartHandler) el.removeEventListener('mousedown', el._dragStartHandler);
    if (el._dragHandler) document.removeEventListener('mousemove', el._dragHandler);
    if (el._dragEndHandler) document.removeEventListener('mouseup', el._dragEndHandler);
  },
};

export default logDrag;
