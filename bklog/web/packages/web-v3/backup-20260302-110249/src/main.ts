import { createApp } from 'vue';
import App from './app';
import { setupRouter } from './router';
import { setupStore } from './stores';

// 导入全局样式
import 'tdesign-vue-next/es/style/index.css';
import '@/assets/styles/variables.scss';
import '@/assets/styles/mixins.scss';
import '@/assets/styles/global.scss';

/**
 * 初始化应用
 */
async function bootstrap() {
  const app = createApp(App);

  // 配置 Store
  setupStore(app);

  // 配置 Router
  setupRouter(app);

  // 挂载应用
  app.mount('#app');

  console.log('🚀 BlueKing Log Platform V3 started!');
}

// 启动应用
bootstrap();
