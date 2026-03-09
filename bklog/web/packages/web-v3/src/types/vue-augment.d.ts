// Vue2 compatibility shims for Vue3
declare module 'vue' {
  // Vue2 set function compatibility
  export function set<T>(object: object, key: string | number, value: T): T;
  export function set<T>(array: T[], key: number, value: T): T;
  
  // Vue2 CreateElement type compatibility
  export type CreateElement = (tag: any, data?: any, children?: any) => any;
}

// Augment Vue HTML attributes to allow 'slot' (Vue2 compatibility)
import { HTMLAttributes } from 'vue';
declare module 'vue' {
  interface HTMLAttributes {
    slot?: string;
    key?: string | number | symbol;
  }
  
  // ReservedProps augmentation
  interface AllowedComponentProps {
    slot?: string;
  }
}
