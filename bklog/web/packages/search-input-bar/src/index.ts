import './styles/index.css';


export { registerSearchInputBar, BklogSearchInputBarElement } from './element';
export { createSearchBar, type SearchBarInstance } from './shell/search-bar';
export { ConditionOperator } from './core/condition-operator';
export {
  ALL_CONTAIN_API_OPERATORS,
  CONTAIN_OPERATOR_LIST,
  CONTAINS_POSITIVE_OPERATORS,
  TEXT_OPERATOR_MAPPING,
  WILDCARD_OPERATOR_LIST,
  formatApiOperatorToFront,
  formatOperatorFrontToApi,
  getConditionRequestParam,
  isContainFamilyOperator,
  isPositiveContainOperator,
  isWildcardApiOperator,
  resolveIsWildcardMatch,
  resolveRelation,
  toUiShowCondition,
  type FrontShowCondition,
  type OperatorConvertItem,
} from './core/operator-convert';
export {
  FulltextOperator,
  FulltextOperatorKey,
  IP_SELECT_FIELD,
  excludesFields,
  getInputQueryDefaultItem,
  getInputQueryIpSelectItem,
  withoutValueConditionList,
} from './core/const.common';
export {
  resolveUiToSqlConvertOutcome,
  shouldConvertUiToSqlOnModeSwitch,
} from './core/ui-to-sql-mode';
export {
  mergeOptions,
  resolveDefaultSqlSyntaxUrl,
  DEFAULT_ENABLE_MODES,
  DEFAULT_TOOLBAR,
  DEFAULT_TEXTS,
  DEFAULT_SQL_MODE,
  INPUT_MIN_HEIGHT,
  INPUT_MAX_HEIGHT,
  AI_SHELL_VERTICAL_PADDING,
  AI_TEXTAREA_MIN_HEIGHT,
} from './config';
export type {
  AiContext,
  AiQueryResult,
  CommonFilterItem,
  CommonFilterState,
  EggResponse,
  EnableModes,
  FavoriteSqlSuggestion,
  FieldEggRequest,
  FieldInfo,
  FieldOperator,
  FieldTypeMeta,
  OperatorMeta,
  ParseResult,
  PlaceholderOptions,
  SearchInputBarEventMap,
  SearchInputBarOptions,
  SearchInputBarServices,
  SearchMode,
  PlatformVariant,
  SqlModeOptions,
  ToolbarOptions,
  UiQueryItem,
} from './types';
export { TAG_NAME } from './types';

import { registerSearchInputBar } from './element';
import { createSearchBar } from './shell/search-bar';
import type { SearchInputBarOptions } from './types';

/** Convenience: register CE and create imperative instance on a host element. */
export function createSearchInputBar(host: HTMLElement, options: SearchInputBarOptions) {
  registerSearchInputBar();
  return createSearchBar(host, options);
}

registerSearchInputBar();
