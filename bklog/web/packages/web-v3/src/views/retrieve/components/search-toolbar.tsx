/**
 * search-toolbar.tsx - 搜索工具栏（Vue3 TSX）
 * 对齐原 src/views/retrieve-v3/toolbar/index.tsx 功能：
 * - 趋势图展示/隐藏
 * - 字段设置
 * - 导出功能
 * - 实时刷新
 */

import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRetrieveStore } from '@/stores/retrieve';
import http from '@/api';
import './search-toolbar.scss';

export default defineComponent({
  name: 'SearchToolbar',
  emits: ['trendHeightChange'],
  setup(_, { emit }) {
    const { t } = useI18n();
    const retrieveStore = useRetrieveStore();
    const { indexItem, isSearchLoading } = storeToRefs(retrieveStore);

    const showTrend = ref(true);
    const isExporting = ref(false);

    // 切换趋势图
    function toggleTrend() {
      showTrend.value = !showTrend.value;
      emit('trendHeightChange', showTrend.value ? 180 : 0);
    }

    // 导出日志
    async function handleExport() {
      const { ids, isUnionIndex, keyword, addition, start_time, end_time } = indexItem.value;
      if (!ids?.length || isExporting.value) return;

      isExporting.value = true;
      try {
        const id = ids[0];
        const resp = await http.request<Blob>(
          isUnionIndex ? 'unionSearch/unionExport' : 'retrieve/exportLog',
          {
            data: {
              index_set_id: id,
              keyword: keyword || '',
              addition: addition || [],
              start_time,
              end_time,
            },
          },
        );
        // 触发下载
        const url = URL.createObjectURL(resp as unknown as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `log_export_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        // 错误由 API 层处理
      } finally {
        isExporting.value = false;
      }
    }

    // 刷新搜索
    function handleRefresh() {
      retrieveStore.requestIndexSetQuery();
    }

    return () => (
      <div class='search-toolbar'>
        <div class='search-toolbar__left'>
          {/* 趋势图切换 */}
          <div
            class={['toolbar-btn', showTrend.value && 'is-active']}
            title={t('趋势图')}
            onClick={toggleTrend}
          >
            <i class='t-icon t-icon-chart-bar' />
            <span>{t('趋势图')}</span>
          </div>
        </div>

        <div class='search-toolbar__right'>
          {/* 刷新 */}
          <div
            class={['toolbar-btn', isSearchLoading.value && 'is-loading']}
            title={t('刷新')}
            onClick={handleRefresh}
          >
            <i class={`t-icon t-icon-refresh ${isSearchLoading.value ? 'is-spinning' : ''}`} />
          </div>

          {/* 导出 */}
          <div
            class={['toolbar-btn', isExporting.value && 'is-loading']}
            title={t('导出')}
            onClick={handleExport}
          >
            <i class='t-icon t-icon-download' />
            <span>{t('导出')}</span>
          </div>
        </div>
      </div>
    );
  },
});
