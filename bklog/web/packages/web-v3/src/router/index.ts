import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import type { App } from 'vue';
import { http } from '@/utils/http';

/**
 * 基础路由配置
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/retrieve',
  },
  {
    path: '/retrieve',
    name: 'retrieve',
    component: () => import('@/layouts/main-layout.tsx'),
    meta: {
      title: '检索',
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'retrieve-index',
        component: () => import('@/views/retrieve/index.tsx'),
        meta: {
          title: '日志检索',
        },
      },
    ],
  },
  {
    path: '/manage',
    name: 'manage',
    component: () => import('@/layouts/main-layout.tsx'),
    meta: {
      title: '管理',
      requiresAuth: true,
    },
    children: [
      {
        path: 'collection',
        name: 'collection',
        component: () => import('@/views/manage/collection/index.tsx'),
        meta: {
          title: '日志采集',
        },
      },
      {
        path: 'index-set',
        name: 'index-set',
        component: () => import('@/views/manage/index-set/index.tsx'),
        meta: {
          title: '索引集',
        },
      },
    ],
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/layouts/main-layout.tsx'),
    meta: {
      title: '仪表盘',
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'dashboard-index',
        component: () => import('@/views/dashboard/index.tsx'),
        meta: {
          title: '仪表盘列表',
        },
      },
    ],
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: () => import('@/layouts/main-layout.tsx'),
    meta: {
      title: '监控日志',
      requiresAuth: true,
    },
    children: [
      {
        path: 'apm',
        name: 'apm',
        component: () => import('@/views/monitor/apm/index.tsx'),
        meta: {
          title: 'APM日志',
        },
      },
      {
        path: 'trace',
        name: 'trace',
        component: () => import('@/views/monitor/trace/index.tsx'),
        meta: {
          title: 'Trace日志',
        },
      },
    ],
  },
  {
    path: '/403',
    name: '403',
    component: () => import('@/views/error/403.tsx'),
    meta: {
      title: '无权限',
    },
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/error/404.tsx'),
    meta: {
      title: '页面不存在',
    },
  },
  {
    path: '/500',
    name: '500',
    component: () => import('@/views/error/500.tsx'),
    meta: {
      title: '服务器错误',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
];

/**
 * 创建路由实例
 */
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

/**
 * 全局前置守卫
 */
router.beforeEach((to, from, next) => {
  // 取消所有 pending 请求
  http.cancelAllPending();

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE}`;
  }

  // TODO: 权限校验
  // if (to.meta.requiresAuth) {
  //   // 检查是否已登录
  // }

  next();
});

/**
 * 全局后置钩子
 */
router.afterEach((to, from) => {
  // TODO: 路由切换后的处理
  console.log('Route changed:', from.path, '->', to.path);
});

/**
 * 路由错误处理
 */
router.onError((error) => {
  console.error('Router error:', error);
});

/**
 * 安装路由
 */
export function setupRouter(app: App): void {
  app.use(router);
}

export default router;
