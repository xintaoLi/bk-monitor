/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent } from 'vue';
import { Table, Loading } from 'bkui-vue';
import { useRetrieveStore } from '@/stores';

/**
 * 检索结果展示
 * 
 * 功能：
 * - 日志列表表格
 * - 趋势图展示
 * - 字段筛选
 * - 分页加载
 * - 上下文日志
 * - 实时日志
 * - 日志导出
 */
export default defineComponent({
  name: 'SearchResult',

  setup() {
    const retrieveStore = useRetrieveStore();

    /**
     * 渲染结果表格
     */
    const renderResultTable = () => {
      return (
        <Table
          data={retrieveStore.searchResult?.list || []}
          pagination={{
            current: 1,
            limit: 50,
            count: retrieveStore.searchResult?.total || 0,
          }}
        >
          {/* TODO: 定义表格列 */}
        </Table>
      );
    };

    /**
     * 渲染趋势图
     */
    const renderTrendChart = () => {
      return (
        <div class='search-result-chart'>
          {/* TODO: 渲染趋势图 */}
          <div style={{ height: '200px', background: '#f0f1f5' }}>
            趋势图占位
          </div>
        </div>
      );
    };

    /**
     * 渲染空状态
     */
    const renderEmpty = () => {
      return (
        <div class='search-result-empty'>
          <div class='empty-content'>
            <div class='empty-icon'>📊</div>
            <div class='empty-text'>暂无数据</div>
            <div class='empty-desc'>请输入搜索条件后查询</div>
          </div>
        </div>
      );
    };

    return () => (
      <div class='search-result'>
        <Loading loading={retrieveStore.isTrendDataLoading}>
          {/* 趋势图 */}
          {renderTrendChart()}

          {/* 结果表格 */}
          <div class='search-result-table'>
            {retrieveStore.searchResult ? renderResultTable() : renderEmpty()}
          </div>
        </Loading>
      </div>
    );
  },
});
