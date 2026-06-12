/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { transformWithEsbuild, type Plugin, type UserConfig } from 'vite';
import { defineConfig } from 'vite';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
import { createVuePlugin } from 'vite-plugin-vue2';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monitorApp = process.env.MONITOR_APP || 'log';
const isProduction = process.env.NODE_ENV === 'production';
const distDir = path.resolve(__dirname, '../static/dist');

const cjsInteropDeps = [
  'bk-magic-vue',
  '@blueking/bk-user-display-name',
  '@blueking/log-web',
  '@blueking/login-modal',
  '@blueking/platform-config',
  'dayjs',
  'dayjs/locale/en',
  'dayjs/locale/zh-cn',
  'dayjs/plugin/customParseFormat',
  'dayjs/plugin/duration',
  'dayjs/plugin/isLeapYear',
  'dayjs/plugin/isSameOrAfter',
  'dayjs/plugin/localizedFormat',
  'dayjs/plugin/relativeTime',
  'dayjs/plugin/timezone',
  'dayjs/plugin/utc',
  'dayjs/plugin/weekOfYear',
  'deepmerge',
  'dompurify',
  'interactjs',
  'json-bigint',
  'konva',
  'lodash',
  'mark.js',
  'screenfull',
  'tiny-pinyin',
  'tiny-pinyin/dist/patchers/56l.js',
  'vue-json-pretty',
  'vue-tsx-support',
  'vue-virtual-scroller',
  'scrollparent',
];

const defaultDevConfig = {
  port: 8001,
  host: '0.0.0.0',
  proxy: [],
  devProxyUrl: '',
  loginHost: '',
};

function getDevConfig() {
  const localSettingsPath = path.resolve(__dirname, './local.settings.js');
  if (!existsSync(localSettingsPath)) {
    return defaultDevConfig;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return { ...defaultDevConfig, ...require(localSettingsPath) };
}

function copyDir(from: string, to: string) {
  if (!existsSync(from)) {
    return;
  }
  mkdirSync(to, { recursive: true });
  for (const item of readdirSync(from)) {
    const source = path.join(from, item);
    const target = path.join(to, item);
    if (statSync(source).isDirectory()) {
      copyDir(source, target);
    } else {
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
  }
}

function ifdefPlugin(): Plugin {
  const ifRE = /^\s*\/\/\s*#if\s+(.+)\s*$/;
  const elseRE = /^\s*\/\/\s*#else\s*$/;
  const endifRE = /^\s*\/\/\s*#endif\s*$/;

  const evaluate = (expr: string) => {
    const normalized = expr
      .replace(/\bMONITOR_APP\b/g, JSON.stringify(monitorApp))
      .replace(/\bAPP\b/g, JSON.stringify(monitorApp));
    // eslint-disable-next-line no-new-func
    return Boolean(new Function('return (' + normalized + ');')());
  };

  return {
    name: 'bklog-ifdef',
    enforce: 'pre',
    transform(code, id) {
      if (!/[jt]sx?$|\.vue$/.test(id) || !code.includes('#if')) {
        return null;
      }

      const lines = code.split('\n');
      const stack: Array<{ parentActive: boolean; active: boolean; condition: boolean; inElse: boolean }> = [];
      let active = true;
      const output: string[] = [];

      for (const line of lines) {
        const ifMatch = line.match(ifRE);
        if (ifMatch) {
          const condition = evaluate(ifMatch[1]);
          stack.push({ parentActive: active, active: active && condition, condition, inElse: false });
          active = active && condition;
          continue;
        }
        if (elseRE.test(line)) {
          const current = stack[stack.length - 1];
          if (current) {
            current.inElse = true;
            current.active = current.parentActive && !current.condition;
            active = current.active;
          }
          continue;
        }
        if (endifRE.test(line)) {
          const current = stack.pop();
          active = current ? current.parentActive : true;
          continue;
        }
        if (active) {
          output.push(line);
        }
      }

      return { code: output.join('\n'), map: null };
    },
  };
}

function jsJsxPlugin(): Plugin {
  return {
    name: 'bklog-js-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.includes('/src/') || id.includes('?') || !id.endsWith('.js') || !/<[A-Za-z][\s\S]*>/.test(code)) {
        return null;
      }

      return transformWithEsbuild(code, id, {
        loader: 'jsx',
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
      });
    },
  };
}

