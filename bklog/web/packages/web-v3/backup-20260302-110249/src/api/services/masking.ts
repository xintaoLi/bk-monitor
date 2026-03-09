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
 * Masking API 服务
 */
export const maskingService = {
  /**
   * getDesensitize
   */
  getDesensitize: {
    url: 'desensitize/rule/:rule_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * desensitizeDebug
   */
  desensitizeDebug: {
    url: '/desensitize/rule/debug/',
    method: 'post',
  } as ApiConfig,

  /**
   * getMaskingConfig
   */
  getMaskingConfig: {
    url: '/index_set/:index_set_id/desensitize/config/retrieve/',
    method: 'get',
  } as ApiConfig,

  /**
   * getMaskingSearchStr
   */
  getMaskingSearchStr: {
    url: '/search/index_set/:index_set_id/search/original/',
    method: 'post',
  } as ApiConfig,

  /**
   * getConfigPreview
   */
  getConfigPreview: {
    url: '/desensitize/rule/preview/',
    method: 'post',
  } as ApiConfig,

  /**
   * matchMaskingRule
   */
  matchMaskingRule: {
    url: '/desensitize/rule/match/',
    method: 'post',
  } as ApiConfig,

  /**
   * getMaskingRuleList
   */
  getMaskingRuleList: {
    url: '/desensitize/rule/?space_uid=:space_uid&rule_type=:rule_type',
    method: 'get',
  } as ApiConfig,

  /**
   * deleteRule
   */
  deleteRule: {
    url: '/desensitize/rule/:rule_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * startDesensitize
   */
  startDesensitize: {
    url: '/desensitize/rule/:rule_id/start/',
    method: 'post',
  } as ApiConfig,

  /**
   * stopDesensitize
   */
  stopDesensitize: {
    url: '/desensitize/rule/:rule_id/stop/',
    method: 'post',
  } as ApiConfig,

  /**
   * updateDesensitize
   */
  updateDesensitize: {
    url: '/desensitize/rule/:rule_id/',
    method: 'put',
  } as ApiConfig,

  /**
   * createDesensitize
   */
  createDesensitize: {
    url: '/desensitize/rule/',
    method: 'post',
  } as ApiConfig,

  /**
   * createDesensitizeConfig
   */
  createDesensitizeConfig: {
    url: '/index_set/:index_set_id/desensitize/config/create/',
    method: 'post',
  } as ApiConfig,

  /**
   * updateDesensitizeConfig
   */
  updateDesensitizeConfig: {
    url: '/index_set/:index_set_id/desensitize/config/update/',
    method: 'put',
  } as ApiConfig,

  /**
   * deleteDesensitizeConfig
   */
  deleteDesensitizeConfig: {
    url: '/index_set/:index_set_id/desensitize/config/delete/',
    method: 'delete',
  } as ApiConfig,

  /**
   * getDesensitizeState
   */
  getDesensitizeState: {
    url: '/index_set/desensitize/config/state/',
    method: 'post',
  } as ApiConfig,
}
