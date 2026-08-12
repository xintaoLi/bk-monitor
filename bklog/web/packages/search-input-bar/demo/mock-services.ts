import type {
  AiQueryResult,
  FavoriteSqlSuggestion,
  FieldInfo,
  SearchInputBarServices,
  UiQueryItem,
} from '../src/types';

const MOCK_FIELDS: FieldInfo[] = [
  {
    field_name: 'log',
    field_alias: '日志',
    field_type: 'text',
    // 与线上一致：条件下拉无「模糊匹配」；通配由匹配模式 + isInclude 表达，下发时转 =~
    field_operator: [
      { operator: 'contains match phrase', label: '包含' },
      { operator: 'not contains match phrase', label: '不包含' },
      { operator: 'exists', label: '存在' },
      { operator: 'does not exists', label: '不存在' },
    ],
  },
  {
    field_name: 'status',
    field_alias: '状态码',
    field_type: 'integer',
    field_operator: [
      { operator: '=', label: '等于' },
      { operator: '!=', label: '不等于' },
      { operator: '>', label: '大于' },
      { operator: '<', label: '小于' },
    ],
  },
  {
    field_name: 'path',
    field_alias: '路径',
    field_type: 'string',
    field_operator: [
      { operator: '=', label: '等于' },
      { operator: 'contains match phrase', label: '包含' },
      { operator: 'not contains match phrase', label: '不包含' },
      { operator: 'exists', label: '存在' },
    ],
  },
  {
    field_name: 'serverIp',
    field_alias: '主机IP',
    field_type: 'keyword',
    field_operator: [
      { operator: '=', label: '等于' },
      { operator: '!=', label: '不等于' },
    ],
  },
];

const EGGS: Record<string, string[]> = {
  status: ['200', '404', '500', '502'],
  path: ['/api/search', '/api/login', '/healthz'],
  serverIp: ['127.0.0.1', '10.0.0.1', '192.168.1.10'],
  log: ['error', 'timeout', 'exception'],
};

const MOCK_FAVORITES: FavoriteSqlSuggestion[] = [
  { name: '错误日志', keyword: 'log:error AND status:500' },
  { name: '登录路径', keyword: 'path:"/api/login"' },
  { name: '健康检查', keyword: 'path:"/healthz" AND status:200' },
];

function uiToSql(addition: UiQueryItem[]): string {
  return addition
    .filter(item => item.field !== '_ip-select_')
    .map((item) => {
      if (item.field === '*') {
        return (item.value || []).map(v => String(v)).join(' OR ');
      }
      const values = (item.value || []).map(v => String(v));
      if (!values.length) return `${item.field}:*`;
      if (item.operator === 'exists') return `_exists_:${item.field}`;
      if (item.operator === '=' || item.operator === '') {
        return values.map(v => `${item.field}:${v}`).join(' OR ');
      }
      if (item.operator === 'contains match phrase') {
        return values.map(v => `${item.field}:"${v}"`).join(' OR ');
      }
      return values.map(v => `${item.field}:${item.operator}${v}`).join(' OR ');
    })
    .filter(Boolean)
    .map(part => (part.includes(' OR ') ? `(${part})` : part))
    .join(' AND ');
}

export function createMockServices(): SearchInputBarServices {
  return {
    getFields: () => MOCK_FIELDS,
    getFieldTypeMap: () => ({
      text: { color: '#3a84ff', textColor: '#fff', name: 'text' },
      keyword: { color: '#2dcb56', textColor: '#fff', name: 'keyword' },
      integer: { color: '#ff9c01', textColor: '#fff', name: 'integer' },
    }),
    getOperatorDictionary: () => ({
      '=': { label: '等于', operator: '=' },
      'contains match phrase': { label: '包含', operator: 'contains match phrase' },
    }),
    requestFieldValues: async ({ field, query }) => {
      await delay(120);
      const list = (EGGS[field] || []).filter(v => !query || v.includes(query));
      return { aggs_items: list.map(value => ({ value, label: value })) };
    },
    convertUiToSql: async (addition) => {
      await delay(80);
      return { querystring: uiToSql(addition) };
    },
    requestAiQuery: async (text) => {
      await delay(500);
      const result: AiQueryResult = {
        queryString: `log:"${text.replace(/"/g, '')}" AND status:500`,
        parseResult: 'SUCCESS',
        explain: `已将自然语言「${text}」转换为示例查询语句`,
        startTime: '',
        endTime: '',
      };
      return result;
    },
    getFavoriteSqlSuggestions: async (keyword) => {
      await delay(60);
      const parts = (keyword || '')
        .split(/\s+(AND\s+NOT|OR|AND)\s+/i)
        .filter(Boolean)
        .map(s => s.trim().toLowerCase())
        .filter(s => !/^(and|or|and\s+not)$/i.test(s));
      if (!parts.length) return MOCK_FAVORITES;
      return MOCK_FAVORITES.filter(item =>
        parts.every(p => item.keyword.toLowerCase().includes(p.replace(/"/g, ''))),
      );
    },
  };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { MOCK_FIELDS };
