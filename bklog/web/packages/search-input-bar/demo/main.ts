import '../src/styles/icons.css';
import { createSearchInputBar } from '../src/index';
import type { PlatformVariant } from '../src/types';
import { createMockServices } from './mock-services';

const host = document.getElementById('search-bar-host')!;
const logEl = document.getElementById('event-log')!;
const controls = document.getElementById('demo-controls')!;

function log(eventName: string, detail: unknown) {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] ${eventName}: ${JSON.stringify(detail, null, 2)}\n`;
  logEl.textContent = `${line}${logEl.textContent || ''}`.slice(0, 8000);
}

const favorites = document.createElement('div');
favorites.dataset.slot = 'favorites';
favorites.title = '收藏(slot)';
favorites.innerHTML = '<span class="bklog-icon bklog-star-line"></span>';

const toolbarExtra = document.createElement('div');
toolbarExtra.dataset.slot = 'toolbar-extra';
toolbarExtra.title = '扩展工具(slot)';
toolbarExtra.style.cssText = 'display:flex;align-items:center;justify-content:center;width:24px;height:24px;font-size:12px;color:#4d4f56;cursor:pointer;border-radius:2px;';
toolbarExtra.textContent = 'AI';
toolbarExtra.onclick = () => bar.setMode('ai');

const ipSelector = document.createElement('div');
ipSelector.className = 'demo-slot-box';
ipSelector.dataset.slot = 'ip-selector';
ipSelector.textContent = 'IP 选择器 Slot（宿主实现，无 Vue）';
ipSelector.style.display = 'block';
ipSelector.style.padding = '12px';
ipSelector.style.minWidth = '280px';

const defaultSlot = document.createElement('div');
defaultSlot.dataset.slot = 'default';
defaultSlot.style.padding = '8px 12px';
defaultSlot.style.fontSize = '12px';
defaultSlot.style.color = '#979ba5';
defaultSlot.textContent = 'default slot：可用于场景标签等宿主扩展内容';

host.append(favorites, toolbarExtra, ipSelector, defaultSlot);

const services = createMockServices();
const bar = createSearchInputBar(host, {
  mode: 'ui',
  platform: 'log-platform',
  enableModes: { ui: true, sql: true, ai: true },
  sqlMode: {
    enableFavoriteSuggestions: true,
    // sqlSyntaxUrl 默认 = Vue 正式文档地址；可在此覆盖
  },
  // 分模式 PlaceHolder：SQL 的 idle（未聚焦）与 focus（键入）分开配置
  placeholders: {
    ui: ' / 唤起，输入检索内容（Tab 可切换为 AI 模式）',
    sql: ' / 唤起， 输入检索内容（Tab 可切换为 AI 模式）',
    sqlFocus: ' / 唤起， 输入检索内容',
    sqlFocusAi: '可输入自然语言，{shortcut} + Enter 触发 AI 解析',
    ai: '用自然语言描述你的查询条件，Enter 执行',
  },
  toolbar: {
    showCopy: true,
    showClear: true,
    showSettings: true,
    showQueryButton: true,
  },
  commonFilter: {
    focused: false,
    selectedFields: [],
    addition: [],
  },
  indexSetId: 'demo-index',
  services,
});

const events = [
  'update:mode',
  'update:uiValue',
  'update:sqlValue',
  'update:aiFilterList',
  'search',
  'mode-change',
  'clear',
  'copy',
  'cancel',
  'settings-toggle',
  'settings-change',
  'common-filter-change',
  'text-to-query',
  'ai-result',
  'height-change',
  'popup-change',
] as const;

events.forEach((name) => {
  bar.on(name as any, detail => log(name, detail));
});

function addControl(label: string, onClick: () => void) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.onclick = onClick;
  controls.appendChild(btn);
}

addControl('切到 UI', () => bar.setMode('ui'));
addControl('切到 SQL', () => bar.setMode('sql'));
addControl('切到 AI', () => bar.setMode('ai'));
addControl('platform: log', () => {
  bar.setOptions({ platform: 'log-platform' as PlatformVariant });
  log('platform', 'log-platform');
});
addControl('platform: default', () => {
  bar.setOptions({ platform: 'default' as PlatformVariant });
  log('platform', 'default');
});
addControl('platform: trace', () => {
  bar.setOptions({ platform: 'trace' as PlatformVariant });
  log('platform', 'trace');
});
addControl('模拟 searching', () => bar.setOptions({ searching: true }));
addControl('结束 searching', () => bar.setOptions({ searching: false }));
addControl('关闭 SQL 收藏联想', () => {
  bar.setOptions({ sqlMode: { enableFavoriteSuggestions: false } });
  log('sqlMode', { enableFavoriteSuggestions: false });
});
addControl('开启 SQL 收藏联想', () => {
  bar.setOptions({ sqlMode: { enableFavoriteSuggestions: true } });
  log('sqlMode', { enableFavoriteSuggestions: true });
});
addControl('打印 getValue()', () => log('getValue', bar.getValue()));

log('ready', {
  checklist: [
    'chrome: log-platform 边框#C1CDE5 / 圆角4px / 高度48',
    'mode: UI↔SQL toggle + qiehuan icon',
    'toolbar: 24x24 icon',
    'query: 外置74px + 查询文案',
    'ui tags: 双行灰底',
    'ai: 渐变整壳',
    'Tab: 组件内切换 AI',
  ],
});
