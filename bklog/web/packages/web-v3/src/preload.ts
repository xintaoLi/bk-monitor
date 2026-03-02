/**
 * preload.ts - 应用预加载
 * 对齐原 src/preload.ts 逻辑：
 * - 并行拉取空间列表、用户信息、全局配置、用户引导
 * - 处理外部版空间权限菜单
 */

import http from '@/api';
import type { SpaceItem, GlobalsData, UserInfo } from '@/types';
import { useAppStore } from '@/stores/app';
import jsCookie from 'js-cookie';

// ==================== URL 参数解析 ====================
function getUrlArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const search = window.location.search.slice(1);
  const hash = window.location.hash;

  // 解析 query string
  search.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key) args[key] = decodeURIComponent(value || '');
  });

  // 解析 hash query
  const hashQuery = hash.includes('?') ? hash.split('?')[1] : '';
  hashQuery.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key) args[key] = decodeURIComponent(value || '');
  });

  return args;
}

// ==================== 外部版菜单权限 ====================
export function getExternalMenuListBySpace(space: SpaceItem): string[] {
  const list: string[] = [];
  const permissions = (space as SpaceItem & { external_permission?: string[] }).external_permission || [];
  for (const permission of permissions) {
    if (permission === 'log_search') {
      list.push('retrieve');
    } else if (permission === 'log_extract') {
      list.push('manage');
    }
  }
  return list;
}

// ==================== 根据 indexId 获取空间 ====================
async function getSpaceByIndexId(indexId: string): Promise<{ spaceUid: string; bkBizId: string } | null> {
  try {
    const data = await http.request<{ space_uid: string; bk_biz_id: string | number }>(
      'retrieve/getSpaceByIndexId',
      { query: { index_set_id: indexId } },
      { catchIsShowMessage: false },
    );
    return {
      spaceUid: String(data.space_uid),
      bkBizId: String(data.bk_biz_id),
    };
  } catch {
    return null;
  }
}

// ==================== 主预加载函数 ====================
export interface PreloadResult {
  spaceUid: string;
  bkBizId: string;
  externalMenu: string[];
}

export default async function preload(): Promise<PreloadResult> {
  const appStore = useAppStore();
  const urlArgs = getUrlArgs();

  // 1. 并行拉取基础数据
  const [spaceResult, userResult, globalsResult, guideResult] = await Promise.allSettled([
    // 空间列表
    http.request<SpaceItem[]>('space/getMySpaceList', {}, { fromCache: true }),
    // 用户信息
    http.request<UserInfo>('userInfo/getUsername', {}, { fromCache: true }),
    // 全局配置
    http.request<GlobalsData>('collect/globals', {}, { fromCache: true }),
    // 用户引导
    http.request<unknown>('meta/getUserGuide', {}, { catchIsShowMessage: false }),
  ]);

  // 2. 处理空间列表
  let spaceList: SpaceItem[] = [];
  if (spaceResult.status === 'fulfilled') {
    spaceList = (spaceResult.value as SpaceItem[]) || [];
    // 格式化空间数据
    spaceList.forEach((item) => {
      item.bk_biz_id = String(item.bk_biz_id);
      item.space_uid = String(item.space_uid);
    });
  }
  appStore.setMySpaceList(spaceList);

  // 3. 处理用户信息
  if (userResult.status === 'fulfilled') {
    appStore.setUserMeta(userResult.value as UserInfo);
  }

  // 4. 处理全局配置
  if (globalsResult.status === 'fulfilled') {
    appStore.setGlobalsData((globalsResult.value as GlobalsData) || {});
  }

  // 5. 确定当前空间
  let spaceUid = urlArgs.spaceUid || urlArgs.space_uid || '';
  let bkBizId = urlArgs.bizId || urlArgs.bk_biz_id || '';

  // 如果没有 spaceUid，尝试通过 indexId 获取
  if (!spaceUid && urlArgs.indexId) {
    const spaceInfo = await getSpaceByIndexId(urlArgs.indexId);
    if (spaceInfo) {
      spaceUid = spaceInfo.spaceUid;
      bkBizId = spaceInfo.bkBizId;
    }
  }

  // 如果仍然没有，使用第一个空间
  if (!spaceUid && spaceList.length > 0) {
    spaceUid = spaceList[0].space_uid;
    bkBizId = String(spaceList[0].bk_biz_id);
  }

  appStore.updateSpace(spaceUid, bkBizId);

  // 6. 处理外部版菜单
  let externalMenu: string[] = [];
  if (appStore.isExternal) {
    const currentSpace = spaceList.find((item) => item.space_uid === spaceUid);
    if (currentSpace) {
      externalMenu = getExternalMenuListBySpace(currentSpace);
    }
  }
  appStore.setExternalMenu(externalMenu);

  // 7. development 环境拉取环境常量
  if (process.env.NODE_ENV === 'development') {
    try {
      const envData = await http.request<Record<string, unknown>>(
        'meta/getEnvConstant',
        {},
        { catchIsShowMessage: false },
      );
      if (envData) {
        Object.entries(envData).forEach(([key, value]) => {
          (window as unknown as Record<string, unknown>)[key] = value;
        });
      }
    } catch {
      // 忽略
    }
  }

  return { spaceUid, bkBizId: String(bkBizId), externalMenu };
}
