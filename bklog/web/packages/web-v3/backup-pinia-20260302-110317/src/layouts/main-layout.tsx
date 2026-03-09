import { defineComponent, computed } from 'vue';
import { RouterView } from 'vue-router';
import { useGlobalStore } from '@/stores';
import './main-layout.scss';

/**
 * 主布局组件
 */
export default defineComponent({
  name: 'MainLayout',

  setup() {
    const globalStore = useGlobalStore();

    const sidebarCollapsed = computed(() => globalStore.sidebarCollapsed);

    const handleToggleSidebar = () => {
      globalStore.toggleSidebar();
    };

    return () => (
      <div class="main-layout">
        {/* 顶部导航栏 */}
        <header class="main-layout__header">
          <div class="header-left">
            <div class="logo">
              <span class="logo-text">蓝鲸日志平台</span>
            </div>
          </div>
          
          <div class="header-right">
            <div class="user-info">
              <span>用户中心</span>
            </div>
          </div>
        </header>

        <div class="main-layout__body">
          {/* 侧边导航栏 */}
          <aside
            class={[
              'main-layout__sidebar',
              { 'is-collapsed': sidebarCollapsed.value }
            ]}
          >
            <div class="sidebar-toggle" onClick={handleToggleSidebar}>
              <t-icon name={sidebarCollapsed.value ? 'chevron-right' : 'chevron-left'} />
            </div>
            
            <nav class="sidebar-nav">
              <t-menu value="retrieve">
                <t-menu-item value="retrieve" to="/retrieve">
                  <t-icon name="search" />
                  <span>检索</span>
                </t-menu-item>
                <t-menu-item value="manage" to="/manage">
                  <t-icon name="setting" />
                  <span>管理</span>
                </t-menu-item>
                <t-menu-item value="dashboard" to="/dashboard">
                  <t-icon name="chart-bar" />
                  <span>仪表盘</span>
                </t-menu-item>
                <t-menu-item value="monitor" to="/monitor">
                  <t-icon name="system-monitor" />
                  <span>监控</span>
                </t-menu-item>
              </t-menu>
            </nav>
          </aside>

          {/* 主内容区 */}
          <main class="main-layout__content">
            <RouterView />
          </main>
        </div>
      </div>
    );
  },
});
