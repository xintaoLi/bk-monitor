/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Menu } from 'bkui-vue';
import { useGlobalStore } from '@/stores';

import './index.scss';

/**
 * 管理模块入口
 * 
 * 功能：
 * - 左侧导航菜单
 * - 子路由内容区
 * - 面包屑导航
 */
export default defineComponent({
  name: 'Manage',

  setup() {
    const route = useRoute();
    const router = useRouter();
    const globalStore = useGlobalStore();

    // 当前激活的菜单
    const activeMenu = ref('log-collection');

    // 菜单配置
    const menuConfig = [
      {
        id: 'log-collection',
        name: '日志采集',
        icon: 'icon-file-close',
        path: '/manage/log-collection',
      },
      {
        id: 'index-set',
        name: '索引集管理',
        icon: 'icon-catalog',
        path: '/manage/index-set',
      },
      {
        id: 'clean',
        name: '清洗配置',
        icon: 'icon-funnel',
        path: '/manage/clean',
      },
      {
        id: 'archive',
        name: '归档管理',
        icon: 'icon-archive',
        path: '/manage/archive',
      },
      {
        id: 'extract',
        name: '日志提取',
        icon: 'icon-download-shape',
        path: '/manage/extract',
      },
      {
        id: 'client-log',
        name: '客户端日志',
        icon: 'icon-mobile',
        path: '/manage/client-log',
      },
      {
        id: 'cluster',
        name: 'ES 集群管理',
        icon: 'icon-cluster',
        path: '/manage/cluster',
      },
    ];

    // 当前面包屑
    const breadcrumbs = computed(() => {
      const current = menuConfig.find(item => item.id === activeMenu.value);
      return [
        { name: '管理', path: '/manage' },
        { name: current?.name || '', path: current?.path || '' },
      ];
    });

    /**
     * 菜单点击
     */
    const handleMenuClick = (item: typeof menuConfig[0]) => {
      activeMenu.value = item.id;
      router.push(item.path);
    };

    /**
     * 渲染左侧菜单
     */
    const renderSidebar = () => {
      return (
        <div class='manage-sidebar'>
          <Menu v-model:openedKeys={activeMenu.value}>
            {menuConfig.map(item => (
              <Menu.Item
                key={item.id}
                onClick={() => handleMenuClick(item)}
              >
                <i class={['bk-icon', item.icon]}></i>
                <span>{item.name}</span>
              </Menu.Item>
            ))}
          </Menu>
        </div>
      );
    };

    /**
     * 渲染面包屑
     */
    const renderBreadcrumb = () => {
      return (
        <div class='manage-breadcrumb'>
          {breadcrumbs.value.map((item, index) => (
            <>
              <span
                key={item.path}
                class='breadcrumb-item'
                onClick={() => item.path && router.push(item.path)}
              >
                {item.name}
              </span>
              {index < breadcrumbs.value.length - 1 && (
                <span class='breadcrumb-separator'>/</span>
              )}
            </>
          ))}
        </div>
      );
    };

    /**
     * 渲染内容区
     */
    const renderContent = () => {
      return (
        <div class='manage-content'>
          {renderBreadcrumb()}
          <div class='manage-main'>
            <router-view />
          </div>
        </div>
      );
    };

    return () => (
      <div class='manage-root'>
        {renderSidebar()}
        {renderContent()}
      </div>
    );
  },
});
