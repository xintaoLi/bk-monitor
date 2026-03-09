// Augment tdesign-vue-next with missing/custom components
import { DefineComponent } from 'vue';

declare module 'tdesign-vue-next' {
  // Grid component (not in TDesign by default, using Row/Col internally)
  const Grid: DefineComponent<{
    cols?: number;
    gap?: number | string;
    [key: string]: any;
  }>;
  
  // Result component (not in TDesign by default)
  const Result: DefineComponent<{
    theme?: 'default' | 'success' | 'warning' | 'error' | '403' | '404' | '500' | 'loading';
    title?: string;
    description?: string;
    status?: string;
    [key: string]: any;
  }>;
  
  export { Grid, Result };
}
