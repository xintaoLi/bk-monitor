/**
 * Retrieve Helper stub
 * 用于兼容从 v2 迁移过来的代码
 */

import dayjs from 'dayjs';

export enum RetrieveEvent {
  TREND_GRAPH_SEARCH = 'trend-graph-search',
  LEFT_FIELD_INFO_UPDATE = 'left-field-info-update',
  QUERY_LOG = 'query-log',
  INDEX_SET_CHANGE = 'index-set-change',
  FIELD_INFO_UPDATE = 'field-info-update',
  GLOBAL_SCROLL = 'global-scroll',
  
  // UI 布局相关事件
  SEARCHBAR_HEIGHT_CHANGE = 'searchbar-height-change',
  FAVORITE_WIDTH_CHANGE = 'favorite-width-change',
  FAVORITE_SHOWN_CHANGE = 'favorite-shown-change',
  FAVORITE_ACTIVE_CHANGE = 'favorite-active-change',
  TREND_GRAPH_HEIGHT_CHANGE = 'trend-graph-height-change',
  
  // 搜索相关事件
  SEARCH_VALUE_CHANGE = 'search-value-change',
  SEARCH_TIME_CHANGE = 'search-time-change',
  AUTO_REFRESH = 'auto-refresh',
  SEARCHING_CHANGE = 'searching-change',
  
  // 索引集相关事件
  INDEX_SET_ID_CHANGE = 'index-set-id-change',
  
  // AI 相关事件
  AI_CLOSE = 'ai-close',
  
  // 左侧字段设置相关事件
  LEFT_FIELD_SETTING_SHOWN_CHANGE = 'left-field-setting-shown-change',
  LEFT_FIELD_SETTING_WIDTH_CHANGE = 'left-field-setting-width-change',
}

type EventCallback = (...args: any[]) => void;

class RetrieveHelperClass {
  private eventMap = new Map<string, Set<EventCallback>>();
  
  // 状态属性
  public markInstance: any = null;
  public favoriteWidth = 400;
  public logRowsContainerId = 'retrieve-log-rows';
  public globalScrollSelector = '.retrieve-scroll-container';
  private _scrollSelector = '.scroll-container';
  private _searchBarHeight = 52;
  private _isSearching = false;
  private _isFavoriteShown = false;
  private _isViewCurrentIndex = false;
  public aiAssitantHelper: any = null;

  // 事件管理
  on(event: string | RetrieveEvent, callback: EventCallback) {
    const eventKey = String(event);
    if (!this.eventMap.has(eventKey)) {
      this.eventMap.set(eventKey, new Set());
    }
    this.eventMap.get(eventKey)!.add(callback);
  }

  off(event: string | RetrieveEvent, callback?: EventCallback) {
    const eventKey = String(event);
    if (!this.eventMap.has(eventKey)) return;
    
    if (callback) {
      this.eventMap.get(eventKey)!.delete(callback);
    } else {
      this.eventMap.delete(eventKey);
    }
  }

  batchOff(events: Array<[string | RetrieveEvent, EventCallback]> | string | string[], fn?: EventCallback) {
    if (typeof events === 'string') {
      this.off(events, fn);
    } else if (Array.isArray(events) && typeof events[0] === 'string') {
      (events as string[]).forEach(event => this.off(event, fn));
    } else {
      (events as Array<[string | RetrieveEvent, EventCallback]>).forEach(([event, callback]) => {
        this.off(event, callback);
      });
    }
  }

  fire(event: string | RetrieveEvent, ...args: any[]) {
    const eventKey = String(event);
    if (!this.eventMap.has(eventKey)) return;
    
    this.eventMap.get(eventKey)!.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event handler for ${eventKey}:`, error);
      }
    });
  }

  clearAllListeners() {
    this.eventMap.clear();
  }

  // 索引集管理
  setIndexsetId(id: any, type?: any, flag?: boolean) {
    this.fire(RetrieveEvent.INDEX_SET_CHANGE, { id, type, flag });
  }

  // 收藏夹相关
  get isFavoriteShown(): boolean {
    return this._isFavoriteShown;
  }

  setFavoriteShown(shown: boolean) {
    this._isFavoriteShown = shown;
  }

  setFavoriteWidth(width: number) {
    this.favoriteWidth = width;
  }

  setFavoriteActive(favorite: any) {
    // 触发收藏激活事件
    this.fire('favorite-active', favorite);
  }

  // 当前索引视图
  get isViewCurrentIndex(): boolean {
    return this._isViewCurrentIndex;
  }

  setViewCurrentIndexn(isView: boolean) {
    this._isViewCurrentIndex = isView;
  }

  // 搜索状态
  setSearchingValue(value: boolean) {
    this._isSearching = value;
  }

  searchValueChange(value: any) {
    this.fire('search-value-change', value);
  }

  // 滚动相关
  getScrollSelector(): string {
    return this._scrollSelector;
  }

  setScrollSelector(selector: string) {
    this._scrollSelector = selector;
  }

  // 搜索栏高度
  setSearchBarHeight(height: number) {
    this._searchBarHeight = height;
  }

  // 高亮相关
  highLightKeywords(keywords: string[], container?: HTMLElement) {
    // 简单实现，实际需要使用 mark.js
    console.log('highLightKeywords', keywords, container);
  }

  setMarkInstance(instance: any) {
    this.markInstance = instance;
  }

  destroyMarkInstance() {
    if (this.markInstance) {
      this.markInstance.unmark?.();
      this.markInstance = null;
    }
  }

  // 点击选择判断
  isClickOnSelection(): boolean {
    const selection = window.getSelection();
    return selection ? selection.toString().length > 0 : false;
  }

  // 生命周期
  onMounted(callback?: Function) {
    // 简单实现，实际需要与 Vue 生命周期集成
    if (callback) {
      setTimeout(() => callback(), 0);
    }
  }

  destroy() {
    this.clearAllListeners();
    this.destroyMarkInstance();
  }

  // 路由查询参数修复
  routeQueryTabValueFix(item?: any, tab?: any, isUnionSearch?: boolean): string {
    // 修复某些特殊字符
    const tabValue = tab || item;
    return String(tabValue || '').replace(/_/g, '-');
  }

  // 日期格式化
  formatDateValue(date: any, format = 'YYYY-MM-DD HH:mm:ss'): string {
    if (!date) return '';
    return dayjs(date).format(format);
  }

  // 上报日志
  reportLog(action: string, data?: any) {
    console.log('[RetrieveHelper] Report:', action, data);
    // 实际应该调用埋点 SDK
  }
}

export const RetrieveHelper = new RetrieveHelperClass();

export default RetrieveHelper;
