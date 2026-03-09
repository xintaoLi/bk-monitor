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
 * Collect API 服务
 */
export const collectService = {
  /**
   * 获取存储集群
   */
  getStorage: {
    url: '/databus/storage/cluster_groups/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取全局配置
   */
  globals: {
    url: '/meta/globals/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集项-创建
   */
  addCollection: {
    url: '/databus/collectors/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集项-更新
   */
  updateCollection: {
    url: '/databus/collectors/:collector_config_id/',
    method: 'put',
  } as ApiConfig,

  /**
   * 采集项-更新
   */
  onlyUpdateCollection: {
    url: '/databus/collectors/:collector_config_id/only_update/',
    method: 'post',
  } as ApiConfig,

  /**
   * 索引集信息-快速更新
   */
  fastUpdateCollection: {
    url: '/databus/collectors/:collector_config_id/fast_update/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集项-只创建配置
   */
  onlyCreateCollection: {
    url: '/databus/collectors/only_create/',
    method: 'post',
  } as ApiConfig,

  /**
   * 创建采集ITSM单据
   */
  applyItsmTicket: {
    url: '/databus/collect_itsm/:collector_config_id/apply_itsm_ticket/',
    method: 'post',
  } as ApiConfig,

  /**
   * 查询采集ITSM状态
   */
  queryItsmTicket: {
    url: '/databus/collect_itsm/:collector_config_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 字段提取&清洗
   */
  fieldCollection: {
    url: '/databus/collectors/:collector_config_id/update_or_create_clean_config/',
    method: 'post',
  } as ApiConfig,

  /**
   * 字段提取-预览
   */
  getEtlPreview: {
    url: '/databus/collectors/:collector_config_id/etl_preview/',
    method: 'post',
  } as ApiConfig,

  /**
   * 字段提取-时间校验
   */
  getCheckTime: {
    url: '/databus/collectors/:collector_config_id/etl_time/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集项-详情
   */
  details: {
    url: '/databus/collectors/:collector_config_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集列表-列表
   */
  getCollectList: {
    url: '/databus/collectors/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集列表-列表（全量）
   */
  getAllCollectors: {
    url: '/databus/collectors/list_collectors/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集插件列表
   */
  getCollectorPlugins: {
    url: '/databus/collector_plugins/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集列表-状态
   */
  getCollectStatus: {
    url: '/databus/collectors/batch_subscription_status/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集列表-启用
   */
  startCollect: {
    url: '/databus/collectors/:collector_config_id/start/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集列表-停用
   */
  stopCollect: {
    url: '/databus/collectors/:collector_config_id/stop/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集列表-删除
   */
  deleteCollect: {
    url: '/databus/collectors/:collector_config_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * 采集下发-topo树
   */
  getBizTopo: {
    url: '/bizs/:bk_biz_id/topo/',
    method: 'get',
  } as ApiConfig,

  /**
   * 日志提取无鉴权topo树
   */
  getExtractBizTopo: {
    url: '/log_extract/strategies/topo/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集下发-by 静态topo or input
   */
  getHostByIp: {
    url: '/bizs/:bk_biz_id/host_instance_by_ip/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集下发-by 动态topo
   */
  getHostByNode: {
    url: '/bizs/:bk_biz_id/host_instance_by_node/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集下发-服务模板topo
   */
  getTemplateTopo: {
    url: '/bizs/:bk_biz_id/template_topo/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集下发-by 根据服务模板或集群模板获取实例
   */
  getHostByTemplate: {
    url: '/bizs/:bk_biz_id/get_nodes_by_template/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集下发-列表&轮询共用同一接口
   */
  getIssuedClusterList: {
    url: '/databus/collectors/:collector_config_id/task_status/',
    method: 'get',
  } as ApiConfig,

  /**
   * 采集下发-重试(批量)
   */
  retry: {
    url: '/databus/collectors/:collector_config_id/retry/',
    method: 'post',
  } as ApiConfig,

  /**
   * 段日志调试
   */
  regexDebug: {
    url: '/databus/collectors/:collector_id/regex_debug/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集下发-任务执行详情(更多)
const executDetails = {
  url: '/databus/collectors/:collector_id/task_detail/',
};
// 获取节点agent数量
   */
  getNodeAgentStatus: {
    url: '/bizs/:bk_biz_id/list_agent_status/',
    method: 'post',
  } as ApiConfig,

  /**
   * 获取动态分组列表
   */
  getDynamicGroupList: {
    url: '/bizs/:bk_biz_id/list_dynamic_group/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取动态分组表格数据
   */
  getDynamicGroup: {
    url: '/bizs/:bk_biz_id/get_dynamic_group/',
    method: 'post',
  } as ApiConfig,

  /**
   * 获取预检查创建采集项的参数
   */
  getPreCheck: {
    url: '/databus/collectors/pre_check/?bk_biz_id=:bk_biz_id&collector_config_name_en=:collector_config_name_en',
    method: 'get',
  } as ApiConfig,

  /**
   * createWeWork
   */
  createWeWork: {
    url: '/esb_api/wework/create_chat/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集项一键检测 - 开启检测
   */
  runCheck: {
    url: '/databus/check_collector/run_check_collector/',
    method: 'post',
  } as ApiConfig,

  /**
   * 采集项一键检测 - 获取检测信息
   */
  getCheckInfos: {
    url: '/databus/check_collector/get_check_collector_infos/',
    method: 'post',
  } as ApiConfig,

  /**
   * oplt_log 查看token请求
   */
  reviewToken: {
    url: '/databus/collectors/:collector_config_id/report_token/',
    method: 'get',
  } as ApiConfig,

  /**
   * 获取日志采集-增加用量数据
   */
  getStorageUsage: {
    url: '/index_set/storage_usage/',
    method: 'post',
  } as ApiConfig,

  /**
   * 获取客户端日志-采集下发-日志列表数据
   */
  getTaskLogList: {
    url: '/tgpa/task/',
    method: 'get',
  } as ApiConfig,

  /**
   * 客户端日志-新建采集
   */
  createCollectionTask: {
    url: '/tgpa/task/',
    method: 'post',
  } as ApiConfig,

  /**
   * 客户端日志-获取下载链接
   */
  getDownloadLink: {
    url: '/tgpa/task/download_url/',
    method: 'get',
  } as ApiConfig,

  /**
   * 客户端日志-获取索引集ID
   */
  getTaskIndexSetId: {
    url: '/tgpa/task/index_set_id/',
    method: 'get',
  } as ApiConfig,

  /**
   * 客户端日志-用户上报列表
   */
  getUserReportList: {
    url: '/tgpa/report/',
    method: 'get',
  } as ApiConfig,

  /**
   * 客户端日志-本地上报
   */
  syncUserReport: {
    url: '/tgpa/report/sync/',
    method: 'post',
  } as ApiConfig,

  /**
   * 客户端日志-获取上报状态
   */
  getFileStatus: {
    url: '/tgpa/report/file_status/',
    method: 'post',
  } as ApiConfig,

  /**
   * 客户端日志-获取同步用户上报文件的状态
   */
  getSyncRecord: {
    url: '/tgpa/report/sync_record/',
    method: 'get',
  } as ApiConfig,

  /**
   * 客户端日志-获取tab数量
   */
  getTgpaCount: {
    url: '/tgpa/count/',
    method: 'get',
  } as ApiConfig,

  /**
   * 客户端日志-获取用户名列表
   */
  getUsernameList: {
    url: '/tgpa/task/username_list/',
    method: 'get',
  } as ApiConfig,
}
