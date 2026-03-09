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
 * Index Set API 服务
 */
export const indexSetService = {
  /**
   * 索引集列表
   */
  list: {
    url: '/index_set/',
    method: 'get',
  } as ApiConfig,

  /**
   * 索引集详情
   */
  info: {
    url: '/index_set/:index_set_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 创建索引集
   */
  create: {
    url: '/index_set/',
    method: 'post',
  } as ApiConfig,

  /**
   * 更新索引集
   */
  update: {
    url: '/index_set/:index_set_id/',
    method: 'put',
  } as ApiConfig,

  /**
   * 删除索引集
   */
  remove: {
    url: '/index_set/:index_set_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * 索引列表
   */
  index: {
    url: '/index_set/:index_set_id/index/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集索引列表
   */
  indexes: {
    url: '/index_set/:index_set_id/indices/',
    method: 'get',
  } as ApiConfig,

  /**
   * getSpaceByIndexId
   */
  getSpaceByIndexId: {
    url: '/index_set/:index_set_id/space/',
    method: 'get',
  } as ApiConfig,

  /**
   * 创建索引
   */
  createIndex: {
    url: '/index_set/:index_set_id/index/',
    method: 'get',
  } as ApiConfig,

  /**
   * 删除索引
   */
  removeIndex: {
    url: '/index_set/:index_set_id/index/:index_id/',
    method: 'post',
  } as ApiConfig,

  /**
   * 标记索引集为收藏索引集
   */
  mark: {
    url: '/index_set/:index_set_id/mark_favorite/',
    method: 'post',
  } as ApiConfig,

  /**
   * 取消标记为收藏索引集
   */
  cancelMark: {
    url: '/index_set/:index_set_id/cancel_favorite/',
    method: 'post',
  } as ApiConfig,

  /**
   * 使用次数趋势
   */
  getIndexTimes: {
    url: '/admin/index_set/:index_set_id/history/date_histogram/',
    method: 'get',
  } as ApiConfig,

  /**
   * 用户使用频次
   */
  getIndexFrequency: {
    url: '/admin/index_set/:index_set_id/history/user_terms/',
    method: 'get',
  } as ApiConfig,

  /**
   * 检索耗时统计
   */
  getIndexSpent: {
    url: '/admin/index_set/:index_set_id/history/duration_terms/',
    method: 'get',
  } as ApiConfig,

  /**
   * 检索记录（表格）
   */
  getIndexHistory: {
    url: '/admin/index_set/:index_set_id/history/',
    method: 'get',
  } as ApiConfig,
}
