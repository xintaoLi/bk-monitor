import { mergeOptions } from '../config';
import { shouldConvertUiToSqlOnModeSwitch } from '../core/ui-to-sql-mode';
import { AiModeView } from '../modes/ai/ai-mode';
import { SqlModeView } from '../modes/sql/sql-mode';
import { UiModeView } from '../modes/ui/ui-mode';
import { CommonFilterSelect } from '../settings/common-filter-select';
import { CommonFilterSetting } from '../settings/common-filter-setting';
import { SlotHost } from '../slots/slot-host';
import type {
  SearchInputBarEventMap,
  SearchInputBarOptions,
  SearchMode,
  UiQueryItem,
} from '../types';
import { el, on } from '../utils/dom';
import { createQueryButton, createToolbar } from './toolbar';

export interface SearchBarInstance {
  el: HTMLElement;
  setOptions: (patch: Partial<SearchInputBarOptions>) => void;
  setMode: (mode: SearchMode) => void;
  setValue: (value: { uiValue?: UiQueryItem[]; sqlValue?: string }) => void;
  getValue: () => { mode: SearchMode; uiValue: UiQueryItem[]; sqlValue: string; aiFilterList: string[] };
  addValue: (item: UiQueryItem) => void;
  getRect: () => DOMRect;
  focus: () => void;
  destroy: () => void;
  on: <K extends keyof SearchInputBarEventMap>(
    type: K,
    listener: (detail: SearchInputBarEventMap[K]) => void,
  ) => () => void;
}

