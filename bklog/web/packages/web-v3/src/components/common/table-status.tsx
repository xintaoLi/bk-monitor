/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */
import { defineComponent, type PropType } from 'vue'
import { Icon as TIcon } from 'tdesign-vue-next'
import { useI18n } from 'vue-i18n'
import './table-status.scss'

export interface TableStatusProps {
  /** 是否为错误状态 */
  isError: boolean
}

/**
 * 表格状态组件
 * 用于在表格中显示成功/失败状态
 */
export const TableStatus = defineComponent({
  name: 'TableStatus',
  props: {
    isError: {
      type: Boolean as PropType<boolean>,
      required: true,
    },
  },
  setup(props) {
    const { t } = useI18n()

    return () => (
      <div class={['table-status-container', props.isError ? 'failed' : 'success']}>
        <TIcon name={props.isError ? 'close-circle-filled' : 'check-circle-filled'} />
        <span class="text">{props.isError ? t('失败') : t('成功')}</span>
      </div>
    )
  },
})

export default TableStatus
