/**
 * global.d.ts - 全局类型声明
 * 对齐原项目 window.* 全局变量定义
 */

declare global {
  interface Window {
    // 基础配置
    SITE_URL: string;
    AJAX_URL_PREFIX: string;
    BK_STATIC_URL: string;
    LOGIN_SERVICE_URL: string;
    MONITOR_URL: string;
    BKDATA_URL: string;
    COLLECTOR_GUIDE_URL: string;
    BK_LOGIN_URL: string;
    BK_PLAT_HOST: string;
    BK_PAAS_API_HOST: string;
    BK_USER_URL: string;
    BK_IAM_URL: string;
    BK_SHARED_RES_URL: string;
    BCS_WEB_CONSOLE_DOMAIN: string;

    // 功能开关
    FEATURE_TOGGLE: Record<string, boolean | string>;
    FEATURE_TOGGLE_WHITE_LIST: Record<string, string[]>;
    SPACE_UID_WHITE_LIST: string[];
    FIELD_ANALYSIS_CONFIG: Record<string, unknown>;
    ENABLE_CHECK_COLLECTOR: boolean;

    // 外部版
    IS_EXTERNAL: boolean | string;
    RUN_VER: string;

    // UI 配置
    TITLE_MENU: string;
    MENU_LOGO_URL: string;
    APP_CODE: string;
    VERSION: string;

    // 文档链接
    BK_DOC_URL: string;
    BK_FAQ_URL: string;
    BK_DOC_QUERY_URL: string;
    BK_HOT_WARM_CONFIG_URL: string;
    BK_DOC_DATA_URL: string;
    BK_ARCHIVE_DOC_URL: string;
    BK_ETL_DOC_URL: string;

    // 业务配置
    DEMO_BIZ_ID: number;
    ES_STORAGE_CAPACITY: string;
    TAM_AEGIS_KEY: string;
    BIZ_ACCESS_URL: string;
    ASSESSMEN_HOST_COUNT: number;
    REAL_TIME_LOG_MAX_LENGTH: string;
    REAL_TIME_LOG_SHIFT_LENGTH: string;
  }

  // Vue3 特性标志
  declare const __VUE_OPTIONS_API__: boolean;
  declare const __VUE_PROD_DEVTOOLS__: boolean;
  declare const __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: boolean;
}

export {};
