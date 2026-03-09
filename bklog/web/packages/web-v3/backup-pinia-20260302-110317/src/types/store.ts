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
 * Store 状态类型定义
 */

import type { Space, Biz, User, IndexSet } from './business'

/**
 * 全局状态接口
 */
export interface GlobalState {
  /** 当前空间 */
  currentSpace: Space | null
  /** 当前业务 */
  currentBiz: Biz | null
  /** 用户信息 */
  userInfo: User | null
  /** 空间列表 */
  spaceList: Space[]
  /** 业务列表 */
  bizList: Biz[]
  /** 全局配置 */
  globalConfig: GlobalConfig
  /** 语言 */
  language: 'zh-cn' | 'en'
  /** 时区 */
  timezone: string
  /** 是否显示侧边栏 */
  showSidebar: boolean
  /** 菜单列表 */
  menuList: MenuItem[]
}

/**
 * 全局配置接口
 */
export interface GlobalConfig {
  /** 站点 URL */
  siteUrl?: string
  /** BK 登录 URL */
  bkLoginUrl?: string
  /** BK 域名 */
  bkDomain?: string
  /** 是否演示模式 */
  isDemoMode?: boolean
  /** 功能开关 */
  featureFlags?: Record<string, boolean>
  /** 其他配置 */
  [key: string]: any
}

/**
 * 菜单项接口
 */
export interface MenuItem {
  /** 菜单 ID */
  id: string
  /** 菜单名称 */
  name: string
  /** 菜单图标 */
  icon?: string
  /** 路由路径 */
  path?: string
  /** 子菜单 */
  children?: MenuItem[]
  /** 是否隐藏 */
  hidden?: boolean
  /** 权限标识 */
  permission?: string
}

/**
 * 检索状态接口
 */
export interface SearchState {
  /** 当前索引集 */
  currentIndexSet: IndexSet | null
  /** 关键词 */
  keyword: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 时间范围 */
  timeRange: string
  /** 查询历史 */
  searchHistory: string[]
  /** 收藏的检索 */
  favoriteSearches: FavoriteSearch[]
}

/**
 * 收藏的检索
 */
export interface FavoriteSearch {
  /** ID */
  id: number
  /** 名称 */
  name: string
  /** 索引集 ID */
  index_set_id: number
  /** 查询参数 */
  params: any
  /** 创建时间 */
  created_at: string
}

/**
 * 应用状态接口
 */
export interface AppState {
  /** 加载状态 */
  loading: boolean
  /** 错误信息 */
  error: string | null
  /** 提示信息 */
  message: string | null
  /** 是否已初始化 */
  initialized: boolean
}

/**
 * Root State 类型（所有 Store 的聚合）
 */
export interface RootState {
  /** 全局状态 */
  global: GlobalState
  /** 检索状态 */
  search: SearchState
  /** 应用状态 */
  app: AppState
}
