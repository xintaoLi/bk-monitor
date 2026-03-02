/**
 * main.ts - Vue3 应用入口
 * 对齐原 src/main.js 启动流程：
 * 1. 初始化全局能力（组件、指令、插件）
 * 2. preload（并行拉取空间/用户/全局配置）
 * 3. 创建路由 + 拉取菜单 + 挂载 Vue
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';

// TDesign Vue Next 全局样式
import 'tdesign-vue-next/es/style/index.css';

// 本地样式
import './assets/scss/index.scss';

import App from './app';
import i18n from './language';
import { getRouter } from './router';
import { useAppStore } from './stores/app';
import preload from './preload';
import http from './api';
import { registerDirectives } from './directives';
import { registerGlobalComponents } from './components/common/register';

// ==================== 初始化 Pinia（必须在 store 使用前）====================
const pinia = createPinia();

// 临时创建 app 用于初始化 pinia（preload 需要 store）
const tempApp = createApp({ template: '<div/>' });
tempApp.use(pinia);
tempApp.mount(document.createElement('div'));

// ==================== 执行 Preload ====================
async function bootstrap() {
  try {
    // 1. 预加载（并行拉取基础数据）
    const { spaceUid, bkBizId, externalMenu } = await preload();

    // 2. 创建路由
    const router = getRouter(spaceUid, bkBizId, externalMenu);

    // 3. 拉取菜单
    const appStore = useAppStore();
    try {
      const menuData = await http.request<unknown[]>('meta/menu', {
        query: { space_uid: spaceUid },
      });
      if (Array.isArray(menuData)) {
        appStore.setMenuList(menuData as never[]);
      }
    } catch (err) {
      console.error('[BkLog] 获取菜单失败', err);
    }

    // 4. 创建 Vue3 应用
    const app = createApp(App);

    // 注册 Pinia
    app.use(pinia);

    // 注册路由
    app.use(router);

    // 注册 i18n
    app.use(i18n);

    // 注册全局指令
    registerDirectives(app);

    // 注册全局组件
    registerGlobalComponents(app);

    // 5. 挂载
    // 如果没有空间且不是 share 路由，跳转无权限页
    const currentPath = window.location.pathname;
    const isShareRoute = currentPath.includes('/share/');
    if (!spaceUid && !isShareRoute) {
      await router.push({
        path: '/un-authorized',
        query: {
          spaceUid,
          bizId: String(bkBizId),
          type: 'space',
        },
      });
    }

    app.mount('#app');

    // 6. 路由错误处理（对齐原项目 chunk load failed 重试）
    router.onError((err) => {
      const pattern = /Loading (CSS chunk|chunk) (\d)+ failed/g;
      if (err.message?.match(pattern)) {
        const targetPath = router.currentRoute.value.fullPath;
        router.replace(targetPath);
      }
    });
  } catch (err) {
    console.error('[BkLog] 应用启动失败', err);
    // 降级处理：直接挂载
    const app = createApp(App);
    app.use(pinia);
    app.use(i18n);
    app.mount('#app');
  }
}

bootstrap();
