import type { MergedOptions } from '../config';
import type { SearchMode } from '../types';
import { el, on } from '../utils/dom';

export interface ToolbarHandlers {
  onCopy: () => void;
  onClear: () => void;
  onSettings: (anchor: HTMLElement) => void;
}

function createIconTool(iconClass: string, title: string, onClick: (el: HTMLElement) => void) {
  const wrap = el('div');
  wrap.title = title;
  const icon = el('span', `bklog-icon ${iconClass}`);
  wrap.appendChild(icon);
  const off = on(wrap, 'click', () => onClick(wrap));
  return { wrap, destroy: off };
}

/**
 * Icon toolbar inside `.bklog-sib-input` (matches `.search-tool.items`).
 * Query button is created separately via `createQueryButton`.
 */
export function createToolbar(
  options: MergedOptions,
  slots: { toolbarExtra?: HTMLElement; favorites?: HTMLElement },
  handlers: ToolbarHandlers,
) {
  const root = el('div', 'bklog-sib-tools search-tool items');
  const cleanups: Array<() => void> = [];
  let settingsWrap: HTMLElement | null = null;

  if (options.toolbar.showCopy) {
    const item = createIconTool('bklog-copy-4', options.localeTexts.copy, () => handlers.onCopy());
    cleanups.push(item.destroy);
    root.appendChild(item.wrap);
  }

  if (options.toolbar.showClear) {
    const item = createIconTool('bklog-qingkong', options.localeTexts.clear, () => handlers.onClear());
    cleanups.push(item.destroy);
    root.appendChild(item.wrap);
  }

  if (options.toolbar.showSettings) {
    const item = createIconTool('bklog-setting', options.localeTexts.settings, (anchor) => {
      handlers.onSettings(anchor);
    });
    settingsWrap = item.wrap;
    cleanups.push(item.destroy);
    root.appendChild(item.wrap);
  }

  if (slots.favorites) root.appendChild(slots.favorites);
  if (slots.toolbarExtra) root.appendChild(slots.toolbarExtra);

  return {
    root,
    update(next: MergedOptions, _mode: SearchMode) {
      if (settingsWrap) {
        settingsWrap.classList.toggle('is-focused', next.commonFilter.focused);
      }
    },
    setSettingsFocused(focused: boolean) {
      settingsWrap?.classList.toggle('is-focused', focused);
    },
    destroy() {
      cleanups.forEach(fn => fn());
      root.remove();
    },
  };
}

export function createQueryButton(
  options: MergedOptions,
  onQuery: () => void,
) {
  const root = el('div', 'bklog-sib-query search-tool search-btn');
  const btn = el('button', 'bklog-sib-query-btn search-query-btn');
  btn.type = 'button';

  const render = (next: MergedOptions) => {
    btn.disabled = next.disabled || next.queryDisabled;
    btn.title = next.queryDisabledReason || '';
    const iconName = next.searching ? 'bklog-zanting' : 'bklog-shoudongchaxun';
    const showText = !next.searching;
    btn.replaceChildren();
    const inner = el('div');
    const icon = el('span', `bklog-icon ${iconName}`);
    inner.appendChild(icon);
    if (showText) {
      const text = el('span');
      text.textContent = next.localeTexts.search;
      inner.appendChild(text);
    }
    btn.appendChild(inner);
  };

  render(options);
  const off = on(btn, 'click', () => onQuery());
  root.appendChild(btn);

  return {
    root,
    update(next: MergedOptions) {
      render(next);
    },
    destroy() {
      off();
      root.remove();
    },
  };
}
