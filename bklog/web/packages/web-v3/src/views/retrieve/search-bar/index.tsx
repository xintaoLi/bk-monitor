/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent, ref } from 'vue';
import { Input, Button, Select, DatePicker } from 'bkui-vue';
import { useRetrieveStore } from '@/stores';

/**
 * 检索搜索栏
 * 
 * 功能：
 * - 索引集选择
 * - 搜索关键字输入
 * - 时间范围选择
 * - 高级过滤条件
 * - 搜索历史
 * - 收藏快捷入口
 */
export default defineComponent({
  name: 'SearchBar',

  setup() {
    const retrieveStore = useRetrieveStore();
    
    const keyword = ref('');
    const timeRange = ref<[string, string]>(['', '']);

    /**
     * 执行搜索
     */
    const handleSearch = () => {
      retrieveStore.updateSearchParams({
        keyword: keyword.value,
        start_time: timeRange.value[0],
        end_time: timeRange.value[1],
      });

      // TODO: 触发搜索
      console.log('Search triggered:', retrieveStore.searchParams);
    };

    /**
     * 清空搜索
     */
    const handleClear = () => {
      keyword.value = '';
      timeRange.value = ['', ''];
      retrieveStore.updateSearchParams({});
    };

    return () => (
      <div class='search-bar'>
        <div class='search-bar-main'>
          {/* 索引集选择 */}
          <Select
            class='search-bar-index'
            v-model={retrieveStore.searchParams.indexId}
            placeholder='选择索引集'
          >
            {/* TODO: 渲染索引集选项 */}
          </Select>

          {/* 搜索输入框 */}
          <Input
            class='search-bar-input'
            v-model={keyword.value}
            placeholder='请输入搜索关键字'
            clearable
            onEnter={handleSearch}
          />

          {/* 时间范围选择 */}
          <DatePicker
            class='search-bar-time'
            v-model={timeRange.value}
            type='datetimerange'
            placeholder='选择时间范围'
          />

          {/* 搜索按钮 */}
          <Button theme='primary' onClick={handleSearch}>
            搜索
          </Button>

          {/* 清空按钮 */}
          <Button onClick={handleClear}>
            清空
          </Button>
        </div>

        {/* TODO: 高级筛选 */}
        {/* TODO: 搜索历史 */}
        {/* TODO: 快捷收藏 */}
      </div>
    );
  },
});
