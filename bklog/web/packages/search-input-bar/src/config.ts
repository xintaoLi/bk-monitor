import type {
  CommonFilterState,
  EnableModes,
  PlaceholderOptions,
  PlatformVariant,
  SearchInputBarOptions,
  SearchMode,
  SqlModeOptions,
  ToolbarOptions,
} from './types';

/** 对齐 Vue .search-bar-container / .search-input min-height */
export const INPUT_MIN_HEIGHT = 48;
/** 对齐 Vue UI ul.search-items max-height；三种模式内容区统一上限 */
export const INPUT_MAX_HEIGHT = 135;
/** AI 外壳上下 padding（2+2+6+6），用于 textarea 自适应上限 */
export const AI_SHELL_VERTICAL_PADDING = 16;
/** AI textarea 内容行高下限（对齐 Vue ai-input min-height） */
export const AI_TEXTAREA_MIN_HEIGHT = 24;

export const DEFAULT_ENABLE_MODES: Required<EnableModes> = {
  ui: true,
  sql: true,
  ai: true,
};

export const DEFAULT_TOOLBAR: Required<ToolbarOptions> = {
  showCopy: true,
  showClear: true,
  showSettings: true,
  showQueryButton: true,
};

export const DEFAULT_COMMON_FILTER: CommonFilterState = {
  focused: false,
  selectedFields: [],
  addition: [],
};

/** 对齐 Vue sql-query-options handleSQLReadmeClick 默认文档地址 */
export function resolveDefaultSqlSyntaxUrl(): string {
  let lang = 'ZH';
  if (typeof document !== 'undefined') {
    const match = /(?:^|;\s*)blueking_language=([^;]+)/.exec(document.cookie || '');
    if (match && /^en/i.test(decodeURIComponent(match[1]))) lang = 'EN';
  }
  return `https://bk.tencent.com/docs/markdown/${lang}/LogSearch/4.6/UserGuide/ProductFeatures/data-visualization/query_string.md`;
}

export const DEFAULT_SQL_MODE: Required<SqlModeOptions> = {
  enableFavoriteSuggestions: true,
  sqlSyntaxUrl: '',
};

export const DEFAULT_TEXTS: Record<string, string> = {
  uiMode: 'UI 模式',
  sqlMode: '语句模式',
  aiMode: 'AI 模式',
  search: '查询',
  pause: '暂停',
  copy: '复制',
  clear: '清空',
  settings: '常用查询设置',
  settingsTitle: '设置筛选',
  availableList: '待选列表',
  fixedFilter: '常驻筛选',
  addAll: '全部添加',
  clearAll: '清空',
  confirm: '确定',
  cancel: '取消',
  searchKeyword: '请输入关键字',
  emptySearch: '搜索为空',
  /** 对齐 Vue ui-input inputPlaceholder（非 APM） */
  uiPlaceholder: ' / 唤起，输入检索内容（Tab 可切换为 AI 模式）',
  sqlPlaceholder: '请输入查询语句',
  sqlPlaceholderIdle: ' / 唤起， 输入检索内容',
  sqlPlaceholderIdleAi: ' / 唤起， 输入检索内容（Tab 可切换为 AI 模式）',
  sqlPlaceholderFocus: ' / 唤起， 输入检索内容',
  sqlPlaceholderFocusAi: '可输入自然语言，{shortcut} + Enter 触发 AI 解析',
  sqlDirectRetrieve: '直接检索',
  sqlMoveCursor: '移动光标',
  sqlAiParse: 'AI 解析',
  sqlSyntaxLink: '查询语法',
  sqlLoading: '加载中...',
  sqlFavoriteTitlePrefix: '联想到以下',
  sqlFavoriteTitleSuffix: '个收藏',
  sqlFavoriteEmpty: '暂无匹配的收藏项',
  sqlFavoriteType: '检索语句',
  aiPlaceholder: '用自然语言描述你的查询条件，Enter 执行',
  tabToAi: 'Tab 切换 AI 模式',
  missingConvert: '未注入 convertUiToSql，无法完成转换',
  missingAi: '未注入 requestAiQuery，无法执行 AI 解析',
  convertWarn: 'UI 转语句失败，已切换到语句模式',
  copied: '已复制',
};

