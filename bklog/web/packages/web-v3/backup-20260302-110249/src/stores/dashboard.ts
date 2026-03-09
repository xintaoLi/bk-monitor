import { defineStore } from 'pinia';
import http from '@/api';

/**
 * 仪表盘类型
 */
export interface DashboardItem {
  id: number;
  name: string;
  desc?: string;
  bk_biz_id: number;
  space_uid?: string;
  order?: number;
  is_favorite?: boolean;
  is_enable?: boolean;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  panels?: DashboardPanel[];
  variables?: DashboardVariable[];
  [key: string]: any;
}

/**
 * 仪表盘面板类型
 */
export interface DashboardPanel {
  id: number;
  type: string;
  title: string;
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  targets?: any[];
  options?: Record<string, any>;
  [key: string]: any;
}

/**
 * 仪表盘变量类型
 */
export interface DashboardVariable {
  name: string;
  type: string;
  label?: string;
  default?: any;
  options?: any[];
  query?: string;
  [key: string]: any;
}

/**
 * 仪表盘状态
 */
interface DashboardState {
  // 仪表盘列表
  dashboardList: DashboardItem[];

  // 当前仪表盘
  currentDashboard: DashboardItem | null;

  // 仪表盘详情
  dashboardDetail: Partial<DashboardItem>;

  // 编辑模式
  isEditMode: boolean;

  // 全屏面板
  fullscreenPanel: DashboardPanel | null;

  // 变量值
  variableValues: Record<string, any>;

  // 刷新间隔
  refreshInterval: number;

  // 时间范围
  timeRange: {
    from: string;
    to: string;
  };
}

/**
 * 仪表盘状态管理
 */
