/**
 * search-result.tsx - 检索结果组件（Vue3 TSX）
 * 对齐原 src/views/retrieve-v3/search-result/index.tsx 功能：
 * - Tab 切换（原始日志/日志聚类/图表分析）
 * - 日志列表渲染
 * - 分页
 * - 导出
 */

import { computed, defineComponent, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRetrieveStore } from '@/stores/retrieve';
import type { LogItem } from '@/types';
import LogList from './log-list';
import LogClustering from './log-clustering';
import Grep from '../grep/index';
import OriginalLog from '../original-log/index';
import './search-result.scss';

// Tab 定义
const RESULT_TABS = [
  { id: 'origin', label: '原始日志' },
  { id: 'clustering', label: '日志聚类' },
  { id: 'grep', label: 'Grep' },
  { id: 'graph_analysis', label: '图表分析' },
];

export default defineComponent({
  name: 'SearchResult',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const retrieveStore = useRetrieveStore();

    const { indexSetQueryResult, isSearchLoading, displayFields } = storeToRefs(retrieveStore);

    // 当前 Tab（与 URL query.tab 同步）
    const activeTab = computed(() => String(route.query.tab || 'origin'));

    function handleTabChange(tabId: string) {
      router.replace({
        query: { ...route.query, tab: tabId },
      });
    }

    // 日志总数
    const totalCount = computed(() => {
      const total = indexSetQueryResult.value.total;
      return typeof total === 'number' ? total : parseInt(String(total), 10) || 0;
    });

    return () => (
      <div class='search-result'>
        {/* Tab 切换 */}
        <div class='search-result__tabs'>
          {RESULT_TABS.map((tab) => (
            <div
              key={tab.id}
              class={['result-tab', activeTab.value === tab.id && 'is-active']}
              onClick={() => handleTabChange(tab.id)}
            >
              {t(tab.label)}
            </div>
          ))}
          {/* 总数显示 */}
          <div class='result-count'>
            {t('共')} <span class='count-num'>{totalCount.value}</span> {t('条')}
          </div>
        </div>

        {/* Tab 内容 */}
        <div class='search-result__content'>
          {isSearchLoading.value && (
            <div class='result-loading'>
              <div class='loading-spinner' />
              <span>{t('加载中...')}</span>
            </div>
          )}

          {!isSearchLoading.value && (
            <>
              {activeTab.value === 'origin' && <OriginalLog />}
              {/* 保留 LogList 作为简化视图备用 */}
              {activeTab.value === 'clustering' && <LogClustering />}
              {activeTab.value === 'grep' && <Grep />}
              {activeTab.value === 'graph_analysis' && (
                <div class='graph-analysis-placeholder'>
                  {t('图表分析')}
                </div>
              )}
            </>
          )}

          {!isSearchLoading.value && !indexSetQueryResult.value.list?.length && (
            <div class='result-empty'>
              <i class='t-icon t-icon-search-error' />
              <p>{t('暂无数据')}</p>
            </div>
          )}
        </div>
      </div>
    );
  },
});
