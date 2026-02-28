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
 * HTTP 请求方法
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options'

/**
 * API 配置接口
 */
export interface ApiConfig {
  /** API 端点 URL */
  url: string
  /** HTTP 请求方法 */
  method: HttpMethod
  /** 是否需要身份验证 */
  auth?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 响应类型 */
  responseType?: 'json' | 'blob' | 'text' | 'arraybuffer'
}

/**
 * API 响应基础结构
 */
export interface ApiResponse<T = any> {
  /** 响应数据 */
  data: T
  /** 响应状态码 */
  code: number
  /** 响应消息 */
  message: string
  /** 请求结果 */
  result: boolean
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 每页大小 */
  pagesize?: number
}

/**
 * 分页响应数据
 */
export interface PaginationResponse<T = any> {
  /** 数据列表 */
  list: T[]
  /** 总数 */
  total: number
  /** 当前页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
}

/**
 * 列表响应数据（不带分页）
 */
export interface ListResponse<T = any> {
  /** 数据列表 */
  list: T[]
  /** 总数（可选） */
  total?: number
}

/**
 * 通用 ID 参数
 */
export interface IdParams {
  /** ID */
  id: number | string
}

/**
 * 通用批量 ID 参数
 */
export interface IdsParams {
  /** ID 列表 */
  ids: Array<number | string>
}

/**
 * 空间 ID 参数
 */
export interface SpaceIdParams {
  /** 空间 UID */
  space_uid?: string
  /** 业务 ID */
  bk_biz_id?: number
}

/**
 * 索引集 ID 参数
 */
export interface IndexSetIdParams {
  /** 索引集 ID */
  index_set_id: number | string
}

/**
 * 采集器 ID 参数
 */
export interface CollectorIdParams {
  /** 采集器配置 ID */
  collector_config_id: number | string
}

/**
 * 请求错误信息
 */
export interface RequestError {
  /** 错误消息 */
  message: string
  /** 错误代码 */
  code?: number | string
  /** 错误详情 */
  detail?: any
  /** 请求 URL */
  url?: string
}

/**
 * 服务模块定义（用于 services 索引）
 */
export type ServiceModule = Record<string, ApiConfig>
