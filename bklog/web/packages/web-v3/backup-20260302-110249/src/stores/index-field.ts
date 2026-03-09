import { defineStore } from 'pinia';

/**
 * 字段信息类型
 */
export interface FieldInfo {
  field_name: string;
  field_type: string;
  field_alias?: string;
  es_doc_values?: boolean;
  is_analyzed?: boolean;
  is_dimension?: boolean;
  is_time?: boolean;
  is_built_in?: boolean;
  tag?: string;
  [key: string]: any;
}

/**
 * 索引字段信息类型
 */
export interface IndexFieldInfo {
  fields: FieldInfo[];
  aggs_items: Record<string, any[]>;
  display_fields?: string[];
  sort_list?: any[];
  time_field?: string;
  time_field_type?: string;
  time_field_unit?: string;
}

/**
 * 字段类型映射
 */
export interface FieldTypeMap {
  [key: string]: {
    type: string;
    name: string;
    icon?: string;
  };
}

/**
 * 索引字段状态
 */
interface IndexFieldState {
  // 当前索引集的字段信息
  indexFieldInfo: IndexFieldInfo;

  // 字段类型映射表
  fieldTypeMap: FieldTypeMap;

  // 字段配置
  fieldConfig: {
    displayFields: string[];
    sortList: any[];
    fieldsWidth: Record<string, number>;
  };

  // 加载状态
  isLoading: boolean;
}

/**
 * 索引字段状态管理
 */
export const useIndexFieldStore = defineStore('indexField', {
  state: (): IndexFieldState => ({
    indexFieldInfo: {
      fields: [],
      aggs_items: {},
      display_fields: [],
      sort_list: [],
    },

    fieldTypeMap: {
      text: { type: 'text', name: '文本' },
      keyword: { type: 'keyword', name: '关键字' },
      long: { type: 'long', name: '长整型' },
      integer: { type: 'integer', name: '整型' },
      short: { type: 'short', name: '短整型' },
      byte: { type: 'byte', name: '字节' },
      double: { type: 'double', name: '双精度浮点' },
      float: { type: 'float', name: '浮点' },
      date: { type: 'date', name: '日期' },
      boolean: { type: 'boolean', name: '布尔' },
      ip: { type: 'ip', name: 'IP地址' },
      object: { type: 'object', name: '对象' },
      nested: { type: 'nested', name: '嵌套' },
      geo_point: { type: 'geo_point', name: '地理坐标' },
    },

    fieldConfig: {
      displayFields: [],
      sortList: [],
      fieldsWidth: {},
    },

    isLoading: false,
  }),

  getters: {
    /**
     * 获取可聚合字段列表
     */
    aggFields(): FieldInfo[] {
      return this.indexFieldInfo.fields.filter(
        f => f.es_doc_values && ['keyword', 'long', 'integer'].includes(f.field_type)
      );
    },

    /**
     * 获取可分析字段列表
     */
    analyzedFields(): FieldInfo[] {
      return this.indexFieldInfo.fields.filter(f => f.is_analyzed);
    },

    /**
     * 获取时间字段
     */
    timeField(): FieldInfo | undefined {
      return this.indexFieldInfo.fields.find(f => f.is_time);
    },

    /**
     * 获取字段映射表（field_name -> FieldInfo）
     */
    fieldMap(): Record<string, FieldInfo> {
      const map: Record<string, FieldInfo> = {};
      this.indexFieldInfo.fields.forEach(field => {
        map[field.field_name] = field;
      });
      return map;
    },

    /**
     * 根据字段名获取字段信息
     */
    getFieldByName() {
      return (fieldName: string): FieldInfo | undefined => {
        return this.indexFieldInfo.fields.find(f => f.field_name === fieldName);
      };
    },

    /**
     * 根据字段名获取字段别名
     */
    getFieldAlias() {
      return (fieldName: string): string => {
        const field = this.getFieldByName(fieldName);
        return field?.field_alias || fieldName;
      };
    },

    /**
     * 获取字段类型
     */
    getFieldType() {
      return (fieldName: string): string => {
        const field = this.getFieldByName(fieldName);
        return field?.field_type || 'unknown';
      };
    },
  },

  actions: {
    /**
     * 更新索引字段信息
     */
    updateIndexFieldInfo(info: Partial<IndexFieldInfo>) {
      this.indexFieldInfo = {
        ...this.indexFieldInfo,
        ...info,
      };
    },

    /**
     * 设置字段列表
     */
    setFields(fields: FieldInfo[]) {
      this.indexFieldInfo.fields = fields;
    },

    /**
     * 更新聚合项
     */
    updateIndexFieldEggsItems(aggsItems: Record<string, any[]>) {
      this.indexFieldInfo.aggs_items = {
        ...this.indexFieldInfo.aggs_items,
        ...aggsItems,
      };
    },

    /**
     * 更新字段类型映射
     */
    updateFieldTypeMap(typeMap: FieldTypeMap) {
      this.fieldTypeMap = {
        ...this.fieldTypeMap,
        ...typeMap,
      };
    },

    /**
     * 更新字段配置
     */
    updateFieldConfig(config: Partial<IndexFieldState['fieldConfig']>) {
      this.fieldConfig = {
        ...this.fieldConfig,
        ...config,
      };
    },

    /**
     * 更新显示字段
     */
    updateDisplayFields(fields: string[]) {
      this.fieldConfig.displayFields = fields;
      this.indexFieldInfo.display_fields = fields;
    },

    /**
     * 更新排序列表
     */
    updateSortList(sortList: any[]) {
      this.fieldConfig.sortList = sortList;
      this.indexFieldInfo.sort_list = sortList;
    },

    /**
     * 更新字段宽度
     */
    updateFieldWidth(fieldName: string, width: number) {
      this.fieldConfig.fieldsWidth[fieldName] = width;
    },

    /**
     * 设置加载状态
     */
    setLoading(loading: boolean) {
      this.isLoading = loading;
    },

    /**
     * 获取索引字段列表
     */
    async fetchIndexFields(indexSetId: string | number) {
      this.setLoading(true);
      try {
        // TODO: 调用API获取字段列表
        // const res = await http.request('indexSet/getFields', {
        //   params: { index_set_id: indexSetId },
        // });
        // this.updateIndexFieldInfo(res.data);
        console.log('fetchIndexFields', indexSetId);
      } catch (error) {
        console.error('Failed to fetch index fields:', error);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    /**
     * 重置字段信息
     */
    reset() {
      this.indexFieldInfo = {
        fields: [],
        aggs_items: {},
        display_fields: [],
        sort_list: [],
      };
      this.fieldConfig = {
        displayFields: [],
        sortList: [],
        fieldsWidth: {},
      };
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'index-field-store',
        storage: localStorage,
        paths: ['fieldConfig'],
      },
    ],
  },
});