export function mergeOptions(options: SearchInputBarOptions) {
  const enableModes = { ...DEFAULT_ENABLE_MODES, ...options.enableModes };
  const toolbar = { ...DEFAULT_TOOLBAR, ...options.toolbar };
  const commonFilter = {
    ...DEFAULT_COMMON_FILTER,
    ...options.commonFilter,
    selectedFields: options.commonFilter?.selectedFields ?? [],
    addition: options.commonFilter?.addition ?? [],
  };
  const localeTexts = { ...DEFAULT_TEXTS, ...options.localeTexts };
  // placeholders.* 优先；否则回落到 localeTexts 对应 key
  const placeholders: Required<PlaceholderOptions> = {
    ui: options.placeholders?.ui ?? localeTexts.uiPlaceholder,
    sql: options.placeholders?.sql
      ?? localeTexts.sqlPlaceholderIdle
      ?? localeTexts.sqlPlaceholder,
    sqlFocus: options.placeholders?.sqlFocus
      ?? localeTexts.sqlPlaceholderFocus
      ?? localeTexts.sqlPlaceholderIdle
      ?? localeTexts.sqlPlaceholder,
    sqlIdleAi: options.placeholders?.sqlIdleAi ?? localeTexts.sqlPlaceholderIdleAi,
    sqlFocusAi: options.placeholders?.sqlFocusAi ?? localeTexts.sqlPlaceholderFocusAi,
    ai: options.placeholders?.ai ?? localeTexts.aiPlaceholder,
  };
  // 同步回 localeTexts，供各模式统一读取
  localeTexts.uiPlaceholder = placeholders.ui;
  localeTexts.sqlPlaceholderIdle = placeholders.sql;
  localeTexts.sqlPlaceholder = placeholders.sql;
  localeTexts.sqlPlaceholderFocus = placeholders.sqlFocus;
  localeTexts.sqlPlaceholderIdleAi = placeholders.sqlIdleAi;
  localeTexts.sqlPlaceholderFocusAi = placeholders.sqlFocusAi;
  localeTexts.aiPlaceholder = placeholders.ai;

  const sqlMode: Required<SqlModeOptions> = {
    enableFavoriteSuggestions:
      options.sqlMode?.enableFavoriteSuggestions
      ?? DEFAULT_SQL_MODE.enableFavoriteSuggestions,
    sqlSyntaxUrl: options.sqlMode?.sqlSyntaxUrl || resolveDefaultSqlSyntaxUrl(),
  };

  let mode: SearchMode = options.mode ?? 'ui';
  if (!enableModes[mode]) {
    mode = (['ui', 'sql', 'ai'] as SearchMode[]).find(m => enableModes[m]) ?? 'ui';
  }

  return {
    mode,
    enableModes,
    platform: (options.platform ?? 'log-platform') as PlatformVariant,
    uiValue: options.uiValue ? [...options.uiValue] : [],
    sqlValue: options.sqlValue ?? '',
    aiFilterList: options.aiFilterList ? [...options.aiFilterList] : [],
    aiQueryResult: options.aiQueryResult ?? null,
    isAiLoading: options.isAiLoading ?? false,
    disabled: options.disabled ?? false,
    loading: options.loading ?? false,
    searching: options.searching ?? false,
    queryDisabled: options.queryDisabled ?? false,
    queryDisabledReason: options.queryDisabledReason ?? '',
    toolbar,
    commonFilter,
    sqlMode,
    placeholders,
    localeTexts,
    services: options.services,
    indexSetId: options.indexSetId,
  };
}

export type MergedOptions = ReturnType<typeof mergeOptions>;
