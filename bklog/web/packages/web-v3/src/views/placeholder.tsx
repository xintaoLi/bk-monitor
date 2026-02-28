/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PlaceholderPage',
  setup(_, { attrs }) {
    const title = (attrs.title as string) || '页面';
    return () => (
      <div class='page-content' style={{ padding: '24px', textAlign: 'center' }}>
        <h2>{title}</h2>
        <p style={{ color: '#979ba5', marginTop: '16px' }}>页面开发中...</p>
      </div>
    );
  },
});
