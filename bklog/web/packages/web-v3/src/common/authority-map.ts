/**
 * 权限映射 stub
 * 用于兼容从 v2 迁移过来的代码
 */

export const VIEW_BUSINESS = 'view_business';
export const MANAGE_COLLECTION = 'manage_collection';
export const MANAGE_EXTRACT_CONFIG = 'manage_extract_config';
export const MANAGE_INDICES = 'manage_indices';
export const SEARCH_LOG = 'search_log';
export const MANAGE_ES_SOURCE = 'manage_es_source';

// 带 _AUTH 后缀的权限常量（兼容旧代码）
export const MANAGE_COLLECTION_AUTH = MANAGE_COLLECTION;
export const SEARCH_LOG_AUTH = SEARCH_LOG;
export const MANAGE_ES_SOURCE_AUTH = MANAGE_ES_SOURCE;
export const MANAGE_EXTRACT_CONFIG_AUTH = MANAGE_EXTRACT_CONFIG;
export const MANAGE_INDICES_AUTH = MANAGE_INDICES;
export const VIEW_BUSINESS_AUTH = VIEW_BUSINESS;

export default {
  VIEW_BUSINESS,
  MANAGE_COLLECTION,
  MANAGE_EXTRACT_CONFIG,
  MANAGE_INDICES,
  SEARCH_LOG,
  MANAGE_ES_SOURCE,
  // 带后缀的
  MANAGE_COLLECTION_AUTH,
  SEARCH_LOG_AUTH,
  MANAGE_ES_SOURCE_AUTH,
  MANAGE_EXTRACT_CONFIG_AUTH,
  MANAGE_INDICES_AUTH,
  VIEW_BUSINESS_AUTH,
};

// Additional permission constants
export const MANAGE_EXTRACT_AUTH = 'manage_extract';
export const DOWNLOAD_FILE_AUTH = 'download_file';
export const CREATE_CLIENT_COLLECTION_AUTH = 'create_client_collection';
export const MANAGE_ARCHIVE_AUTH = 'manage_archive';
export const VIEW_MONITOR_AUTH = 'view_monitor';
