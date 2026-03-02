/**
 * index.ts - Vue Router 4 路由配置
 * 对齐原 src/router/index.js 逻辑：
 * - 动态路由生成（根据 spaceUid/bkBizId/externalMenu）
 * - beforeEach：取消请求 + 外部版白名单 + 跨应用通信
 * - afterEach：路由日志上报
 */

import { createRouter, createWebHistory, type RouteRecordRaw, type Router } from 'vue-router';
import http from '@/api';
import { useAppStore } from '@/stores/app';

// ==================== 路由懒加载声明 ====================

// 检索模块
const RetrieveView = () => import(/* webpackChunkName: 'retrieve' */ '@/views/retrieve/index');
const ShareView = () => import(/* webpackChunkName: 'share' */ '@/views/share/index');
const AuthorizationView = () => import(/* webpackChunkName: 'authorization' */ '@/views/authorization/index');
const DataIdView = () => import(/* webpackChunkName: 'data-id' */ '@/views/retrieve/data-id');
const TemplateManageView = () => import(/* webpackChunkName: 'template-manage' */ '@/views/retrieve/template-manage');

// 管理模块
const ManageView = () => import(/* webpackChunkName: 'manage' */ '@/views/manage/index');
const CollectionListView = () => import(/* webpackChunkName: 'collection-list' */ '@/views/manage/collection/list');
const CollectionManageView = () => import(/* webpackChunkName: 'collection-manage' */ '@/views/manage/collection/manage');
const CollectionAccessView = () => import(/* webpackChunkName: 'collection-access' */ '@/views/manage/collection/access');
const IndexSetListView = () => import(/* webpackChunkName: 'index-set-list' */ '@/views/manage/index-set/list');
const IndexSetManageView = () => import(/* webpackChunkName: 'index-set-manage' */ '@/views/manage/index-set/manage');
const ClientLogView = () => import(/* webpackChunkName: 'client-log' */ '@/views/manage/client-log/index');
const CleanListView = () => import(/* webpackChunkName: 'clean-list' */ '@/views/manage/clean/list');
const CleanTemplateListView = () => import(/* webpackChunkName: 'clean-template' */ '@/views/manage/clean/template-list');
const MaskingListView = () => import(/* webpackChunkName: 'masking' */ '@/views/manage/masking/list');
const ArchiveRepositoryView = () => import(/* webpackChunkName: 'archive-repo' */ '@/views/manage/archive/repository');
const ArchiveListView = () => import(/* webpackChunkName: 'archive-list' */ '@/views/manage/archive/list');
const ArchiveRestoreView = () => import(/* webpackChunkName: 'archive-restore' */ '@/views/manage/archive/restore');
const ExtractConfigView = () => import(/* webpackChunkName: 'extract-config' */ '@/views/manage/extract/config');
const ExtractTaskView = () => import(/* webpackChunkName: 'extract-task' */ '@/views/manage/extract/task');
const ExtractLinkView = () => import(/* webpackChunkName: 'extract-link' */ '@/views/manage/extract/link');
const EsClusterView = () => import(/* webpackChunkName: 'es-cluster' */ '@/views/manage/es-cluster/index');
const ReportManageView = () => import(/* webpackChunkName: 'report-manage' */ '@/views/manage/report/index');
const CollectionTrackView = () => import(/* webpackChunkName: 'collection-track' */ '@/views/manage/track/collection');
const SdkTrackView = () => import(/* webpackChunkName: 'sdk-track' */ '@/views/manage/track/sdk');
const DataLinkConfView = () => import(/* webpackChunkName: 'data-link' */ '@/views/manage/data-link/index');
const CustomReportListView = () => import(/* webpackChunkName: 'custom-report' */ '@/views/manage/custom-report/list');
const CustomReportCreateView = () =>
  import(/* webpackChunkName: 'custom-report-create' */ '@/views/manage/custom-report/create');
const BkDataCollectionView = () =>
  import(/* webpackChunkName: 'bkdata-collection' */ '@/views/manage/bkdata-collection/index');
