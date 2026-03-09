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
 * Migrate API 服务
 */
export const migrateService = {
  /**
   * 获取采集项列表
   */
  getUpgradeList: {
    url: '/upgrade_record/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取采集项任务日志
   */
  getTaskLog: {
    url: '/upgrade_record/:bkdata_data_id/task_log/',
    method: 'get',
  } as ApiConfig,

  /**
   * 启动迁移任务
   */
  startTask: {
    url: '/upgrade_record/start_task/',
    method: 'post',
  } as ApiConfig,

  /**
   * 获取新老索引信息
   */
  getIndexInfo: {
    url: '/upgrade_record/:bkdata_data_id/index_info/',
    method: 'get',
  } as ApiConfig,

  /**
   * 设置新索引启用日期
   */
  setIndexInfo: {
    url: '/upgrade_record/:bkdata_data_id/set_index_date/',
    method: 'post',
  } as ApiConfig,
}
