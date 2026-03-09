import { defineStore } from 'pinia';
import http from '@/api';

/**
 * 采集项类型
 */
export interface CollectItem {
  collector_config_id: number;
  collector_config_name: string;
  collector_scenario_id: string;
  collector_scenario_name: string;
  bk_biz_id: number;
  index_set_id?: number;
  storage_cluster_id?: number;
  retention?: number;
  allocation_min_days?: number;
  data_encoding?: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  [key: string]: any;
}

/**
 * 索引集类型
 */
export interface IndexSetInfo {
  index_set_id: number;
  index_set_name: string;
  scenario_id: string;
  scenario_name: string;
  indices: any[];
  [key: string]: any;
}

/**
 * 场景映射类型
 */
export interface ScenarioMap {
  [key: string]: {
    id: string;
    name: string;
    children?: ScenarioMap;
  };
}

/**
 * 导出采集配置类型
 */
export interface ExportCollectObj {
  collectID: number | null;
  syncType: string[];
  collect: Partial<CollectItem>;
}

/**
 * 采集状态
 */
interface CollectState {
  // 当前采集项
  curCollect: Partial<CollectItem>;

  // 当前索引集
  curIndexSet: Partial<IndexSetInfo>;

  // 场景映射
  scenarioMap: ScenarioMap | null;

  // 导出采集配置
  exportCollectObj: ExportCollectObj;

  // 采集项列表
  collectorList: CollectItem[];

  // 采集项详情
  collectorDetail: Partial<CollectItem>;

  // 任务状态
  taskStatus: Record<string, any>;
}

/**
 * 采集状态管理
 */
export const useCollectStore = defineStore('collect', {
  state: (): CollectState => ({
    curCollect: {},
    curIndexSet: {},
    scenarioMap: null,
    exportCollectObj: {
      collectID: null,
      syncType: [],
      collect: {},
    },
    collectorList: [],
    collectorDetail: {},
    taskStatus: {},
  }),

  getters: {
    /**
     * 获取当前采集项
     */
    getCurrentCollect(): Partial<CollectItem> {
      return this.curCollect;
    },

    /**
     * 获取导出采集配置
     */
    getExportCollectObj(): ExportCollectObj {
      return this.exportCollectObj;
    },

    /**
     * 检查采集项是否激活
     */
    isCollectActive(): boolean {
      return this.curCollect?.is_active ?? false;
    },
  },

  actions: {
    /**
     * 设置当前采集项
     */
    setCurCollect(collect: Partial<CollectItem>) {
      this.curCollect = collect;
    },

    /**
     * 更新当前采集项
     */
    updateCurCollect(collect: Partial<CollectItem>) {
      this.curCollect = {
        ...this.curCollect,
        ...collect,
      };
    },

    /**
     * 更新当前索引集
     */
    updateCurIndexSet(indexSet: Partial<IndexSetInfo>) {
      this.curIndexSet = indexSet;
    },

    /**
     * 更新场景映射
     */
    updateScenarioMap(scenarioMap: ScenarioMap) {
      this.scenarioMap = scenarioMap;
    },

    /**
     * 更新导出采集配置
     */
    updateExportCollectObj(obj: Partial<ExportCollectObj>) {
      this.exportCollectObj = {
        ...this.exportCollectObj,
        ...obj,
      };
    },

    /**
     * 更新采集项列表
     */
    updateCollectorList(list: CollectItem[]) {
      this.collectorList = list;
    },

    /**
     * 更新采集项详情
     */
    updateCollectorDetail(detail: Partial<CollectItem>) {
      this.collectorDetail = detail;
    },

    /**
     * 更新任务状态
     */
    updateTaskStatus(status: Record<string, any>) {
      this.taskStatus = {
        ...this.taskStatus,
        ...status,
      };
    },

    /**
     * 获取采集项列表
     */
    async fetchCollectorList(params: {
      bk_biz_id?: number;
      space_uid?: string;
      page?: number;
      pagesize?: number;
    }) {
      try {
        const res = await http.request('collect/getCollectorList', {
          query: params,
        });
        this.updateCollectorList(res.data?.list ?? []);
        return res.data;
      } catch (error) {
        console.error('Failed to fetch collector list:', error);
        throw error;
      }
    },

    /**
     * 获取采集项详情
     */
    async fetchCollectorDetail(collectorConfigId: number) {
      try {
        const res = await http.request('collect/getCollectorDetail', {
          params: { collector_config_id: collectorConfigId },
        });
        this.updateCollectorDetail(res.data ?? {});
        this.setCurCollect(res.data ?? {});
        return res.data;
      } catch (error) {
        console.error('Failed to fetch collector detail:', error);
        throw error;
      }
    },

    /**
     * 创建采集项
     */
    async createCollector(data: Partial<CollectItem>) {
      try {
        const res = await http.request('collect/createCollector', {
          data,
        });
        return res.data;
      } catch (error) {
        console.error('Failed to create collector:', error);
        throw error;
      }
    },

    /**
     * 更新采集项
     */
    async updateCollector(collectorConfigId: number, data: Partial<CollectItem>) {
      try {
        const res = await http.request('collect/updateCollector', {
          params: { collector_config_id: collectorConfigId },
          data,
        });
        return res.data;
      } catch (error) {
        console.error('Failed to update collector:', error);
        throw error;
      }
    },

    /**
     * 删除采集项
     */
    async deleteCollector(collectorConfigId: number) {
      try {
        const res = await http.request('collect/deleteCollector', {
          params: { collector_config_id: collectorConfigId },
        });
        return res.data;
      } catch (error) {
        console.error('Failed to delete collector:', error);
        throw error;
      }
    },

    /**
     * 启动采集项
     */
    async startCollector(collectorConfigId: number) {
      try {
        const res = await http.request('collect/startCollector', {
          params: { collector_config_id: collectorConfigId },
        });
        return res.data;
      } catch (error) {
        console.error('Failed to start collector:', error);
        throw error;
      }
    },

    /**
     * 停止采集项
     */
    async stopCollector(collectorConfigId: number) {
      try {
        const res = await http.request('collect/stopCollector', {
          params: { collector_config_id: collectorConfigId },
        });
        return res.data;
      } catch (error) {
        console.error('Failed to stop collector:', error);
        throw error;
      }
    },

    /**
     * 获取场景列表
     */
    async fetchScenarioList() {
      try {
        const res = await http.request('collect/getScenarioList');
        this.updateScenarioMap(res.data ?? {});
        return res.data;
      } catch (error) {
        console.error('Failed to fetch scenario list:', error);
        throw error;
      }
    },

    /**
     * 获取任务状态
     */
    async fetchTaskStatus(taskId: string) {
      try {
        const res = await http.request('collect/getTaskStatus', {
          params: { task_id: taskId },
        });
        this.updateTaskStatus({ [taskId]: res.data });
        return res.data;
      } catch (error) {
        console.error('Failed to fetch task status:', error);
        throw error;
      }
    },

    /**
     * 重置当前采集项
     */
    resetCurCollect() {
      this.curCollect = {};
    },

    /**
     * 重置当前索引集
     */
    resetCurIndexSet() {
      this.curIndexSet = {};
    },

    /**
     * 重置导出配置
     */
    resetExportCollectObj() {
      this.exportCollectObj = {
        collectID: null,
        syncType: [],
        collect: {},
      };
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'collect-store',
        storage: localStorage,
        paths: ['exportCollectObj'],
      },
    ],
  },
});
