/**
 * index.tsx - 鉴权页面（Vue3 TSX）
 * 对齐原 src/views/authorization 功能
 */

import { defineComponent, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import http from '@/api';
import './index.scss';

export default defineComponent({
  name: 'AuthorizationView',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();

    const isLoading = ref(true);
    const authUrl = ref('');

    onMounted(async () => {
      const actionId = route.query.action_id as string;
      const resourceType = route.query.resource_type as string;
      const resourceId = route.query.resource_id as string;

      if (!actionId) {
        isLoading.value = false;
        return;
      }

      try {
        const data = await http.request<{ apply_url: string }>('auth/getApplyUrl', {
          data: { action_id: actionId, resource_type: resourceType, resource_id: resourceId },
        });
        authUrl.value = data.apply_url || '';
        if (authUrl.value) {
          window.location.href = authUrl.value;
        }
      } catch {
        // ignore
      } finally {
        isLoading.value = false;
      }
    });

    return () => (
      <div class='authorization-view'>
        {isLoading.value ? (
          <div class='auth-loading'>
            <div class='loading-spinner' />
            <span>{t('正在跳转权限申请页...')}</span>
          </div>
        ) : (
          <div class='auth-content'>
            <i class='t-icon t-icon-lock-on' />
            <p>{t('权限申请')}</p>
            {authUrl.value && (
              <t-button theme='primary' onClick={() => (window.location.href = authUrl.value)}>
                {t('前往申请权限')}
              </t-button>
            )}
            <t-button variant='text' onClick={() => router.back()}>
              {t('返回')}
            </t-button>
          </div>
        )}
      </div>
    );
  },
});
