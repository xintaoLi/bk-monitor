/**
 * index.tsx - 计算平台接入（Vue3 TSX）
 * 对齐原项目 bk-data-collection 功能页面
 */

import { defineComponent, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/app';
import './index.scss';

export default defineComponent({
  name: 'BkDataCollection',
  setup() {
    const { t } = useI18n();
    const appStore = useAppStore();
    const isLoading = ref(false);

    onMounted(() => {
      // TODO: 加载页面数据
    });

    return () => (
      <div class='bk-data-collection-page'>
        <div class='page-header'>
          <h2 class='page-title'>{t('计算平台接入')}</h2>
        </div>
        <div class='page-content'>
          {isLoading.value ? (
            <div class='page-loading'>
              <div class='loading-spinner' />
            </div>
          ) : (
            <div class='page-placeholder'>
              <p>{t('计算平台接入功能模块')}</p>
            </div>
          )}
        </div>
      </div>
    );
  },
});
