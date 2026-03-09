import { ComponentCustomProperties } from 'vue';
import { Router } from 'vue-router';

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string, ...args: any[]) => string;
    $bkMessage: any;
    $bkInfo: any;
    $bkPopover: any;
    $globalStore: any;
    $router: Router;
    $route: any;
  }
}

// 扩展 JSX 全局命名空间
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any;
    }
  }
}

export {};
