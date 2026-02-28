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
 * Router 路由类型定义
 */

import type { RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'

/**
 * 路由元信息接口
 */
export interface RouteMeta {
  /** 页面标题 */
  title?: string
  /** 页面图标 */
  icon?: string
  /** 是否需要认证 */
  requiresAuth?: boolean
  /** 权限标识 */
  permission?: string | string[]
  /** 是否隐藏在菜单中 */
  hideInMenu?: boolean
  /** 是否缓存页面 */
  keepAlive?: boolean
  /** 面包屑配置 */
  breadcrumb?: boolean | Breadcrumb[]
  /** 是否固定在标签栏 */
  affix?: boolean
  /** 外链地址 */
  externalLink?: string
  /** 是否在新窗口打开 */
  target?: '_blank' | '_self'
  /** 排序权重 */
  order?: number
  /** 其他自定义元数据 */
  [key: string]: any
}

/**
 * 面包屑项
 */
export interface Breadcrumb {
  /** 名称 */
  name: string
  /** 路径 */
  path?: string
}

/**
 * 扩展的路由记录类型
 */
export interface AppRouteRecordRaw extends Omit<RouteRecordRaw, 'meta' | 'children'> {
  /** 路由元信息 */
  meta?: RouteMeta
  /** 子路由 */
  children?: AppRouteRecordRaw[]
}

/**
 * 导航守卫类型
 */
export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => void | Promise<void>

/**
 * 路由配置接口
 */
export interface RouterConfig {
  /** 基础路径 */
  base?: string
  /** 路由模式 */
  mode?: 'hash' | 'history'
  /** 滚动行为 */
  scrollBehavior?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    savedPosition: any
  ) => any
}

/**
 * 标签页项
 */
export interface TabItem {
  /** 路由名称 */
  name: string
  /** 路由路径 */
  path: string
  /** 标题 */
  title: string
  /** 是否固定 */
  affix?: boolean
  /** 路由参数 */
  params?: Record<string, any>
  /** 查询参数 */
  query?: Record<string, any>
}
