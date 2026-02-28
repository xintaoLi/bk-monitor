/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent, ref } from 'vue';
import { Sideslider, Button, Input, Tree } from 'bkui-vue';
import { useRetrieveStore } from '@/stores';

/**
 * 收藏夹管理
 * 
 * 功能：
 * - 收藏列表展示
 * - 收藏分组管理
 * - 收藏快速搜索
 * - 收藏编辑/删除
 */
export default defineComponent({
  name: 'Favorite',

  setup() {
    const retrieveStore = useRetrieveStore();
    const isShow = ref(false);
    const searchKeyword = ref('');

    /**
     * 打开收藏夹
     */
    const handleOpen = () => {
      isShow.value = true;
    };

    /**
     * 关闭收藏夹
     */
    const handleClose = () => {
      isShow.value = false;
    };

    /**
     * 选择收藏项
     */
    const handleSelect = (item: any) => {
      console.log('Favorite selected:', item);
      // TODO: 应用收藏的搜索条件
      handleClose();
    };

    /**
     * 渲染收藏列表
     */
    const renderFavoriteList = () => {
      return (
        <div class='favorite-list'>
          {retrieveStore.favoriteList.map(item => (
            <div
              key={item.id}
              class='favorite-item'
              onClick={() => handleSelect(item)}
            >
              <div class='favorite-item-name'>{item.name}</div>
              <div class='favorite-item-desc'>{item.description}</div>
            </div>
          ))}
        </div>
      );
    };

    return () => (
      <>
        {/* 收藏夹触发按钮 */}
        <Button class='favorite-trigger' onClick={handleOpen}>
          <i class='bk-icon icon-star'></i>
          收藏夹
        </Button>

        {/* 收藏夹侧滑 */}
        <Sideslider
          v-model:isShow={isShow.value}
          title='收藏夹'
          width={600}
          quick-close
        >
          <div class='favorite-content'>
            {/* 搜索框 */}
            <Input
              v-model={searchKeyword.value}
              placeholder='搜索收藏'
              clearable
            />

            {/* 收藏列表 */}
            {renderFavoriteList()}
          </div>
        </Sideslider>
      </>
    );
  },
});
