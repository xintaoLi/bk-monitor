/**
 * global.d.ts - 全局类型声明
 * 声明 window 上的全局变量（对齐原项目 src/typings/global.d.ts）
 */

/// <reference types="vite/client" />

declare global {
  // ==================== 全局配置（由后端模板注入）====================
  interface Window {
    SITE_URL: string;
    AJAX_URL_PREFIX: string;
    BK_STATIC_URL: string;
    LOGIN_SERVICE_URL: string;
    BK_LOGIN_URL: string;
    MONITOR_URL: string;
    BKDATA_URL: string;
    COLLECTOR_GUIDE_URL: string;
    BK_DOC_URL: string;
    BK_FAQ_URL: string;
    BK_DOC_QUERY_URL: string;
    BK_HOT_WARM_CONFIG_URL: string;
    BIZ_ACCESS_URL: string;
    BK_DOC_DATA_URL: string;
    BK_PLAT_HOST: string;
    BK_ARCHIVE_DOC_URL: string;
    BK_ETL_DOC_URL: string;
    BK_PAAS_API_HOST: string;
    BK_USER_URL: string;
    BK_SHARED_RES_URL: string;
    BCS_WEB_CONSOLE_DOMAIN: string;
    APP_CODE: string;
    RUN_VER: string;
    VERSION: string;
    TITLE_MENU: string;
    MENU_LOGO_URL: string;
    DEMO_BIZ_ID: number;
    ES_STORAGE_CAPACITY: string;
    TAM_AEGIS_KEY: string;
    REAL_TIME_LOG_MAX_LENGTH: string;
    REAL_TIME_LOG_SHIFT_LENGTH: string;
    ASSESSMEN_HOST_COUNT: number;
    ENABLE_CHECK_COLLECTOR: boolean;
    IS_EXTERNAL: boolean | string;
    FEATURE_TOGGLE: Record<string, 'on' | 'off'>;
    FEATURE_TOGGLE_WHITE_LIST: Record<string, string[]>;
    SPACE_UID_WHITE_LIST: string[];
    FIELD_ANALYSIS_CONFIG: Record<string, unknown>;
  }
}

// ==================== 模块声明 ====================

// .vue 文件模块
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

// 图片资源
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

// SCSS 模块
declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

// ==================== 进程环境变量 ====================
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    MONITOR_APP?: 'apm' | 'trace' | 'log';
    ANALYZE?: string;
  }
}

export {};