export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    dashboardList: [],
    currentDashboard: null,
    dashboardDetail: {},
    isEditMode: false,
    fullscreenPanel: null,
    variableValues: {},
    refreshInterval: 0,
    timeRange: {
      from: 'now-1h',
      to: 'now',
    },
  }),

  getters: {
    /**
     * 获取当前仪表盘 ID
     */
    currentDashboardId(): number | undefined {
      return this.currentDashboard?.id;
    },

    /**
     * 获取收藏的仪表盘列表
     */
    favoriteDashboards(): DashboardItem[] {
      return this.dashboardList.filter(item => item.is_favorite);
    },

    /**
     * 获取启用的仪表盘列表
     */
    enabledDashboards(): DashboardItem[] {
      return this.dashboardList.filter(item => item.is_enable !== false);
    },

    /**
     * 检查是否为全屏模式
     */
    isFullscreen(): boolean {
      return this.fullscreenPanel !== null;
    },
  },

  actions: {
    /**
     * 更新仪表盘列表
     */
    updateDashboardList(list: DashboardItem[]) {
      this.dashboardList = list;
    },

    /**
     * 设置当前仪表盘
     */
    setCurrentDashboard(dashboard: DashboardItem | null) {
      this.currentDashboard = dashboard;
      if (dashboard) {
        this.dashboardDetail = dashboard;
      }
    },

    /**
     * 更新仪表盘详情
     */
    updateDashboardDetail(detail: Partial<DashboardItem>) {
      this.dashboardDetail = {
        ...this.dashboardDetail,
        ...detail,
      };
    },

    /**
     * 设置编辑模式
     */
    setEditMode(isEdit: boolean) {
      this.isEditMode = isEdit;
    },

    /**
     * 设置全屏面板
     */
    setFullscreenPanel(panel: DashboardPanel | null) {
      this.fullscreenPanel = panel;
    },

    /**
     * 更新变量值
     */
    updateVariableValue(name: string, value: any) {
      this.variableValues[name] = value;
    },

    /**
     * 批量更新变量值
     */
    updateVariableValues(values: Record<string, any>) {
      this.variableValues = {
        ...this.variableValues,
        ...values,
      };
    },

    /**
     * 设置刷新间隔
     */
    setRefreshInterval(interval: number) {
      this.refreshInterval = interval;
    },

    /**
     * 设置时间范围
     */
    setTimeRange(from: string, to: string) {
      this.timeRange = { from, to };
    },

    /**
     * 获取仪表盘列表
     */
    async fetchDashboardList(params?: {
      bk_biz_id?: number;
      space_uid?: string;
      page?: number;
      pagesize?: number;
    }) {
      try {
        const res = await http.request('dashboard/getDashboardList', {
          query: params,
        });
        this.updateDashboardList(res.data?.list ?? []);
        return res.data;
      } catch (error) {
        console.error('Failed to fetch dashboard list:', error);
        throw error;
      }
    },

    /**
     * 获取仪表盘详情
     */
    async fetchDashboardDetail(dashboardId: number) {
      try {
        const res = await http.request('dashboard/getDashboardDetail', {
          params: { dashboard_id: dashboardId },
        });
        this.updateDashboardDetail(res.data ?? {});
        this.setCurrentDashboard(res.data);
        return res.data;
      } catch (error) {
        console.error('Failed to fetch dashboard detail:', error);
        throw error;
      }
    },

    /**
     * 创建仪表盘
     */
    async createDashboard(data: Partial<DashboardItem>) {
      try {
        const res = await http.request('dashboard/createDashboard', {
          data,
        });
        return res.data;
      } catch (error) {
        console.error('Failed to create dashboard:', error);
        throw error;
      }
    },

    /**
     * 更新仪表盘
     */
    async updateDashboard(dashboardId: number, data: Partial<DashboardItem>) {
      try {
        const res = await http.request('dashboard/updateDashboard', {
          params: { dashboard_id: dashboardId },
          data,
        });
        return res.data;
      } catch (error) {
        console.error('Failed to update dashboard:', error);
        throw error;
      }
    },

    /**
     * 删除仪表盘
     */
    async deleteDashboard(dashboardId: number) {
      try {
        const res = await http.request('dashboard/deleteDashboard', {
          params: { dashboard_id: dashboardId },
        });
        // 从列表中移除
        const index = this.dashboardList.findIndex(item => item.id === dashboardId);
        if (index >= 0) {
          this.dashboardList.splice(index, 1);
        }
        return res.data;
      } catch (error) {
        console.error('Failed to delete dashboard:', error);
        throw error;
      }
    },

    /**
     * 收藏仪表盘
     */
    async favoriteDashboard(dashboardId: number, isFavorite: boolean) {
      try {
        const res = await http.request('dashboard/favoriteDashboard', {
          params: { dashboard_id: dashboardId },
          data: { is_favorite: isFavorite },
        });
        // 更新列表中的状态
        const dashboard = this.dashboardList.find(item => item.id === dashboardId);
        if (dashboard) {
          dashboard.is_favorite = isFavorite;
        }
        return res.data;
      } catch (error) {
        console.error('Failed to favorite dashboard:', error);
        throw error;
      }
    },

    /**
     * 导入仪表盘
     */
    async importDashboard(data: any) {
      try {
        const res = await http.request('dashboard/importDashboard', {
          data,
        });
        return res.data;
      } catch (error) {
        console.error('Failed to import dashboard:', error);
        throw error;
      }
    },

    /**
     * 导出仪表盘
     */
    async exportDashboard(dashboardId: number) {
      try {
        const res = await http.request('dashboard/exportDashboard', {
          params: { dashboard_id: dashboardId },
        });
        return res.data;
      } catch (error) {
        console.error('Failed to export dashboard:', error);
        throw error;
      }
    },

    /**
     * 复制仪表盘
     */
    async cloneDashboard(dashboardId: number, name: string) {
      try {
        const res = await http.request('dashboard/cloneDashboard', {
          params: { dashboard_id: dashboardId },
          data: { name },
        });
        return res.data;
      } catch (error) {
        console.error('Failed to clone dashboard:', error);
        throw error;
      }
    },

    /**
     * 重置当前仪表盘
     */
    resetCurrentDashboard() {
      this.currentDashboard = null;
      this.dashboardDetail = {};
      this.isEditMode = false;
      this.fullscreenPanel = null;
      this.variableValues = {};
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'dashboard-store',
        storage: localStorage,
        paths: ['refreshInterval', 'timeRange'],
      },
    ],
  },
});
