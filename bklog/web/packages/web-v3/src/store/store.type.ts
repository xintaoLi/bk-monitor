/**
 * Store 类型定义 stub
 */

export interface RouteParams {
  spaceUid?: string;
  bkBizId?: number | string;
  indexSetId?: string | number;
  ids?: any[];
  [key: string]: any;
}

export const SEARCH_MODE_DIC: Record<string, string> = {
  'sql': 'sql',
  'ui': 'ui',
  'default': 'ui',
};

export default {
  RouteParams,
  SEARCH_MODE_DIC,
};

// Re-export from stores
export { BK_LOG_STORAGE } from '../stores/storage';

export interface FieldInfoItem {
  field_name: string;
  field_type: string;
  field_alias?: string;
  is_display?: boolean;
  [key: string]: any;
}
