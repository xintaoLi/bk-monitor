import { defineStore } from 'pinia';
import type { SpaceInfo, BizInfo } from '@/types';

interface GlobalState {
  // 空间信息
  spaceUid: string;
  spaceList: SpaceInfo[];
  currentSpace: SpaceInfo | null;

  // 业务信息
  bkBizId: number;
  bizList: BizInfo[];
  currentBiz: BizInfo | null;

  // 索引集信息
  indexSetId: number;

  // 全局配置
  isExternal: boolean; // 是否外部版
  runVer: string; // 运行版本
  featureToggle: Record<string, any>; // 功能开关
  
  // UI 状态
  sidebarCollapsed: boolean;
  fullscreen: boolean;
}

/**
 * 全局状态管理
 */
export const useGlobalStore = defineStore('global', {
  state: (): GlobalState => ({
    spaceUid: '',
    spaceList: [],
    currentSpace: null,

    bkBizId: 0,
    bizList: [],
    currentBiz: null,

    indexSetId: 0,

    isExternal: window.IS_EXTERNAL || false,
    runVer: window.RUN_VER || 'open',
    featureToggle: window.FEATURE_TOGGLE || {},

    sidebarCollapsed: false,
    fullscreen: false,
  }),

  getters: {
    /**
     * 获取当前空间名称
     */
    spaceName: (state): string => {
      return state.currentSpace?.space_name || '';
    },

    /**
     * 获取当前业务名称
     */
    bizName: (state): string => {
      return state.currentBiz?.bk_biz_name || '';
    },

    /**
     * 检查功能是否开启
     */
    isFeatureEnabled: (state) => {
      return (featureName: string): boolean => {
        return !!state.featureToggle[featureName];
      };
    },
  },

  actions: {
    /**
     * 设置空间 UID
     */
    setSpaceUid(spaceUid: string) {
      this.spaceUid = spaceUid;
      // 更新当前空间信息
      const space = this.spaceList.find(item => item.space_uid === spaceUid);
      if (space) {
        this.currentSpace = space;
      }
    },

    /**
     * 设置空间列表
     */
    setSpaceList(spaceList: SpaceInfo[]) {
      this.spaceList = spaceList;
    },

    /**
     * 设置业务 ID
     */
    setBkBizId(bkBizId: number) {
      this.bkBizId = bkBizId;
      // 更新当前业务信息
      const biz = this.bizList.find(item => item.bk_biz_id === bkBizId);
      if (biz) {
        this.currentBiz = biz;
      }
    },

    /**
     * 设置业务列表
     */
    setBizList(bizList: BizInfo[]) {
      this.bizList = bizList;
    },

    /**
     * 设置索引集 ID
     */
    setIndexSetId(indexSetId: number) {
      this.indexSetId = indexSetId;
    },

    /**
     * 切换侧边栏
     */
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    /**
     * 切换全屏
     */
    toggleFullscreen() {
      this.fullscreen = !this.fullscreen;
    },

    /**
     * 获取空间列表
     */
    async fetchSpaceList() {
      try {
        // TODO: 调用API获取空间列表
        // const data = await http.get('/api/space/list');
        // this.setSpaceList(data);
      } catch (error) {
        console.error('Failed to fetch space list:', error);
      }
    },

    /**
     * 获取业务列表
     */
    async fetchBizList() {
      try {
        // TODO: 调用API获取业务列表
        // const data = await http.get('/api/biz/list');
        // this.setBizList(data);
      } catch (error) {
        console.error('Failed to fetch biz list:', error);
      }
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'global-store',
        storage: localStorage,
        paths: ['spaceUid', 'bkBizId', 'indexSetId', 'sidebarCollapsed'],
      },
    ],
  },
});
