// Type shim for vue-text-highlight
declare module 'vue-text-highlight' {
  import { DefineComponent } from 'vue';
  const TextHighlight: DefineComponent<{
    queries?: string | RegExp | Array<string | RegExp>;
    highlightStyle?: string | object;
    highlightClass?: string;
    highlightDelay?: number;
    caseSensitive?: boolean;
    diacritics?: boolean;
  }, {}, {}>;
  export default TextHighlight;
}
