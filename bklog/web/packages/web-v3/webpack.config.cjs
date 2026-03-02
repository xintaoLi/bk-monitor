/**
 * webpack.config.cjs - Vue3 升级版本 Webpack 配置
 * 对齐原 bklog/web/webpack.config.js 的构建逻辑，适配 Vue3 + TSX
 */

'use strict';

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const WebpackBar = require('webpackbar');

const isProd = process.env.NODE_ENV === 'production';
const isAnalyze = process.env.ANALYZE === 'true';
const monitorApp = process.env.MONITOR_APP || 'log';
const distUrl = path.resolve(__dirname, '../../static/dist');

// 读取本地开发配置
let devConfig = {
  port: 8002,
  host: 'localhost',
  proxy: [{}],
  devProxyUrl: '',
  loginHost: '',
};

const localSettingsPath = path.resolve(__dirname, './local.settings.cjs');
if (fs.existsSync(localSettingsPath)) {
  const localSettings = require(localSettingsPath);
  devConfig = Object.assign({}, devConfig, localSettings);
}

// 生产环境 HTML 模板变量注入脚本（对齐原项目）
const pcBuildVariates = `
<script>
  window.SITE_URL = '\${SITE_URL}'
  window.AJAX_URL_PREFIX = '\${AJAX_URL_PREFIX}'
  window.BK_STATIC_URL = '\${BK_STATIC_URL}'
  window.LOGIN_SERVICE_URL = '\${LOGIN_SERVICE_URL}'
  window.MONITOR_URL = '\${MONITOR_URL}'
  window.BKDATA_URL = '\${BKDATA_URL}'
  window.COLLECTOR_GUIDE_URL = '\${COLLECTOR_GUIDE_URL}'
  window.FEATURE_TOGGLE = \${FEATURE_TOGGLE | n}
  window.FEATURE_TOGGLE_WHITE_LIST = \${FEATURE_TOGGLE_WHITE_LIST | n}
  window.SPACE_UID_WHITE_LIST = \${SPACE_UID_WHITE_LIST | n}
  window.FIELD_ANALYSIS_CONFIG = \${FIELD_ANALYSIS_CONFIG | n}
  window.REAL_TIME_LOG_MAX_LENGTH = '\${REAL_TIME_LOG_MAX_LENGTH}'
  window.REAL_TIME_LOG_SHIFT_LENGTH = '\${REAL_TIME_LOG_SHIFT_LENGTH}'
  window.RUN_VER = '\${RUN_VER}'
  window.TITLE_MENU = '\${TITLE_MENU}'
  window.MENU_LOGO_URL = '\${MENU_LOGO_URL}'
  window.APP_CODE = '\${APP_CODE}'
  window.BK_DOC_URL = '\${BK_DOC_URL}'
  window.BK_FAQ_URL = '\${BK_FAQ_URL}'
  window.BK_DOC_QUERY_URL = '\${BK_DOC_QUERY_URL}'
  window.BK_HOT_WARM_CONFIG_URL = '\${BK_HOT_WARM_CONFIG_URL}'
  window.BIZ_ACCESS_URL = '\${BIZ_ACCESS_URL}'
  window.DEMO_BIZ_ID = \${DEMO_BIZ_ID}
  window.ES_STORAGE_CAPACITY = '\${ES_STORAGE_CAPACITY}'
  window.TAM_AEGIS_KEY = '\${TAM_AEGIS_KEY}'
  window.BK_LOGIN_URL = '\${BK_LOGIN_URL}'
  window.BK_DOC_DATA_URL = '\${BK_DOC_DATA_URL}'
  window.BK_PLAT_HOST = '\${BK_PLAT_HOST}'
  window.BK_ARCHIVE_DOC_URL = '\${BK_ARCHIVE_DOC_URL}'
  window.BK_ETL_DOC_URL = '\${BK_ETL_DOC_URL}'
  window.ASSESSMEN_HOST_COUNT = \${BK_ASSESSMEN_HOST_COUNT}
  window.ENABLE_CHECK_COLLECTOR = \${ENABLE_CHECK_COLLECTOR}
  window.IS_EXTERNAL = \${IS_EXTERNAL}
  window.BCS_WEB_CONSOLE_DOMAIN = '\${BCS_WEB_CONSOLE_DOMAIN}'
  window.VERSION = '\${VERSION}'
  window.BK_SHARED_RES_URL = '\${BK_SHARED_RES_URL}'
  window.BK_PAAS_API_HOST = '\${BK_PAAS_API_HOST}'
  window.BK_USER_URL = '\${BK_USER_URL}'
  window.BK_IAM_URL = '\${BK_IAM_URL}'
</script>`;

