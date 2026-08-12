export type SearchMode = 'ui' | 'sql' | 'ai';

export type ParseResult = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';

export interface FieldOperator {
  operator: string;
  label?: string;
  placeholder?: string;
}

export interface FieldInfo {
  field_name: string;
  field_type?: string;
  field_alias?: string;
  query_alias?: string;
  field_operator?: FieldOperator[];
  is_full_text?: boolean;
  /** UI weight for sorting */
  field_weight?: number;
}

export interface FieldTypeMeta {
  icon?: string;
  color?: string;
  textColor?: string;
  name?: string;
}

export interface OperatorMeta {
  label?: string;
  operator?: string;
}

export interface UiQueryItem {
  field: string;
  operator: string;
  value: Array<string | Record<string, unknown>>;
  relation?: 'AND' | 'OR' | string;
  isInclude?: boolean | null;
  field_type?: string;
  hidden_values?: string[];
  disabled?: boolean;
  showAll?: boolean;
  isCommonFixed?: boolean;
  is_focus_input?: boolean;
}

export interface CommonFilterItem {
  field: string;
  operator: string;
  value: string[];
  relation?: string;
  isInclude?: boolean | null;
  field_type?: string;
  disabled?: boolean;
  hidden_values?: string[];
}

export interface AiQueryResult {
  startTime?: string;
  endTime?: string;
  queryString?: string;
  parseResult?: ParseResult;
  explain?: string;
}

export interface FieldEggRequest {
  field: string;
  query?: string;
  size?: number;
}

export interface EggResponse {
  aggs_items?: Array<{ id?: string; value?: string; label?: string; count?: number }>;
}

export interface AiContext {
  fieldsJson?: string;
  indexSetId?: string | number;
  keyword?: string;
}

export interface EnableModes {
  ui?: boolean;
  sql?: boolean;
  ai?: boolean;
}

export interface ToolbarOptions {
  showCopy?: boolean;
  showClear?: boolean;
  showSettings?: boolean;
  showQueryButton?: boolean;
}

export interface CommonFilterState {
  focused: boolean;
  selectedFields: FieldInfo[];
  addition: CommonFilterItem[];
}

/** SQL tippy 底部「联想收藏」项（与工具栏收藏按钮无关） */
export interface FavoriteSqlSuggestion {
  name?: string;
  keyword: string;
}

export interface SqlModeOptions {
  /** 是否启用语句联想面板底部收藏列表，默认 true */
  enableFavoriteSuggestions?: boolean;
  /** 「查询语法」外链，默认对齐 Vue 正式文档地址 */
  sqlSyntaxUrl?: string;
}

export interface SearchInputBarServices {
  getFields: () => FieldInfo[];
  getFieldTypeMap?: () => Record<string, FieldTypeMeta>;
  getOperatorDictionary?: () => Record<string, OperatorMeta>;
  /** 值联想：宿主注入 API 或返回 Promise 的函数（包内不做缓存） */
  requestFieldValues: (args: FieldEggRequest) => Promise<EggResponse>;
  convertUiToSql: (addition: UiQueryItem[]) => Promise<{ querystring: string }>;
  requestAiQuery?: (text: string, ctx: AiContext) => Promise<AiQueryResult>;
  /** 语句模式 tippy 底部收藏联想（可选；也可改用 slot sql-favorite-list） */
  getFavoriteSqlSuggestions?: (
    keyword: string,
  ) => FavoriteSqlSuggestion[] | Promise<FavoriteSqlSuggestion[]>;
}

export type PlatformVariant = 'log-platform' | 'trace' | 'default';

/** 各模式输入区 PlaceHolder（优先于 localeTexts 中同名文案） */
export interface PlaceholderOptions {
  /** UI 模式：空输入时通过 data-attr-txt 展示（对齐 Vue，非 input[placeholder]） */
  ui?: string;
  /**
   * 语句模式：未聚焦（idle）
   * 对齐 Vue placeholderText 未 focus 分支
   */
  sql?: string;
  /**
   * 语句模式：聚焦/键入时（focus）
   * 对齐 Vue placeholderText isFocused 分支
   */
  sqlFocus?: string;
  /** 语句模式：未聚焦且启用 AI（默认在 sql 后拼 Tab 提示，可整句覆盖） */
  sqlIdleAi?: string;
  /** 语句模式：聚焦且启用 AI（支持 `{shortcut}` → CMD/Ctrl） */
  sqlFocusAi?: string;
  /** AI 模式 textarea placeholder */
  ai?: string;
}

export interface SearchInputBarOptions {
  mode?: SearchMode;
  enableModes?: EnableModes;
  /** Visual chrome variant; default log-platform */
  platform?: PlatformVariant;
  uiValue?: UiQueryItem[];
  sqlValue?: string;
  aiFilterList?: string[];
  aiQueryResult?: AiQueryResult | null;
  isAiLoading?: boolean;
  disabled?: boolean;
  loading?: boolean;
  searching?: boolean;
  queryDisabled?: boolean;
  queryDisabledReason?: string;
  toolbar?: ToolbarOptions;
  commonFilter?: CommonFilterState;
  /** 语句模式专属配置 */
  sqlMode?: SqlModeOptions;
  /** 分模式 PlaceHolder，可单独覆盖 ui / sql / ai */
  placeholders?: PlaceholderOptions;
  localeTexts?: Record<string, string>;
  services: SearchInputBarServices;
  indexSetId?: string | number;
}

export type SearchInputBarEventMap = {
  'update:mode': SearchMode;
  'update:uiValue': UiQueryItem[];
  'update:sqlValue': string;
  'update:aiFilterList': string[];
  search: { mode: SearchMode; value: UiQueryItem[] | string };
  'mode-change': { from: SearchMode; to: SearchMode; convertedKeyword?: string };
  clear: void;
  copy: { text: string };
  cancel: void;
  'settings-toggle': { focused: boolean };
  'settings-change': { selectedFields: FieldInfo[] };
  'common-filter-change': CommonFilterItem[];
  'text-to-query': { text: string; source: 'ui' | 'sql' | 'ai' };
  'ai-result': AiQueryResult;
  'height-change': number;
  'popup-change': { isShow: boolean };
};

export const TAG_NAME = 'bklog-search-input-bar';
