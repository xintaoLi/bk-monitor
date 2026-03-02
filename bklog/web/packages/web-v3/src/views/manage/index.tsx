/**
 * index.tsx - 管理页面布局（Vue3 TSX）
 * 对齐原 src/views/manage/ 功能：
 * - 左侧导航菜单（采集项/索引集/清洗/归档/提取/ES集群等）
 * - 右侧内容区（RouterView）
 */

import { computed, defineComponent } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/stores/app';
import HeadNav from '@/components/layout/head-nav';
import './index.scss';

// 管理菜单定义（对齐原项目 manage 路由）
const MANAGE_MENUS = [
  {
    id: 'log-collection',
    name: '日志接入',
    icon: 't-icon-data-base',
    children: [
      { id: 'collection-item', name: '采集项', routeName: 'collection-item' },
      { id: 'log-index-set', name: '索引集', routeName: 'log-index-set' },
      { id: 'bk-data-collection', name: '计算平台', routeName: 'bk-data-collection' },
      { id: 'es-collection', name: '第三方 ES', routeName: 'es-collection' },
      { id: 'custom-report', name: '自定义上报', routeName: 'custom-report' },
      { id: 'tgpa-task', name: '客户端日志', routeName: 'tgpa-task' },
    ],
  },
  {
    id: 'log-clean',
    name: '日志清洗',
    icon: 't-icon-filter',
    children: [
      { id: 'clean-list', name: '清洗列表', routeName: 'clean-list' },
      { id: 'clean-templates', name: '清洗模板', routeName: 'clean-templates' },
      { id: 'log-desensitize', name: '脱敏列表', routeName: 'log-desensitize' },
    ],
  },
  {
    id: 'log-archive',
    name: '日志归档',
    icon: 't-icon-archive',
    children: [
      { id: 'archive-repository', name: '归档仓库', routeName: 'archive-repository' },
      { id: 'archive-list', name: '归档列表', routeName: 'archive-list' },
      { id: 'archive-restore', name: '归档还原', routeName: 'archive-restore' },
    ],
  },
  {
    id: 'log-extract',
    name: '日志提取',
    icon: 't-icon-download',
    children: [
      { id: 'manage-log-extract', name: '提取配置', routeName: 'manage-log-extract' },
      { id: 'extract-home', name: '提取任务', routeName: 'extract-home' },
      { id: 'extract-link-manage', name: '链路管理', routeName: 'extract-link-manage' },
    ],
  },
  {
    id: 'system-setting',
    name: '系统设置',
    icon: 't-icon-setting',
    children: [
      { id: 'es-cluster-manage', name: 'ES集群管理', routeName: 'es-cluster-manage' },
      { id: 'report-manage', name: '订阅管理', routeName: 'report-manage' },
      { id: 'manage-data-link-conf', name: '数据链路配置', routeName: 'manage-data-link-conf' },
    ],
  },
];

export default defineComponent({
  name: 'ManageView',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const appStore = useAppStore();
    const { spaceUid, bkBizId } = storeToRefs(appStore);

    const activeMenuId = computed(() => {
      return String(route.name || '');
    });

    function handleMenuClick(routeName: string) {
      router.push({
        name: routeName,
        query: { spaceUid: spaceUid.value, bizId: String(bkBizId.value) },
      });
    }

    return () => (
      <div class='manage-view'>
        {/* 顶部导航 */}
        <HeadNav />

        <div class='manage-view__body'>
          {/* 左侧导航 */}
          <aside class='manage-sidebar'>
            {MANAGE_MENUS.map((group) => (
              <div key={group.id} class='sidebar-group'>
                <div class='sidebar-group__title'>
                  <i class={`t-icon ${group.icon}`} />
                  <span>{t(group.name)}</span>
                </div>
                <ul class='sidebar-group__items'>
                  {group.children.map((item) => (
                    <li
                      key={item.id}
                      class={['sidebar-item', activeMenuId.value === item.routeName && 'is-active']}
                      onClick={() => handleMenuClick(item.routeName)}
                    >
                      {t(item.name)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          {/* 右侧内容区 */}
          <main class='manage-content'>
            <RouterView />
          </main>
        </div>
      </div>
    );
  },
});