const EsCollectionView = () => import(/* webpackChunkName: 'es-collection' */ '@/views/manage/es-collection/index');

// 仪表盘模块
const DashboardView = () => import(/* webpackChunkName: 'dashboard' */ '@/views/dashboard/index');
const DashboardHomeView = () => import(/* webpackChunkName: 'dashboard-home' */ '@/views/dashboard/home');

// 监控嵌入模块
const MonitorView = () => import(/* webpackChunkName: 'monitor' */ '@/views/monitor/index');

// 通用页面
const UnAuthorizedView = () => import(/* webpackChunkName: 'un-authorized' */ '@/views/un-authorized/index');
const NotFoundView = () => import(/* webpackChunkName: '404' */ '@/views/not-found/index');

// ==================== 外部版白名单 ====================
const EXTERNAL_ROUTE_WHITELIST = ['retrieve', 'externalAuth', 'extractHome', 'extractCreate', 'extractClone'];

// ==================== 路由生成函数 ====================
function getRetrieveRoutes(): RouteRecordRaw[] {
  return [
    {
      path: '/retrieve/:indexId?',
      name: 'retrieve',
      component: RetrieveView,
      meta: { title: '检索', navId: 'retrieve' },
    },
    {
      path: '/template-manage',
      name: 'templateManage',
      component: TemplateManageView,
      meta: { title: '模版管理', navId: 'retrieve' },
    },
    {
      path: '/external-auth/:activeNav?',
      name: 'externalAuth',
      component: AuthorizationView,
      meta: { title: '授权列表', navId: 'external-auth' },
    },
    {
      path: '/share/:linkId?',
      name: 'share',
      component: ShareView,
      meta: { title: '分享链接', navId: 'share' },
    },
    {
      path: '/data_id/:id?',
      name: 'data_id',
      component: DataIdView,
      meta: { title: 'Data ID 解析', navId: 'data_id' },
    },
  ];
}

