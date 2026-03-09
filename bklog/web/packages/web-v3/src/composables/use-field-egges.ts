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

import { useIndexFieldStore } from '@/stores';
import http from '@/api';

/**
 * 字段聚合管理 Composable
 * 用于管理字段聚合数据的获取和缓存
 * @param options - 配置项
 * @returns 字段聚合管理对象
 */
export default ({ indexSetId }: { indexSetId: string | number }) => {
  const indexFieldStore = useIndexFieldStore();

  /**
   * 获取字段聚合数据
   * @param fieldName - 字段名
   * @param queryString - 查询字符串
   * @param addition - 附加参数
   * @returns 聚合数据列表
   */
  const getFieldEgges = async (
    fieldName: string,
    queryString: string = '*',
    addition: any[] = [],
  ): Promise<any[]> => {
    try {
      // 检查缓存
      const cachedData = indexFieldStore.indexFieldInfo.aggs_items[fieldName];
      if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
        return cachedData;
      }

      // 请求新数据
      const params = {
        index_set_id: indexSetId,
        field_name: fieldName,
        query_string: queryString,
        addition,
      };

      const resp = await http.request('retrieve/getFieldAggs', {
        query: params,
      });

      if (resp?.data?.aggs_items) {
        // 更新到 store
        indexFieldStore.updateIndexFieldEggsItems(resp.data.aggs_items);
        return resp.data.aggs_items[fieldName] || [];
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch field aggregations:', error);
      return [];
    }
  };

  /**
   * 清除字段聚合缓存
   * @param fieldName - 字段名，如果不传则清除所有
   */
  const clearFieldEggesCache = (fieldName?: string) => {
    if (fieldName) {
      const aggsItems = { ...indexFieldStore.indexFieldInfo.aggs_items };
      delete aggsItems[fieldName];
      indexFieldStore.updateIndexFieldEggsItems(aggsItems);
    } else {
      indexFieldStore.updateIndexFieldEggsItems({});
    }
  };

  return {
    getFieldEgges,
    clearFieldEggesCache,
  };
};
