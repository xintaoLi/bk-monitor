import type { UiQueryItem } from '../types';
import {
  ALL_CONTAIN_API_OPERATORS,
  CONTAIN_OPERATOR_LIST,
  CONTAINS_POSITIVE_OPERATORS,
  TEXT_OPERATOR_MAPPING,
  WILDCARD_OPERATOR_LIST,
  formatApiOperatorToFront,
  formatOperatorFrontToApi,
  getConditionRequestParam,
  resolveIsWildcardMatch,
  resolveRelation,
  toUiShowCondition,
} from './operator-convert';

/**
 * 兼容 retrieve `ConditionOperator` 类 API；核心映射见 `operator-convert.ts`。
 */
class ConditionOperator {
  item: UiQueryItem;
  relationList: string[] = ['AND', 'OR', 'and', 'or'];
  containOperatorList: string[] = [...CONTAIN_OPERATOR_LIST];
  wildcardList: string[] = [...WILDCARD_OPERATOR_LIST];
  textMappingKey: Record<string, string> = { ...TEXT_OPERATOR_MAPPING };
  allContainsStrList: string[] = [...ALL_CONTAIN_API_OPERATORS];
  containsStrList: string[] = [...CONTAINS_POSITIVE_OPERATORS];

  constructor(item: UiQueryItem) {
    this.item = item;
  }

  get operatorRelationVlaue() {
    return resolveRelation(this.item);
  }

  get isWildcardMatch() {
    return resolveIsWildcardMatch(this.item);
  }

  get isFulltextField() {
    return this.item.field === '*';
  }

  FormatOpetatorFrontToApi() {
    return formatOperatorFrontToApi(this.item);
  }

  formatApiOperatorToFront(isInitializing = false) {
    return formatApiOperatorToFront(this.item, isInitializing);
  }

  getShowCondition() {
    return toUiShowCondition(this.item);
  }

  getRequestParam() {
    return getConditionRequestParam(this.item);
  }
}

export { ConditionOperator };
