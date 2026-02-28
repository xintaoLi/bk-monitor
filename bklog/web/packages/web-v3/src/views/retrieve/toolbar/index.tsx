/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */

import { defineComponent } from 'vue';
import { Button, Dropdown } from 'bkui-vue';

/**
 * 检索工具栏
 * 
 * 功能：
 * - 字段管理
 * - 分享链接
 * - 导出日志
 * - 创建告警
 * - 更多操作
 */
export default defineComponent({
  name: 'Toolbar',

  setup() {
    /**
     * 字段管理
     */
    const handleFieldManage = () => {
      console.log('Field manage clicked');
    };

    /**
     * 分享链接
     */
    const handleShare = () => {
      console.log('Share clicked');
    };

    /**
     * 导出日志
     */
    const handleExport = () => {
      console.log('Export clicked');
    };

    return () => (
      <div class='retrieve-toolbar'>
        <div class='toolbar-left'>
          <Button onClick={handleFieldManage}>
            <i class='bk-icon icon-cog'></i>
            字段管理
          </Button>
        </div>

        <div class='toolbar-right'>
          <Button onClick={handleShare}>
            <i class='bk-icon icon-share'></i>
            分享
          </Button>

          <Button onClick={handleExport}>
            <i class='bk-icon icon-download'></i>
            导出
          </Button>

          <Dropdown>
            {{
              default: () => (
                <Button>
                  更多
                  <i class='bk-icon icon-down-shape'></i>
                </Button>
              ),
              content: () => (
                <div class='toolbar-more-menu'>
                  {/* TODO: 更多菜单项 */}
                </div>
              ),
            }}
          </Dropdown>
        </div>
      </div>
    );
  },
});
