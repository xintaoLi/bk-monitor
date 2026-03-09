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
import { computed } from 'vue';

import useStore from './use-store';

/**
 * 字段别名请求参数 Composable
 * 用于生成字段别名和排序列表的请求参数
 * @returns 请求参数对象
 */
export default () => {
  const store = useStore();

  /**
   * 字段别名设置
   * 返回包含字段名、查询别名和路径类型的数组
   */
  const alias_settings = computed(() =>
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    (store.state.indexFieldInfo?.fields ?? [])
      .filter((f: any) => f.query_alias)
      .map((f: any) => ({
        field_name: f.field_name,
        query_alias: f.query_alias,
        path_type: f.field_type,
      })),
  );

  /**
   * 排序列表
   * 根据本地排序状态返回不同的排序列表
   */
  const sort_list = computed(() =>
    store.state.localSort
      ? (store.state.indexItem.sort_list ?? [])
      : (store.state.retrieve.catchFieldCustomConfig.sortList ?? []),
  );

  return {
    alias_settings,
    sort_list,
  };
};
