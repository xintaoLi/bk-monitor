/**
 * index.ts - API 服务定义聚合
 * 对齐原 src/services/index.js 逻辑，将所有 API 服务定义汇总
 * 格式: { url: string, method: string }
 */

export interface ServiceDefinition {
  url: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
}

type ServiceMap = Record<string, ServiceDefinition>;

// ==================== meta 服务 ====================
const metaServices: ServiceMap = {
  'meta/menu': { url: '/meta/menu/', method: 'get' },
  'meta/language': { url: '/meta/language/', method: 'get' },
  'meta/updateLanguage': { url: '/meta/language/', method: 'post' },
  'meta/scenario': { url: '/meta/scenario/', method: 'get' },
  'meta/getMaintainerApi': { url: '/meta/bizs/:bk_biz_id/', method: 'get' },
  'meta/getUserGuide': { url: '/meta/user_guide/', method: 'get' },
  'meta/updateUserGuide': { url: '/meta/user_guide/', method: 'post' },
  'meta/getEnvConstant': { url: '/meta/env_constant/', method: 'get' },
  'meta/globals': { url: '/meta/globals/', method: 'get' },
  'meta/globalSettingList': { url: '/meta/global_setting/', method: 'get' },
  'meta/updateGlobalSetting': { url: '/meta/global_setting/:id/', method: 'put' },
};

// ==================== space 服务 ====================
const spaceServices: ServiceMap = {
  'space/getMySpaceList': { url: '/meta/spaces/mine/', method: 'get' },
  'space/getAllSpaceList': { url: '/meta/spaces/', method: 'get' },
};

// ==================== userInfo 服务 ====================
const userInfoServices: ServiceMap = {
  'userInfo/getUsername': { url: '/meta/user/', method: 'get' },
};

// ==================== retrieve 检索服务 ====================
const retrieveServices: ServiceMap = {
  'retrieve/getIndexSetList': { url: '/search/index_set/', method: 'get' },
  'retrieve/getLogTableHead': { url: '/search/index_set/:index_set_id/fields/', method: 'get' },
  'retrieve/getLogTableList': { url: '/search/index_set/:index_set_id/search/', method: 'post' },
  'retrieve/getDateHistogram': { url: '/search/index_set/:index_set_id/aggs/date_histogram/', method: 'post' },
  'retrieve/getTerms': { url: '/search/index_set/:index_set_id/aggs/terms/', method: 'post' },
  'retrieve/getContext': { url: '/search/index_set/:index_set_id/context/', method: 'post' },
  'retrieve/getTailF': { url: '/search/index_set/:index_set_id/tail_f/', method: 'post' },
  'retrieve/exportLog': { url: '/search/index_set/:index_set_id/export/', method: 'post' },
  'retrieve/quickExport': { url: '/search/index_set/:index_set_id/quick_export/', method: 'post' },
  'retrieve/asyncExport': { url: '/search/index_set/:index_set_id/async_export/', method: 'post' },
  'retrieve/generateQuerystring': { url: '/search/index_set/generate_querystring/', method: 'post' },
  'retrieve/getShareParams': { url: '/share/get_share_params/', method: 'get' },
  'retrieve/createOrUpdateToken': { url: '/share/create_or_update_token/', method: 'post' },
  'retrieve/getIndexSetDataByDataId': { url: '/index_set/query_by_dataid/', method: 'get' },
  'retrieve/getSpaceByIndexId': { url: '/index_set/:index_set_id/space/', method: 'get' },
};

// ==================== unionSearch 联合检索服务 ====================
const unionSearchServices: ServiceMap = {
  'unionSearch/unionSearch': { url: '/search/index_set/union_search/', method: 'post' },
  'unionSearch/unionMapping': { url: '/search/index_set/union_mapping/', method: 'post' },
  'unionSearch/unionDateHistogram': { url: '/search/index_set/union_aggs/date_histogram/', method: 'post' },
  'unionSearch/unionTerms': { url: '/search/index_set/union_aggs/terms/', method: 'post' },
  'unionSearch/unionExport': { url: '/search/index_set/union_export/', method: 'post' },
  'unionSearch/unionAsyncExport': { url: '/search/index_set/union_async_export/', method: 'post' },
};

