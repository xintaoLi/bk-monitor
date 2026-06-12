/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
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


type PackageMeta = {
  type?: string;
  main?: string;
  module?: string;
  exports?: unknown;
};

function readPackageMeta(pkgName: string): PackageMeta {
  try {
    return JSON.parse(readFileSync(path.resolve(__dirname, 'node_modules', ...pkgName.split('/'), 'package.json'), 'utf-8'));
  } catch (_) {
    return {};
  }
}

function resolvePackageName(importee: string) {
  if (
    importee.startsWith('.')
    || importee.startsWith('/')
    || importee.startsWith('@/')
    || importee.startsWith('src/')
  ) {
    return '';
  }
  if (importee.startsWith('@')) {
    return importee.split('/').slice(0, 2).join('/');
  }
  return importee.split('/')[0];
}

function walkSourceFiles(dir: string, output: string[] = []) {
  if (!existsSync(dir)) {
    return output;
  }

  for (const item of readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    if (['node_modules', '.vite-cache', 'dist', 'packages'].includes(item)) {
      continue;
    }
    if (statSync(fullPath).isDirectory()) {
      walkSourceFiles(fullPath, output);
    } else if (/\.(vue|js|jsx|ts|tsx)$/.test(item)) {
      output.push(fullPath);
    }
  }
  return output;
}

function collectSourceImports() {
  const importSpecifiers = new Set<string>();
  const importRE = /(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

  for (const file of walkSourceFiles(path.resolve(__dirname, 'src'))) {
    const code = readFileSync(file, 'utf-8');
    let match: RegExpExecArray | null;
    while ((match = importRE.exec(code))) {
      const importee = match[1];
      if (resolvePackageName(importee)) {
        importSpecifiers.add(importee);
      }
    }
  }

  return [...importSpecifiers];
}

function resolveImportPath(importee: string) {
  try {
    return require.resolve(importee, { paths: [__dirname] });
  } catch (_) {
    return '';
  }
}

function isOptimizableImport(importee: string) {
  if (
    /\.(css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|woff2?|ttf|eot)$/.test(importee)
    || importee.startsWith('vue/types/')
    || importee === 'monaco-editor'
    || importee.startsWith('monaco-editor/')
    || importee === 'monaco-yaml'
    || importee.startsWith('monaco-yaml/')
  ) {
    return false;
  }

  const resolved = resolveImportPath(importee);
  return /\.(mjs|cjs|js)$/.test(resolved);
}

const prebundlePackageAllowList = new Set([
  '@blueking/login-modal',
  '@blueking/platform-config',
  '@blueking/notice-component-vue2',
  'dayjs',
  'deepmerge',
  'dompurify',
  'json-bigint',
  'lodash',
  'mark.js',
  'screenfull',
  'tiny-pinyin',
  'vue-json-pretty',
  'vue-tsx-support',
  'vue-virtual-scroller',
]);

function isKnownSafeBlueKingEsmPackage(pkgName: string) {
  // These packages are plain JS utilities with ESM named exports. Prebundle them, but do not force CJS interop.
  // UI component packages are intentionally not included because their optimizeDeps graph pulls CSS/font assets.
  return ['@blueking/login-modal', '@blueking/platform-config', '@blueking/notice-component-vue2'].includes(pkgName);
}

function isInteropRiskPackage(pkgName: string, meta: PackageMeta) {
  const main = meta.main || '';
  const module = meta.module || '';
  return (
    !module
    || /(?:umd|common|cjs|min\.js|\.cjs|lodash\.js)/.test(main)
    || /(?:umd|min\.js)/.test(module)
    || ['dayjs', 'deepmerge', 'json-bigint', 'lodash', 'mark.js', 'tiny-pinyin', 'vue-json-pretty', 'vue-tsx-support'].includes(pkgName)
  );
}

function isPrebundleRiskPackage(pkgName: string, meta: PackageMeta) {
  return prebundlePackageAllowList.has(pkgName) && (isKnownSafeBlueKingEsmPackage(pkgName) || isInteropRiskPackage(pkgName, meta));
}

function getViteDependencyInteropConfig() {
  const sourceImports = collectSourceImports();
  const include = new Set<string>();
  const needsInterop = new Set<string>();

  for (const importee of sourceImports) {
    if (!isOptimizableImport(importee)) {
      continue;
    }
    const pkgName = resolvePackageName(importee);
    const meta = readPackageMeta(pkgName);
    if (!isPrebundleRiskPackage(pkgName, meta)) {
      continue;
    }
    include.add(importee);
    if (isInteropRiskPackage(pkgName, meta) && meta.type !== 'module') {
      needsInterop.add(importee);
    }
  }

  // dayjs locale/plugin files are CJS-style subpath modules but are often imported as default.
  for (const dep of [
    'dayjs/locale/en',
    'dayjs/locale/zh-cn',
    'dayjs/plugin/customParseFormat',
    'dayjs/plugin/duration',
    'dayjs/plugin/relativeTime',
    'dayjs/plugin/timezone',
    'dayjs/plugin/utc',
  ]) {
    try {
      require.resolve(dep, { paths: [__dirname] });
      include.add(dep);
      needsInterop.add(dep);
    } catch (_) {}
  }

  // vue-virtual-scroller imports scrollparent as ESM default; force prebundle keeps its dependency graph stable.
  include.add('vue-virtual-scroller');

  return {
    include: [...include].sort(),
    needsInterop: [...needsInterop].sort(),
  };
}

const viteDependencyInteropConfig = getViteDependencyInteropConfig();

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
      // 只关闭自动发现，依赖入口仍通过 package.json + node_modules 的扫描结果集中维护。
      // include: 需要强制预构建的依赖，解决浏览器直接消费 CJS/UMD/子路径导入时的兼容问题。
      // needsInterop: 仅放真正需要 CJS default interop 的包，避免把 @blueking/login-modal 这类 ESM named export 包误转成 default import。
      noDiscovery: true,
      include: viteDependencyInteropConfig.include,
      exclude: ['monaco-editor', 'monaco-yaml'],
      needsInterop: viteDependencyInteropConfig.needsInterop,
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
