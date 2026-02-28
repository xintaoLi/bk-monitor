/**
 * 通用 API 响应类型
 */
export interface ApiResponse<T = any> {
  result: boolean;
  code: number;
  message: string;
  data: T;
  permission?: any;
}

/**
 * 分页请求参数
 */
export interface PageParams {
  page: number;
  pageSize: number;
}

/**
 * 分页响应数据
 */
export interface PageData<T = any> {
  count: number;
  results: T[];
}

/**
 * 空间信息
 */
export interface SpaceInfo {
  id: number;
  space_uid: string;
  space_id: string;
  space_name: string;
  space_type_id: string;
  space_type_name: string;
  space_code: string;
  time_zone: string;
  language: string;
}

/**
 * 业务信息
 */
export interface BizInfo {
  bk_biz_id: number;
  bk_biz_name: string;
}

/**
 * 用户信息
 */
export interface UserInfo {
  username: string;
  chinese_name: string;
  phone: string;
  email: string;
}

/**
 * 索引集信息
 */
export interface IndexSetInfo {
  index_set_id: number;
  index_set_name: string;
  scenario_id: string;
  scenario_name: string;
  storage_cluster_id: number;
  time_field: string;
  time_field_type: string;
  time_field_unit: string;
}

/**
 * 字段信息
 */
export interface FieldInfo {
  field_name: string;
  field_type: string;
  field_alias: string;
  is_display: boolean;
  is_editable: boolean;
  tag: string;
  es_doc_values: boolean;
  filterExpand?: boolean;
}

/**
 * 检索查询参数
 */
export interface SearchParams {
  space_uid: string;
  bk_biz_id: number;
  index_set_id: number;
  keyword: string;
  start_time: string;
  end_time: string;
  time_range?: string;
  host_scopes?: any;
  addition?: any[];
  begin?: number;
  size?: number;
  aggs?: any;
  highlight?: any;
}

/**
 * 检索结果
 */
export interface SearchResult {
  total: number;
  took: number;
  list: any[];
  aggs?: any;
  origin_log_list?: any[];
}
