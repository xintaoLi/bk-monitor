import type { UiQueryItem } from '../types';

export const FulltextOperator = 'contains match phrase';

export const FulltextOperatorKey = '*contains match phrase';

export const excludesFields = ['__ext', '__module__', ' __set__', '__ipv6__'];

export const withoutValueConditionList = ['does not exists', 'exists', 'is false', 'is true'];

export const IP_SELECT_FIELD = '_ip-select_';

export const getInputQueryDefaultItem = (value: string[] = []): UiQueryItem => ({
  field: '*',
  operator: FulltextOperator,
  isInclude: false,
  value: [...(Array.isArray(value) ? value : [value])],
  relation: 'OR',
  disabled: false,
  hidden_values: [],
});

export const getInputQueryIpSelectItem = (value: Record<string, unknown> = {}): UiQueryItem => ({
  field: IP_SELECT_FIELD,
  operator: '',
  isInclude: false,
  value: [value ?? {}],
  relation: '',
  disabled: false,
  hidden_values: [],
});

export const getFieldConditonItem = () => ({
  field_name: '*',
  field_type: null as string | null,
  field_alias: null as string | null,
  field_id: null as string | null,
  field_operator: [] as Array<{ operator: string; label?: string }>,
  disabled: false,
  hidden_values: [] as string[],
});
