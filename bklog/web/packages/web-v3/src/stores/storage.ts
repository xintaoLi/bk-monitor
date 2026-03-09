import { defineStore } from 'pinia';
import type { StorageStore } from './types';

/**
 * 本地存储键名常量
 */
export const BK_LOG_STORAGE = {
  // 文本省略方向
  TEXT_ELLIPSIS_DIR: 'textEllipsisDir',
  
  // 是否显示字段别名
  SHOW_FIELD_ALIAS: 'showFieldAlias',
  
  // 搜索类型
  SEARCH_TYPE: 'searchType',
  
  // 缓存的批量列表
  CACHED_BATCH_LIST: 'cachedBatchList',
  
  // 表格显示密度
  TABLE_DENSITY: 'tableDensity',
  
  // 侧边栏折叠状态
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  
  // 主题模式
  THEME_MODE: 'themeMode',
  
  // 语言设置
  LANGUAGE: 'language',
  
  // 最近使用的索引集
  RECENT_INDEX_SETS: 'recentIndexSets',
  
  // 检索历史
  SEARCH_HISTORY: 'searchHistory',
  
  // 字段配置缓存
  FIELD_CONFIG_CACHE: 'fieldConfigCache',
  
  // 过滤条件缓存
  FILTER_CACHE: 'filterCache',
  
  // 时间范围缓存
  TIME_RANGE_CACHE: 'timeRangeCache',

  // 业务 ID（新增）
  BK_BIZ_ID: 'bkBizId',

  // 空间 UID（新增）
  BK_SPACE_UID: 'bkSpaceUid',

  // 最后访问的索引集 ID（新增）
  LAST_INDEX_SET_ID: 'lastIndexSetId',

  // 索引集活跃标签页（新增）
  INDEX_SET_ACTIVE_TAB: 'indexSetActiveTab',

  // 字段设置（新增）
  FIELD_SETTING: 'fieldSetting',

  // 趋势图折叠状态（新增）
  TREND_CHART_IS_FOLD: 'trendChartIsFold',

  // 是否限制展开视图（新增）
  IS_LIMIT_EXPAND_VIEW: 'isLimitExpandView',
} as const;

/**
 * 存储值类型
 */
type StorageValue = string | number | boolean | any[] | Record<string, any>;

/**
 * 存储状态类型
 */
interface StorageState {
  // 文本省略方向：'start' | 'end' | 'middle'
  [BK_LOG_STORAGE.TEXT_ELLIPSIS_DIR]: string;
  
  // 是否显示字段别名
  [BK_LOG_STORAGE.SHOW_FIELD_ALIAS]: boolean;
  
  // 搜索类型：0-lucene, 1-sql
  [BK_LOG_STORAGE.SEARCH_TYPE]: number;
  
  // 缓存的批量列表
  [BK_LOG_STORAGE.CACHED_BATCH_LIST]: any[];
  
  // 表格显示密度：'small' | 'medium' | 'large'
  [BK_LOG_STORAGE.TABLE_DENSITY]: string;
  
  // 侧边栏折叠状态
  [BK_LOG_STORAGE.SIDEBAR_COLLAPSED]: boolean;
  
  // 主题模式：'light' | 'dark' | 'auto'
  [BK_LOG_STORAGE.THEME_MODE]: string;
  
  // 语言设置：'zh-cn' | 'en'
  [BK_LOG_STORAGE.LANGUAGE]: string;
  
  // 最近使用的索引集
  [BK_LOG_STORAGE.RECENT_INDEX_SETS]: string[];
  
  // 检索历史
  [BK_LOG_STORAGE.SEARCH_HISTORY]: any[];
  
  // 字段配置缓存
  [BK_LOG_STORAGE.FIELD_CONFIG_CACHE]: Record<string, any>;
  
  // 过滤条件缓存
  [BK_LOG_STORAGE.FILTER_CACHE]: Record<string, any>;
  
  // 时间范围缓存
  [BK_LOG_STORAGE.TIME_RANGE_CACHE]: any;

  // 业务 ID（新增）
  [BK_LOG_STORAGE.BK_BIZ_ID]: number | null;

  // 空间 UID（新增）
  [BK_LOG_STORAGE.BK_SPACE_UID]: string;

  // 最后访问的索引集 ID（新增）
  [BK_LOG_STORAGE.LAST_INDEX_SET_ID]: Record<string, any>;

  // 索引集活跃标签页（新增）
  [BK_LOG_STORAGE.INDEX_SET_ACTIVE_TAB]: string;

  // 字段设置（新增）
  [BK_LOG_STORAGE.FIELD_SETTING]: { width: number; show: boolean };
}

/**
 * 本地存储状态管理
 * 用于管理所有需要持久化的 UI 配置和用户偏好设置
 */
