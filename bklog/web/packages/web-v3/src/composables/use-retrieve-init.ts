/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGlobalStore, useRetrieveStore } from '@/stores';

/**
 * 检索页面初始化逻辑
 * 
 * 核心流程：
 * 1. 解析 URL 参数
 * 2. 更新 Store 状态
 * 3. 拉取索引集列表
 * 4. 拉取字段信息
 * 5. 执行查询
 * 6. 处理收藏夹
 * 7. 监听空间切换
 */
export function useRetrieveInit() {
  const route = useRoute();
  const router = useRouter();
  const globalStore = useGlobalStore();
  const retrieveStore = useRetrieveStore();

  // 加载状态
  const isPreApiLoaded = ref(false);

  // 粘性定位状态
  const isSearchContextStickyTop = ref(false);
  const isSearchResultStickyTop = ref(false);

  // 样式
  const stickyStyle = computed(() => ({
    // TODO: 根据实际需求计算
  }));

  const contentStyle = computed(() => ({
    // TODO: 根据实际需求计算
  }));

  /**
   * 解析 URL 参数
   */
  const parseUrlParams = () => {
    const { indexId, spaceUid, keyword, from, to } = route.query;

    // 更新空间 UID
    if (spaceUid && typeof spaceUid === 'string') {
      globalStore.setSpaceUid(spaceUid);
    }

    // 更新索引集 ID
    if (indexId && typeof indexId === 'string') {
      globalStore.setIndexSetId(Number(indexId));
    }

    // 更新搜索参数
    if (keyword || from || to) {
      retrieveStore.updateSearchParams({
        keyword: keyword as string,
        start_time: from as string,
        end_time: to as string,
      });
    }
  };

  /**
   * 初始化索引集列表
   */
  const initIndexSetList = async () => {
    if (!globalStore.spaceUid) {
      console.warn('Space UID is required');
      return;
    }

    try {
      await retrieveStore.getIndexSetList({
        spaceUid: globalStore.spaceUid,
        isLoading: true,
      });
    } catch (error) {
      console.error('Failed to fetch index set list:', error);
    }
  };

  /**
   * 初始化收藏列表
   */
  const initFavoriteList = async () => {
    if (!globalStore.spaceUid) {
      return;
    }

    try {
      await retrieveStore.getFavoriteList(globalStore.spaceUid);
    } catch (error) {
      console.error('Failed to fetch favorite list:', error);
    }
  };

  /**
   * 执行检索
   */
  const executeSearch = async () => {
    // TODO: 实现检索逻辑
    console.log('Execute search with params:', retrieveStore.searchParams);
  };

  /**
   * 初始化页面
   */
  const initPage = async () => {
    try {
      // 1. 解析 URL 参数
      parseUrlParams();

      // 2. 拉取索引集列表
      await initIndexSetList();

      // 3. 拉取收藏列表
      await initFavoriteList();

      // 4. 如果有搜索参数，执行查询
      if (retrieveStore.searchParams?.keyword) {
        await executeSearch();
      }

      isPreApiLoaded.value = true;
    } catch (error) {
      console.error('Failed to initialize retrieve page:', error);
      isPreApiLoaded.value = true;
    }
  };

  /**
   * 监听空间切换
   */
  watch(
    () => globalStore.spaceUid,
    async (newSpaceUid, oldSpaceUid) => {
      if (newSpaceUid && newSpaceUid !== oldSpaceUid) {
        // 重新初始化
        isPreApiLoaded.value = false;
        await initPage();
      }
    }
  );

  /**
   * 监听路由变化
   */
  watch(
    () => route.query,
    (newQuery, oldQuery) => {
      // URL 参数变化时重新解析
      if (JSON.stringify(newQuery) !== JSON.stringify(oldQuery)) {
        parseUrlParams();
      }
    }
  );

  onMounted(() => {
    initPage();
  });

  return {
    isPreApiLoaded,
    isSearchContextStickyTop,
    isSearchResultStickyTop,
    stickyStyle,
    contentStyle,
    initPage,
    executeSearch,
  };
}
