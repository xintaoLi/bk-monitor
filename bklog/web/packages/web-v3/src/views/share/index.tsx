/**
 * index.tsx - 分享页面（Vue3 TSX）
 * 对齐原 src/views/share/index.tsx 功能：
 * - 外部分享链接页面（无需登录）
 * - 展示共享的日志检索结果
 */

import { defineComponent, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import http from '@/api';
import './index.scss';

export default defineComponent({
  name: 'ShareView',
  setup() {
    const { t } = useI18n();
    const route = useRoute();

    const shareData = ref<Record<string, unknown> | null>(null);
    const isLoading = ref(true);
    const errorMsg = ref('');

    async function loadShareData() {
      const shareCode = route.params.shareCode || route.query.share_code;
      if (!shareCode) {
        errorMsg.value = t('分享链接无效');
        isLoading.value = false;
        return;
      }

      try {
        const data = await http.request<Record<string, unknown>>('retrieve/getShareLink', {
          query: { share_code: shareCode },
        });
        shareData.value = data;
      } catch (err: unknown) {
        errorMsg.value = (err as Error)?.message || t('加载分享内容失败');
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(loadShareData);

    return () => (
      <div class='share-view'>
        {isLoading.value && (
          <div class='share-loading'>
            <div class='loading-spinner' />
            <span>{t('加载中...')}</span>
          </div>
        )}

        {!isLoading.value && errorMsg.value && (
          <div class='share-error'>
            <i class='t-icon t-icon-close-circle' />
            <p>{errorMsg.value}</p>
          </div>
        )}

        {!isLoading.value && !errorMsg.value && shareData.value && (
          <div class='share-content'>
            <div class='share-header'>
              <h1 class='share-title'>{t('日志检索分享')}</h1>
            </div>
            <pre class='share-data'>{JSON.stringify(shareData.value, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  },
});