function getManageRoutes(): RouteRecordRaw[] {
  return [
    {
      path: '/manage',
      name: 'manage',
      component: ManageView,
      redirect: '/manage/log-collection/collection-item/list',
      meta: { title: '管理', navId: 'manage' },
      children: [
        // 日志接入 - 采集项
        {
          path: 'log-collection/collection-item/list',
          name: 'collection-item',
          component: CollectionListView,
          meta: { title: '采集项', navId: 'log-collection' },
        },
        {
          path: 'log-collection/collection-item/manage/:collectorId',
          name: 'manage-collection',
          component: CollectionManageView,
          meta: { title: '采集项详情', navId: 'log-collection' },
        },
        {
          path: 'log-collection/collection-item/add/:collectorId?',
          name: 'add-collection',
          component: CollectionAccessView,
          meta: { title: '新增采集项', navId: 'log-collection' },
        },
        {
          path: 'log-collection/collection-item/edit/:collectorId',
          name: 'edit-collection',
          component: CollectionAccessView,
          meta: { title: '编辑采集项', navId: 'log-collection' },
        },
        {
          path: 'log-collection/collection-item/field/:collectorId',
          name: 'field-collection',
          component: CollectionAccessView,
          meta: { title: '字段提取', navId: 'log-collection' },
        },
        {
          path: 'log-collection/collection-item/storage/:collectorId',
          name: 'storage-collection',
          component: CollectionAccessView,
          meta: { title: '存储配置', navId: 'log-collection' },
        },
        {
          path: 'log-collection/collection-item/masking/:collectorId',
          name: 'masking-collection',
          component: CollectionAccessView,
          meta: { title: '脱敏配置', navId: 'log-collection' },
        },
        // 日志接入 - 索引集
        {
          path: 'log-collection/log-index-set/list',
          name: 'log-index-set',
          component: IndexSetListView,
          meta: { title: '索引集', navId: 'log-index-set' },
        },
        {
          path: 'log-collection/log-index-set/manage/:indexSetId',
          name: 'manage-index-set',
          component: IndexSetManageView,
          meta: { title: '索引集详情', navId: 'log-index-set' },
        },
        {
          path: 'log-collection/log-index-set/edit/:indexSetId',
          name: 'edit-index-set',
          component: IndexSetManageView,
          meta: { title: '编辑索引集', navId: 'log-index-set' },
        },
        // 客户端日志
        {
          path: 'tgpa-task/list',
          name: 'tgpa-task',
          component: ClientLogView,
          meta: { title: '客户端日志', navId: 'tgpa-task' },
        },
        // 计算平台
        {
          path: 'bk-data-collection/list',
          name: 'bk-data-collection',
          component: BkDataCollectionView,
          meta: { title: '计算平台', navId: 'bk-data-collection' },
        },
        // 第三方 ES
        {
          path: 'es-collection/list',
          name: 'es-collection',
          component: EsCollectionView,
          meta: { title: '第三方 ES', navId: 'es-collection' },
        },
        // 自定义上报
        {
          path: 'custom-report/list',
          name: 'custom-report',
          component: CustomReportListView,
          meta: { title: '自定义上报', navId: 'custom-report' },
        },
        {
          path: 'custom-report/create',
          name: 'custom-report-create',
          component: CustomReportCreateView,
          meta: { title: '新增自定义上报', navId: 'custom-report' },
        },
        // 日志清洗
        {
          path: 'clean-list/list',
          name: 'clean-list',
          component: CleanListView,
          meta: { title: '清洗列表', navId: 'clean-list' },
        },
        {
          path: 'clean-templates/list',
          name: 'clean-templates',
          component: CleanTemplateListView,
          meta: { title: '清洗模板', navId: 'clean-templates' },
        },
        {
          path: 'log-desensitize/list',
          name: 'log-desensitize',
          component: MaskingListView,
          meta: { title: '脱敏列表', navId: 'log-desensitize' },
        },
        // 日志归档
        {
          path: 'archive-repository',
          name: 'archive-repository',
          component: ArchiveRepositoryView,
          meta: { title: '归档仓库', navId: 'archive-repository' },
        },
        {
          path: 'archive-list',
          name: 'archive-list',
          component: ArchiveListView,
          meta: { title: '归档列表', navId: 'archive-list' },
        },
        {
          path: 'archive-restore',
          name: 'archive-restore',
          component: ArchiveRestoreView,
          meta: { title: '归档还原', navId: 'archive-restore' },
        },
        // 日志提取
        {
          path: 'manage-log-extract',
          name: 'manage-log-extract',
          component: ExtractConfigView,
          meta: { title: '提取配置', navId: 'manage-log-extract' },
        },
        {
          path: 'log-extract-task',
          name: 'extract-home',
          component: ExtractTaskView,
          meta: { title: '提取任务', navId: 'log-extract-task' },
        },
        {
          path: 'log-extract-task/create',
          name: 'extractCreate',
          component: ExtractTaskView,
          meta: { title: '新建提取任务', navId: 'log-extract-task' },
        },
        {
          path: 'log-extract-task/clone/:taskId',
          name: 'extractClone',
          component: ExtractTaskView,
          meta: { title: '克隆提取任务', navId: 'log-extract-task' },
        },
        {
          path: 'extract-link-manage',
          name: 'extract-link-manage',
          component: ExtractLinkView,
          meta: { title: '链路管理', navId: 'extract-link-manage' },
        },
        // 系统设置
        {
          path: 'es-cluster-manage',
          name: 'es-cluster-manage',
          component: EsClusterView,
          meta: { title: 'ES集群管理', navId: 'es-cluster-manage' },
        },
        {
          path: 'report-manage',
          name: 'report-manage',
          component: ReportManageView,
          meta: { title: '订阅管理', navId: 'report-manage' },
        },
        {
          path: 'collection-track',
          name: 'collection-track',
          component: CollectionTrackView,
          meta: { title: '全链路追踪', navId: 'collection-track' },
        },
        {
          path: 'sdk-track',
          name: 'sdk-track',
          component: SdkTrackView,
          meta: { title: 'SDK 追踪', navId: 'sdk-track' },
        },
        {
          path: 'manage-data-link-conf',
          name: 'manage-data-link-conf',
          component: DataLinkConfView,
          meta: { title: '数据链路配置', navId: 'manage-data-link-conf' },
        },
      ],
    },
  ];
}

