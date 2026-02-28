/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */
import { defineComponent, type PropType } from 'vue'
import { Button as TButton } from 'tdesign-vue-next'
import { useI18n } from 'vue-i18n'
import './welcome-page.scss'

export interface WelcomePageData {
  /** 新业务接入 */
  newBusiness?: {
    url: string
  }
  /** 获取权限 */
  getAccess?: {
    url?: string
    businessName?: string
    operatorId?: string
  }
  /** 业务 DEMO */
  demoBusiness?: {
    url: string
  }
}

export interface WelcomePageProps {
  /** 欢迎页数据 */
  data: WelcomePageData
}

/**
 * 欢迎页组件
 * 用于展示新业务接入、权限申请、业务 DEMO 的引导卡片
 */
export const WelcomePage = defineComponent({
  name: 'WelcomePage',
  props: {
    data: {
      type: Object as PropType<WelcomePageData>,
      default: () => ({
        newBusiness: { url: '' },
        getAccess: { url: '', businessName: '', operatorId: '' },
        demoBusiness: { url: '' },
      }),
    },
  },
  setup(props) {
    const { t } = useI18n()

    const handleMouseEnter = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLElement
      const button = card.querySelector('.t-button')
      if (button) {
        button.classList.add('hover-state')
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLElement
      const button = card.querySelector('.t-button')
      if (button) {
        button.classList.remove('hover-state')
      }
    }

    const handleNewBusiness = () => {
      if (props.data.newBusiness?.url) {
        window.open(props.data.newBusiness.url)
      }
    }

    const handleGetAccess = () => {
      if (props.data.getAccess?.url) {
        window.open(props.data.getAccess.url)
      }
    }

    const handleDemoBusiness = () => {
      if (props.data.demoBusiness?.url) {
        window.open(props.data.demoBusiness.url)
      }
    }

    const renderNewBusinessCard = () => {
      if (!props.data.newBusiness) return null

      return (
        <div
          class="card"
          onMouseenter={handleMouseEnter}
          onMouseleave={handleMouseLeave}
        >
          <img
            class="card-img"
            src="../../images/icons/new-business.svg"
            alt={t('新业务接入')}
          />
          <p class="card-title">{t('新业务接入')}</p>
          <p class="card-detail">{t('新业务接入详情')}</p>
          <div
            class="button-container"
            onClick={handleNewBusiness}
          >
            <TButton class="king-button">{t('业务接入')}</TButton>
            <svg
              class="outside-link-icon"
              viewBox="0 0 1024 1024"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M864 864H160V160h352V96H128a32 32 0 0 0-32 32v768a32 32 0 0 0 32 32h768a32 32 0 0 0 32-32V512h-64z" />
              <path d="M896 96H672v64h146.72l-192 192L672 397.76l192-192V352h64V128a32 32 0 0 0-32-32z" />
            </svg>
          </div>
        </div>
      )
    }

    const renderGetAccessCard = () => {
      if (!props.data.getAccess) return null

      const { url, businessName, operatorId } = props.data.getAccess

      let detailText = ''
      if (url) {
        detailText = businessName
          ? t('您当前没有业务--{n}的权限，请先申请吧！', { n: businessName })
          : t('您当前没有业务权限，请先申请吧！')
      } else if (businessName) {
        const operatorText = operatorId ? `(${operatorId})` : ''
        detailText = t('您当前没有业务--${x}的权限，请先联系运维同学{n}进行角色的添加', {
          x: businessName,
          n: operatorText,
        })
      } else {
        detailText = t('您当前没有业务权限，请先联系对应的业务运维同学进行添加!')
      }

      return (
        <div
          class="card"
          onMouseenter={handleMouseEnter}
          onMouseleave={handleMouseLeave}
        >
          <img
            class="card-img"
            src="../../images/icons/get-access.svg"
            alt={t('获取权限')}
          />
          <p class="card-title">{t('获取权限')}</p>
          <p class="card-detail">{detailText}</p>
          {url && (
            <TButton
              class="king-button"
              onClick={handleGetAccess}
            >
              {t('权限申请')}
            </TButton>
          )}
        </div>
      )
    }

    const renderDemoBusinessCard = () => {
      if (!props.data.demoBusiness) return null

      return (
        <div
          class="card"
          onMouseenter={handleMouseEnter}
          onMouseleave={handleMouseLeave}
        >
          <img
            class="card-img"
            src="../../images/icons/demo-business.svg"
            alt={t('业务DEMO')}
          />
          <p class="card-title">{t('业务DEMO')}</p>
          <p class="card-detail">{t('您当前想快速体验下平台的功能')}</p>
          <TButton
            class="king-button"
            onClick={handleDemoBusiness}
          >
            {t('我要体验')}
          </TButton>
        </div>
      )
    }

    return () => (
      <div class="welcome-page-container">
        <h1 class="title">{t('未接入业务或无可查看的业务权限')}</h1>
        <div class="card-container">
          {renderNewBusinessCard()}
          {renderGetAccessCard()}
          {renderDemoBusinessCard()}
        </div>
      </div>
    )
  },
})

export default WelcomePage
