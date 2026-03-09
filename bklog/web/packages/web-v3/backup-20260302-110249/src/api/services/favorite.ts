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
 * Favorite API 服务
 */
export const favoriteService = {
  /**
   * getFavorite
   */
  getFavorite: {
    url: '/search/favorite/:id/',
    method: 'get',
  } as ApiConfig,

  /**
   * getFavoriteList
   */
  getFavoriteList: {
    url: '/search/favorite/',
    method: 'get',
  } as ApiConfig,

  /**
   * getFavoriteByGroupList
   */
  getFavoriteByGroupList: {
    url: '/search/favorite/list_by_group/',
    method: 'get',
  } as ApiConfig,

  /**
   * createFavorite
   */
  createFavorite: {
    url: '/search/favorite/',
    method: 'post',
  } as ApiConfig,

  /**
   * updateFavorite
   */
  updateFavorite: {
    url: '/search/favorite/:id/',
    method: 'put',
  } as ApiConfig,

  /**
   * deleteFavorite
   */
  deleteFavorite: {
    url: '/search/favorite/:favorite_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * getGroupList
   */
  getGroupList: {
    url: '/search/favorite_group/',
    method: 'get',
  } as ApiConfig,

  /**
   * createGroup
   */
  createGroup: {
    url: '/search/favorite_group/',
    method: 'post',
  } as ApiConfig,

  /**
   * updateGroupName
   */
  updateGroupName: {
    url: '/search/favorite_group/:group_id/',
    method: 'put',
  } as ApiConfig,

  /**
   * deleteGroup
   */
  deleteGroup: {
    url: '/search/favorite_group/:group_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * getSearchFields
   */
  getSearchFields: {
    url: '/search/favorite/get_search_fields/',
    method: 'post',
  } as ApiConfig,

  /**
   * getGenerateQuery
   */
  getGenerateQuery: {
    url: '/search/favorite/generate_query/',
    method: 'post',
  } as ApiConfig,

  /**
   * batchFavoriteUpdate
   */
  batchFavoriteUpdate: {
    url: '/search/favorite/batch_update/',
    method: 'post',
  } as ApiConfig,

  /**
   * batchFavoriteDelete
   */
  batchFavoriteDelete: {
    url: '/search/favorite/batch_delete/',
    method: 'post',
  } as ApiConfig,

  /**
   * groupUpdateOrder
   */
  groupUpdateOrder: {
    url: '/search/favorite_group/update_order/',
    method: 'post',
  } as ApiConfig,

  /**
   * checkKeywords
   */
  checkKeywords: {
    url: '/search/favorite/inspect/',
    method: 'post',
  } as ApiConfig,
}
