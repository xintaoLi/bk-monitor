/** Aligned with retrieve-v2/search-bar/utils/const-values.ts */
export const operatorMapping: Record<string, string> = {
  '=': '=',
  '!=': '!=',
  '<': '<',
  '>': '>',
  '<=': '<=',
  '>=': '>=',
  '=~': '=~',
  '!=~': '!=~',
  exists: '存在',
  'does not exists': '不存在',
  'is true': 'is true',
  'is false': 'is false',
  contains: '包含',
  'not contains': '不包含',
  'contains match phrase': '包含',
  'not contains match phrase': '不包含',
  'all contains match phrase': '全部包含',
  'all not contains match phrase': '全部不包含',
};

export function getOperatorDisplayLabel(
  operator: string,
  dictionary?: Record<string, { label?: string }>,
): string {
  const mapped = operatorMapping[operator] ?? operator;
  return dictionary?.[operator]?.label || dictionary?.[mapped]?.label || mapped;
}

export function isNegateOperator(operator: string) {
  return /^(not contains|does not exists|is false|!=)/.test(operator || '');
}

/** 对齐 Vue ui-input-option FUZZY_MATCH_OPERATOR_LIST */
export const FUZZY_MATCH_OPERATOR_LIST = [
  'contains match phrase',
  'not contains match phrase',
  '=~',
  '!=~',
] as const;

/** @deprecated 使用 FUZZY_MATCH_OPERATOR_LIST / isFuzzyMatchOperator */
export const FUZZY_OPERATORS = [...FUZZY_MATCH_OPERATOR_LIST];

/** 对齐 Vue FUZZY_NEGATIVE_OPERATOR_LIST */
export const FUZZY_NEGATIVE_OPERATOR_LIST = [
  'not contains match phrase',
  '!=~',
] as const;

export function isFuzzyOperator(operator: string) {
  return (FUZZY_MATCH_OPERATOR_LIST as readonly string[]).includes(operator);
}

export function isFuzzyFieldType(fieldType?: string) {
  return fieldType === 'text' || fieldType === 'string';
}

/**
 * 对齐 Vue ui-input-option：
 * getFuzzyOperator(isWildcard) 内部用 condition.operator 判断正负
 */
export function getFuzzyOperator(baseOperator: string, isWildcard: boolean) {
  const isNegative = (FUZZY_NEGATIVE_OPERATOR_LIST as readonly string[]).includes(baseOperator);
  if (isNegative) {
    return isWildcard ? '!=~' : 'not contains match phrase';
  }
  return isWildcard ? '=~' : 'contains match phrase';
}
