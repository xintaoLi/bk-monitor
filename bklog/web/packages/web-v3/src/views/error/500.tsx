/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent } from 'vue';
import { Result, Button } from 'tdesign-vue-next';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Error500',
  setup() {
    const router = useRouter();
    return () => (
      <Result
        type='error'
        title='500'
        subTitle='服务器错误'
      >
        <Button theme='primary' onClick={() => router.push('/')}>
          返回首页
        </Button>
      </Result>
    );
  },
});
