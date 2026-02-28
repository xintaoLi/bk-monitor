/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent } from 'vue';

/**
 * 检索容器
 * 
 * 提供统一的布局容器
 */
export default defineComponent({
  name: 'Container',

  setup(props, { slots }) {
    return () => (
      <div class='retrieve-container'>
        {slots.default?.()}
      </div>
    );
  },
});
