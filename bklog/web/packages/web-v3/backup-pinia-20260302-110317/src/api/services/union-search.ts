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

import type { ApiConfig } from '@/types/api'

/**
 * Union Search API 服务
 */
export const unionSearchService = {
  /**
   * unionSearch
   */
  unionSearch: {
    url: '/search/index_set/union_search/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionMapping
   */
  unionMapping: {
    url: '/search/index_set/union_search/fields/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionDateHistogram
   */
  unionDateHistogram: {
    url: '/search/index_set/aggs/union_search/date_histogram/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionExport
   */
  unionExport: {
    url: '/search/index_set/union_search/export/',
    method: 'get',
  } as ApiConfig,

  /**
   * unionExportHistory
   */
  unionExportHistory: {
    url: '/search/index_set/union_search/export_history/?bk_biz_id=:bk_biz_id&page=:page&pagesize=:pagesize&show_all=:show_all&index_set_ids=:index_set_ids',
    method: 'get',
  } as ApiConfig,

  /**
   * unionSearchHistory
   */
  unionSearchHistory: {
    url: '/search/index_set/union_search/history/?index_set_ids=:index_set_ids',
    method: 'get',
  } as ApiConfig,

  /**
   * unionLabelList
   */
  unionLabelList: {
    url: '/index_set/tag/list/',
    method: 'get',
  } as ApiConfig,

  /**
   * unionCreateLabel
   */
  unionCreateLabel: {
    url: '/index_set/tag/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionAddLabel
   */
  unionAddLabel: {
    url: '/index_set/:index_set_id/tag/add/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionDeleteLabel
   */
  unionDeleteLabel: {
    url: '/index_set/:index_set_id/tag/delete/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionCreateFavorite
   */
  unionCreateFavorite: {
    url: '/search/favorite_union/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionDeleteFavorite
   */
  unionDeleteFavorite: {
    url: '/search/favorite_union/:favorite_union_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * unionFavoriteList
   */
  unionFavoriteList: {
    url: '/search/favorite_union/?space_uid=:space_uid',
    method: 'get',
  } as ApiConfig,

  /**
   * unionHistoryList
   */
  unionHistoryList: {
    url: '/search/index_set/option/history/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionDeleteHistory
   */
  unionDeleteHistory: {
    url: '/search/index_set/option/history/delete/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionTerms
   */
  unionTerms: {
    url: '/search/index_set/aggs/union_search/terms/',
    method: 'post',
  } as ApiConfig,
}
