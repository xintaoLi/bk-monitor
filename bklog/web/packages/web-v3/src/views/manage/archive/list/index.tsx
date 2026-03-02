/**
 * index.tsx - 归档列表（Vue3 TSX）
 * 对齐原项目 archive-list 功能页面
 */

import { defineComponent, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/app';
import './index.scss';

export default defineComponent({
  name: 'ArchiveList',
  setup() {
    const { t } = useI18n();
    const appStore = useAppStore();
    const isLoading = ref(false);

    onMounted(() => {
      // TODO: 加载页面数据
    });

    return () => (
      <div class='archive-list-page'>
        <div class='page-header'>
          <h2 class='page-title'>{t('归档列表')}</h2>
        </div>
        <div class='page-content'>
          {isLoading.value ? (
            <div class='page-loading'>
              <div class='loading-spinner' />
            </div>
          ) : (
            <div class='page-placeholder'>
              <p>{t('归档列表功能模块')}</p>
            </div>
          )}
        </div>
      </div>
    );
  },
});
