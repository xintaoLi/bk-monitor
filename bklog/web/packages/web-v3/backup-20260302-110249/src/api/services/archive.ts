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
 * 归档相关 API 服务
 */
export const archiveService = {
  /**
   * 获取集群快照仓库列表
   */
  getRepositoryList: {
    url: '/databus/storage/list_repository/',
    method: 'get',
  } as ApiConfig,

  /**
   * 新增归档仓库
   */
  createRepository: {
    url: '/meta/esb/create_es_snapshot_repository/',
    method: 'post',
  } as ApiConfig,

  /**
   * 删除归档仓库
   */
  deleteRepository: {
    url: '/meta/esb/delete_es_snapshot_repository/',
    method: 'post',
  } as ApiConfig,

  /**
   * 获取归档列表
   */
  getArchiveList: {
    url: '/databus/archive/',
    method: 'get',
  } as ApiConfig,

  /**
   * 新建归档
   */
  createArchive: {
    url: '/databus/archive/',
    method: 'post',
  } as ApiConfig,

  /**
   * 编辑归档
   */
  editArchive: {
    url: '/databus/archive/:archive_config_id',
    method: 'put',
  } as ApiConfig,

  /**
   * 删除归档
   */
  deleteArchive: {
    url: '/databus/archive/:archive_config_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * 获取归档配置详情
   */
  archiveConfig: {
    url: '/databus/archive/:archive_config_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取回溯列表
   */
  restoreList: {
    url: '/databus/restore/',
    method: 'get',
  } as ApiConfig,

  /**
   * 全量获取归档列表
   */
  getAllArchives: {
    url: '/databus/archive/list_archive/',
    method: 'get',
  } as ApiConfig,

  /**
   * 新建回溯
   */
  createRestore: {
    url: '/databus/restore/',
    method: 'post',
  } as ApiConfig,

  /**
   * 编辑回溯
   */
  editRestore: {
    url: '/databus/restore/:restore_config_id/',
    method: 'put',
  } as ApiConfig,

  /**
   * 删除回溯
   */
  deleteRestore: {
    url: '/databus/restore/:restore_config_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * 异步获取回溯状态
   */
  getRestoreStatus: {
    url: '/databus/restore/batch_get_state/',
    method: 'post',
  } as ApiConfig,
}
