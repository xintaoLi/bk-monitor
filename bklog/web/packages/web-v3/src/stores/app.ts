/**
 * app.ts - 应用全局状态 Store（Pinia）
 * 对齐原 Vuex store/index.js 中的全局状态：
 * - 空间/业务信息
 * - 菜单状态
 * - 全局配置
 * - 鉴权弹窗
 * - 外部版标志
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SpaceItem, MenuItem, GlobalsData, UserInfo } from '@/types';

export const useAppStore = defineStore('app', () => {
  // ==================== 空间/业务 ====================
  const spaceUid = ref<string>('');
  const bkBizId = ref<string | number>('');
  const mySpaceList = ref<SpaceItem[]>([]);
  const space = ref<SpaceItem | null>(null);
  const timezone = ref<string>('');

  // ==================== 用户 ====================
  const userMeta = ref<UserInfo>({ username: '' });

  // ==================== 菜单 ====================
  const topMenu = ref<MenuItem[]>([]);
  const currentMenu = ref<MenuItem | null>(null);
  const activeManageNav = ref<string>('');
  const activeManageSubNav = ref<string>('');

  // ==================== 全局配置 ====================
  const globalsData = ref<GlobalsData>({});
  const maskingToggle = ref<boolean>(false);
  const globalSettingList = ref<unknown[]>([]);

  // ==================== 外部版 ====================
  const isExternal = ref<boolean>(String(window.IS_EXTERNAL) === 'true');
  const externalMenu = ref<string[]>([]);

  // ==================== 鉴权弹窗 ====================
  const authDialogData = ref<Record<string, unknown> | null>(null);
  const authDialogVisible = ref<boolean>(false);

  // ==================== 全局设置弹窗 ====================
  const globalSettingVisible = ref<boolean>(false);
  const globalSettingActiveTab = ref<string>('');

  // ==================== 计算属性 ====================
  const currentSpace = computed(() => {
    return mySpaceList.value.find((item) => item.space_uid === spaceUid.value) || null;
  });

  const manageMenu = computed(() => {
    return topMenu.value.find((item) => item.id === 'manage')?.children || [];
  });

  // ==================== Actions ====================
  function updateSpace(uid: string, bizId?: string | number) {
    spaceUid.value = uid;
    if (bizId !== undefined) {
      bkBizId.value = bizId;
    }
    // 同步 space 对象
    space.value = mySpaceList.value.find((item) => item.space_uid === uid) || null;
  }

  function setMySpaceList(list: SpaceItem[]) {
    mySpaceList.value = list;
  }

  function setUserMeta(info: UserInfo) {
    userMeta.value = info;
  }

  function setMenuList(menus: MenuItem[]) {
    topMenu.value = menus;
  }

  function setCurrentMenu(menu: MenuItem | null) {
    currentMenu.value = menu;
  }

  function setActiveManageNav(navId: string, subNavId = '') {
    activeManageNav.value = navId;
    activeManageSubNav.value = subNavId;
  }

  function setGlobalsData(data: GlobalsData) {
    globalsData.value = data;
    maskingToggle.value = Boolean(data.masking_toggle);
  }

  function setGlobalSettingList(list: unknown[]) {
    globalSettingList.value = list;
  }

  function setExternalMenu(menus: string[]) {
    externalMenu.value = menus;
  }

  function setAuthDialogData(data: Record<string, unknown> | null) {
    authDialogData.value = data;
    authDialogVisible.value = data !== null;
  }

  function closeAuthDialog() {
    authDialogData.value = null;
    authDialogVisible.value = false;
  }

  function openGlobalSetting(tab = '') {
    globalSettingActiveTab.value = tab;
    globalSettingVisible.value = true;
  }

  function closeGlobalSetting() {
    globalSettingVisible.value = false;
  }

  function setTimezone(tz: string) {
    timezone.value = tz;
  }

  return {
    // state
    spaceUid,
    bkBizId,
    mySpaceList,
    space,
    timezone,
    userMeta,
    topMenu,
    currentMenu,
    activeManageNav,
    activeManageSubNav,
    globalsData,
    maskingToggle,
    globalSettingList,
    isExternal,
    externalMenu,
    authDialogData,
    authDialogVisible,
    globalSettingVisible,
    globalSettingActiveTab,
    // computed
    currentSpace,
    manageMenu,
    // actions
    updateSpace,
    setMySpaceList,
    setUserMeta,
    setMenuList,
    setCurrentMenu,
    setActiveManageNav,
    setGlobalsData,
    setGlobalSettingList,
    setExternalMenu,
    setAuthDialogData,
    closeAuthDialog,
    openGlobalSetting,
    closeGlobalSetting,
    setTimezone,
  };
});
