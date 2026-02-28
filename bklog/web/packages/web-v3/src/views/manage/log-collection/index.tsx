/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent, ref, onMounted } from 'vue';
import { Button, Table, Dialog } from 'bkui-vue';
import { useCollectStore } from '@/stores';

/**
 * 日志采集管理
 * 
 * 功能：
 * - 采集项列表展示
 * - 新建采集项
 * - 编辑采集项
 * - 删除采集项
 * - 启动/停止采集
 * - 查看采集状态
 */
export default defineComponent({
  name: 'LogCollection',

  setup() {
    const collectStore = useCollectStore();
    const loading = ref(false);

    /**
     * 加载采集列表
     */
    const loadCollectorList = async () => {
      loading.value = true;
      try {
        await collectStore.fetchCollectorList({});
      } catch (error) {
        console.error('Failed to load collector list:', error);
      } finally {
        loading.value = false;
      }
    };

    /**
     * 新建采集
     */
    const handleCreate = () => {
      console.log('Create collector');
      // TODO: 跳转到创建页面或打开弹窗
    };

    /**
     * 编辑采集
     */
    const handleEdit = (row: any) => {
      console.log('Edit collector:', row);
      // TODO: 跳转到编辑页面或打开弹窗
    };

    /**
     * 删除采集
     */
    const handleDelete = (row: any) => {
      Dialog.confirm({
        title: '确认删除',
        message: `确定删除采集项 "${row.collector_config_name}" 吗？`,
        confirmFn: async () => {
          try {
            await collectStore.deleteCollector(row.collector_config_id);
            loadCollectorList();
          } catch (error) {
            console.error('Failed to delete collector:', error);
          }
        },
      });
    };

    /**
     * 表格列配置
     */
    const columns = [
      { label: '采集项名称', prop: 'collector_config_name' },
      { label: '采集场景', prop: 'collector_scenario_name' },
      { label: '业务ID', prop: 'bk_biz_id' },
      { label: '状态', prop: 'is_active' },
      { label: '创建人', prop: 'created_by' },
      { label: '创建时间', prop: 'created_at' },
      {
        label: '操作',
        width: 200,
        render: ({ row }: any) => (
          <>
            <Button text onClick={() => handleEdit(row)}>编辑</Button>
            <Button text onClick={() => handleDelete(row)}>删除</Button>
          </>
        ),
      },
    ];

    onMounted(() => {
      loadCollectorList();
    });

    return () => (
      <div class='log-collection'>
        <div class='log-collection-header'>
          <h2>日志采集</h2>
          <Button theme='primary' onClick={handleCreate}>
            新建采集
          </Button>
        </div>

        <div class='log-collection-content'>
          <Table
            data={collectStore.collectorList}
            columns={columns}
            loading={loading.value}
            pagination={{
              current: 1,
              limit: 20,
              count: collectStore.collectorList.length,
            }}
          />
        </div>
      </div>
    );
  },
});