/** @type {import('webpack').Configuration} */
const config = {
  mode: isProd ? 'production' : 'development',
  target: 'web',

  entry: {
    main: './src/main.ts',
  },

  output: {
    path: distUrl,
    filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
    chunkFilename: isProd ? 'js/[name].[contenthash:8].chunk.js' : 'js/[name].chunk.js',
    publicPath: '/',
    clean: false,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Vue3 完整版（包含运行时编译器）
      vue: '@vue/runtime-dom',
    },
    fallback: {
      path: false,
      fs: false,
    },
  },

  module: {
    rules: [
      // TypeScript / TSX（使用 babel-loader + @vue/babel-plugin-jsx）
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'thread-loader',
            options: { workers: 2 },
          },
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { browsers: ['> 1%', 'last 2 versions'] } }],
                '@babel/preset-typescript',
              ],
              plugins: ['@vue/babel-plugin-jsx'],
              cacheDirectory: true,
            },
          },
        ],
      },
      // Vue SFC（.vue 文件，Vue3 vue-loader@17）
      {
        test: /\.vue$/,
        use: 'vue-loader',
      },
      // SCSS / CSS
      {
        test: /\.(scss|css)$/,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          {
            loader: 'css-loader',
            options: { sourceMap: !isProd },
          },
          {
            loader: 'postcss-loader',
            options: { sourceMap: !isProd },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: !isProd,
              // 使用现代 API，消除 legacy JS API 弃用警告
              api: 'modern',
              sassOptions: {
                // 静默 @import 弃用警告（Dart Sass 3.0 才会移除）
                silenceDeprecations: ['import'],
              },
              additionalData: (content, loaderContext) => {
                // 只对项目自身文件注入全局变量，跳过 node_modules
                if (loaderContext.resourcePath.includes('node_modules')) {
                  return content;
                }
                return `@use "sass:math";\n@import "@/assets/scss/variables";\n@import "@/assets/scss/mixins/index";\n${content}`;
              },
            },
          },
        ],
      },
      // 图片资源
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 8 * 1024 }, // 8kb 以下 inline
        },
        generator: {
          filename: 'img/[name].[contenthash:8][ext]',
        },
      },
      // 字体资源
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash:8][ext]',
        },
      },
      // Monaco Editor TTF（需要单独处理）
      {
        test: /\.ttf$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash:8][ext]',
        },
      },
    ],
  },

  plugins: [
    new WebpackBar({
      name: `日志平台 V3 ${isProd ? 'Production' : 'Development'} 构建`,
      profile: true,
    }),

    // Vue3 特性标志
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(false),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.MONITOR_APP': JSON.stringify(monitorApp),
    }),

    // Monaco Editor 插件
    new MonacoWebpackPlugin({
      languages: ['javascript', 'typescript', 'json', 'sql', 'yaml'],
      customLanguages: [
        {
          label: 'yaml',
          entry: 'monaco-yaml',
          worker: {
            id: 'monaco-yaml/yamlWorker',
            entry: 'monaco-yaml/yaml.worker',
          },
        },
      ],
    }),

    // HTML 模板
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      filename: 'index.html',
      inject: true,
      minify: isProd ? {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: false,
      } : false,
    }),
  ],

  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: { drop_console: false },
        },
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 第三方核心库
        vendor: {
          test: /[\\/]node_modules[\\/](vue|vue-router|pinia|vue-i18n)[\\/]/,
          name: 'vendor-core',
          chunks: 'all',
          priority: 20,
        },
        // TDesign 组件库
        tdesign: {
          test: /[\\/]node_modules[\\/]tdesign-vue-next[\\/]/,
          name: 'vendor-tdesign',
          chunks: 'all',
          priority: 15,
        },
        // Monaco Editor（体积大，单独分包）
        monaco: {
          test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
          name: 'vendor-monaco',
          chunks: 'async',
          priority: 10,
        },
        // Echarts
        echarts: {
          test: /[\\/]node_modules[\\/](echarts|zrender)[\\/]/,
          name: 'vendor-echarts',
          chunks: 'async',
          priority: 10,
        },
        // 其他第三方
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor-commons',
          chunks: 'all',
          priority: 5,
          minChunks: 2,
        },
      },
    },
    runtimeChunk: { name: 'runtime' },
  },

  cache: isProd
    ? false
    : {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: path.resolve(__dirname, '.cache'),
        name: `${monitorApp}-v3-cache`,
      },

  devtool: isProd ? false : 'cheap-module-source-map',

  performance: {
    hints: isProd ? 'warning' : false,
    maxEntrypointSize: 1024 * 1024 * 2,
    // Monaco Editor 的 ts.worker.js 约 4.6 MiB，属正常现象
    maxAssetSize: 1024 * 1024 * 6,
  },
};

// 生产环境额外插件
if (isProd) {
  config.plugins.push(
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, './src/assets/images'),
          to: path.resolve(distUrl, './img'),
          noErrorOnMissing: true,
        },
      ],
    }),
  );
}

// 开发环境配置
if (!isProd) {
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.devUrl': JSON.stringify(`${devConfig.host}:${devConfig.port}`),
      'process.env.devHost': JSON.stringify(devConfig.host),
      'process.env.loginHost': JSON.stringify(devConfig.loginHost),
      'process.env.loginUrl': JSON.stringify(`${devConfig.loginHost}/login/`),
      'process.env.proxyUrl': JSON.stringify(devConfig.devProxyUrl),
    }),
  );

  config.devServer = {
    port: devConfig.port,
    host: '0.0.0.0',
    allowedHosts: 'all',
    open: false,
    hot: true,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    static: [
      {
        directory: path.resolve(__dirname, '../../static/dist'),
        publicPath: '/static/dist',
        serveIndex: false,
      },
    ],
    proxy: devConfig.proxy || [],
  };
}

// Bundle 分析
if (isAnalyze) {
  config.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    }),
  );
}

module.exports = config;
