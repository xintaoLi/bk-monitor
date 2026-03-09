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
 * Retrieve API 服务
 */
export const retrieveService = {
  /**
   * getIndexSetList
   */
  getIndexSetList: {
    url: '/search/index_set/',
    method: 'get',
  } as ApiConfig,

  /**
   * getLogTableHead
   */
  getLogTableHead: {
    url: '/search/index_set/:index_set_id/fields/',
    method: 'get',
  } as ApiConfig,

  /**
   * 时间戳字符串
    bk_host_id: number;
    cloudId: number;
    dtEventTimeStamp: string; // 时间戳字符串
    gseIndex: number;
    iterationIndex: number;
    log: string;
    path: string;
    serverIp: string;
    time: string; // 时间戳字符串
    __index_set_id__: number;
    index: string;
    __id__: string;
  }[];
  done: boolean;
  trace_id: string;
  result_table_options: {
    [key: string]: {
      search_after: number[];
    };
  };
  aggs: any;
  aggregations: any;
  origin_log_list: {
    __data_label: string;
    __result_table: string;
    _time: string;
    bk_host_id: number;
    cloudId: number;
    dtEventTimeStamp: string;
    gseIndex: number;
    iterationIndex: number;
    log: string;
    path: string;
    serverIp: string;
    time: string;
    __index_set_id__: number;
    index: string;
    __id__: string;
  }[];
  took: number;
  fields: {
    [key: string]: {
      max_length: number;
    };
  };
  raw_took: number;
}
   */
  getLogTableList: {
    url: '/search/index_set/:index_set_id/search/',
    method: 'post',
  } as ApiConfig,

  /**
   * 格式化的时间字符串，如 "2025-08-03 08:00:00"
        key: number; // 时间戳（毫秒）
        doc_count: number; // 文档计数
      }[];
    };
  };
}
   */
  getLogChartList: {
    url: '/search/index_set/:index_set_id/aggs/date_histogram/',
    method: 'post',
  } as ApiConfig,

  /**
   * getFilterBiz
   */
  getFilterBiz: {
    url: '/bizs/',
    method: 'get',
  } as ApiConfig,

  /**
   * IP快选 选择业务接口调整
   */
  getIpBusinessList: {
    url: '/search/index_set/:index_set_id/bizs/',
    method: 'get',
  } as ApiConfig,

  /**
   * getIpTree
   */
  getIpTree: {
    url: '/bizs/:bk_biz_id/topo/',
    method: 'get',
  } as ApiConfig,

  /**
   * getOperators
   */
  getOperators: {
    url: '/search/index_set/operators/',
    method: 'get',
  } as ApiConfig,

  /**
   * getCloudAreaList
   */
  getCloudAreaList: {
    url: '/search/index_set/$index_set_id/:tailf/',
    method: 'post',
  } as ApiConfig,

  /**
   * downloadLog
   */
  downloadLog: {
    url: '/search/index_set/:index_set_id/export/',
    method: 'post',
  } as ApiConfig,

  /**
   * quickDownload
   */
  quickDownload: {
    url: '/search/index_set/:index_set_id/quick_export/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionDownloadLog
   */
  unionDownloadLog: {
    url: '/search/index_set/union_search/export/',
    method: 'post',
  } as ApiConfig,

  /**
   * exportAsync
   */
  exportAsync: {
    url: '/search/index_set/:index_set_id/async_export/',
    method: 'post',
  } as ApiConfig,

  /**
   * unionExportAsync
   */
  unionExportAsync: {
    url: '/search/index_set/union_async_export/',
    method: 'post',
  } as ApiConfig,

  /**
   * getRealTimeLog
   */
  getRealTimeLog: {
    url: '/search/index_set/:index_set_id/tail_f/',
    method: 'post',
  } as ApiConfig,

  /**
   * getContentLog
   */
  getContentLog: {
    url: '/search/index_set/:index_set_id/context/',
    method: 'post',
  } as ApiConfig,

  /**
   * saveTitleInfo
   */
  saveTitleInfo: {
    url: '/search/index_set/:index_set_id/config/',
    method: 'post',
  } as ApiConfig,

  /**
   * getRetrieveFavorite
   */
  getRetrieveFavorite: {
    url: '/search/favorite/',
    method: 'get',
  } as ApiConfig,

  /**
   * postRetrieveFavorite
   */
  postRetrieveFavorite: {
    url: '/search/favorite/',
    method: 'post',
  } as ApiConfig,

  /**
   * deleteRetrieveFavorite
   */
  deleteRetrieveFavorite: {
    url: '/search/favorite/:id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * postFieldsConfig
   */
  postFieldsConfig: {
    url: '/search/index_set/config/',
    method: 'post',
  } as ApiConfig,

  /**
   * getWebConsoleUrl
   */
  getWebConsoleUrl: {
    url: '/search/index_set/:index_set_id/bcs_web_console/',
    method: 'get',
  } as ApiConfig,

  /**
   * getSearchHistory
   */
  getSearchHistory: {
    url: '/search/index_set/:index_set_id/history/',
    method: 'get',
  } as ApiConfig,

  /**
   * getExportHistoryList
   */
  getExportHistoryList: {
    url: '/search/index_set/:index_set_id/export_history/?bk_biz_id=:bk_biz_id&page=:page&pagesize=:pagesize&show_all=:show_all',
    method: 'get',
  } as ApiConfig,

  /**
   * getFieldsListConfig
   */
  getFieldsListConfig: {
    url: '/search/index_set/list_config/',
    method: 'post',
  } as ApiConfig,

  /**
   * createFieldsConfig
   */
  createFieldsConfig: {
    url: '/search/index_set/create_config/',
    method: 'post',
  } as ApiConfig,

  /**
   * updateFieldsConfig
   */
  updateFieldsConfig: {
    url: '/search/index_set/update_config/',
    method: 'post',
  } as ApiConfig,

  /**
   * deleteFieldsConfig
   */
  deleteFieldsConfig: {
    url: '/search/index_set/delete_config/',
    method: 'post',
  } as ApiConfig,

  /**
   * getFieldsConfigByContextLog
   */
  getFieldsConfigByContextLog: {
    url: '/search/index_set/:index_set_id/retrieve_config/?config_id=:config_id',
    method: 'get',
  } as ApiConfig,

  /**
   * getAggsTerms
   */
  getAggsTerms: {
    url: '/search/index_set/:index_set_id/aggs/terms/',
    method: 'post',
  } as ApiConfig,

  /**
   * fieldFetchTopList
   */
  fieldFetchTopList: {
    url: '/field/index_set/fetch_topk_list/',
    method: 'post',
  } as ApiConfig,

  /**
   * fieldStatisticsInfo
   */
  fieldStatisticsInfo: {
    url: '/field/index_set/statistics/info/',
    method: 'post',
  } as ApiConfig,

  /**
   * fieldStatisticsTotal
   */
  fieldStatisticsTotal: {
    url: '/field/index_set/statistics/total/',
    method: 'post',
  } as ApiConfig,

  /**
   * fieldStatisticsGraph
   */
  fieldStatisticsGraph: {
    url: '/field/index_set/statistics/graph/',
    method: 'post',
  } as ApiConfig,

  /**
   * fieldDistinctCount
   */
  fieldDistinctCount: {
    url: '/field/index_set/fetch_distinct_count_list/',
    method: 'post',
  } as ApiConfig,

  /**
   * 无法确定具体结构，使用any[]
  mention_list: {
    id: string;
    type: string;
  }[];
  mention_type: number;
  app: string;
  users: {
    id: string;
    display_name: string;
    type: string;
  }[];
  strategy_count: number;
  rules_count: number;
  delete_allowed: boolean;
  edit_allowed: boolean;
  config_source: string;
}[];

/** 聚类告警列表 */
   */
  userGroup: {
    url: '/clustering_monitor/search_user_groups/',
    method: 'post',
  } as ApiConfig,

  /**
   * normalStrategy
   */
  normalStrategy: {
    url: '/clustering_monitor/:index_set_id/normal_strategy/',
    method: 'post',
  } as ApiConfig,

  /**
   * newClsStrategy
   */
  newClsStrategy: {
    url: '/clustering_monitor/:index_set_id/new_cls_strategy/',
    method: 'post',
  } as ApiConfig,

  /**
   * getClusteringInfo
   */
  getClusteringInfo: {
    url: '/clustering_monitor/:index_set_id/get_strategy/?strategy_type=:strategy_type',
    method: 'get',
  } as ApiConfig,

  /**
   * deleteClusteringInfo
   */
  deleteClusteringInfo: {
    url: '/clustering_monitor/:index_set_id/',
    method: 'delete',
  } as ApiConfig,

  /**
   * createClusteringConfig
   */
  createClusteringConfig: {
    url: '/clustering_config/:index_set_id/access/create/',
    method: 'post',
  } as ApiConfig,

  /**
   * updateClusteringConfig
   */
  updateClusteringConfig: {
    url: '/clustering_config/:index_set_id/access/update/',
    method: 'post',
  } as ApiConfig,

  /**
   * getClusteringConfigStatus
   */
  getClusteringConfigStatus: {
    url: '/clustering_config/:index_set_id/access/status/',
    method: 'get',
  } as ApiConfig,

  /**
   * updateUserFiledTableConfig
   */
  updateUserFiledTableConfig: {
    url: '/search/index_set/user_custom_config/',
    method: 'post',
  } as ApiConfig,

  /**
   * generateQueryString
   */
  generateQueryString: {
    url: '/search/index_set/generate_querystring/',
    method: 'post',
  } as ApiConfig,

  /**
   * setIndexSetCustomConfig
   */
  setIndexSetCustomConfig: {
    url: '/search/index_set/custom_config/',
    method: 'post',
  } as ApiConfig,

  /**
   * getProxyHost
   */
  getProxyHost: {
    url: '/databus/collectors/proxy_host_info/',
    method: 'get',
  } as ApiConfig,

  /**
   * requestGrepResult
   */
  requestGrepResult: {
    url: '/search/index_set/$index_set_id/grep_query/',
    method: 'post',
  } as ApiConfig,

  /**
   * createOrUpdateToken
   */
  createOrUpdateToken: {
    url: '/share/create_or_update_token/',
    method: 'post',
  } as ApiConfig,

  /**
   * getShareParams
   */
  getShareParams: {
    url: 'share/get_share_params/',
    method: 'get',
  } as ApiConfig,

  /**
   * getGrepResultTotal
   */
  getGrepResultTotal: {
    url: '/search/index_set/:index_set_id/grep_query/total/',
    method: 'post',
  } as ApiConfig,

  /**
   * getIndexSetDataByDataId
   */
  getIndexSetDataByDataId: {
    url: '/index_set/query_by_dataid/',
    method: 'get',
  } as ApiConfig,

  /**
   * updateFieldsAlias
   */
  updateFieldsAlias: {
    url: '/search/index_set/:index_set_id/alias_settings/',
    method: 'post',
  } as ApiConfig,
}
