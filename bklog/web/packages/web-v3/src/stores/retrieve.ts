import { defineStore } from 'pinia';
import { random } from '@/utils';
import http from '@/api';

/**
 * 索引集项类型
 */
export interface IndexSetItem {
  index_set_id: string;
  index_set_name: string;
  indexName: string;
  lightenName: string;
  unique_id: string;
  is_child_node: boolean;
  parent_node: IndexSetItem | null;
  children?: IndexSetItem[];
  indices: Array<{ result_table_id: string }>;
  auth_wieght?: number;
  scenario_id?: string;
  scenario_name?: string;
}

/**
 * 字段配置类型
 */
export interface FieldCustomConfig {
  fieldsWidth: Record<string, number>;
  displayFields: string[];
  filterSetting: any[];
  filterAddition: any[];
  fixedFilterAddition: boolean;
  sortList: any[];
}

/**
 * 检索状态
 */
interface RetrieveState {
  // 图表相关
  chartKey: string;
  cacheDatePickerValue: any[];
  cacheTimeRange: string;
  filedSettingConfigID: number;

  // 索引集列表
  indexSetList: IndexSetItem[];
  flatIndexSetList: IndexSetItem[];
  isIndexSetLoading: boolean;

  // 趋势数据
  isTrendDataLoading: boolean;
  trendDataCount: number;

  // 字段配置
  catchFieldCustomConfig: FieldCustomConfig;

  // 版本标识
  activeVersion: string;

  // 检索结果
  searchResult: any;
  searchParams: any;
  searchHistory: any[];

  // 收藏夹
  favoriteList: any[];
  favoriteGroups: any[];
}

/**
 * 解析索引集属性
 * @param indexSetList 索引集列表
 * @param parent_node 父节点
 */
const resolveIndexItemAttr = (
  indexSetList: any[] = [],
  parent_node: IndexSetItem | null = null
): IndexSetItem[] => {
  const s1: IndexSetItem[] = [];
  const s2: IndexSetItem[] = [];

  indexSetList?.forEach(item => {
    const copyItem = structuredClone(item);
    Object.assign(copyItem, {
      index_set_id: `${item.index_set_id}`,
      indexName: item.index_set_name,
      lightenName: ` (${item.indices.map((i: any) => i.result_table_id).join(';')})`,
      unique_id: `${parent_node?.index_set_id ?? '#'}_${item.index_set_id}`,
      is_child_node: parent_node !== null,
      parent_node,
    });

    // 递归处理子节点
    copyItem.children = resolveIndexItemAttr(item.children ?? [], copyItem);

    if (copyItem.auth_wieght === 1) {
      s1.push(copyItem);
    } else {
      s2.push(copyItem);
    }
  });

  return s1.concat(s2);
};

/**
 * 检索状态管理
 */
