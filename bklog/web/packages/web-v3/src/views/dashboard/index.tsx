/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent, ref, onMounted } from 'vue';
import { Button, Card, Grid } from 'tdesign-vue-next';
import { useDashboardStore } from '@/stores';
import { useRouter } from 'vue-router';

/**
 * 仪表盘首页
 * 
 * 功能：
 * - 仪表盘列表展示
 * - 创建仪表盘
 * - 导入仪表盘
 * - 收藏仪表盘
 */
export default defineComponent({
  name: 'DashboardHome',

  setup() {
    const router = useRouter();
    const dashboardStore = useDashboardStore();
    const loading = ref(false);

    /**
     * 加载仪表盘列表
     */
    const loadDashboardList = async () => {
      loading.value = true;
      try {
        await dashboardStore.fetchDashboardList();
      } catch (error) {
        console.error('Failed to load dashboard list:', error);
      } finally {
        loading.value = false;
      }
    };

    /**
     * 创建仪表盘
     */
    const handleCreate = () => {
      router.push('/dashboard/create');
    };

    /**
     * 导入仪表盘
     */
    const handleImport = () => {
      router.push('/dashboard/import');
    };

    /**
     * 查看仪表盘
     */
    const handleView = (item: any) => {
      router.push(`/dashboard/${item.id}`);
    };

    onMounted(() => {
      loadDashboardList();
    });

    return () => (
      <div class='dashboard-home'>
        <div class='dashboard-header'>
          <h2>仪表盘</h2>
          <div class='dashboard-actions'>
            <Button onClick={handleImport}>导入仪表盘</Button>
            <Button theme='primary' onClick={handleCreate}>
              创建仪表盘
            </Button>
          </div>
        </div>

        <div class='dashboard-content' v-bkloading={{ isLoading: loading.value }}>
          <Grid cols={3} gap={16}>
            {dashboardStore.dashboardList.map(item => (
              <Card
                key={item.id}
                title={item.name}
                onClick={() => handleView(item)}
                hoverable
              >
                <div class='dashboard-card-content'>
                  <p>{item.desc || '暂无描述'}</p>
                  <div class='dashboard-card-meta'>
                    <span>创建人：{item.created_by}</span>
                    <span>创建时间：{item.created_at}</span>
                  </div>
                </div>
              </Card>
            ))}
          </Grid>

          {dashboardStore.dashboardList.length === 0 && !loading.value && (
            <div class='dashboard-empty'>
              <div class='empty-content'>
                <div class='empty-icon'>📊</div>
                <div class='empty-text'>暂无仪表盘</div>
                <div class='empty-desc'>请创建或导入仪表盘</div>
                <Button theme='primary' onClick={handleCreate}>
                  立即创建
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
});