export const useStorageStore = defineStore('storage', {
  state: (): StorageState => ({
    [BK_LOG_STORAGE.TEXT_ELLIPSIS_DIR]: 'end',
    [BK_LOG_STORAGE.SHOW_FIELD_ALIAS]: false,
    [BK_LOG_STORAGE.SEARCH_TYPE]: 1,
    [BK_LOG_STORAGE.CACHED_BATCH_LIST]: [],
    [BK_LOG_STORAGE.TABLE_DENSITY]: 'medium',
    [BK_LOG_STORAGE.SIDEBAR_COLLAPSED]: false,
    [BK_LOG_STORAGE.THEME_MODE]: 'light',
    [BK_LOG_STORAGE.LANGUAGE]: 'zh-cn',
    [BK_LOG_STORAGE.RECENT_INDEX_SETS]: [],
    [BK_LOG_STORAGE.SEARCH_HISTORY]: [],
    [BK_LOG_STORAGE.FIELD_CONFIG_CACHE]: {},
    [BK_LOG_STORAGE.FILTER_CACHE]: {},
    [BK_LOG_STORAGE.TIME_RANGE_CACHE]: null,
    [BK_LOG_STORAGE.BK_BIZ_ID]: null,
    [BK_LOG_STORAGE.BK_SPACE_UID]: '',
    [BK_LOG_STORAGE.LAST_INDEX_SET_ID]: {},
    [BK_LOG_STORAGE.INDEX_SET_ACTIVE_TAB]: 'single',
    [BK_LOG_STORAGE.FIELD_SETTING]: { width: 240, show: true },
  }),

  getters: {
    /**
     * 获取文本省略方向
     */
    textEllipsisDir(): string {
      return this[BK_LOG_STORAGE.TEXT_ELLIPSIS_DIR];
    },

    /**
     * 是否显示字段别名
     */
    showFieldAlias(): boolean {
      return this[BK_LOG_STORAGE.SHOW_FIELD_ALIAS];
    },

    /**
     * 获取搜索类型
     */
    searchType(): number {
      return this[BK_LOG_STORAGE.SEARCH_TYPE];
    },

    /**
     * 是否为 SQL 搜索模式
     */
    isSqlMode(): boolean {
      return this[BK_LOG_STORAGE.SEARCH_TYPE] === 1;
    },

    /**
     * 获取缓存的批量列表
     */
    cachedBatchList(): any[] {
      return this[BK_LOG_STORAGE.CACHED_BATCH_LIST];
    },

    /**
     * 获取表格密度
     */
    tableDensity(): string {
      return this[BK_LOG_STORAGE.TABLE_DENSITY];
    },

    /**
     * 是否侧边栏折叠
     */
    isSidebarCollapsed(): boolean {
      return this[BK_LOG_STORAGE.SIDEBAR_COLLAPSED];
    },

    /**
     * 获取主题模式
     */
    themeMode(): string {
      return this[BK_LOG_STORAGE.THEME_MODE];
    },

    /**
     * 是否暗黑模式
     */
    isDarkMode(): boolean {
      if (this[BK_LOG_STORAGE.THEME_MODE] === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return this[BK_LOG_STORAGE.THEME_MODE] === 'dark';
    },

    /**
     * 获取语言设置
     */
    language(): string {
      return this[BK_LOG_STORAGE.LANGUAGE];
    },

    /**
     * 获取最近使用的索引集
     */
    recentIndexSets(): string[] {
      return this[BK_LOG_STORAGE.RECENT_INDEX_SETS];
    },
  },

  actions: {
    /**
     * 更新存储值（通用方法）
     */
    updateStorage(payload: Record<string, StorageValue>) {
      Object.keys(payload).forEach(key => {
        if (key in this.$state) {
          (this as any)[key] = payload[key];
        }
      });
    },

    /**
     * 设置文本省略方向
     */
    setTextEllipsisDir(dir: 'start' | 'end' | 'middle') {
      this[BK_LOG_STORAGE.TEXT_ELLIPSIS_DIR] = dir;
    },

    /**
     * 切换字段别名显示
     */
    toggleFieldAlias() {
      this[BK_LOG_STORAGE.SHOW_FIELD_ALIAS] = !this[BK_LOG_STORAGE.SHOW_FIELD_ALIAS];
    },

    /**
     * 设置搜索类型
     */
    setSearchType(type: number) {
      this[BK_LOG_STORAGE.SEARCH_TYPE] = type;
    },

    /**
     * 更新缓存的批量列表
     */
    updateCachedBatchList(list: any[]) {
      this[BK_LOG_STORAGE.CACHED_BATCH_LIST] = list;
    },

    /**
     * 清空缓存的批量列表
     */
    clearCachedBatchList() {
      this[BK_LOG_STORAGE.CACHED_BATCH_LIST] = [];
    },

    /**
     * 设置表格密度
     */
    setTableDensity(density: 'small' | 'medium' | 'large') {
      this[BK_LOG_STORAGE.TABLE_DENSITY] = density;
    },

    /**
     * 切换侧边栏折叠状态
     */
    toggleSidebarCollapsed() {
      this[BK_LOG_STORAGE.SIDEBAR_COLLAPSED] = !this[BK_LOG_STORAGE.SIDEBAR_COLLAPSED];
    },

    /**
     * 设置主题模式
     */
    setThemeMode(mode: 'light' | 'dark' | 'auto') {
      this[BK_LOG_STORAGE.THEME_MODE] = mode;
      // 应用主题
      this.applyTheme();
    },

    /**
     * 应用主题
     */
    applyTheme() {
      const isDark = this.isDarkMode;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    },

    /**
     * 设置语言
     */
    setLanguage(lang: 'zh-cn' | 'en') {
      this[BK_LOG_STORAGE.LANGUAGE] = lang;
    },

    /**
     * 添加最近使用的索引集
     */
    addRecentIndexSet(indexSetId: string) {
      const recentSets = this[BK_LOG_STORAGE.RECENT_INDEX_SETS];
      const index = recentSets.indexOf(indexSetId);
      
      // 如果已存在，先移除
      if (index >= 0) {
        recentSets.splice(index, 1);
      }
      
      // 添加到开头
      recentSets.unshift(indexSetId);
      
      // 限制最多保留 20 个
      if (recentSets.length > 20) {
        this[BK_LOG_STORAGE.RECENT_INDEX_SETS] = recentSets.slice(0, 20);
      }
    },

    /**
     * 清空最近使用的索引集
     */
    clearRecentIndexSets() {
      this[BK_LOG_STORAGE.RECENT_INDEX_SETS] = [];
    },

    /**
     * 添加搜索历史
     */
    addSearchHistory(history: any) {
      const historyList = this[BK_LOG_STORAGE.SEARCH_HISTORY];
      const index = historyList.findIndex(h => h.id === history.id);
      
      // 如果已存在，先移除
      if (index >= 0) {
        historyList.splice(index, 1);
      }
      
      // 添加到开头
      historyList.unshift(history);
      
      // 限制最多保留 50 个
      if (historyList.length > 50) {
        this[BK_LOG_STORAGE.SEARCH_HISTORY] = historyList.slice(0, 50);
      }
    },

    /**
     * 清空搜索历史
     */
    clearSearchHistory() {
      this[BK_LOG_STORAGE.SEARCH_HISTORY] = [];
    },

    /**
     * 缓存字段配置
     */
    cacheFieldConfig(indexSetId: string, config: any) {
      this[BK_LOG_STORAGE.FIELD_CONFIG_CACHE][indexSetId] = config;
    },

    /**
     * 获取字段配置缓存
     */
    getFieldConfigCache(indexSetId: string): any {
      return this[BK_LOG_STORAGE.FIELD_CONFIG_CACHE][indexSetId];
    },

    /**
     * 缓存过滤条件
     */
    cacheFilter(key: string, filter: any) {
      this[BK_LOG_STORAGE.FILTER_CACHE][key] = filter;
    },

    /**
     * 获取过滤条件缓存
     */
    getFilterCache(key: string): any {
      return this[BK_LOG_STORAGE.FILTER_CACHE][key];
    },

    /**
     * 缓存时间范围
     */
    cacheTimeRange(timeRange: any) {
      this[BK_LOG_STORAGE.TIME_RANGE_CACHE] = timeRange;
    },

    /**
     * 清空所有缓存
     */
    clearAllCache() {
      this[BK_LOG_STORAGE.FIELD_CONFIG_CACHE] = {};
      this[BK_LOG_STORAGE.FILTER_CACHE] = {};
      this[BK_LOG_STORAGE.TIME_RANGE_CACHE] = null;
      this[BK_LOG_STORAGE.CACHED_BATCH_LIST] = [];
      this[BK_LOG_STORAGE.SEARCH_HISTORY] = [];
    },

    /**
     * 重置所有设置到默认值
     */
    resetToDefault() {
      this.$patch({
        [BK_LOG_STORAGE.TEXT_ELLIPSIS_DIR]: 'end',
        [BK_LOG_STORAGE.SHOW_FIELD_ALIAS]: false,
        [BK_LOG_STORAGE.SEARCH_TYPE]: 1,
        [BK_LOG_STORAGE.TABLE_DENSITY]: 'medium',
        [BK_LOG_STORAGE.SIDEBAR_COLLAPSED]: false,
        [BK_LOG_STORAGE.THEME_MODE]: 'light',
        [BK_LOG_STORAGE.LANGUAGE]: 'zh-cn',
      });
      this.clearAllCache();
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'storage-store',
        storage: localStorage,
        // 持久化整个 state
      },
    ],
  },
}) as () => StorageStore;
