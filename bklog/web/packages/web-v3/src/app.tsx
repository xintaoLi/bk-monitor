import { defineComponent } from 'vue';
import { RouterView } from 'vue-router';

/**
 * 根组件
 */
export default defineComponent({
  name: 'App',
  
  setup() {
    return () => (
      <div id="app" class="bk-log-app">
        <RouterView />
      </div>
    );
  },
});
