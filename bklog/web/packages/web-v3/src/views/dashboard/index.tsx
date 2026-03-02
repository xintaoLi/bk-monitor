/**
 * index.tsx - 仪表盘布局（Vue3 TSX）
 * 对齐原 src/views/dashboard/index.tsx 功能
 */

import { defineComponent } from 'vue';
import { RouterView } from 'vue-router';
import HeadNav from '@/components/layout/head-nav';

export default defineComponent({
  name: 'DashboardView',
  setup() {
    return () => (
      <div class='dashboard-view' style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <HeadNav />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <RouterView />
        </div>
      </div>
    );
  },
});
