/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent } from 'vue';
import { Button, Table } from 'bkui-vue';

/**
 * 索引集管理
 * 
 * 功能：
 * - 索引集列表
 * - 新建索引集
 * - 编辑索引集
 * - 删除索引集
 * - 索引集详情
 */
export default defineComponent({
  name: 'IndexSet',

  setup() {
    return () => (
      <div class='index-set'>
        <div class='page-header'>
          <h2>索引集管理</h2>
          <Button theme='primary'>新建索引集</Button>
        </div>

        <div class='page-content'>
          <Table
            data={[]}
            columns={[
              { label: '索引集名称', prop: 'index_set_name' },
              { label: '场景', prop: 'scenario_name' },
              { label: '索引数量', prop: 'indices_count' },
              { label: '操作', width: 200 },
            ]}
          />
        </div>
      </div>
    );
  },
});
