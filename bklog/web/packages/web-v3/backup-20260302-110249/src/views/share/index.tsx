/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import { Result, Button } from 'bkui-vue';

/**
 * 分享页面
 * 
 * 用于展示分享的检索结果
 */
export default defineComponent({
  name: 'Share',

  setup() {
    const route = useRoute();
    const shareId = route.params.id as string;

    return () => (
      <div class='share-page'>
        <div class='share-content'>
          <Result
            title='分享页面'
            subTitle={`分享ID: ${shareId}`}
            icon='success'
          >
            <Button theme='primary'>查看详情</Button>
          </Result>
        </div>
      </div>
    );
  },
});
