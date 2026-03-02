/**
 * log-clustering.tsx - 日志聚类组件（Vue3 TSX）
 */

import { defineComponent, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRetrieveStore } from '@/stores/retrieve';
import http from '@/api';
import type { ClusterItem } from '@/types';

export default defineComponent({
  name: 'LogClustering',
  setup() {
    const { t } = useI18n();
    const retrieveStore = useRetrieveStore();
    const clusterList = ref<ClusterItem[]>([]);
    const isLoading = ref(false);

    async function loadClustering() {
      const { ids, isUnionIndex, keyword, addition, start_time, end_time } = retrieveStore.indexItem;
      if (!ids?.length) return;

      isLoading.value = true;
      try {
        const id = ids[0];
        const data = await http.request<{ patterns: ClusterItem[] }>('logClustering/getPatternList', {
          query: {
            index_set_id: id,
            keyword: keyword || '',
            start_time,
            end_time,
          },
        });
        clusterList.value = data?.patterns || [];
      } catch {
        clusterList.value = [];
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(loadClustering);

    return () => (
      <div class='log-clustering'>
        {isLoading.value ? (
          <div class='clustering-loading'>{t('加载中...')}</div>
        ) : clusterList.value.length ? (
          <div class='clustering-list'>
            {clusterList.value.map((item, idx) => (
              <div key={idx} class='clustering-item'>
                <div class='item-pattern'>{item.pattern}</div>
                <div class='item-count'>{item.count}</div>
              </div>
            ))}
          </div>
        ) : (
          <div class='clustering-empty'>{t('暂无数据')}</div>
        )}
      </div>
    );
  },
});