export const useRetrieveStore = defineStore('retrieve', {
  state: (): RetrieveState => ({
    chartKey: random(10),
    cacheDatePickerValue: [],
    cacheTimeRange: '',
    filedSettingConfigID: 1,
    indexSetList: [],
    flatIndexSetList: [],
    isIndexSetLoading: false,
    isTrendDataLoading: false,
    trendDataCount: 0,
    catchFieldCustomConfig: {
      fieldsWidth: {},
      displayFields: [],
      filterSetting: [],
      filterAddition: [],
      fixedFilterAddition: false,
      sortList: [],
    },
    activeVersion: 'v3',
    searchResult: null,
    searchParams: {},
    searchHistory: [],
    favoriteList: [],
    favoriteGroups: [],
  }),

  getters: {
    /**
     * 获取当前索引集
     */
    currentIndexSet(): IndexSetItem | undefined {
      return this.flatIndexSetList.find(item => item.index_set_id === this.indexSetId);
    },

    /**
     * 获取根节点索引集列表
     */
    rootIndexSetList(): IndexSetItem[] {
      return this.indexSetList.filter(item => !item.is_child_node);
    },
  },

  actions: {
    /**
     * 更新活跃版本
     */
    updateActiveVersion(version?: string) {
      this.activeVersion = version ?? 'v3';
    },

    /**
     * 更新趋势数据加载状态
     */
    updateTrendDataLoading(loading: boolean) {
      this.isTrendDataLoading = loading;
    },

    /**
     * 更新趋势数据数量
     */
    updateTrendDataCount(count: number) {
      this.trendDataCount = count;
    },

    /**
     * 更新图表 Key
     */
    updateChartKey(options?: { prefix?: string }) {
      this.chartKey = (options?.prefix ?? '') + random(10);
    },

    /**
     * 更新缓存的日期选择器值
     */
    updateCachePickerValue(value: any[]) {
      this.cacheDatePickerValue = value;
    },

    /**
     * 更新缓存的时间范围
     */
    updateCacheTimeRange(timeRange: string) {
      this.cacheTimeRange = timeRange;
    },

    /**
     * 更新字段设置配置 ID
     */
    updateFiledSettingConfigID(id: number) {
      this.filedSettingConfigID = id;
    },

    /**
     * 更新索引集列表
     */
    updateIndexSetList(payload: any[]) {
      this.indexSetList = resolveIndexItemAttr(payload);
      this.flatIndexSetList = payload
        .map(item => [item, ...(item.children ?? [])])
        .flat();
    },

    /**
     * 更新索引集加载状态
     */
    updateIndexSetLoading(loading: boolean) {
      this.isIndexSetLoading = loading;
    },

    /**
     * 更新字段自定义配置
     */
    updateCatchFieldCustomConfig(config?: Partial<FieldCustomConfig>) {
      Object.assign(
        this.catchFieldCustomConfig,
        {
          fieldsWidth: {},
          displayFields: [],
          filterSetting: [],
          filterAddition: [],
          sortList: [],
        },
        config ?? {}
      );
    },

    /**
     * 更新过滤追加配置
     */
    updateCatchFilterAddition({ addition }: { addition: any[] }) {
      if (addition?.length) {
        this.catchFieldCustomConfig.filterAddition = [...addition];
      }
    },

    /**
     * 获取索引集列表
     */
    async getIndexSetList(payload: {
      spaceUid: string;
      isLoading?: boolean;
      is_group?: boolean;
    }) {
      const { spaceUid, isLoading = true, is_group } = payload;

      if (isLoading) {
        this.updateIndexSetLoading(true);
      }

      this.updateIndexSetList([]);

      try {
        const res = await http.request('retrieve/getIndexSetList', {
          query: {
            space_uid: spaceUid,
            is_group,
          },
        });

        const indexSetList = resolveIndexItemAttr(res.data ?? []);
        this.updateIndexSetList(indexSetList);

        return indexSetList;
      } catch (error) {
        console.error('Failed to fetch index set list:', error);
        throw error;
      } finally {
        if (isLoading) {
          this.updateIndexSetLoading(false);
        }
      }
    },

    /**
     * 更新检索结果
     */
    updateSearchResult(result: any) {
      this.searchResult = result;
    },

    /**
     * 更新检索参数
     */
    updateSearchParams(params: any) {
      this.searchParams = { ...this.searchParams, ...params };
    },

    /**
     * 添加搜索历史
     */
    addSearchHistory(item: any) {
      const index = this.searchHistory.findIndex(h => h.id === item.id);
      if (index >= 0) {
        this.searchHistory.splice(index, 1);
      }
      this.searchHistory.unshift(item);
      // 限制历史记录数量
      if (this.searchHistory.length > 50) {
        this.searchHistory = this.searchHistory.slice(0, 50);
      }
    },

    /**
     * 清空搜索历史
     */
    clearSearchHistory() {
      this.searchHistory = [];
    },

    /**
     * 更新收藏列表
     */
    updateFavoriteList(list: any[]) {
      this.favoriteList = list;
    },

    /**
     * 更新收藏分组
     */
    updateFavoriteGroups(groups: any[]) {
      this.favoriteGroups = groups;
    },

    /**
     * 获取收藏列表
     */
    async getFavoriteList(spaceUid: string) {
      try {
        const res = await http.request('favorite/getFavoriteList', {
          query: { space_uid: spaceUid },
        });
        this.updateFavoriteList(res.data ?? []);
        return res.data;
      } catch (error) {
        console.error('Failed to fetch favorite list:', error);
        throw error;
      }
    },

    /**
     * 获取收藏分组
     */
    async getFavoriteGroups(spaceUid: string) {
      try {
        const res = await http.request('favorite/getFavoriteGroups', {
          query: { space_uid: spaceUid },
        });
        this.updateFavoriteGroups(res.data ?? []);
        return res.data;
      } catch (error) {
        console.error('Failed to fetch favorite groups:', error);
        throw error;
      }
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'retrieve-store',
        storage: localStorage,
        paths: ['activeVersion', 'searchHistory', 'catchFieldCustomConfig'],
      },
    ],
  },
});