export function createSearchBar(host: HTMLElement, rawOptions: SearchInputBarOptions): SearchBarInstance {
  let options = mergeOptions(rawOptions);
  let platform = options.platform;
  const listeners = new Map<string, Set<(detail: any) => void>>();
  const slotHost = new SlotHost();
  const cleanups: Array<() => void> = [];

  const root = el('div', `bklog-sib-root bklog-sib-root--${platform}`);
  const row = el('div', 'bklog-sib-row');
  const container = el('div', 'bklog-sib-container');
  const modeToggle = el('button', 'bklog-sib-mode-toggle') as HTMLButtonElement;
  modeToggle.type = 'button';
  const inputWrap = el('div', 'bklog-sib-input');
  const inputSection = el('div', 'bklog-sib-input-section');
  const progressBar = el('div', 'bklog-sib-ai-progress');
  const aiShellHost = el('div', 'bklog-sib-ai-host');
  const below = el('div', 'bklog-sib-below');
  const bannerHost = el('div', 'bklog-sib-banner-host');

  const toolbarExtraSlot = slotHost.createContainer('toolbar-extra');
  const favoritesSlot = slotHost.createContainer('favorites');
  const sqlFavoriteListSlot = slotHost.createContainer('sql-favorite-list');
  const ipSlot = slotHost.createContainer('ip-selector');
  const placeholderSlot = slotHost.createContainer('custom-placeholder');
  const defaultSlot = slotHost.createContainer('default');

  host.classList.add('bklog-sib-host');
  host.appendChild(root);

  const emit = <K extends keyof SearchInputBarEventMap>(type: K, detail: SearchInputBarEventMap[K]) => {
    listeners.get(type)?.forEach(fn => fn(detail));
    host.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  };

  const settingsPanel = new CommonFilterSetting({
    texts: options.localeTexts,
    getFields: () => options.services.getFields(),
    getSelected: () => options.commonFilter.selectedFields,
    onConfirm: (selectedFields) => {
      options.commonFilter.selectedFields = selectedFields;
      options.commonFilter.focused = true;
      toolbar.setSettingsFocused(true);
      emit('settings-change', { selectedFields });
      emit('settings-toggle', { focused: true });
      renderCommonFilter();
      syncContainerBorder();
      observeHeight();
    },
  });

  const toolbar = createToolbar(
    options,
    { toolbarExtra: toolbarExtraSlot, favorites: favoritesSlot },
    {
      onCopy: () => void handleCopy(),
      onClear: () => handleClear(),
      onSettings: (anchor) => {
        settingsPanel.open(anchor);
        options.commonFilter.focused = true;
        toolbar.setSettingsFocused(true);
        emit('settings-toggle', { focused: true });
        renderCommonFilter();
        syncContainerBorder();
        observeHeight();
      },
    },
  );

  const queryBtn = createQueryButton(options, () => handleQuery());

  let uiMode: UiModeView | null = null;
  let sqlMode: SqlModeView | null = null;
  let aiMode: AiModeView | null = null;
  let commonFilterView: CommonFilterSelect | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const syncContainerBorder = () => {
    container.classList.toggle('set-border', options.commonFilter.focused);
  };

  const buildModeToggle = () => {
    const uiOn = options.enableModes.ui;
    const sqlOn = options.enableModes.sql;
    const showToggle = uiOn && sqlOn && options.mode !== 'ai';
    modeToggle.classList.toggle('is-hidden', !showToggle);
    modeToggle.replaceChildren();
    if (!showToggle) return;

    const label = options.mode === 'sql' ? options.localeTexts.sqlMode : options.localeTexts.uiMode;
    const modeText = el('span', 'mode-text');
    modeText.textContent = label;
    const modeIcon = el('span', `bklog-icon mode-icon ${options.mode === 'sql' ? 'bklog-yuju1' : 'bklog-ui1'}`);
    const switchIcon = el('span', 'bklog-icon bklog-qiehuan-2');
    modeToggle.append(modeText, modeIcon, switchIcon);
  };

  const destroyModes = () => {
    uiMode?.destroy();
    sqlMode?.destroy();
    aiMode?.destroy();
    uiMode = null;
    sqlMode = null;
    aiMode = null;
    inputSection.replaceChildren();
    aiShellHost.replaceChildren();
  };

  const renderLayoutForMode = () => {
    const isAi = options.mode === 'ai';
    root.classList.toggle('is-ai-mode', isAi);
    row.style.display = isAi ? 'none' : 'flex';
    aiShellHost.style.display = isAi ? 'block' : 'none';
    bannerHost.style.display = isAi ? 'none' : 'block';
  };

  const mountActiveMode = () => {
    destroyModes();
    renderLayoutForMode();
    progressBar.classList.toggle('is-show', options.isAiLoading);

    if (options.mode === 'ai') {
      aiMode = new AiModeView({
        texts: options.localeTexts,
        getFilterList: () => options.aiFilterList,
        setFilterList: (next) => {
          options.aiFilterList = next;
          emit('update:aiFilterList', next);
          aiMode?.update();
        },
        getResult: () => options.aiQueryResult,
        isLoading: () => options.isAiLoading,
        onSubmit: text => void handleTextToQuery(text, 'ai'),
        onClearResult: () => {
          options.aiQueryResult = null;
          emit('ai-result', {});
          aiMode?.update();
          renderBanner();
        },
        onExitAi: () => void setMode(options.enableModes.sql ? 'sql' : 'ui'),
      });
      aiMode.mount(aiShellHost);
      return;
    }

    if (options.mode === 'ui') {
      uiMode = new UiModeView({
        services: options.services,
        texts: options.localeTexts,
        getValue: () => options.uiValue,
        setValue: (next, emitEvent = true) => {
          options.uiValue = next;
          if (emitEvent) emit('update:uiValue', next);
        },
        onSearch: () => handleQuery(),
        onPopupChange: isShow => emit('popup-change', { isShow }),
        onHeightChange: height => emit('height-change', height),
        ipSlot,
        placeholderSlot,
        fuzzyEngine: 'es',
      });
      uiMode.mount(inputSection);
    } else {
      sqlMode = new SqlModeView({
        services: options.services,
        texts: options.localeTexts,
        enableAi: !!options.enableModes.ai && !!options.services.requestAiQuery,
        disabled: options.disabled,
        sqlSyntaxUrl: options.sqlMode.sqlSyntaxUrl,
        enableFavoriteSuggestions: options.sqlMode.enableFavoriteSuggestions,
        favoriteListSlot: sqlFavoriteListSlot,
        placeholderSlot,
        getValue: () => options.sqlValue,
        setValue: (next, emitEvent = true) => {
          options.sqlValue = next;
          if (emitEvent) emit('update:sqlValue', next);
        },
        onSearch: () => handleQuery(),
        onTextToQuery: text => void handleTextToQuery(text, 'sql'),
        onPopupChange: isShow => emit('popup-change', { isShow }),
      });
      sqlMode.mount(inputSection);
    }
    renderBanner();
  };

  const renderBanner = () => {
    bannerHost.replaceChildren();
    const result = options.aiQueryResult;
    if (!result?.parseResult && !result?.queryString) return;
    if (options.mode === 'ai') return;

    const ok = result.parseResult !== 'FAILED';
    const box = el('div', `bklog-sib-banner ai-parse-result-banner ${ok ? 'is-success' : 'is-failed'} show-border`);
    const left = el('div', 'ai-parse-result-left');
    const label = el('div', 'ai-parse-label');
    const labelLeft = el('div', 'ai-parse-label-left');
    const icon = el('span', `bklog-icon bklog-circle-alert-filled ai-parse-icon`);
    const title = el('span', ok ? 'ai-parse-success-label' : 'ai-parse-failed-label');
    title.textContent = `AI 解析: ${result.parseResult || 'SUCCESS'}`;
    labelLeft.append(icon, title);
    label.appendChild(labelLeft);
    left.appendChild(label);

    if (result.queryString) {
      const text = el('div', 'ai-parse-success-text');
      text.textContent = result.queryString;
      left.appendChild(text);
    }

    const actions = el('div', 'ai-parse-result-actions');
    const copyBtn = el('button', 'ai-parse-action');
    copyBtn.type = 'button';
    copyBtn.textContent = '复制';
    on(copyBtn, 'click', async () => {
      if (result.queryString) {
        try { await navigator.clipboard.writeText(result.queryString); } catch { /* ignore */ }
      }
    });
    const closeBtn = el('button', 'ai-parse-action');
    closeBtn.type = 'button';
    closeBtn.textContent = '关闭';
    on(closeBtn, 'click', () => {
      options.aiQueryResult = null;
      emit('ai-result', {});
      renderBanner();
      observeHeight();
    });
    actions.append(copyBtn, closeBtn);
    box.append(left, actions);
    bannerHost.appendChild(box);
  };

  const renderCommonFilter = () => {
    commonFilterView?.destroy();
    commonFilterView = null;
    below.querySelector('.bklog-sib-common-filter-wrap')?.remove();

    if (!options.commonFilter.focused) return;
    const wrap = el('div', 'bklog-sib-common-filter-wrap filter-container-wrap');
    commonFilterView = new CommonFilterSelect({
      services: options.services,
      getFields: () => options.commonFilter.selectedFields,
      getAddition: () => options.commonFilter.addition,
      onChange: (addition) => {
        options.commonFilter.addition = addition;
        emit('common-filter-change', addition);
      },
    });
    wrap.appendChild(commonFilterView.root);
    below.insertBefore(wrap, defaultSlot);
    commonFilterView.update();
  };

  async function setMode(mode: SearchMode, opts?: { silent?: boolean }) {
    if (!options.enableModes[mode]) return;
    const from = options.mode;
    if (from === mode) return;

    let convertedKeyword: string | undefined;
    if (from === 'ui' && mode === 'sql') {
      const needConvert = shouldConvertUiToSqlOnModeSwitch(0, 1, options.uiValue.length);
      if (needConvert) {
        try {
          const res = await options.services.convertUiToSql(options.uiValue);
          convertedKeyword = res.querystring || '';
          options.sqlValue = convertedKeyword;
          emit('update:sqlValue', options.sqlValue);
        } catch {
          console.warn(options.localeTexts.convertWarn);
        }
      }
    }

    if (from !== 'ai' && mode === 'ai') {
      const seed = from === 'sql' ? options.sqlValue : '';
      options.aiFilterList = [seed].filter(f => !/^\s*\*?\s*$/.test(f));
      emit('update:aiFilterList', options.aiFilterList);
    }

    if (from === 'ai' && mode !== 'ai') {
      const parts = [...options.aiFilterList];
      if (options.aiQueryResult?.queryString) parts.push(options.aiQueryResult.queryString);
      const keyword = parts.filter(Boolean).join(' AND ');
      if (mode === 'sql') {
        options.sqlValue = keyword;
        emit('update:sqlValue', options.sqlValue);
      }
      options.aiFilterList = [];
      emit('update:aiFilterList', []);
    }

    options.mode = mode;
    buildModeToggle();
    mountActiveMode();
    toolbar.update(options, mode);
    queryBtn.update(options);
    if (!opts?.silent) {
      emit('update:mode', mode);
      emit('mode-change', { from, to: mode, convertedKeyword });
    }
    observeHeight();
  }

  async function handleCopy() {
    let text = '';
    if (options.mode === 'sql' || options.mode === 'ai') {
      text = options.mode === 'ai' ? options.aiQueryResult?.queryString || '' : options.sqlValue;
    } else {
      try {
        const res = await options.services.convertUiToSql(options.uiValue);
        text = res.querystring || '';
      } catch {
        console.warn(options.localeTexts.missingConvert);
        return;
      }
    }
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    emit('copy', { text });
  }

  function handleClear() {
    options.uiValue = [];
    options.sqlValue = '';
    options.aiFilterList = [];
    options.aiQueryResult = null;
    emit('update:uiValue', []);
    emit('update:sqlValue', '');
    emit('update:aiFilterList', []);
    emit('clear', undefined as void);
    mountActiveMode();
    observeHeight();
  }

  function handleQuery() {
    if (options.queryDisabled || options.disabled) return;
    if (options.searching) {
      emit('cancel', undefined as void);
      return;
    }
    if (options.mode === 'ui') emit('search', { mode: 'ui', value: options.uiValue });
    else if (options.mode === 'sql') emit('search', { mode: 'sql', value: options.sqlValue });
    else emit('search', { mode: 'ai', value: options.aiQueryResult?.queryString || options.sqlValue });
  }

  async function handleTextToQuery(text: string, source: 'ui' | 'sql' | 'ai') {
    emit('text-to-query', { text, source });
    if (!options.services.requestAiQuery) {
      console.warn(options.localeTexts.missingAi);
      return;
    }
    options.isAiLoading = true;
    progressBar.classList.add('is-show');
    aiMode?.update();
    try {
      const fields = options.services.getFields();
      const fieldsJson = JSON.stringify(
        Object.fromEntries(
          fields.map(f => [
            f.field_name,
            { type: f.field_type, ...(f.query_alias ? { query_alias: f.query_alias } : {}) },
          ]),
        ),
      );
      const result = await options.services.requestAiQuery(text, {
        fieldsJson,
        indexSetId: options.indexSetId,
        keyword: text,
      });
      options.aiQueryResult = result;
      if (result.queryString) {
        options.sqlValue = result.queryString;
        emit('update:sqlValue', options.sqlValue);
      }
      emit('ai-result', result);
      if (source === 'ai') aiMode?.clearInput();
      aiMode?.update();
      renderBanner();
    } finally {
      options.isAiLoading = false;
      progressBar.classList.remove('is-show');
      aiMode?.update();
    }
  }

  function observeHeight() {
    emit('height-change', root.getBoundingClientRect().height);
  }

  // assemble DOM
  inputWrap.append(inputSection, toolbar.root, progressBar);
  container.append(modeToggle, inputWrap);
  row.append(container, queryBtn.root);
  below.append(bannerHost, defaultSlot);
  root.append(row, aiShellHost, below);

  cleanups.push(
    on(modeToggle, 'click', () => {
      if (options.mode === 'ui') void setMode('sql');
      else if (options.mode === 'sql') void setMode('ui');
    }),
  );

  buildModeToggle();
  mountActiveMode();
  slotHost.projectFrom(host);
  if (host.firstChild !== root) host.insertBefore(root, host.firstChild);
  renderCommonFilter();
  syncContainerBorder();

  resizeObserver = new ResizeObserver(() => observeHeight());
  resizeObserver.observe(root);

  cleanups.push(
    on(document, 'keydown', (e) => {
      if (!options.enableModes.ai) return;
      if (options.isAiLoading) return;
      if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.metaKey) return;
      if (!host.contains(document.activeElement)) return;
      e.preventDefault();
      void setMode(options.mode === 'ai' ? (options.enableModes.sql ? 'sql' : 'ui') : 'ai');
    }, true),
  );

  observeHeight();

  return {
    el: root,
    setOptions(patch) {
      const nextServices = patch.services ?? options.services;
      options = mergeOptions({
        ...options,
        ...patch,
        services: nextServices,
        uiValue: patch.uiValue ?? options.uiValue,
        sqlValue: patch.sqlValue ?? options.sqlValue,
        aiFilterList: patch.aiFilterList ?? options.aiFilterList,
        commonFilter: patch.commonFilter
          ? { ...options.commonFilter, ...patch.commonFilter }
          : options.commonFilter,
        toolbar: patch.toolbar ? { ...options.toolbar, ...patch.toolbar } : options.toolbar,
        enableModes: patch.enableModes ? { ...options.enableModes, ...patch.enableModes } : options.enableModes,
        sqlMode: patch.sqlMode
          ? { ...options.sqlMode, ...patch.sqlMode }
          : options.sqlMode,
        placeholders: patch.placeholders
          ? { ...options.placeholders, ...patch.placeholders }
          : options.placeholders,
      });
      if (patch.platform) {
        platform = options.platform;
        root.classList.remove('bklog-sib-root--log-platform', 'bklog-sib-root--trace', 'bklog-sib-root--default');
        root.classList.add(`bklog-sib-root--${platform}`);
      }
      buildModeToggle();
      mountActiveMode();
      toolbar.update(options, options.mode);
      queryBtn.update(options);
      renderCommonFilter();
      syncContainerBorder();
      observeHeight();
    },
    setMode: mode => void setMode(mode),
    setValue({ uiValue, sqlValue }) {
      if (uiValue) {
        options.uiValue = uiValue;
        emit('update:uiValue', uiValue);
      }
      if (typeof sqlValue === 'string') {
        options.sqlValue = sqlValue;
        emit('update:sqlValue', sqlValue);
      }
      if (options.mode === 'ui') uiMode?.update();
      if (options.mode === 'sql') sqlMode?.update();
    },
    getValue: () => ({
      mode: options.mode,
      uiValue: options.uiValue,
      sqlValue: options.sqlValue,
      aiFilterList: options.aiFilterList,
    }),
    addValue(item) {
      options.uiValue = [...options.uiValue, item];
      emit('update:uiValue', options.uiValue);
      uiMode?.update();
    },
    getRect: () => root.getBoundingClientRect(),
    focus() {
      if (options.mode === 'ui') uiMode?.focus();
      else if (options.mode === 'sql') sqlMode?.focus();
      else aiMode?.focus();
    },
    destroy() {
      resizeObserver?.disconnect();
      settingsPanel.destroy();
      commonFilterView?.destroy();
      destroyModes();
      toolbar.destroy();
      queryBtn.destroy();
      cleanups.forEach(fn => fn());
      root.remove();
    },
    on(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener as any);
      return () => listeners.get(type)?.delete(listener as any);
    },
  };
}
