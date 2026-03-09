/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */
import { defineComponent, type PropType } from 'vue'
import { Dialog as TDialog } from 'tdesign-vue-next'
import { Icon as TIcon } from 'tdesign-vue-next'
import './global-dialog.scss'

export interface GlobalDialogProps {
  /** 是否显示对话框 */
  modelValue?: boolean
  /** 对话框标题 */
  title?: string
}

/**
 * 全局对话框组件
 * 全屏模式的对话框，用于重要的业务流程
 */
export const GlobalDialog = defineComponent({
  name: 'GlobalDialog',
  props: {
    modelValue: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    title: {
      type: String as PropType<string>,
      required: true,
      default: '',
    },
  },
  emits: ['update:modelValue', 'close'],
  setup(props, { emit, slots }) {
    const handleClose = () => {
      emit('update:modelValue', false)
      emit('close')
    }

    return () => (
      <TDialog
        visible={props.modelValue}
        width="100%"
        attach="body"
        class="global-dialog"
        showOverlay={false}
        closeBtn={false}
        header={false}
        footer={false}
        draggable={false}
        mode="full-screen"
        onClose={handleClose}
      >
        <div class="global-container">
          <div class="global-title">
            <div />
            <span>{props.title}</span>
            <div
              class="close-icon"
              onClick={handleClose}
            >
              <TIcon name="close" size="32px" />
            </div>
          </div>
          <div class="center-box">
            <div class="content-panel">{slots.default?.()}</div>
          </div>
        </div>
      </TDialog>
    )
  },
})

export default GlobalDialog
