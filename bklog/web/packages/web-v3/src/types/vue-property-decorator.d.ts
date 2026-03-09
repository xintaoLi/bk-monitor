// Type shim for vue-property-decorator (Vue2 -> Vue3 migration)
declare module 'vue-property-decorator' {
  export function Component(options?: any): any;
  export function Prop(options?: any): any;
  export function Watch(path: string, options?: any): any;
  export function Emit(event?: string): any;
  export function Inject(options?: any): any;
  export function Provide(key?: string): any;
  export function Ref(options?: any): any;
  export function Model(event?: string, options?: any): any;
  export function Mixins(...mixins: any[]): any;
  export const Vue: any;
  export const mixins: any;
}
