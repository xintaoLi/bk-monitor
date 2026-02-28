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
 * Source API 服务
 */
export const sourceService = {
  /**
   * list
   */
  list: {
    url: '/databus/storage/',
    method: 'get',
  } as ApiConfig,

  /**
   * logList
   */
  logList: {
    url: '/databus/storage/log_cluster/',
    method: 'get',
  } as ApiConfig,

  /**
   * scenario
   */
  scenario: {
    url: '/meta/scenario/',
    method: 'get',
  } as ApiConfig,

  /**
   * create
   */
  create: {
    url: '/databus/storage/?bk_biz_id=:bk_biz_id',
    method: 'post',
  } as ApiConfig,

  /**
   * getProperty
   */
  getProperty: {
    url: '/bizs/get_property/',
    method: 'get',
  } as ApiConfig,

  /**
   * deleteEs
   */
  deleteEs: {
    url: '/databus/storage/:cluster_id/?bk_biz_id=:bk_biz_id',
    method: 'delete',
  } as ApiConfig,

  /**
   * remove
   */
  remove: {
    url: '/source/:source_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * update
   */
  update: {
    url: '/databus/storage/:cluster_id/?bk_biz_id=:bk_biz_id',
    method: 'put',
  } as ApiConfig,

  /**
   * info
   */
  info: {
    url: '/databus/storage/:cluster_id/?bk_biz_id=:bk_biz_id',
    method: 'get',
  } as ApiConfig,

  /**
   * connectivityDetect
   */
  connectivityDetect: {
    url: '/esb/databus/storage/connectivity_detect/',
    method: 'post',
  } as ApiConfig,

  /**
   * 连通性测试之后获取集群中各节点属性
   */
  getNodeAttrs: {
    url: '/databus/storage/node_attrs/',
    method: 'post',
  } as ApiConfig,

  /**
   * connectionStatus
   */
  connectionStatus: {
    url: '/databus/storage/batch_connectivity_detect/',
    method: 'post',
  } as ApiConfig,

  /**
   * 数据采集相关接口
   */
  getCollectList: {
    url: '/databus/collectors/',
    method: 'get',
  } as ApiConfig,

  /**
   * getCollectStatus
   */
  getCollectStatus: {
    url: '/databus/collectors/batch_subscription_status/',
    method: 'get',
  } as ApiConfig,

  /**
   * createCollection
   */
  createCollection: {
    url: '/databus/storage/',
    method: 'post',
  } as ApiConfig,

  /**
   * deleteCollection
   */
  deleteCollection: {
    url: '/collectors/:collector_config_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * startCollection
   */
  startCollection: {
    url: '/collectors/:collector_config_id/start/',
    method: 'post',
  } as ApiConfig,

  /**
   * stopCollection
   */
  stopCollection: {
    url: '/collectors/:collector_config_id/stop/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集下发 列表&轮询共用同一接口
   */
  getIssuedClusterList: {
    url: '/databus/collectors/:collector_config_id/task_status/',
    method: 'get',
  } as ApiConfig,

  /**
   * detailsList
   */
  detailsList: {
    url: '/databus/collectors/:collector_config_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 物理索引
   */
  getIndexes: {
    url: '/databus/collectors/:collector_config_id/indices_info/',
    method: 'get',
  } as ApiConfig,

  /**
   * collectList
   */
  collectList: {
    url: '/databus/collectors/:collector_config_id/subscription_status/',
    method: 'get',
  } as ApiConfig,

  /**
   * retryList
   */
  retryList: {
    url: '/databus/collectors/:collector_config_id/retry/',
    method: 'post',
  } as ApiConfig,

  /**
   * dataList
   */
  dataList: {
    url: '/esb/databus/collectors/:collector_config_id/tail/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集下发 - 重试
   */
  issuedRetry: {
    url: '/databus/collectors/:collector_config_id/subscription_run/',
    method: 'post',
  } as ApiConfig,

  /**
   * es集群
   */
  getEsList: {
    url: '/databus/storage/cluster_groups',
    method: 'get',
  } as ApiConfig,
}