function bklogAssetsPlugin(): Plugin {
  return {
    name: 'bklog-assets-copy',
    closeBundle() {
      if (!isProduction || ['apm', 'trace'].includes(monitorApp)) {
        return;
      }
      copyDir(
        path.resolve(__dirname, './node_modules/@blueking/log-web/dist'),
        path.resolve(distDir, './log-web1-dll'),
      );
      const logo = path.resolve(__dirname, './src/images/new-logo.svg');
      if (existsSync(logo)) {
        mkdirSync(path.resolve(distDir, './img'), { recursive: true });
        copyFileSync(logo, path.resolve(distDir, './img/new-logo.svg'));
      }
    },
  };
}


const DEV_TEMPLATE_DEFAULTS: Record<string, string> = {
  FEATURE_TOGGLE: '{}',
  FEATURE_TOGGLE_WHITE_LIST: '{}',
  FEATURE_TOGGLE_BLACK_LIST: '{}',
  SPACE_UID_WHITE_LIST: '{}',
  FIELD_ANALYSIS_CONFIG: '{}',
  DEMO_BIZ_ID: '0',
  BK_ASSESSMEN_HOST_COUNT: '0',
  ENABLE_CHECK_COLLECTOR: 'false',
  IS_EXTERNAL: 'false',
};

function devHtmlTemplatePlugin(): Plugin {
  return {
    name: 'bklog-dev-html-template',
    transformIndexHtml(html) {
      if (!isProduction) {
        return html.replace(/\$\{\s*([A-Z0-9_]+)(?:\s*\|\s*n)?\s*\}/g, (matched, key) => {
          if (Object.prototype.hasOwnProperty.call(DEV_TEMPLATE_DEFAULTS, key)) {
            return DEV_TEMPLATE_DEFAULTS[key];
          }
          return '';
        });
      }
      return html;
    },
  };
}

export default defineConfig(({ mode }): UserConfig => {
  const devConfig = getDevConfig();
  const isDev = mode === 'development';

  return {
    root: __dirname,
    base: isDev ? '/' : './',
    cacheDir: path.resolve(__dirname, '.vite-cache'),
    publicDir: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.proxyUrl': JSON.stringify(devConfig.devProxyUrl),
      'process.env.devUrl': JSON.stringify(devConfig.host + ':' + devConfig.port),
      'process.env.devHost': JSON.stringify(devConfig.host),
      'process.env.loginHost': JSON.stringify(devConfig.loginHost),
      'process.env.loginUrl': JSON.stringify(devConfig.loginHost + '/login/'),
      'process.env.APP': JSON.stringify(monitorApp),
      'process.env.MONITOR_APP': JSON.stringify(monitorApp),
      'process.env': JSON.stringify({
        NODE_ENV: mode,
        APP: monitorApp,
        MONITOR_APP: monitorApp,
        proxyUrl: devConfig.devProxyUrl,
        devUrl: devConfig.host + ':' + devConfig.port,
        devHost: devConfig.host,
        loginHost: devConfig.loginHost,
        loginUrl: devConfig.loginHost + '/login/',
      }),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        vue$: 'vue/dist/vue.esm.js',
        scrollparent: path.resolve(__dirname, 'src/vite-shims/scrollparent.ts'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
        },
      },
    },
    server: {
      host: devConfig.host,
      port: devConfig.port,
      strictPort: true,
      open: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      proxy: Array.isArray(devConfig.proxy)
        ? devConfig.proxy.reduce((acc: Record<string, any>, item: any) => ({ ...acc, ...item }), {})
        : devConfig.proxy,
      fs: {
        allow: [__dirname, path.resolve(__dirname, '../static/dist')],
      },
    },
    plugins: [
      devHtmlTemplatePlugin(),
      ifdefPlugin(),
      jsJsxPlugin(),
      createVuePlugin({
        jsx: true,
        jsxOptions: {
          compositionAPI: true,
        },
      }),
      Object.assign(
        monacoEditorPlugin({
          languageWorkers: ['editorWorkerService', 'json', 'css', 'html', 'typescript'],
          customWorkers: [
            {
              label: 'yaml',
              entry: 'monaco-yaml/yaml.worker',
            },
          ],
        }) as Plugin,
        { apply: 'build' as const },
      ),
      bklogAssetsPlugin(),
    ],
    optimizeDeps: {
      noDiscovery: true,
      include: cjsInteropDeps,
      exclude: ['monaco-editor', 'monaco-yaml'],
      needsInterop: cjsInteropDeps,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
      },
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      sourcemap: false,
      target: 'es2018',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
        },
      },
    },
  };
});