function getDashboardRoutes(): RouteRecordRaw[] {
  return [
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      redirect: '/dashboard/home',
      meta: { title: '仪表盘', navId: 'dashboard' },
      children: [
        {
          path: 'home',
          name: 'dashboard-home',
          component: DashboardHomeView,
          meta: { title: '仪表盘首页', navId: 'dashboard' },
        },
      ],
    },
  ];
}

function getMonitorRoutes(): RouteRecordRaw[] {
  const monitorApp = process.env.MONITOR_APP;
  if (!['apm', 'trace'].includes(monitorApp || '')) return [];

  return [
    {
      path: '/monitor-apm-log/:indexId?',
      name: 'monitor-apm-log',
      component: MonitorView,
      meta: { title: 'APM 日志', navId: 'monitor-apm' },
    },
    {
      path: '/monitor-trace-log/:indexId?',
      name: 'monitor-trace-log',
      component: MonitorView,
      meta: { title: 'Trace 日志', navId: 'monitor-trace' },
    },
  ];
}

// ==================== 路由实例创建 ====================
export function getRouter(spaceUid: string, bkBizId: string | number, externalMenu?: string[]): Router {
  const isExternal = String(window.IS_EXTERNAL) === 'true';

  const getDefaultRouteName = () => {
    if (isExternal) {
      return externalMenu?.includes('retrieve') ? 'retrieve' : 'manage';
    }
    return 'retrieve';
  };

  const routes: RouteRecordRaw[] = [
    // 根路径重定向
    {
      path: '/',
      redirect: (to) => ({
        name: getDefaultRouteName(),
        query: {
          ...to.query,
          spaceUid,
          bizId: String(bkBizId),
        },
      }),
    },
    // 业务模块路由
    ...getRetrieveRoutes(),
    ...getManageRoutes(),
    ...getDashboardRoutes(),
    ...getMonitorRoutes(),
    // 无权限页
    {
      path: '/un-authorized',
      name: 'un-authorized',
      component: UnAuthorizedView,
      meta: { title: '无权限' },
    },
    // 404
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: { title: '404' },
    },
  ];

  const router = createRouter({
    history: createWebHistory(window.SITE_URL || '/'),
    routes,
    scrollBehavior: () => ({ top: 0 }),
  });

  // ==================== 路由守卫 ====================

  // beforeEach：取消请求 + 外部版白名单 + 跨应用通信
  router.beforeEach((to, _from, next) => {
    // 1. 取消路由切换时的请求
    http.cancelRouteChangeRequests();

    // 2. 跨应用通信（retrieve 页面同步参数给父窗口）
    if (to.name === 'retrieve' && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'route-change',
          route: { name: to.name, query: to.query, params: to.params },
        },
        '*',
      );
    }

    // 3. 外部版白名单校验
    if (isExternal && to.name && !EXTERNAL_ROUTE_WHITELIST.includes(String(to.name))) {
      const targetName = externalMenu?.includes('retrieve') ? 'retrieve' : 'manage';
      if (to.name !== targetName) {
        next({ name: targetName, query: { spaceUid, bizId: String(bkBizId) } });
        return;
      }
    }

    next();
  });

  // afterEach：路由日志上报
  router.afterEach((to) => {
    if (to.name === 'not-found') return;
    // 上报路由日志
    reportRouteLog({
      route_id: String(to.name || ''),
      nav_id: String(to.meta?.navId || ''),
      nav_name: String(to.meta?.title || ''),
      external_menu: isExternal,
    });
  });

  return router;
}

// ==================== 路由日志上报 ====================
function reportRouteLog(data: Record<string, unknown>) {
  try {
    // 通过 API 上报（对齐原项目 reportLogStore.reportRouteLog）
    http
      .request('meta/reportRouteLog', { data }, { catchIsShowMessage: false })
      .catch(() => {
        // 忽略上报失败
      });
  } catch {
    // 忽略
  }
}

export default getRouter;
