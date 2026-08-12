/**
 * 从 retrieve `store/condition-operator.ts` 抽出的纯函数，无新增业务规则。
 * ConditionOperator 类与本模块共享同一套映射。
 */

export const RELATION_LIST = ['AND', 'OR', 'and', 'or'] as const;

/** 前端条件下拉中「包含族」可选 operator（含 API 通配符写法，便于兼容回填） */
export const CONTAIN_OPERATOR_LIST = [
  'contains match phrase',
  '=~',
  'not contains match phrase',
  '!=~',
] as const;

/** API 侧通配符 operator */
export const WILDCARD_OPERATOR_LIST = ['&!=~', '!=~', '&=~', '=~'] as const;

/**
 * text 类型前端语义 → API operator
 * key = `${relation?} is|is not ${match?}`
 */
export const TEXT_OPERATOR_MAPPING: Record<string, string> = {
  is: 'contains match phrase',
  'is not': 'not contains match phrase',
  'and is': 'all contains match phrase',
  'and is not': 'all not contains match phrase',
  'is match': '=~',
  'is not match': '!=~',
  'and is match': '&=~',
  'and is not match': '&!=~',
};

export const ALL_CONTAIN_API_OPERATORS = Object.values(TEXT_OPERATOR_MAPPING);

/** 正向（包含）一侧的 operator */
export const CONTAINS_POSITIVE_OPERATORS = [
  'contains match phrase',
  '=~',
  'all contains match phrase',
  '&=~',
] as const;

export interface OperatorConvertItem {
  field?: string;
  field_type?: string;
  operator: string;
  value?: unknown;
  relation?: string;
  isInclude?: boolean | null;
  hidden_values?: unknown[];
  disabled?: boolean;
}

export interface FrontShowCondition {
  operator: string;
  relation: string;
  field?: string;
  isInclude: boolean;
  value: unknown[];
  hidden_values: unknown[];
  disabled: boolean;
}

export function isWildcardApiOperator(operator: string): boolean {
  return (WILDCARD_OPERATOR_LIST as readonly string[]).includes(operator);
}

export function isContainFamilyOperator(operator: string): boolean {
  return (CONTAIN_OPERATOR_LIST as readonly string[]).includes(operator)
    || ALL_CONTAIN_API_OPERATORS.includes(operator);
}

export function isPositiveContainOperator(operator: string): boolean {
  return (CONTAINS_POSITIVE_OPERATORS as readonly string[]).includes(operator);
}

export function resolveRelation(item: OperatorConvertItem): string {
  if (item.relation && (RELATION_LIST as readonly string[]).includes(item.relation)) {
    return item.relation;
  }
  return (CONTAIN_OPERATOR_LIST as readonly string[]).includes(item.operator) ? 'OR' : 'AND';
}

/** isInclude 优先；否则看 operator 是否本身是通配符 API 值 */
export function resolveIsWildcardMatch(item: OperatorConvertItem): boolean {
  if (typeof item.isInclude === 'boolean') return item.isInclude;
  return isWildcardApiOperator(item.operator);
}

/**
 * 前端条件 → API operator（对齐 FormatOpetatorFrontToApi）
 */
export function formatOperatorFrontToApi(item: OperatorConvertItem): string {
  if (item.field === '*') return item.operator;

  const relationRaw = resolveRelation(item);
  const inContainFamily = (CONTAIN_OPERATOR_LIST as readonly string[]).includes(item.operator);
  const allowByType = ['text', 'string'].includes(item.field_type || '') || /^and$/i.test(relationRaw);

  if (!inContainFamily || !allowByType) {
    return item.operator;
  }

  const relation = String(relationRaw).toUpperCase();
  const valueList = Array.isArray(item.value) ? item.value : [item.value];
  const isWildcard = resolveIsWildcardMatch(item);
  const shouldKeepOrigin = !isWildcard
    && ['contains match phrase', 'not contains match phrase'].includes(item.operator)
    && (relation !== 'AND' || valueList.length <= 1);

  if (shouldKeepOrigin) return item.operator;

  let key = relation === 'AND' ? 'and ' : '';
  key += isPositiveContainOperator(item.operator) ? 'is ' : 'is not ';
  key += isWildcard ? 'match' : '';
  return TEXT_OPERATOR_MAPPING[key.trim()] || item.operator;
}

/**
 * API / 存储条件 → 前端展示结构（对齐 formatApiOperatorToFront + getShowCondition）
 * - 默认把 all contains / &=~ 等归一成「包含 / 不包含」+ isInclude
 * - isInitializing=true 时保留通配符 operator 原值（历史兼容）
 */
export function formatApiOperatorToFront(
  item: OperatorConvertItem,
  isInitializing = false,
): FrontShowCondition {
  const valueArr = Array.isArray(item.value) ? [...item.value] : [item.value];
  const hidden = Array.isArray(item.hidden_values) ? [...item.hidden_values] : [];
  const disabled = Boolean(item.disabled);

  if (item.field !== '*' && ALL_CONTAIN_API_OPERATORS.includes(item.operator)) {
    const apiOp = item.operator;
    const relation = ['AND', 'OR'].includes(item.relation?.toLocaleUpperCase?.() ?? '')
      ? (item.relation as string)
      : (CONTAIN_OPERATOR_LIST as readonly string[]).includes(apiOp)
        ? 'OR'
        : 'AND';

    if (isWildcardApiOperator(apiOp) || isInitializing) {
      return {
        operator: apiOp,
        relation,
        field: item.field,
        isInclude: resolveIsWildcardMatch({ ...item, operator: apiOp }),
        value: valueArr,
        hidden_values: hidden,
        disabled,
      };
    }

    return {
      operator: isPositiveContainOperator(apiOp)
        ? 'contains match phrase'
        : 'not contains match phrase',
      relation,
      field: item.field,
      isInclude: resolveIsWildcardMatch({ ...item, operator: apiOp }),
      value: valueArr,
      hidden_values: hidden,
      disabled,
    };
  }

  return {
    operator: item.operator,
    relation: item.relation || 'OR',
    field: item.field,
    isInclude: typeof item.isInclude === 'boolean' ? item.isInclude : false,
    value: valueArr,
    hidden_values: hidden,
    disabled,
  };
}

/** 对齐 ConditionOperator.getShowCondition */
export function toUiShowCondition(item: OperatorConvertItem): FrontShowCondition | undefined {
  if (item.field === '*' || !ALL_CONTAIN_API_OPERATORS.includes(item.operator)) {
    return undefined;
  }
  const apiOp = item.operator;
  const relation = ['AND', 'OR'].includes(item.relation?.toLocaleUpperCase?.() ?? '')
    ? (item.relation as string)
    : (CONTAIN_OPERATOR_LIST as readonly string[]).includes(apiOp)
      ? 'OR'
      : 'AND';
  return {
    operator: isPositiveContainOperator(apiOp)
      ? 'contains match phrase'
      : 'not contains match phrase',
    relation,
    field: item.field,
    isInclude: resolveIsWildcardMatch(item),
    value: Array.isArray(item.value) ? [...item.value] : [item.value],
    hidden_values: Array.isArray(item.hidden_values) ? [...item.hidden_values] : [],
    disabled: Boolean(item.disabled),
  };
}

export function getConditionRequestParam(item: OperatorConvertItem) {
  return {
    field: item.field,
    operator: formatOperatorFrontToApi(item),
    value: Array.isArray(item.value) ? item.value : [item.value],
    hidden_values: item.hidden_values ?? [],
    disabled: item.disabled ?? false,
  };
}
