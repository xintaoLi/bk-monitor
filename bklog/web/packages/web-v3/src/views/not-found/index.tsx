/**
 * index.tsx - 404 页面（Vue3 TSX）
 */

import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'NotFoundView',
  setup() {
    const { t } = useI18n();
    const router = useRouter();

    return () => (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        background: '#f4f7fa',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '60px 40px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '80px', fontWeight: 700, color: '#dcdee5', lineHeight: 1 }}>404</div>
          <p style={{ fontSize: '16px', color: '#63656e', margin: '16px 0 24px' }}>
            {t('页面不存在')}
          </p>
          <t-button theme='primary' onClick={() => router.push('/')}>
            {t('返回首页')}
          </t-button>
        </div>
      </div>
    );
  },
});
