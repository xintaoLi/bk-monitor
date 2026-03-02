/**
 * retrieve.ts - 检索模块状态 Store（Pinia）
 * 对齐原 Vuex store/retrieve.js 和 store/index.js 中检索相关状态：
 * - 索引集列表
 * - 检索参数（IndexItem）
 * - 字段信息（IndexFieldInfo）
 * - 检索结果（IndexSetQueryResult）
 * - 收藏夹
 */

import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import type {
  IndexItem,
  IndexSetItem,
  IndexFieldInfo,
  IndexSetQueryResult,
  FavoriteGroup,
  FieldItem,
  FilterCondition,
} from '@/types';
import http from '@/api';
import { useAppStore } from './app';

// 默认检索参数
const DEFAULT_INDEX_ITEM: IndexItem = {
  ids: [],
  isUnionIndex: false,
  start_time: '',
  end_time: '',
  datePickerValue: [],
  keyword: '',
  addition: [],
  host_scopes: {},
  timezone: '',
  size: 50,
  interval: 'auto',
  sort_list: [],
  ip_chooser: {},
  search_mode: 'ui',
};

export const useRetrieveStore = defineStore('retrieve', () => {
  // ==================== 索引集 ====================
  const indexSetList = ref<IndexSetItem[]>([]);
  const indexId = ref<string | number>('');
  const indexItem = ref<IndexItem>({ ...DEFAULT_INDEX_ITEM });

  // ==================== 字段信息 ====================
  const indexFieldInfo = shallowRef<IndexFieldInfo>({ fields: [] });
  const isFieldLoading = ref<boolean>(false);

  // ==================== 检索结果 ====================
  const indexSetQueryResult = shallowRef<IndexSetQueryResult>({ list: [], total: 0 });
  const isSearchLoading = ref<boolean>(false);
  const searchRequestId = ref<string>('');

  // ==================== 趋势图 ====================
  const trendData = ref<{ time: number | string; count: number }[]>([]);
  const isTrendLoading = ref<boolean>(false);

  // ==================== 收藏夹 ====================
  const favoriteGroups = ref<FavoriteGroup[]>([]);
  const isFavoriteLoading = ref<boolean>(false);

  // ==================== 计算属性 ====================
  const flatIndexSetList = computed(() => {
    return indexSetList.value;
  });

  const currentIndexSet = computed(() => {
    if (!indexId.value) return null;
    return indexSetList.value.find((item) => String(item.index_set_id) === String(indexId.value)) || null;
  });

  const displayFields = computed<FieldItem[]>(() => {
    const { fields, display_fields } = indexFieldInfo.value;
    if (!display_fields?.length) return fields.filter((f) => f.is_display);
    return fields.filter((f) => display_fields.includes(f.field_name));
  });

  const allFavorites = computed(() => {
    return favoriteGroups.value.flatMap((group) => group.favorites || []);
  });

  // ==================== Actions ====================
  function updateIndexItem(params: Partial<IndexItem>) {
    indexItem.value = { ...indexItem.value, ...params };
  }

  function resetIndexItem() {
    indexItem.value = { ...DEFAULT_INDEX_ITEM };
  }

  function setIndexId(id: string | number) {
    indexId.value = id;
  }

  function setIndexSetList(list: IndexSetItem[]) {
    indexSetList.value = list;
  }

  function setIndexFieldInfo(info: IndexFieldInfo) {
    indexFieldInfo.value = info;
  }

  function setIndexSetQueryResult(result: IndexSetQueryResult) {
    indexSetQueryResult.value = result;
  }

  function setTrendData(data: { time: number | string; count: number }[]) {
    trendData.value = data;
  }

  function setFavoriteGroups(groups: FavoriteGroup[]) {
    favoriteGroups.value = groups;
  }

  // ==================== 异步 Actions ====================

  /**
   * 获取索引集列表
   */
  async function getIndexSetList(params: { spaceUid: string; bkBizId?: string | number; is_group?: boolean }) {
    const appStore = useAppStore();
    try {
      const data = await http.request<IndexSetItem[]>('retrieve/getIndexSetList', {
        query: {
          space_uid: params.spaceUid || appStore.spaceUid,
          ...(params.bkBizId ? { bk_biz_id: params.bkBizId } : {}),
          ...(params.is_group ? { is_group: true } : {}),
        },
      });
      setIndexSetList(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setIndexSetList([]);
      throw err;
    }
  }

  /**
   * 获取字段信息
   */
  async function requestIndexSetFieldInfo() {
    const { ids, isUnionIndex } = indexItem.value;
    if (!ids?.length) return;

    isFieldLoading.value = true;
    try {
      let data: IndexFieldInfo;
      if (isUnionIndex) {
        data = await http.request<IndexFieldInfo>('unionSearch/unionMapping', {
          data: { index_set_ids: ids },
        });
      } else {
        const id = ids[0];
        data = await http.request<IndexFieldInfo>('retrieve/getLogTableHead', {
          query: { index_set_id: id },
        });
      }
      setIndexFieldInfo(data);
      return data;
    } finally {
      isFieldLoading.value = false;
    }
  }

  /**
   * 执行检索查询
   */
  async function requestIndexSetQuery(extraParams?: Record<string, unknown>) {
    const { ids, isUnionIndex, keyword, addition, start_time, end_time, size, sort_list, ip_chooser, host_scopes } =
      indexItem.value;

    if (!ids?.length) return;

    isSearchLoading.value = true;
    try {
      const baseParams = {
        keyword: keyword || '',
        addition: addition || [],
        start_time,
        end_time,
        size: size || 50,
        sort_list: sort_list || [],
        ip_chooser: ip_chooser || {},
        host_scopes: host_scopes || {},
        ...extraParams,
      };

      let result: IndexSetQueryResult;
      if (isUnionIndex) {
        result = await http.request<IndexSetQueryResult>('unionSearch/unionSearch', {
          data: { index_set_ids: ids, ...baseParams },
        });
      } else {
        const id = ids[0];
        result = await http.request<IndexSetQueryResult>('retrieve/getLogTableList', {
          data: { index_set_id: id, ...baseParams },
        });
      }
      setIndexSetQueryResult(result);
      return result;
    } finally {
      isSearchLoading.value = false;
    }
  }

  /**
   * 获取趋势图数据
   */
  async function requestTrendData(params: Record<string, unknown>) {
    const { ids, isUnionIndex } = indexItem.value;
    if (!ids?.length) return;

    isTrendLoading.value = true;
    try {
      let data: { buckets: { key: number | string; doc_count: number }[] };
      if (isUnionIndex) {
        data = await http.request('unionSearch/unionDateHistogram', {
          data: { index_set_ids: ids, ...params },
        });
      } else {
        const id = ids[0];
        data = await http.request('retrieve/getDateHistogram', {
          data: { index_set_id: id, ...params },
        });
      }
      const trendList = (data?.buckets || []).map((item) => ({
        time: item.key,
        count: item.doc_count,
      }));
      setTrendData(trendList);
      return trendList;
    } finally {
      isTrendLoading.value = false;
    }
  }

  /**
   * 获取收藏夹列表
   */
  async function requestFavoriteList() {
    const appStore = useAppStore();
    isFavoriteLoading.value = true;
    try {
      const data = await http.request<FavoriteGroup[]>('favorite/getFavoriteByGroupList', {
        query: { space_uid: appStore.spaceUid },
      });
      setFavoriteGroups(Array.isArray(data) ? data : []);
      return data;
    } finally {
      isFavoriteLoading.value = false;
    }
  }

  /**
   * 更新过滤条件
   */
  function updateAddition(conditions: FilterCondition[]) {
    indexItem.value = { ...indexItem.value, addition: conditions };
  }

  /**
   * 更新时间范围
   */
  function updateTimeRange(startTime: string, endTime: string, datePickerValue?: string[]) {
    indexItem.value = {
      ...indexItem.value,
      start_time: startTime,
      end_time: endTime,
      datePickerValue: datePickerValue || [startTime, endTime],
    };
  }

  /**
   * 更新关键词
   */
  function updateKeyword(keyword: string) {
    indexItem.value = { ...indexItem.value, keyword };
  }

  return {
    // state
    indexSetList,
    indexId,
    indexItem,
    indexFieldInfo,
    isFieldLoading,
    indexSetQueryResult,
    isSearchLoading,
    searchRequestId,
    trendData,
    isTrendLoading,
    favoriteGroups,
    isFavoriteLoading,
    // computed
    flatIndexSetList,
    currentIndexSet,
    displayFields,
    allFavorites,
    // actions
    updateIndexItem,
    resetIndexItem,
    setIndexId,
    setIndexSetList,
    setIndexFieldInfo,
    setIndexSetQueryResult,
    setTrendData,
    setFavoriteGroups,
    getIndexSetList,
    requestIndexSetFieldInfo,
    requestIndexSetQuery,
    requestTrendData,
    requestFavoriteList,
    updateAddition,
    updateTimeRange,
    updateKeyword,
  };
});
