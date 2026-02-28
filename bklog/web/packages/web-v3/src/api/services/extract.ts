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
 * Extract API 服务
 */
export const extractService = {
  /**
   * getTaskList
   */
  getTaskList: {
    url: '/log_extract/tasks/',
    method: 'get',
  } as ApiConfig,

  /**
   * getTaskDetail
   */
  getTaskDetail: {
    url: '/log_extract/tasks/:id/',
    method: 'get',
  } as ApiConfig,

  /**
   * getTopoIpList
   */
  getTopoIpList: {
    url: '/log_extract/explorer/topo/',
    method: 'get',
  } as ApiConfig,

  /**
   * 文件浏览策略，返回某用户在某业务-某IP 中可访问的目录的文件类型
   */
  getAvailableExplorerPath: {
    url: '/log_extract/explorer/strategies/',
    method: 'post',
  } as ApiConfig,

  /**
   * 预览用户在业务机器中的可下载的文件
   */
  getExplorerList: {
    url: '/log_extract/explorer/list_file/',
    method: 'post',
  } as ApiConfig,

  /**
   * 点击开始下载后创建下载任务
   */
  createDownloadTask: {
    url: '/log_extract/tasks/',
    method: 'post',
  } as ApiConfig,

  /**
   * 点击重新下载
   */
  reDownloadFile: {
    url: '/log_extract/tasks/recreate/',
    method: 'post',
  } as ApiConfig,

  /**
   * 轮询任务状态
   */
  pollingTaskStatus: {
    url: '/log_extract/tasks/polling/',
    method: 'get',
  } as ApiConfig,

  /**
   * 轮询任务状态
   */
  getDownloadUrl: {
    url: '/log_extract/tasks/download/',
    method: 'get',
  } as ApiConfig,

  /**
   * 提取链路接口
   */
  getExtractLinkList: {
    url: '/log_extract/tasks/link_list/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取下载目标主机数量的拓扑树
   */
  trees: {
    url: '/log_extract/explorer/trees/',
    method: 'post',
  } as ApiConfig,

  /**
   * 根据多个拓扑节点与搜索条件批量分页查询所包含的主机信息
   */
  queryHosts: {
    url: '/log_extract/explorer/query_hosts/',
    method: 'post',
  } as ApiConfig,

  /**
   * 根据多个拓扑节点与搜索条件批量分页查询所包含的主机ID信息
   */
  queryHostIdInfos: {
    url: '/log_extract/explorer/query_host_id_infos/',
    method: 'post',
  } as ApiConfig,

  /**
   * getIpListDisplayName
   */
  getIpListDisplayName: {
    url: '/bizs/:bk_biz_id/get_display_name/',
    method: 'post',
  } as ApiConfig,
}
