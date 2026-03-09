// Type shim for vuedraggable
declare module 'vuedraggable' {
  import { DefineComponent } from 'vue';
  const Draggable: DefineComponent<{
    modelValue?: any[];
    list?: any[];
    group?: string | object;
    itemKey?: string | ((item: any) => string);
    tag?: string;
    disabled?: boolean;
    animation?: number;
    ghostClass?: string;
    chosenClass?: string;
    dragClass?: string;
    handle?: string;
    [key: string]: any;
  }, {}, {}>;
  export default Draggable;
}
