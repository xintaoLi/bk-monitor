/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 *
 * License for 蓝鲸智云PaaS平台 (BlueKing PaaS):
 *
 * ---------------------------------------------------
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
import { defineComponent, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import './empty-status.scss'

export type EmptyType = 'empty' | 'search-empty' | '500' | '403'
export type SceneType = 'part' | 'page'

export interface EmptyStatusProps {
  /** 空状态类型 */
  emptyType?: EmptyType
  /** 场景类型 */
  scene?: SceneType
  /** 是否显示操作按钮 */
  showOperation?: boolean
  /** 是否显示文本 */
  showText?: boolean
}

/**
 * 空状态组件
 * 支持多种空状态展示和操作
 */
export const EmptyStatus = defineComponent({
  name: 'EmptyStatus',
  props: {
    emptyType: {
      type: String as PropType<EmptyType>,
      default: 'empty',
    },
    scene: {
      type: String as PropType<SceneType>,
      default: 'part',
    },
    showOperation: {
      type: Boolean as PropType<boolean>,
      default: true,
    },
    showText: {
      type: Boolean as PropType<boolean>,
      default: true,
    },
  },
  emits: ['operation'],
  setup(props, { emit, slots }) {
    const { t } = useI18n()

    const defaultTextMap = computed(() => ({
      empty: t('暂无数据'),
      'search-empty': t('搜索结果为空'),
      500: t('数据获取异常'),
      403: t('无业务权限'),
    }))

    const typeText = computed(() => defaultTextMap.value[props.emptyType])

    const handleOperation = (type: string) => {
      emit('operation', type)
    }

    const renderSearchEmptyOperation = () => (
      <p class="operation-text">
        {t('可以尝试')}
        <span style="margin: 0 3px">{t('调整关键词')}</span>
        {t('或')}
        <span
          class="operation-btn"
          style="margin-left: 3px"
          onClick={() => handleOperation('clear-filter')}
        >
          {t('清空筛选条件')}
        </span>
      </p>
    )

    const render500Operation = () => (
      <span
        class="operation-btn"
        onClick={() => handleOperation('refresh')}
      >
        {t('刷新')}
      </span>
    )

    return () => (
      <div class="empty-status-container">
        <div class={`empty-exception empty-exception-${props.emptyType}`}>
          <div class="exception-image" />
          <div class="empty-text-content">
            {props.showText && <p class="empty-text">{typeText.value}</p>}
            {slots.default ? (
              <p class="empty-text">{slots.default()}</p>
            ) : (
              <>
                {props.emptyType === 'search-empty' && renderSearchEmptyOperation()}
                {props.emptyType === '500' && render500Operation()}
              </>
            )}
          </div>
        </div>
      </div>
    )
  },
})

export default EmptyStatus
