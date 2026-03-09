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

/**
 * API Services 统一导出
 */

export * from './alert-strategy'
export * from './archive'
export * from './auth'
export * from './authorization'
export * from './biz'
export * from './clean'
export * from './collect'
export * from './container'
export * from './custom'
export * from './dashboard'
export * from './docs'
export * from './example'
export * from './extract'
export * from './extract-manage'
export * from './favorite'
export * from './graph-analysis'
export * from './index-set'
export * from './ip-chooser'
export * from './link-configuration'
export * from './log-clustering'
export * from './masking'
export * from './meta'
export * from './migrate'
export * from './monitor'
export * from './new-report'
export * from './particulars'
export * from './plugins'
export * from './project'
export * from './result-tables'
export * from './retrieve'
export * from './source'
export * from './union-search'
export * from './user-info'

/**
 * 通用 API 配置
 */
import type { ApiConfig } from '@/types/api'

/**
 * 项目相关 API
 */
export const projectApi = {
  /**
   * 获取我的项目列表
   */
  getMyProjectList: {
    url: '/meta/projects/mine/',
    method: 'get',
  } as ApiConfig,
}

/**
 * 空间相关 API
 */
export const spaceApi = {
  /**
   * 获取我的空间列表
   */
  getMySpaceList: {
    url: '/meta/spaces/mine/',
    method: 'get',
  } as ApiConfig,
}

/**
 * 上报相关 API
 */
export const reportApi = {
  /**
   * 前端事件上报
   */
  frontendEventReport: {
    url: '/frontend_event/report/',
    method: 'post',
  } as ApiConfig,
}
