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
    path: '/retrieve/:indexId?',
    name: 'retrieve',
    component: () => import('@/views/retrieve/index'),
    meta: {
      title: '检索',
      navId: 'search',
      requiresAuth: true,
    },
  },
  {
    path: '/manage',
    name: 'manage',
    component: () => import('@/views/manage/index'),
    meta: {
      title: '管理',
      navId: 'manage',
      requiresAuth: true,
    },
    children: [
      {
        path: 'log-collection',
        name: 'log-collection',
        component: () => import('@/views/manage/log-collection/index'),
        meta: {
          title: '日志采集',
        },
      },
      {
        path: 'index-set',
        name: 'index-set',
        component: () => import('@/views/manage/index-set/index'),
        meta: {
          title: '索引集管理',
        },
      },
      {
        path: 'clean',
        name: 'clean',
        component: () => import('@/views/manage/clean/index'),
        meta: {
          title: '清洗配置',
        },
      },
      {
        path: 'archive',
        name: 'archive',
        component: () => import('@/views/manage/archive/index'),
        meta: {
          title: '归档管理',
        },
      },
      {
        path: 'extract',
        name: 'extract',
        component: () => import('@/views/manage/extract/index'),
        meta: {
          title: '日志提取',
        },
      },
      {
        path: 'client-log',
        name: 'client-log',
        component: () => import('@/views/manage/client-log/index'),
        meta: {
          title: '客户端日志',
        },
      },
      {
        path: 'cluster',
        name: 'cluster',
        component: () => import('@/views/manage/cluster/index'),
        meta: {
          title: 'ES 集群管理',
        },
      },
    ],
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/dashboard/index'),
    meta: {
      title: '仪表盘',
      navId: 'dashboard',
      requiresAuth: true,
    },
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: () => import('@/views/monitor/index'),
    meta: {
      title: '监控日志',
      navId: 'monitor',
      requiresAuth: true,
    },
  },
  {
    path: '/share/:id',
    name: 'share',
    component: () => import('@/views/share/index'),
    meta: {
      title: '分享',
    },
  },
  {
    path: '/authorization',
    name: 'authorization',
    component: () => import('@/views/authorization/index'),
    meta: {
      title: '权限管理',
      requiresAuth: true,
    },
  },
  {
    path: '/403',
    name: '403',
    component: () => import('@/views/error/403'),
    meta: {
      title: '无权限',
    },
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/error/404'),
    meta: {
      title: '页面不存在',
    },
  },
  {
    path: '/500',
    name: '500',
    component: () => import('@/views/error/500'),
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
