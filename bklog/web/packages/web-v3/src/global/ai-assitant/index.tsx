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
 * AI Assistant 组件（占位）
 * TODO: 实现完整的 AI 助手功能
 */
export default defineComponent({
  name: 'AiAssistant',
  
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  
  emits: ['close'],
  
  setup(props, { emit }) {
    const handleClose = () => {
      emit('close');
    };
    
    return () => {
      if (!props.visible) {
        return null;
      }
      
      return (
        <div class="ai-assistant-placeholder">
          <div class="ai-assistant-header">
            <span>AI Assistant</span>
            <t-button onClick={handleClose}>Close</t-button>
          </div>
          <div class="ai-assistant-content">
            <p>AI Assistant feature is under development.</p>
          </div>
        </div>
      );
    };
  },
});
