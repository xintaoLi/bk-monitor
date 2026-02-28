import { createPinia } from 'pinia';
import type { App } from 'vue';

/**
 * 创建 Pinia 实例
 */
export const pinia = createPinia();

/**
 * 安装 Pinia
 */
export function setupStore(app: App): void {
  app.use(pinia);
}

// 导出所有 store
export * from './user';
export * from './global';

export default pinia;
