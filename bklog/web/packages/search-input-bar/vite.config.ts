import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      root: '.',
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src'),
        },
      },
      server: {
        port: 5178,
        open: true,
      },
    };
  }

  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'BklogSearchInputBar',
        formats: ['es', 'cjs', 'iife'],
        fileName: (format) => {
          if (format === 'es') return 'index.js';
          if (format === 'cjs') return 'index.cjs';
          return 'bklog-search-input-bar.iife.js';
        },
      },
      cssCodeSplit: false,
      assetsInlineLimit: 0,
      rollupOptions: {
        external: [
          'codemirror',
          '@codemirror/state',
          '@codemirror/view',
          '@codemirror/language',
          '@codemirror/autocomplete',
          '@codemirror/lang-sql',
        ],
        output: {
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || '';
            if (/\.(woff2?|ttf)$/.test(name)) return 'fonts/[name][extname]';
            return 'bklog-search-input-bar.css';
          },
          globals: {
            codemirror: 'CodeMirror',
            '@codemirror/state': 'CMState',
            '@codemirror/view': 'CMView',
            '@codemirror/language': 'CMLanguage',
            '@codemirror/autocomplete': 'CMAutocomplete',
            '@codemirror/lang-sql': 'CMSQL',
          },
        },
      },
    },
  };
});
