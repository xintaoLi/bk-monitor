/**
 * use-retrieve-init.ts - 检索页面初始化 Composable（Vue3）
 * 对齐原 src/views/retrieve-v3/use-app-init.tsx 核心逻辑：
 * - 解析 URL 参数恢复检索状态
 * - 并行加载前置数据（索引集列表、字段信息）
 * - 收藏夹/趋势图宽高状态管理
 */

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRetrieveStore } from '@/stores/retrieve';
import { useAppStore } from '@/stores/app';
import type { IndexItem } from '@/types';

const FAVORITE_WIDTH_DEFAULT = 240;
const FAVORITE_WIDTH_MIN = 180;
const FAVORITE_WIDTH_MAX = 400;

export function useRetrieveInit() {
  const route = useRoute();
  const router = useRouter();
  const retrieveStore = useRetrieveStore();
  const appStore = useAppStore();

  // ==================== 状态 ====================
  const isPreApiLoaded = ref(false);
  const searchBarHeight = ref(0);
  const trendGraphHeight = ref(0);
  const favoriteWidth = ref(FAVORITE_WIDTH_DEFAULT);
  const isFavoriteShown = ref(true);
  const leftFieldSettingWidth = ref(0);

  // ==================== 计算属性 ====================
  const isSearchContextStickyTop = computed(() => {
    return searchBarHeight.value > 0 && trendGraphHeight.value === 0;
  });

  const isSearchResultStickyTop = computed(() => {
    return searchBarHeight.value > 0 && trendGraphHeight.value > 0;
  });

  const stickyStyle = computed(() => ({
    '--search-bar-height': `${searchBarHeight.value}px`,
    '--trend-graph-height': `${trendGraphHeight.value}px`,
    '--favorite-width': `${isFavoriteShown.value ? favoriteWidth.value : 0}px`,
    '--field-setting-width': `${leftFieldSettingWidth.value}px`,
  }));

  const contentStyle = computed(() => ({
    paddingLeft: `${isFavoriteShown.value ? favoriteWidth.value : 0}px`,
  }));

  // ==================== URL 参数解析 ====================
  function parseUrlParams(): Partial<IndexItem> {
    const query = route.query;
    const params: Partial<IndexItem> = {};

    // 索引集 ID
    const indexId = query.indexId || query.index_id;
    if (indexId) {
      params.ids = [String(indexId)];
      params.isUnionIndex = false;
    }

    // 联合检索
    const unionList = query.unionList;
    if (unionList) {
      try {
        const ids = JSON.parse(decodeURIComponent(String(unionList)));
        if (Array.isArray(ids) && ids.length > 0) {
          params.ids = ids.map(String);
          params.isUnionIndex = true;
        }
      } catch {
        // 忽略解析失败
      }
    }

    // 关键词
    if (query.keyword) {
      params.keyword = String(query.keyword);
    }

    // 过滤条件
    if (query.addition) {
      try {
        params.addition = JSON.parse(decodeURIComponent(String(query.addition)));
      } catch {
        // 忽略
      }
    }

    // 时间范围
    if (query.start_time && query.end_time) {
      params.start_time = String(query.start_time);
      params.end_time = String(query.end_time);
    }

    // 搜索模式
    if (query.search_mode) {
      params.search_mode = String(query.search_mode) as 'ui' | 'lucene';
    }

    return params;
  }

  // ==================== 初始化 ====================
  async function init() {
    // 1. 解析 URL 参数
    const urlParams = parseUrlParams();
    if (Object.keys(urlParams).length) {
      retrieveStore.updateIndexItem(urlParams);
    }

    // 2. 并行加载前置数据
    try {
      await Promise.all([
        // 加载索引集列表
        retrieveStore.getIndexSetList({ spaceUid: appStore.spaceUid }),
        // 加载收藏夹
        retrieveStore.requestFavoriteList(),
      ]);

      // 3. 如果有 indexId，加载字段信息
      if (retrieveStore.indexItem.ids?.length) {
        await retrieveStore.requestIndexSetFieldInfo();
      }
    } catch (err) {
      console.error('[Retrieve] 初始化失败', err);
    } finally {
      isPreApiLoaded.value = true;
    }
  }

  // ==================== 事件处理 ====================
  function handleSearchBarHeightChange(height: number) {
    searchBarHeight.value = height;
  }

  function handleTrendGraphHeightChange(height: number) {
    trendGraphHeight.value = height;
  }

  function handleFavoriteWidthChange(width: number) {
    favoriteWidth.value = Math.min(Math.max(width, FAVORITE_WIDTH_MIN), FAVORITE_WIDTH_MAX);
  }

  function handleFavoriteShownChange(shown: boolean) {
    isFavoriteShown.value = shown;
  }

  // ==================== 监听路由变化 ====================
  watch(
    () => route.query,
    (newQuery, oldQuery) => {
      const newIndexId = newQuery.indexId || newQuery.index_id;
      const oldIndexId = oldQuery.indexId || oldQuery.index_id;
      if (newIndexId !== oldIndexId && newIndexId) {
        retrieveStore.setIndexId(String(newIndexId));
        retrieveStore.updateIndexItem({ ids: [String(newIndexId)], isUnionIndex: false });
        retrieveStore.requestIndexSetFieldInfo();
      }
    },
    { deep: false },
  );

  // ==================== 生命周期 ====================
  onMounted(() => {
    init();
  });

  return {
    isPreApiLoaded,
    searchBarHeight,
    trendGraphHeight,
    favoriteWidth,
    isFavoriteShown,
    leftFieldSettingWidth,
    isSearchContextStickyTop,
    isSearchResultStickyTop,
    stickyStyle,
    contentStyle,
    handleSearchBarHeightChange,
    handleTrendGraphHeightChange,
    handleFavoriteWidthChange,
    handleFavoriteShownChange,
  };
}

export default useRetrieveInit;
