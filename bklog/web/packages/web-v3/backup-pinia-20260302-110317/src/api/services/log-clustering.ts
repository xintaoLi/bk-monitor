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
 * Log Clustering API 服务
 */
export const logClusteringService = {
  /**
   * getConfig
   */
  getConfig: {
    url: '/clustering_config/:index_set_id/config/',
    method: 'get',
  } as ApiConfig,

  /**
   * getDefaultConfig
   */
  getDefaultConfig: {
    url: '/clustering_config/default_config/',
    method: 'get',
  } as ApiConfig,

  /**
   * debug
   */
  debug: {
    url: '/clustering_config/debug/',
    method: 'post',
  } as ApiConfig,

  /**
   * 格式化后的日志模式（包含占位符如 #NUMBER#）
  origin_pattern: string; // 原始日志模式
  remark: any[]; // 备注信息（数组类型，具体结构未知）
  owners: Ref<any[]>; // 负责人列表（数组类型，具体结构未知）
  count: number; // 该模式出现的次数
  signature: string; // 模式签名（唯一标识符）
  percentage: number; // 占比（如 10.00168170960309 表示 10.00%）
  is_new_class: boolean; // 是否为新类别
  origin_log: string; // 原始日志
  year_on_year_count: number; // 同比数量
  year_on_year_percentage: number; // 同比百分比
  group: string[]; // 分组信息（包含主机ID、云ID、日志路径、服务器IP等）
  strategy_id: number; // 关联的策略ID
  strategy_enabled: boolean; // 策略是否启用
  id: number; // 前端加的唯一标识
}
   */
  clusterSearch: {
    url: '/pattern/:index_set_id/search/',
    method: 'post',
  } as ApiConfig,

  /**
   * closeClean
   */
  closeClean: {
    url: '/databus/collectors/:collector_config_id/close_clean/',
    method: 'post',
  } as ApiConfig,

  /**
   * updateStrategies
   */
  updateStrategies: {
    url: '/clustering_monitor/:index_set_id/update_strategies/',
    method: 'post',
  } as ApiConfig,

  /**
   * getFingerLabels
   */
  getFingerLabels: {
    url: '/pattern/:index_set_id/labels/',
    method: 'post',
  } as ApiConfig,

  /**
   * updateNewClsStrategy
   */
  updateNewClsStrategy: {
    url: '/clustering_monitor/:index_set_id/update_new_cls_strategy/',
    method: 'post',
  } as ApiConfig,

  /**
   * checkRegexp
   */
  checkRegexp: {
    url: '/clustering_config/check_regexp/',
    method: 'post',
  } as ApiConfig,

  /**
   * 设置备注
   */
  setRemark: {
    url: '/pattern/:index_set_id/remark/ ',
    method: 'post',
  } as ApiConfig,

  /**
   * 更新备注
   */
  updateRemark: {
    url: '/pattern/:index_set_id/update_remark/ ',
    method: 'put',
  } as ApiConfig,

  /**
   * 删除备注
   */
  deleteRemark: {
    url: '/pattern/:index_set_id/delete_remark/ ',
    method: 'delete',
  } as ApiConfig,

  /**
   * 设置负责人
   */
  setOwner: {
    url: '/pattern/:index_set_id/owner/',
    method: 'post',
  } as ApiConfig,

  /**
   * 获取当前pattern所有负责人列表
   */
  getOwnerList: {
    url: '/pattern/:index_set_id/list_owners/',
    method: 'get',
  } as ApiConfig,

  /**
   * 第一次进数据指纹时候的分组
   */
  updateInitGroup: {
    url: '/pattern/:index_set_id/group_fields/',
    method: 'post',
  } as ApiConfig,

  /**
   * 看起来是经过编码的字符串（可能是base64或其他编码）
  related_index_set_list: {
    index_set_id: number;
    index_set_name: string;
  }[];
}

// 模板列表
   */
  ruleTemplate: {
    url: '/regex_template/?space_uid=:space_uid',
    method: 'get',
  } as ApiConfig,

  /**
   * 创建模板
   */
  createTemplate: {
    url: '/regex_template/',
    method: 'post',
  } as ApiConfig,

  /**
   * 更新模板（名称）
   */
  updateTemplateName: {
    url: '/regex_template/:regex_template_id/',
    method: 'patch',
  } as ApiConfig,

  /**
   * 删除模板
   */
  deleteTemplate: {
    url: '/regex_template/:regex_template_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * 日志聚类-告警策略开关
   */
  updatePatternStrategy: {
    url: '/pattern/:index_set_id/pattern_strategy/',
    method: 'post',
  } as ApiConfig,
}
