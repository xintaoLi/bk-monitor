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
 * 业务领域类型定义
 */

import type { ID, Timestamp, TimeString } from './common'

/**
 * 空间类型
 */
export type SpaceType = 'bkcc' | 'bcs' | 'bkci' | 'bksaas' | 'default'

/**
 * 空间信息
 */
export interface Space {
  /** 空间 ID */
  id: number
  /** 空间 UID */
  space_uid: string
  /** 空间 ID（字符串） */
  space_id: string
  /** 空间名称 */
  space_name: string
  /** 空间类型 ID */
  space_type_id: SpaceType
  /** 空间类型名称 */
  space_type_name: string
  /** 空间代码 */
  space_code: string
  /** 时区 */
  time_zone: string
  /** 语言 */
  language: string
  /** 是否默认空间 */
  is_default?: boolean
  /** 创建时间 */
  created_at?: TimeString
  /** 更新时间 */
  updated_at?: TimeString
}

/**
 * 业务信息
 */
export interface Biz {
  /** 业务 ID */
  bk_biz_id: number
  /** 业务名称 */
  bk_biz_name: string
  /** 是否停用 */
  is_disabled?: boolean
  /** 运维人员 */
  maintainer?: string[]
  /** 开发人员 */
  developer?: string[]
}

/**
 * 用户信息
 */
export interface User {
  /** 用户名 */
  username: string
  /** 中文名 */
  chinese_name: string
  /** 电话 */
  phone?: string
  /** 邮箱 */
  email?: string
  /** 角色 */
  role?: string[]
  /** 时区 */
  time_zone?: string
  /** 语言 */
  language?: string
}

/**
 * 索引集场景
 */
export type IndexSetScenario = 'log' | 'bkdata' | 'es' | 'custom'

/**
 * 索引集状态
 */
export type IndexSetStatus = 'normal' | 'preparing' | 'empty'

/**
 * 索引集信息
 */
export interface IndexSet {
  /** 索引集 ID */
  index_set_id: number
  /** 索引集名称 */
  index_set_name: string
  /** 空间 UID */
  space_uid: string
  /** 业务 ID */
  bk_biz_id?: number
  /** 场景 ID */
  scenario_id: IndexSetScenario
  /** 场景名称 */
  scenario_name: string
  /** 存储集群 ID */
  storage_cluster_id: number
  /** 存储集群名称 */
  storage_cluster_name?: string
  /** 时间字段 */
  time_field: string
  /** 时间字段类型 */
  time_field_type: string
  /** 时间字段单位 */
  time_field_unit: string
  /** 索引列表 */
  indexes?: Index[]
  /** 字段列表 */
  fields?: Field[]
  /** 标签 */
  tags?: string[]
  /** 是否收藏 */
  is_favorite?: boolean
  /** 状态 */
  status?: IndexSetStatus
  /** 创建人 */
  created_by?: string
  /** 创建时间 */
  created_at?: TimeString
  /** 更新人 */
  updated_by?: string
  /** 更新时间 */
  updated_at?: TimeString
}

/**
 * 索引信息
 */
export interface Index {
  /** 索引 ID */
  index_id?: string
  /** 索引名称 */
  index: string
  /** 存储集群 ID */
  storage_cluster_id: number
  /** 时间字段 */
  time_field: string
  /** 应用时间 */
  apply_time?: TimeString
}

/**
 * 字段类型
 */
export type FieldType =
  | 'text'
  | 'keyword'
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'date'
  | 'boolean'
  | 'nested'
  | 'object'
  | 'ip'
  | 'geo_point'
  | '__virtual__'

/**
 * 字段信息
 */
export interface Field {
  /** 字段名 */
  field_name: string
  /** 字段类型 */
  field_type: FieldType
  /** 字段别名 */
  field_alias: string
  /** 是否显示 */
  is_display: boolean
  /** 是否可编辑 */
  is_editable: boolean
  /** 是否可分析 */
  is_analyzed?: boolean
  /** 标签 */
  tag: string
  /** ES doc_values */
  es_doc_values: boolean
  /** 过滤展开 */
  filterExpand?: boolean
  /** 描述 */
  description?: string
}

