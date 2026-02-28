/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent, computed } from 'vue';
import { useRetrieveStore, useGlobalStore } from '@/stores';
import { useRetrieveInit } from '@/composables/use-retrieve-init';
import SearchBar from './search-bar';
import SearchResult from './search-result';
import Toolbar from './toolbar';
import Container from './container';
import Favorite from './favorite';

import './index.scss';

/**
 * 检索主页
 * 
 * 核心功能：
 * - 索引集选择
 * - 搜索框（关键字、条件过滤）
 * - 日志列表展示
 * - 趋势图展示
 * - 字段侧栏
 * - 收藏夹管理
 * - 上下文日志
 * - 实时日志
 * - 导出功能
 */
export default defineComponent({
  name: 'Retrieve',
  
  setup() {
    const retrieveStore = useRetrieveStore();
    const globalStore = useGlobalStore();

    // 初始化检索页面
    const {
      isSearchContextStickyTop,
      isSearchResultStickyTop,
      stickyStyle,
      contentStyle,
      isPreApiLoaded,
    } = useRetrieveInit();

    // 是否文本省略从开始
    const isStartTextEllipsis = computed(() => {
      // TODO: 从配置中读取
      return false;
    });

    /**
     * 渲染结果内容
     */
    const renderResultContent = () => {
      if (isPreApiLoaded.value) {
        return [
          <Toolbar />,
          <Container>
            <SearchBar
              class={{
                'is-sticky-top': isSearchContextStickyTop.value,
                'is-sticky-top-result': isSearchResultStickyTop.value,
              }}
            />
            <SearchResult />
          </Container>,
        ];
      }

      return <div style={{ minHeight: '50vh', width: '100%' }}></div>;
    };

    return () => (
      <div
        style={stickyStyle.value}
        class={[
          'retrieve-root',
          { 'is-start-text-ellipsis': isStartTextEllipsis.value },
          {
            'is-sticky-top': isSearchContextStickyTop.value,
            'is-sticky-top-result': isSearchResultStickyTop.value,
          },
        ]}
        v-bkloading={{ isLoading: !isPreApiLoaded.value }}
      >
        <Favorite />
        <div style={contentStyle.value} class='retrieve-content'>
          {renderResultContent()}
        </div>
      </div>
    );
  },
});