// ==================== favorite 收藏服务 ====================
const favoriteServices: ServiceMap = {
  'favorite/getFavoriteByGroupList': { url: '/search/favorite/', method: 'get' },
  'favorite/createFavorite': { url: '/search/favorite/', method: 'post' },
  'favorite/updateFavorite': { url: '/search/favorite/:id/', method: 'put' },
  'favorite/deleteFavorite': { url: '/search/favorite/:id/', method: 'delete' },
  'favorite/getFavoriteGroupList': { url: '/search/favorite_group/', method: 'get' },
  'favorite/createFavoriteGroup': { url: '/search/favorite_group/', method: 'post' },
  'favorite/updateFavoriteGroup': { url: '/search/favorite_group/:id/', method: 'put' },
  'favorite/deleteFavoriteGroup': { url: '/search/favorite_group/:id/', method: 'delete' },
  'favorite/batchUpdateFavorite': { url: '/search/favorite/batch_update/', method: 'post' },
};

// ==================== indexSet 索引集服务 ====================
const indexSetServices: ServiceMap = {
  'indexSet/getIndexSetList': { url: '/index_set/', method: 'get' },
  'indexSet/createIndexSet': { url: '/index_set/', method: 'post' },
  'indexSet/updateIndexSet': { url: '/index_set/:index_set_id/', method: 'put' },
  'indexSet/deleteIndexSet': { url: '/index_set/:index_set_id/', method: 'delete' },
  'indexSet/getIndexSetDetail': { url: '/index_set/:index_set_id/', method: 'get' },
  'indexSet/markFavorite': { url: '/index_set/:index_set_id/mark_favorite/', method: 'post' },
  'indexSet/cancelFavorite': { url: '/index_set/:index_set_id/cancel_favorite/', method: 'post' },
};

// ==================== collect 采集服务 ====================
const collectServices: ServiceMap = {
  'collect/globals': { url: '/meta/globals/', method: 'get' },
  'collect/getCollectorList': { url: '/databus/collectors/', method: 'get' },
  'collect/createCollector': { url: '/databus/collectors/', method: 'post' },
  'collect/updateCollector': { url: '/databus/collectors/:collector_config_id/', method: 'put' },
  'collect/deleteCollector': { url: '/databus/collectors/:collector_config_id/', method: 'delete' },
  'collect/getCollectorDetail': { url: '/databus/collectors/:collector_config_id/', method: 'get' },
  'collect/startCollector': { url: '/databus/collectors/:collector_config_id/start/', method: 'post' },
  'collect/stopCollector': { url: '/databus/collectors/:collector_config_id/stop/', method: 'post' },
  'collect/getTaskStatus': { url: '/databus/collectors/:collector_config_id/task_status/', method: 'get' },
  'collect/retryTask': { url: '/databus/collectors/:collector_config_id/retry/', method: 'post' },
  'collect/updateOrCreateCleanConfig': {
    url: '/databus/collectors/:collector_config_id/update_or_create_clean_config/',
    method: 'post',
  },
  'collect/etlPreview': { url: '/databus/collectors/:collector_config_id/etl_preview/', method: 'post' },
  'collect/etlTime': { url: '/databus/collectors/:collector_config_id/etl_time/', method: 'post' },
};

// ==================== clean 清洗服务 ====================
const cleanServices: ServiceMap = {
  'clean/getCleanList': { url: '/databus/clean/', method: 'get' },
  'clean/getCleanTemplateList': { url: '/databus/clean_template/', method: 'get' },
  'clean/createCleanTemplate': { url: '/databus/clean_template/', method: 'post' },
  'clean/updateCleanTemplate': { url: '/databus/clean_template/:id/', method: 'put' },
  'clean/deleteCleanTemplate': { url: '/databus/clean_template/:id/', method: 'delete' },
};

// ==================== masking 脱敏服务 ====================
const maskingServices: ServiceMap = {
  'masking/getMaskingList': { url: '/databus/log_desensitize/', method: 'get' },
  'masking/createMasking': { url: '/databus/log_desensitize/', method: 'post' },
  'masking/updateMasking': { url: '/databus/log_desensitize/:id/', method: 'put' },
  'masking/deleteMasking': { url: '/databus/log_desensitize/:id/', method: 'delete' },
};

// ==================== archive 归档服务 ====================
const archiveServices: ServiceMap = {
  'archive/getRepositoryList': { url: '/archive/repository/', method: 'get' },
  'archive/createRepository': { url: '/archive/repository/', method: 'post' },
  'archive/updateRepository': { url: '/archive/repository/:id/', method: 'put' },
  'archive/deleteRepository': { url: '/archive/repository/:id/', method: 'delete' },
  'archive/getArchiveList': { url: '/archive/archive/', method: 'get' },
  'archive/getRestoreList': { url: '/archive/restore/', method: 'get' },
  'archive/createRestore': { url: '/archive/restore/', method: 'post' },
  'archive/deleteRestore': { url: '/archive/restore/:id/', method: 'delete' },
};

