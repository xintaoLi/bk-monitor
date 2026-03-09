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

/**
 * 无权限页面
 */
export default defineComponent({
  name: 'Unauthorized',

  setup() {
    const handleApplyPermission = () => {
      console.log('Apply permission');
      // TODO: 跳转到权限申请页面
    };

    return () => (
      <div class='error-page'>
        <Result
          type='error'
          title='403'
          subTitle='无权限访问'
        >
          <Button theme='primary' onClick={handleApplyPermission}>
            申请权限
          </Button>
        </Result>
      </div>
    );
  },
});
