/**
 * Pinia Stores 类型定义
 * 解决 TypeScript 无法正确推断 Pinia actions 的问题
 */

import type { Store } from 'pinia';

// ==================== GlobalStore ====================

export interface GlobalState {
  spaceUid: string;
  bkBizId: number;
  runVer: string;
  indexSetId: string;
  isExternal: boolean;
  featureToggle: Record<string, any>;
  indexSetLoading: boolean;
  bizList: any[];
  bizInfo: Record<string, any>;
  // 新增字段
  showAlert: boolean;
  isShowGlobalDialog: boolean;
  authDialogData: any;
  // UI state
  sidebarCollapsed: boolean;
  fullscreen: boolean;
  [key: string]: any;
}

export interface GlobalActions {
  setSpaceUid(spaceUid: string): void;
  toggleSidebar(): void;
  updateSpaceUid(spaceUid: string): void;
  updateBkBizId(bkBizId: number): void;
  updateRunVer(runVer: string): void;
  updateIndexSetId(indexSetId: string): void;
  updateIsExternal(isExternal: boolean): void;
  updateFeatureToggle(featureToggle: Record<string, any>): void;
  updateIndexSetLoading(loading: boolean): void;
  updateBizList(list: any[]): void;
  updateBizInfo(info: Record<string, any>): void;
  getApplyData(params: any): Promise<any>;
  updateState(payload: Record<string, any>): void;
}

export type GlobalStore = Store<'global', GlobalState, {}, GlobalActions>;

// ==================== RetrieveStore ====================

export interface RetrieveState {
  chartKey: string;
  cacheDatePickerValue: any[];
  cacheTimeRange: string;
  filedSettingConfigID: number;
  indexSetList: any[];
  flatIndexSetList: any[];
  isIndexSetLoading: boolean;
  isTrendDataLoading: boolean;
  trendDataCount: number;
  catchFieldCustomConfig: any;
  activeVersion: string;
  searchResult: any;
  searchParams: any;
  searchHistory: any[];
  favoriteList: any[];
  favoriteGroups: any[];
  indexItem: any;
  indexSetQueryResult: any;
  storeIsShowClusterStep: boolean;
  clusterParams: any;
  aiMode: any;
  indexItemParams: any;
}

export interface RetrieveGetters {
  currentIndexSet: any;
  rootIndexSetList: any[];
  isUnionSearch: boolean;
}

export interface RetrieveActions {
  updateActiveVersion(version?: string): void;
  updateTrendDataLoading(loading: boolean): void;
  updateTrendDataCount(count: number): void;
  updateChartKey(options?: { prefix?: string }): void;
  updateCachePickerValue(value: any[]): void;
  updateCacheTimeRange(timeRange: string): void;
  updateFiledSettingConfigID(id: number): void;
  updateIndexSetList(payload: any[]): void;
  updateIndexSetLoading(loading: boolean): void;
  updateCatchFieldCustomConfig(config?: any): void;
  updateCatchFilterAddition(payload: { addition: any[] }): void;
  getIndexSetList(payload: { spaceUid: string; isLoading?: boolean; is_group?: boolean }): Promise<any[]>;
  updateSearchResult(result: any): void;
  updateSearchParams(params: any): void;
  addSearchHistory(item: any): void;
  clearSearchHistory(): void;
  updateFavoriteList(list: any[]): void;
  updateFavoriteGroups(groups: any[]): void;
  getFavoriteList(spaceUid: string): Promise<any>;
  fetchFavoriteList(spaceUid: string): Promise<any>;
  getFavoriteGroups(spaceUid: string): Promise<any>;
  updateAiMode(mode: any): void;
  updateIndexItemParams(params: any): void;
  updateIndexItem(item: any): void;
  updateUnionIndexList(data: any): void;
  updateIndexSetQueryResult(result: any): void;
  updateStoreIsShowClusterStep(isShow: boolean): void;
  updateClusterParams(params: any): void;
  updateIndexSetCustomConfig(config: any): void;
  updateState(payload: Record<string, any>): void;
}

export type RetrieveStore = Store<'retrieve', RetrieveState, RetrieveGetters, RetrieveActions> & RetrieveGetters;

// ==================== UserStore ====================

export interface UserState {
  username: string;
  userInfo: any;
}

export interface UserActions {
  updateUsername(username: string): void;
  updateUserInfo(userInfo: any): void;
  getUserInfo(): Promise<any>;
}

export type UserStore = Store<'user', UserState, {}, UserActions>;

// ==================== CollectStore ====================

export interface CollectState {
  curCollect: any;
  exportCollectObj: any;
}

export interface CollectActions {
  updateCurCollect(collect: any): void;
  updateExportCollectObj(obj: any): void;
}

export type CollectStore = Store<'collect', CollectState, {}, CollectActions>;

// ==================== IndexFieldStore ====================

export interface IndexFieldState {
  indexFieldInfo: any;
  fieldTypeMap: Record<string, any>;
}

export interface IndexFieldActions {
  updateIndexFieldInfo(info: any): void;
  updateFieldTypeMap(map: Record<string, any>): void;
  updateIndexFieldEggsItems(items: any[]): void;
  fetchIndexFields(indexSetId: string | number): Promise<any>;
}

export type IndexFieldStore = Store<'index-field', IndexFieldState, {}, IndexFieldActions>;

// ==================== StorageStore ====================

export type StorageStore = Store<'storage', Record<string, any>, {}, {
  updateStorage(payload: Record<string, any>): void;
}>;