// ==================== extract 日志提取服务 ====================
const extractServices: ServiceMap = {
  'extract/getStrategyList': { url: '/log_extract/strategies/', method: 'get' },
  'extract/getTopo': { url: '/log_extract/strategies/topo/', method: 'get' },
  'extract/getTaskList': { url: '/log_extract/tasks/', method: 'get' },
  'extract/createTask': { url: '/log_extract/tasks/', method: 'post' },
  'extract/getTaskDetail': { url: '/log_extract/tasks/:id/', method: 'get' },
  'extract/getLinkList': { url: '/log_extract/links/', method: 'get' },
  'extract/createLink': { url: '/log_extract/links/', method: 'post' },
  'extract/updateLink': { url: '/log_extract/links/:id/', method: 'put' },
  'extract/deleteLink': { url: '/log_extract/links/:id/', method: 'delete' },
};

// ==================== logClustering 聚类服务 ====================
const logClusteringServices: ServiceMap = {
  'logClustering/getClusteringConfig': { url: '/log_clustering/config/', method: 'get' },
  'logClustering/createClusteringConfig': { url: '/log_clustering/config/', method: 'post' },
  'logClustering/updateClusteringConfig': { url: '/log_clustering/config/:id/', method: 'put' },
  'logClustering/getPatternList': { url: '/log_clustering/pattern/', method: 'get' },
  'logClustering/updateRemark': { url: '/log_clustering/pattern/:id/update_remark/', method: 'post' },
  'logClustering/updateLabel': { url: '/log_clustering/pattern/:id/update_label/', method: 'post' },
};

// ==================== dashboard 仪表盘服务 ====================
const dashboardServices: ServiceMap = {
  'dashboard/getDashboardList': { url: '/grafana/dashboards/', method: 'get' },
  'dashboard/createDashboard': { url: '/grafana/dashboards/', method: 'post' },
  'dashboard/getDashboardDetail': { url: '/grafana/dashboards/:uid/', method: 'get' },
  'dashboard/deleteDashboard': { url: '/grafana/dashboards/:uid/', method: 'delete' },
};

// ==================== esCluster ES集群服务 ====================
const esClusterServices: ServiceMap = {
  'esCluster/getClusterList': { url: '/meta/es_cluster/', method: 'get' },
  'esCluster/createCluster': { url: '/meta/es_cluster/', method: 'post' },
  'esCluster/updateCluster': { url: '/meta/es_cluster/:id/', method: 'put' },
  'esCluster/deleteCluster': { url: '/meta/es_cluster/:id/', method: 'delete' },
};

// ==================== report 订阅服务 ====================
const reportServices: ServiceMap = {
  'report/getReportList': { url: '/report/report/', method: 'get' },
  'report/createReport': { url: '/report/report/', method: 'post' },
  'report/updateReport': { url: '/report/report/:id/', method: 'put' },
  'report/deleteReport': { url: '/report/report/:id/', method: 'delete' },
  'report/sendReport': { url: '/report/report/:id/send/', method: 'post' },
};

// ==================== tgpa 客户端日志服务 ====================
const tgpaServices: ServiceMap = {
  'tgpa/getTaskList': { url: '/tgpa/task/', method: 'get' },
  'tgpa/getDownloadUrl': { url: '/tgpa/task/download_url/', method: 'get' },
  'tgpa/getIndexSetId': { url: '/tgpa/task/index_set_id/', method: 'get' },
};

// ==================== authorization 授权服务 ====================
const authorizationServices: ServiceMap = {
  'authorization/getAuthorizationList': { url: '/authorization/', method: 'get' },
  'authorization/createAuthorization': { url: '/authorization/', method: 'post' },
  'authorization/updateAuthorization': { url: '/authorization/:id/', method: 'put' },
  'authorization/deleteAuthorization': { url: '/authorization/:id/', method: 'delete' },
};

// ==================== 聚合导出 ====================
const serviceList: ServiceMap = {
  ...metaServices,
  ...spaceServices,
  ...userInfoServices,
  ...retrieveServices,
  ...unionSearchServices,
  ...favoriteServices,
  ...indexSetServices,
  ...collectServices,
  ...cleanServices,
  ...maskingServices,
  ...archiveServices,
  ...extractServices,
  ...logClusteringServices,
  ...dashboardServices,
  ...esClusterServices,
  ...reportServices,
  ...tgpaServices,
  ...authorizationServices,
};

export default serviceList;
