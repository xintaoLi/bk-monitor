import { defineStore } from 'pinia';
import type { UserInfo } from '@/types';

interface UserState {
  userInfo: UserInfo | null;
  isLogin: boolean;
  permissions: string[];
}

/**
 * 用户状态管理
 */
export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    userInfo: null,
    isLogin: false,
    permissions: [],
  }),

  getters: {
    /**
     * 获取用户名
     */
    username: (state): string => {
      return state.userInfo?.username || '';
    },

    /**
     * 获取用户中文名
     */
    chineseName: (state): string => {
      return state.userInfo?.chinese_name || '';
    },

    /**
     * 检查是否有某个权限
     */
    hasPermission: (state) => {
      return (permission: string): boolean => {
        return state.permissions.includes(permission);
      };
    },
  },

  actions: {
    /**
     * 设置用户信息
     */
    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo;
      this.isLogin = true;
    },

    /**
     * 设置权限列表
     */
    setPermissions(permissions: string[]) {
      this.permissions = permissions;
    },

    /**
     * 清除用户信息
     */
    clearUserInfo() {
      this.userInfo = null;
      this.isLogin = false;
      this.permissions = [];
    },

    /**
     * 获取用户信息
     */
    async fetchUserInfo() {
      try {
        // TODO: 调用API获取用户信息
        // const data = await http.get('/api/user/info');
        // this.setUserInfo(data);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    },
  },

  persist: {
    enabled: false, // 是否持久化
  },
});
