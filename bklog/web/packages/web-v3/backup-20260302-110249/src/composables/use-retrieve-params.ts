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
import { RetrieveUrlResolver } from '@/store/url-resolver';
import { useRoute } from './use-route';
import { useRouter } from './use-router';
import useStore from './use-store';

/**
 * 检索参数管理 Composable
 * 用于管理检索路由参数
 * @returns 参数管理对象
 */
export default () => {
  const store = useStore();
  const route = useRoute();
  const router = useRouter();

  /**
   * 根据关键字和附加信息设置路由参数
   * @param appendToQuery - 要追加到查询参数的对象
   * @returns Promise
   */
  const setRouteParamsByKeywordAndAddition = (appendToQuery: Record<string, any> = {}) => {
    const query = { ...route.query };

    const resolver = new RetrieveUrlResolver({
      keyword: store.getters.retrieveParams.keyword,
      addition: store.getters.retrieveParams.addition,
    });

    Object.assign(query, resolver.resolveParamsToUrl());

    return router.replace({
      query: {
        ...query,
        ...(appendToQuery ?? {}),
      },
    });
  };

  return { setRouteParamsByKeywordAndAddition };
};
