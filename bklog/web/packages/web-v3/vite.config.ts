import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { TDesignResolver } from 'unplugin-vue-components/resolvers';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  return {
    base: isDev ? '/' : '/static/dist/',
    
    plugins: [
      vue(),
      vueJsx(),
      
      // 自动导入 Vue 相关 API
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'pinia',
          '@vueuse/core',
        ],
        dts: 'src/types/auto-imports.d.ts',
        eslintrc: {
          enabled: true,
        },
      }),
      
      // 自动导入 TDesign 组件
      Components({
        resolvers: [
          TDesignResolver({
            library: 'vue-next',
          }),
        ],
        dts: 'src/types/components.d.ts',
      }),
      
      // Monaco Editor 支持
      monacoEditorPlugin({
        languageWorkers: ['json', 'editorWorkerService'],
        customWorkers: [
          {
            label: 'yaml',
            entry: 'monaco-yaml/yaml.worker',
          },
        ],
      }),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@/api': resolve(__dirname, './src/api'),
        '@/assets': resolve(__dirname, './src/assets'),
        '@/components': resolve(__dirname, './src/components'),
        '@/composables': resolve(__dirname, './src/composables'),
        '@/layouts': resolve(__dirname, './src/layouts'),
        '@/router': resolve(__dirname, './src/router'),
        '@/stores': resolve(__dirname, './src/stores'),
        '@/types': resolve(__dirname, './src/types'),
        '@/utils': resolve(__dirname, './src/utils'),
        '@/views': resolve(__dirname, './src/views'),
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.json'],
    },

    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `
            @import "@/assets/styles/variables.scss";
            @import "@/assets/styles/mixins.scss";
          `,
        },
      },
    },

    server: {
      host: '0.0.0.0',
      port: 8002,
      open: false,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: '../../../static/dist',
      assetsDir: 'assets',
      sourcemap: isDev,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'tdesign-vendor': ['tdesign-vue-next', 'tdesign-icons-vue-next'],
            'editor-vendor': ['monaco-editor', 'codemirror'],
            'utils-vendor': ['axios', 'dayjs', 'lodash-es'],
            'chart-vendor': ['echarts'],
          },
        },
      },
      // 提升 chunk 分割效率
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !isDev,
          drop_debugger: !isDev,
        },
      },
    },

    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        'axios',
        'dayjs',
        'lodash-es',
        'tdesign-vue-next',
        'tdesign-icons-vue-next',
      ],
      exclude: ['monaco-editor'],
    },

    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        VITE_APP_VERSION: JSON.stringify(process.env.npm_package_version),
      },
    },
  };
});
