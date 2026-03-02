/**
 * register.ts - 全局公共组件注册（Vue3 + Webpack）
 */

import type { App, Component } from 'vue';

/**
 * 注册全局公共组件
 * TDesign 组件通过插件自动注册，此处注册业务公共组件
 * Webpack 环境下使用 require.context 代替 import.meta.glob
 */
export function registerGlobalComponents(app: App): void {
  // Webpack require.context 动态加载
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requireContext = (require as any).context('./', true, /\.tsx$/);
  requireContext.keys().forEach((key: string) => {
    const module = requireContext(key) as { default?: Component & { name?: string } };
    const comp = module.default;
    if (comp?.name) {
      app.component(comp.name, comp);
    }
  });
}

export default registerGlobalComponents;
