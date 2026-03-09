/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent } from 'vue';
import { Result, Button } from 'bkui-vue';
import { useRouter } from 'vue-router';

/**
 * 404 错误页面
 */
export default defineComponent({
  name: 'Error404',

  setup() {
    const router = useRouter();

    const handleGoHome = () => {
      router.push('/');
    };

    return () => (
      <div class='error-page'>
        <Result
          type='error'
          title='404'
          subTitle='页面不存在'
        >
          <Button theme='primary' onClick={handleGoHome}>
            返回首页
          </Button>
        </Result>
      </div>
    );
  },
});
