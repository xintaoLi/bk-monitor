/**
 * index.ts - 全局指令注册
 * 对齐原 src/directives/index.ts，升级为 Vue3 app.directive API
 */

import type { App } from 'vue';
import cursor from './cursor';
import logDrag from './log-drag';

export function registerDirectives(app: App): void {
  // 鼠标锁定图标（无权限提示）
  app.directive('cursor', cursor);

  // 列宽拖拽
  app.directive('log-drag', logDrag);
}

export { cursor, logDrag };
