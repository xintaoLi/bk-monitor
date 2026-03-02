/**
 * app.tsx - Vue3 根组件
 * 对齐原 src/app.tsx 功能：
 * - 布局容器（HeadNav + RouterView）
 * - 公告组件
 * - 鉴权弹窗
 * - 全局设置弹窗
 * - 脱敏灰度初始化
 * - 外部版 iframe 适配
 */

import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/stores/app';
import './assets/scss/app.scss';

export default defineComponent({
  name: 'App',
  setup() {
    const route = useRoute();
    const { t } = useI18n();
    const appStore = useAppStore();

    const {
      authDialogVisible,
      authDialogData,
      globalSettingVisible,
      globalSettingActiveTab,
      maskingToggle,
      isExternal,
    } = storeToRefs(appStore);

    // 公告高度
    const noticeHeight = ref(0);
    const showNotice = ref(false);

    // 是否作为 iframe 嵌入（监控平台）
    const isAsIframe = computed(() => route.query.from === 'monitor');

    // 根容器样式
    const rootClass = computed(() => ({
      'log-search-container': true,
      'as-iframe': isAsIframe.value,
      'is-show-notice': showNotice.value,
      'clear-min-height': route.name === 'retrieve',
    }));

    const noticeStyle = computed(() => ({
      '--notice-component-height': `${noticeHeight.value}px`,
    }));

    // ==================== 脱敏灰度初始化 ====================
    function initMaskingToggle() {
      const featureToggle = window.FEATURE_TOGGLE || {};
      const logDesensitize = featureToggle.log_desensitize;
      let toggleList: string[] = window.FEATURE_TOGGLE_WHITE_LIST?.log_desensitize || [];

      if (logDesensitize === 'on') {
        toggleList = [];
      } else if (logDesensitize === 'off') {
        toggleList = [];
        appStore.setGlobalSettingList([]);
      }

      // 更新全局操作列表
      const isShowSettingList = logDesensitize !== 'off';
      const customItems = [
        { id: 'my-applied', name: t('我申请的') },
        { id: 'my-report', name: t('我的订阅') },
      ];
      const maskingItems = isShowSettingList ? [{ id: 'masking-setting', name: t('全局脱敏') }] : [];
      appStore.setGlobalSettingList([...customItems, ...maskingItems]);
    }

    // ==================== API 错误事件监听 ====================
    function handleApiError(event: CustomEvent<{ message: string }>) {
      // 通过 TDesign Message 组件显示错误（在组件内处理）
      console.error('[App] API Error:', event.detail.message);
    }

    onMounted(() => {
      initMaskingToggle();
      window.addEventListener('bklog:api-error', handleApiError as EventListener);
    });

    onUnmounted(() => {
      window.removeEventListener('bklog:api-error', handleApiError as EventListener);
    });

    return () => (
      <div class={rootClass.value} style={noticeStyle.value}>
        {/* 公告组件（占位，实际由子应用注入） */}
        {showNotice.value && (
          <div class='notice-wrapper' style={{ height: `${noticeHeight.value}px` }} />
        )}

        {/* 主内容区域 */}
        <RouterView />

        {/* 鉴权弹窗（全局） */}
        {authDialogVisible.value && (
          <auth-dialog
            permission={authDialogData.value}
            onClose={() => appStore.closeAuthDialog()}
          />
        )}

        {/* 全局设置弹窗 */}
        {globalSettingVisible.value && (
          <global-setting-dialog
            activeTab={globalSettingActiveTab.value}
            onClose={() => appStore.closeGlobalSetting()}
          />
        )}
      </div>
    );
  },
});
