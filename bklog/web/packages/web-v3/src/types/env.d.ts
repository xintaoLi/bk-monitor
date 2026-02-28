/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 环境变量类型定义
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 全局 window 对象扩展
interface Window {
  SITE_URL: string;
  AJAX_URL_PREFIX: string;
  BK_STATIC_URL: string;
  LOGIN_SERVICE_URL: string;
  MONITOR_URL: string;
  BKDATA_URL: string;
  COLLECTOR_GUIDE_URL: string;
  FEATURE_TOGGLE: Record<string, any>;
  FEATURE_TOGGLE_WHITE_LIST: string[];
  SPACE_UID_WHITE_LIST: string[];
  FIELD_ANALYSIS_CONFIG: Record<string, any>;
  REAL_TIME_LOG_MAX_LENGTH: string;
  REAL_TIME_LOG_SHIFT_LENGTH: string;
  RUN_VER: string;
  TITLE_MENU: string;
  MENU_LOGO_URL: string;
  APP_CODE: string;
  BK_DOC_URL: string;
  BK_FAQ_URL: string;
  BK_DOC_QUERY_URL: string;
  BK_HOT_WARM_CONFIG_URL: string;
  BIZ_ACCESS_URL: string;
  DEMO_BIZ_ID: number;
  ES_STORAGE_CAPACITY: string;
  TAM_AEGIS_KEY: string;
  BK_LOGIN_URL: string;
  BK_DOC_DATA_URL: string;
  BK_PLAT_HOST: string;
  BK_ARCHIVE_DOC_URL: string;
  BK_ETL_DOC_URL: string;
  ASSESSMEN_HOST_COUNT: number;
  ENABLE_CHECK_COLLECTOR: boolean;
  IS_EXTERNAL: boolean;
  BCS_WEB_CONSOLE_DOMAIN: string;
  VERSION: string;
  BK_SHARED_RES_URL: string;
  BK_PAAS_API_HOST: string;
  BK_USER_URL: string;
  BK_IAM_URL: string;
}
