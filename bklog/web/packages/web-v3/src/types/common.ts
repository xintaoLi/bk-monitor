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
 * 通用类型定义
 */

/**
 * 基础 ID 类型
 */
export type ID = string | number

/**
 * 时间戳类型（毫秒）
 */
export type Timestamp = number

/**
 * 时间字符串类型（ISO 8601）
 */
export type TimeString = string

/**
 * 通用对象类型
 */
export type AnyObject = Record<string, any>

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * 深度可选类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * 可为 null 类型
 */
export type Nullable<T> = T | null

/**
 * 可为 undefined 类型
 */
export type Optional<T> = T | undefined

/**
 * 可为 null 或 undefined 类型
 */
export type Maybe<T> = T | null | undefined

/**
 * 值类型（排除对象和数组）
 */
export type ValueType = string | number | boolean | null | undefined

/**
 * 函数类型
 */
export type AnyFunction = (...args: any[]) => any

/**
 * 异步函数类型
 */
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>

/**
 * 事件处理函数类型
 */
export type EventHandler<E = Event> = (event: E) => void

/**
 * 回调函数类型
 */
export type Callback<T = void> = (result: T) => void

/**
 * 错误回调函数类型
 */
export type ErrorCallback = (error: Error) => void

/**
 * 成功和失败回调
 */
export interface Callbacks<T = any> {
  onSuccess?: Callback<T>
  onError?: ErrorCallback
}

/**
 * 键值对类型
 */
export interface KeyValue<K = string, V = any> {
  key: K
  value: V
}

/**
 * 选项类型（用于下拉选择等）
 */
export interface Option<T = any> {
  /** 标签 */
  label: string
  /** 值 */
  value: T
  /** 是否禁用 */
  disabled?: boolean
  /** 子选项 */
  children?: Option<T>[]
  /** 其他属性 */
  [key: string]: any
}

/**
 * 树节点类型
 */
export interface TreeNode<T = any> {
  /** 节点 ID */
  id: ID
  /** 节点标签 */
  label: string
  /** 父节点 ID */
  parentId?: ID
  /** 子节点 */
  children?: TreeNode<T>[]
  /** 是否展开 */
  expanded?: boolean
  /** 是否选中 */
  checked?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 节点数据 */
  data?: T
  /** 其他属性 */
  [key: string]: any
}

/**
 * 坐标类型
 */
export interface Point {
  x: number
  y: number
}

/**
 * 矩形区域类型
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 尺寸类型
 */
export interface Size {
  width: number
  height: number
}

/**
 * 范围类型
 */
export interface Range<T = number> {
  start: T
  end: T
}

/**
 * 时间范围类型
 */
export type TimeRange = Range<TimeString | Timestamp>

/**
 * 排序方向
 */
export type SortOrder = 'asc' | 'desc' | 'ascending' | 'descending'

/**
 * 排序配置
 */
export interface SortConfig {
  /** 排序字段 */
  field: string
  /** 排序方向 */
  order: SortOrder
}

/**
 * 过滤条件
 */
export interface FilterCondition {
  /** 字段名 */
  field: string
  /** 操作符 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between'
  /** 值 */
  value: any
}

/**
 * 查询参数
 */
export interface QueryParams {
  /** 关键词 */
  keyword?: string
  /** 分页参数 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 排序配置 */
  sort?: SortConfig | SortConfig[]
  /** 过滤条件 */
  filters?: FilterCondition[]
  /** 其他参数 */
  [key: string]: any
}

/**
 * 表单规则类型
 */
export interface FormRule {
  /** 是否必填 */
  required?: boolean
  /** 错误消息 */
  message?: string
  /** 触发时机 */
  trigger?: 'blur' | 'change' | 'submit'
  /** 正则表达式 */
  pattern?: RegExp
  /** 最小长度 */
  min?: number
  /** 最大长度 */
  max?: number
  /** 自定义验证函数 */
  validator?: (rule: FormRule, value: any, callback: (error?: Error) => void) => void
}

/**
 * 表单规则集合
 */
export type FormRules = Record<string, FormRule | FormRule[]>
