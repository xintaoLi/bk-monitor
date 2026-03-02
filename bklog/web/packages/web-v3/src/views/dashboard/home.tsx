/**
 * home.tsx - 仪表盘首页（Vue3 TSX）
 */

import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: 'DashboardHome',
  setup() {
    const { t } = useI18n();
    return () => (
      <div style={{ padding: '24px', height: '100%', background: '#f4f7fa' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#313238', marginBottom: '16px' }}>
          {t('仪表盘')}
        </h2>
        <div style={{ background: '#fff', borderRadius: '4px', padding: '40px', textAlign: 'center', color: '#c4c6cc' }}>
          {t('仪表盘功能模块')}
        </div>
      </div>
    );
  },
});
