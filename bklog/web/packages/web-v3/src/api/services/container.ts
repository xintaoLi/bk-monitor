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
 * Container API 服务
 */
export const containerService = {
  /**
   * 新建容器日志
   */
  create: {
    url: '/databus/collectors/',
    method: 'post',
  } as ApiConfig,

  /**
   * 更新容器日志
   */
  update: {
    url: '/databus/collectors/:collector_config_id/',
    method: 'put',
  } as ApiConfig,

  /**
   * 获取容器日志详情
   */
  getDetail: {
    url: '/databus/collectors/:collector_config_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取namespace列表
   */
  getNameSpace: {
    url: '/databus/collectors/list_namespace/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取 集群-node树或集群-namespace-pod列表
   */
  getPodTree: {
    url: '/databus/collectors/list_topo/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取node 标签列表
   */
  getNodeLabelList: {
    url: '/databus/collectors/get_labels/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取标签命中的结果
   */
  getHitResult: {
    url: '/databus/collectors/match_labels/',
    method: 'post',
  } as ApiConfig,

  /**
   * 获取workload类型
   */
  getWorkLoadType: {
    url: '/databus/collectors/list_workload_type/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取workload name
   */
  getWorkLoadName: {
    url: '/databus/collectors/get_workload/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取bcs集群列表
   */
  getBcsList: {
    url: '/databus/collectors/list_bcs_clusters/',
    method: 'get',
  } as ApiConfig,

  /**
   * yaml判断
   */
  yamlJudgement: {
    url: '/databus/collectors/validate_container_config_yaml/',
    method: 'post',
  } as ApiConfig,

  /**
   * ui配置转yaml base64
   */
  containerConfigsToYaml: {
    url: 'databus/collectors/container_configs_to_yaml/',
    method: 'post',
  } as ApiConfig,

  /**
   * 预览
   */
  getLabelHitView: {
    url: '/databus/collectors/preview_containers/',
    method: 'post',
  } as ApiConfig,
}
