/**
 * index.ts - 核心业务类型定义
 * 对齐原项目 store/default-values.ts 中的类型
 */

// ==================== 空间/业务 ====================

export interface SpaceItem {
  space_uid: string;
  bk_biz_id: number | string;
  space_name: string;
  space_type_id: string;
  space_id: string;
  is_active?: boolean;
  tags?: string[];
}

// ==================== 索引集 ====================

export interface IndexSetItem {
  index_set_id: number | string;
  index_set_name: string;
  space_uid?: string;
  bk_biz_id?: number | string;
  tags?: IndexSetTag[];
  is_active?: boolean;
  time_field?: string;
  time_field_type?: string;
  time_field_unit?: string;
}

export interface IndexSetTag {
  tag_id: number;
  name: string;
  color?: string;
}

// ==================== 检索参数 ====================

export interface IndexItem {
  ids: (number | string)[];
  isUnionIndex: boolean;
  start_time?: string;
  end_time?: string;
  datePickerValue?: string[];
  keyword?: string;
  addition?: FilterCondition[];
  host_scopes?: HostScopes;
  timezone?: string;
  size?: number;
  interval?: string;
  sort_list?: [string, 'asc' | 'desc'][];
  ip_chooser?: Record<string, unknown>;
  search_mode?: 'ui' | 'lucene';
}

export interface FilterCondition {
  field: string;
  operator: string;
  value: string | string[];
  condition?: 'and' | 'or';
}

export interface HostScopes {
  modules?: unknown[];
  ips?: string[];
  target_nodes?: unknown[];
  target_node_type?: string;
}

// ==================== 字段信息 ====================

export interface FieldItem {
  field_name: string;
  field_alias?: string;
  field_type: string;
  is_display?: boolean;
  is_editable?: boolean;
  is_built_in?: boolean;
  is_analyzed?: boolean;
  tag?: string;
  description?: string;
  width?: number;
  minWidth?: number;
  filterVisible?: boolean;
}

export interface IndexFieldInfo {
  fields: FieldItem[];
  time_field?: string;
  time_field_type?: string;
  time_field_unit?: string;
  display_fields?: string[];
  sort_list?: [string, 'asc' | 'desc'][];
  config?: FieldConfig[];
}

export interface FieldConfig {
  id: number | string;
  name: string;
  display_fields: string[];
  sort_list: [string, 'asc' | 'desc'][];
  index_set_ids?: (number | string)[];
}

// ==================== 检索结果 ====================

export interface IndexSetQueryResult {
  list: LogItem[];
  total: number | string;
  took?: number;
  origin_log_list?: LogItem[];
  fields?: FieldItem[];
  scroll_id?: string;
  dsl?: string;
}

export interface LogItem {
  [key: string]: unknown;
  log?: string;
  dtEventTimeStamp?: string | number;
  serverIp?: string;
  path?: string;
  gseIndex?: number;
  iterationIndex?: number;
}

// ==================== 收藏 ====================

export interface FavoriteGroup {
  id: number | string;
  name: string;
  favorites: FavoriteItem[];
  group_type?: string;
}

export interface FavoriteItem {
  id: number | string;
  name: string;
  space_uid?: string;
  index_set_id?: number | string;
  index_set_ids?: (number | string)[];
  params?: IndexItem;
  display_fields?: string[];
  sort_list?: [string, 'asc' | 'desc'][];
  group_id?: number | string;
  is_enable_display_fields?: boolean;
  created_by?: string;
  updated_at?: string;
}

// ==================== 菜单 ====================

export interface MenuItem {
  id: string;
  name: string;
  icon?: string;
  children?: MenuItem[];
  meta?: Record<string, unknown>;
}

// ==================== 用户 ====================

export interface UserInfo {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

// ==================== 全局配置 ====================

export interface GlobalsData {
  field_analysis_config?: Record<string, unknown>;
  masking_toggle?: boolean;
  [key: string]: unknown;
}

// ==================== 路由 Meta ====================

export interface RouteMeta {
  title?: string;
  navId?: string;
  needBack?: boolean;
  backName?: string;
  [key: string]: unknown;
}

// ==================== 趋势图 ====================

export interface TrendDataItem {
  time: number | string;
  count: number;
}

// ==================== 聚类 ====================

export interface ClusterItem {
  pattern: string;
  count: number;
  signature?: string;
  label?: string;
  remark?: string;
  is_new_class?: boolean;
  year_on_year_count?: number;
  year_on_year_percentage?: string;
}

// ==================== 日志提取 ====================

export interface ExtractTask {
  id: number | string;
  task_name: string;
  status?: string;
  created_by?: string;
  created_at?: string;
  link_id?: number | string;
}

// ==================== 采集配置 ====================

export interface CollectorConfig {
  collector_config_id: number | string;
  collector_config_name: string;
  collector_config_name_en?: string;
  bk_biz_id?: number | string;
  space_uid?: string;
  category_id?: string;
  collector_plugin_id?: number | string;
  status?: string;
  is_active?: boolean;
}

// ==================== API 响应 ====================

export interface ApiResponse<T = unknown> {
  result: boolean;
  code: string | number;
  message: string;
  data: T;
}

// ==================== HTTP 请求配置 ====================

export interface RequestConfig {
  fromCache?: boolean;
  cancelPrevious?: boolean;
  cancelWhenRouteChange?: boolean;
  catchIsShowMessage?: boolean;
  clearCache?: boolean;
}

// ==================== 鉴权 ====================

export interface AuthInfo {
  apply_url?: string;
  permission?: Record<string, unknown>;
  action_id?: string;
  resource_type?: string;
  resource_id?: string;
}

