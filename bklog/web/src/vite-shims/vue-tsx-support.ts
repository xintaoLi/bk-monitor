/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 */
import Vue from 'vue';

export class Component extends Vue {}

const factoryImpl = {
  convert: (component: any) => component,
  extendFrom: (component: any) => component,
};

export function createComponent(options: any) {
  return Vue.extend(options);
}

export function ofType() {
  return factoryImpl;
}

export function withNativeOn(componentType: any) {
  return componentType;
}

export function withHtmlAttrs(componentType: any) {
  return componentType;
}

export function withUnknownProps(componentType: any) {
  return componentType;
}

export function withPropsObject(componentType: any) {
  return componentType;
}

function createComponentFactory(base: any, mixins: any[]) {
  return {
    create(options: any) {
      const mergedMixins = options.mixins ? [...options.mixins, ...mixins] : mixins;
      return base.extend({ ...options, mixins: mergedMixins });
    },
    extendFrom(component: any) {
      return createComponentFactory(component, mixins);
    },
    mixin(mixinObject: any) {
      return createComponentFactory(base, [...mixins, mixinObject]);
    },
  };
}

function createExtendableComponentFactory() {
  return {
    create(options: any) {
      return Vue.extend(options);
    },
    extendFrom(base: any) {
      return createComponentFactory(base, []);
    },
    mixin(mixinObject: any) {
      return createComponentFactory(Vue, [mixinObject]);
    },
  };
}

export const componentFactory = createExtendableComponentFactory();
export function componentFactoryOf() {
  return componentFactory;
}
export const component = componentFactory.create;
export const extendFrom = componentFactory.extendFrom;

export function emit(vm: Vue, name: string, ...args: any[]) {
  vm.$emit(name, ...args);
}

export function emitOn(vm: Vue, name: string, ...args: any[]) {
  vm.$emit(name.replace(/^on[A-Z]/, value => value[2].toLowerCase()), ...args);
}

export function emitUpdate(vm: Vue, name: string, value: any) {
  vm.$emit('update:' + name, value);
}

function createModifier(filters: Array<(event: Event) => boolean> = []) {
  const modifier = (handler: any) => (event: Event) => {
    if (filters.every(filter => filter(event)) && handler) {
      handler(event);
    }
  };
  return new Proxy(modifier, {
    get(target, key: string) {
      if (key === 'stop') {
        return createModifier([...filters, event => (event.stopPropagation(), true)]);
      }
      if (key === 'prevent') {
        return createModifier([...filters, event => (event.preventDefault(), true)]);
      }
      return (target as any)[key];
    },
  });
}

export const modifiers = createModifier();