/**
 * 采集器状态
 */
export type CollectorStatus = 'running' | 'stopped' | 'preparing' | 'failed'

/**
 * 采集器类型
 */
export type CollectorType = 'log' | 'winlog' | 'syslog' | 'snmp_trap' | 'custom'

/**
 * 采集器信息
 */
export interface Collector {
  /** 采集器配置 ID */
  collector_config_id: number
  /** 采集器名称（英文） */
  collector_config_name: string
  /** 采集器名称（中文） */
  collector_config_name_en: string
  /** 业务 ID */
  bk_biz_id: number
  /** 采集类型 */
  collector_scenario_id: CollectorType
  /** 采集目标 */
  target_nodes?: any[]
  /** 采集插件 */
  collector_plugin_id: string
  /** 采集配置 */
  params?: any
  /** 数据 ID */
  bk_data_id?: number
  /** 订阅 ID */
  subscription_id?: number
  /** 任务 ID */
  task_id_list?: string[]
  /** 索引集 ID */
  index_set_id?: number
  /** 状态 */
  status?: CollectorStatus
  /** 是否启用 */
  is_active?: boolean
  /** 创建人 */
  created_by?: string
  /** 创建时间 */
  created_at?: TimeString
  /** 更新人 */
  updated_by?: string
  /** 更新时间 */
  updated_at?: TimeString
}

/**
 * 日志记录
 */
export interface LogRecord {
  /** 日志时间 */
  dtEventTimeStamp?: Timestamp
  /** 日志时间字符串 */
  time?: TimeString
  /** 索引名 */
  _index?: string
  /** 文档 ID */
  _id?: string
  /** 原始日志 */
  log?: string
  /** 服务器 IP */
  serverIp?: string
  /** 日志路径 */
  path?: string
  /** 迭代 ID */
  iterationIndex?: number
  /** 高亮字段 */
  __highlight__?: Record<string, string[]>
  /** 其他字段 */
  [key: string]: any
}

/**
 * 检索查询参数
 */
export interface SearchParams {
  /** 空间 UID */
  space_uid: string
  /** 业务 ID */
  bk_biz_id: number
  /** 索引集 ID */
  index_set_id: number
  /** 关键词 */
  keyword: string
  /** 开始时间 */
  start_time: string
  /** 结束时间 */
  end_time: string
  /** 时间范围 */
  time_range?: string
  /** 主机范围 */
  host_scopes?: any
  /** 附加条件 */
  addition?: any[]
  /** 起始位置 */
  begin?: number
  /** 返回数量 */
  size?: number
  /** 聚合条件 */
  aggs?: any
  /** 高亮配置 */
  highlight?: any
  /** IP 列表 */
  ip_list?: string[]
  /** 排序字段 */
  sort_list?: Array<[string, string]>
}

/**
 * 检索结果
 */
export interface SearchResult {
  /** 总数 */
  total: number
  /** 耗时（毫秒） */
  took: number
  /** 日志列表 */
  list: LogRecord[]
  /** 聚合结果 */
  aggs?: any
  /** 原始日志列表 */
  origin_log_list?: any[]
  /** 滚动 ID */
  scroll_id?: string
}

/**
 * 归档配置
 */
export interface ArchiveConfig {
  /** 归档配置 ID */
  archive_config_id: number
  /** 归档配置名称 */
  archive_config_name: string
  /** 索引集 ID */
  index_set_id: number
  /** 仓库名称 */
  snapshot_repository_name: string
  /** 保留天数 */
  snapshot_days: number
  /** 是否启用 */
  is_enable: boolean
  /** 创建人 */
  created_by?: string
  /** 创建时间 */
  created_at?: TimeString
}

/**
 * 仪表盘配置
 */
export interface Dashboard {
  /** 仪表盘 ID */
  dashboard_id: string
  /** 仪表盘标题 */
  title: string
  /** 仪表盘 UID */
  uid: string
  /** 文件夹 ID */
  folder_id?: number
  /** 文件夹名称 */
  folder_title?: string
  /** 标签 */
  tags?: string[]
  /** 创建时间 */
  created?: TimeString
  /** 更新时间 */
  updated?: TimeString
}
