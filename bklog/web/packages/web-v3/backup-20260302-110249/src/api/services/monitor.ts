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
 * Monitor API 服务
 */
export const monitorService = {
  /**
   * 监控策略列表
   */
  list: {
    url: '/monitor/policy/',
    method: 'get',
  } as ApiConfig,

  /**
   * 创建监控策略
   */
  create: {
    url: '/monitor/policy/',
    method: 'post',
  } as ApiConfig,

  /**
   * 删除监控策略
   */
  remove: {
    url: '/monitor/policy/:policy_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * 监控策略启动
   */
  start: {
    url: '/monitor/policy/:policy_id/start/',
    method: 'post',
  } as ApiConfig,

  /**
   * 监控策略停止
   */
  stop: {
    url: '/monitor/policy/:policy_id/stop/',
    method: 'post',
  } as ApiConfig,

  /**
   * 编辑监控策略
   */
  updata: {
    url: '/monitor/policy/:policy_id/',
    method: 'put',
  } as ApiConfig,

  /**
   * 监控策略详情
   */
  particulars: {
    url: '/monitor/policy/:policy_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取监控类型列表
   */
  type: {
    url: '/monitor/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取告警等级
   */
  levels: {
    url: '/monitor/alarm/levels/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取告警记录
   */
  alarm: {
    url: '/monitor/alarm/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取屏蔽策略列表
   */
  shields: {
    url: '/monitor/shields/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取屏蔽类型
   */
  shieldsType: {
    url: '/monitor/shields/type/',
    method: 'get',
  } as ApiConfig,

  /**
   * 新增屏蔽策略
   */
  addShields: {
    url: '/monitor/shields/',
    method: 'post',
  } as ApiConfig,

  /**
   * 删除屏蔽策略
   */
  removeShields: {
    url: '/monitor/shields/:shield_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * 获取屏蔽策略详情
   */
  shieldsInfo: {
    url: '/monitor/shields/:shield_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 更新屏蔽策略
   */
  updateShields: {
    url: '/monitor/shields/:shield_id/',
    method: 'put',
  } as ApiConfig,

  /**
   * 获取索引集
   */
  index: {
    url: '/monitor/index_set/',
    method: 'get',
  } as ApiConfig,
}
