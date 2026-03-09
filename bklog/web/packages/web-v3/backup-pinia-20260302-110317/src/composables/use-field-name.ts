/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 *
 * License for 蓝鲸智云PaaS平台 (BlueKing PaaS):
 *
 * ---------------------------------------------------
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import type { Store } from 'vuex';
import type { BK_LOG_STORAGE, FieldInfoItem } from '../store/store.type';

/**
 * 根据字段信息返回别名
 * @param field - 字段信息
 * @param store - Vuex Store 实例
 * @returns 返回别名，如果没有别名则返回字段名
 */
export const getFieldNameByField = (field: any, store: Store<any>) => {
  if (store.state.storage[BK_LOG_STORAGE.SHOW_FIELD_ALIAS]) {
    return field.query_alias || field.field_name;
  }

  return field.field_name;
};

/**
 * 字段名管理 Composable
 * 用于管理字段名称和别名的转换
 * @param options - 配置项
 * @returns 字段名管理对象
 */
export default ({ store }: { store: Store<any> }) => {
  /**
   * 根据字段名返回别名
   * @param name - 字段名 field_name
   * @returns 返回别名，如果没有别名则返回字段名
   */
  const getFieldName = (name: string) => {
    if (store.state.storage[BK_LOG_STORAGE.SHOW_FIELD_ALIAS]) {
      const field = store.state.indexFieldInfo.fields.filter((item: any) => item.field_name === name);
      return field[0]?.query_alias || name;
    }
    return name;
  };

  const mGetFieldNameByField = (field: { field_name: string; query_alias: string }) => {
    return getFieldNameByField(field, store);
  };

  /**
   * 根据字段列表返回别名数组
   * @param fields - 字段列表
   * @returns 返回别名数组，如果没有别名则返回字段名
   */
  const getFieldNames = (fields: any[]) => {
    if (store.state.storage[BK_LOG_STORAGE.SHOW_FIELD_ALIAS]) {
      return fields.map(fieldInfo => fieldInfo.query_alias || fieldInfo.field_name);
    }
    return fields.map(fieldInfo => fieldInfo.field_name);
  };

  /**
   * 根据字段信息返回拼接字段名
   * @param fields - 字段信息
   * @returns 返回拼接字段名
   */
  const getConcatenatedFieldName = (fields: any) => {
    const { field_name: id, field_alias: alias, query_alias: query } = fields;
    if (store.state.storage[BK_LOG_STORAGE.SHOW_FIELD_ALIAS] && query) {
      return { id, name: `${query}(${alias || id})` };
    }
    return { id, name: alias ? `${id}(${alias})` : id };
  };

  /**
   * 根据字段信息返回别名
   * @param field - 字段信息
   * @returns 返回别名
   */
  const getQueryAlias = (field: any) => {
    return store.state.storage[BK_LOG_STORAGE.SHOW_FIELD_ALIAS]
      ? field.query_alias || field.field_name
      : field.field_name;
  };

  const getFieldList = (withAliasFieldMap = false) => {
    if (withAliasFieldMap) {
      return store.state.indexFieldInfo.fields;
    }

    return store.state.indexFieldInfo.fields.filter((field: any) => !field.is_virtual_alias_field);
  };

  /**
   * 根据别名返回字段名
   * @param name - 别名 query_alias
   * @param list - 字段列表
   * @param withAliasFieldMap - 是否包含别名字段映射
   * @returns 返回字段名，如果没有字段名则返回别名
   */
  const changeFieldName = (name: string, list?: FieldInfoItem[], withAliasFieldMap = false) => {
    const field = (list || getFieldList(withAliasFieldMap)).filter((item: any) => item.query_alias === name);
    return field[0]?.field_name || name;
  };

  /**
   * 根据字段名返回拼接字段名
   * @param fieldName - 字段名 field_name
   * @param list - 字段列表
   * @param withAliasFieldMap - 是否包含别名字段映射
   * @returns 返回拼接字段名
   */
  const getQualifiedFieldName = (fieldName: string, list?: FieldInfoItem[], withAliasFieldMap = false) => {
    const field = (list || getFieldList(withAliasFieldMap)).filter((item: any) => item.field_name === fieldName);
    if (field[0]?.query_alias) {
      return `${field[0].query_alias}(${fieldName})`;
    }
    return fieldName;
  };

  /**
   * 根据字段名返回拼接字段名及属性
   * @param fieldName - 字段名
   * @param list - 字段列表
   * @param withAliasFieldMap - 是否包含别名字段映射
   * @param attrs - 属性列表
   * @returns 返回包含字段名和属性的对象
   */
  const getQualifiedFieldAttrs = (
    fieldName: string,
    list?: FieldInfoItem[],
    withAliasFieldMap = false,
    attrs: string[] = [],
  ) => {
    const field = (list || getFieldList(withAliasFieldMap)).find((item: any) => item.field_name === fieldName);
    const reduceFn = (acc: Record<string, any>, attr: string) => {
      if (attr !== 'field_name') {
        acc[attr] = (field as any)?.[attr];
      }
      return acc;
    };
    if (field?.query_alias) {
      return attrs.reduce(reduceFn, { field_name: `${field.query_alias}(${fieldName})` });
    }
    return attrs.reduce(reduceFn, { field_name: fieldName });
  };

  return {
    getFieldName,
    getFieldNames,
    getConcatenatedFieldName,
    getQueryAlias,
    changeFieldName,
    getFieldNameByField: mGetFieldNameByField,
    getQualifiedFieldName,
    getQualifiedFieldAttrs,
  };
};
