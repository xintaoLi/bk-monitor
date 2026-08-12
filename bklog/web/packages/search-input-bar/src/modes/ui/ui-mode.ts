import { IP_SELECT_FIELD, getInputQueryDefaultItem } from '../../core/const.common';
import type { SearchInputBarServices, UiQueryItem } from '../../types';
import { createTippyPopover, type TippyPopoverInstance } from '../../utils/popover';
import { el, on } from '../../utils/dom';
import { getOperatorDisplayLabel, isNegateOperator } from './operator-labels';
import { UiOptionsPanel } from './ui-options-panel';
import { MoreValuesMenu, ValueTagMenu } from './value-tag-menu';

export interface UiModeContext {
  services: SearchInputBarServices;
  texts: Record<string, string>;
  getValue: () => UiQueryItem[];
  setValue: (next: UiQueryItem[], emit?: boolean) => void;
  onSearch: () => void;
  onPopupChange: (isShow: boolean) => void;
  onHeightChange?: (height: number) => void;
  ipSlot?: HTMLElement;
  placeholderSlot?: HTMLElement;
  tippyAppendTo?: HTMLElement | (() => HTMLElement);
  tippyZIndex?: number;
  formatFieldValue?: (value: string, fieldType?: string) => string;
  fuzzyEngine?: 'es' | 'doris';
}

/**
 * UI mode aligned with retrieve-v2/ui-input.vue.
 */
export class UiModeView {
  root: HTMLElement;
  private listEl: HTMLUListElement;
  private addBtn: HTMLElement;
  private hiddenAnchor: HTMLElement;
  private focusLi: HTMLElement;
  private focusInput: HTMLInputElement;
  private panel: UiOptionsPanel;
  private tippy: TippyPopoverInstance | null = null;
  private cleanups: Array<() => void> = [];
  private tagMenus: Array<ValueTagMenu | MoreValuesMenu> = [];
  private activeEditIndex: number | null = null;
  private openFromInputFocus = false;
  private needDeleteItem = false;
  private isComposing = false;
  private pendingSeed: Partial<UiQueryItem> | null = null;
  private suppressStateReset = false;
  private resizeObserver: ResizeObserver | null = null;
  /** 用于 onHide 判断：点击是否落在挂 body 的嵌套 tippy 上 */
  private lastPointerTarget: EventTarget | null = null;

  constructor(private ctx: UiModeContext) {
    this.root = el('div', 'bklog-sib-ui search-ui-input');
    this.listEl = el('ul', 'search-items') as HTMLUListElement;

    this.addBtn = el('li', 'search-item btn-add');
    this.addBtn.append(
      Object.assign(el('span', 'tag-add'), { textContent: '+' }),
      Object.assign(el('span', 'tag-text'), { textContent: '添加条件' }),
    );

    this.hiddenAnchor = el('li', 'search-item search-item-focus hidden-pointer');
    this.hiddenAnchor.setAttribute('aria-hidden', 'true');

    this.focusLi = el('li', 'search-item is-focus-input');
    this.focusInput = el('input', 'tag-option-focus-input') as HTMLInputElement;
    this.focusInput.type = 'text';
    // 对齐 Vue：仅 data-attr-txt(::after) 展示占位，勿再设 input.placeholder（会重复）
    this.focusInput.placeholder = '';
    this.syncUiPlaceholder();
    this.focusLi.appendChild(this.focusInput);

    this.panel = new UiOptionsPanel({
      services: ctx.services,
      texts: ctx.texts,
      ipSlot: ctx.ipSlot,
      fuzzyEngine: ctx.fuzzyEngine,
      onSave: item => this.handleSave(item),
      onCancel: () => this.hidePopup(),
      onFuzzyAvailableChange: (available) => {
        this.tippy?.setProps({ maxWidth: available ? 1000 : 800 });
        this.tippy?.reposition();
      },
      onBatchShowChange: (isShow) => {
        this.tippy?.setProps({ hideOnClick: !isShow });
      },
      onNestedPopoverChange: (isShow) => {
        // 子 tippy（条件/值蛋）打开时禁用父层 hideOnClick，避免误关
        this.tippy?.setProps({ hideOnClick: !isShow });
      },
    });

    this.cleanups.push(
      on(this.addBtn, 'click', (e) => {
        e.stopPropagation();
        this.activeEditIndex = null;
        this.pendingSeed = null;
        this.openFromInputFocus = false;
        this.showPopup(this.addBtn);
      }),
      on(this.focusInput, 'focus', () => {
        this.openFromInputFocus = true;
        this.activeEditIndex = null;
        this.pendingSeed = null;
        this.showPopup(this.hiddenAnchor);
      }),
      on(this.focusInput, 'compositionstart', () => { this.isComposing = true; }),
      on(this.focusInput, 'compositionend', () => { this.isComposing = false; }),
      on(this.focusInput, 'input', () => {
        this.needDeleteItem = false;
        this.syncUiPlaceholder();
        this.resizeFocusInput();
      }),
      on(this.focusInput, 'keydown', e => this.handleFocusKeydown(e)),
      on(this.root, 'click', (e) => {
        const target = e.target as HTMLElement;
        if (
          target === this.listEl
          || target === this.root
          || target.classList.contains('search-ui-input')
          || target.classList.contains('search-items')
        ) {
          this.openFromInputFocus = true;
          this.activeEditIndex = null;
          this.pendingSeed = null;
          this.focusInput.focus();
          this.showPopup(this.hiddenAnchor);
        }
      }),
      on(this.root, 'mousedown', (e) => {
        // prevent tippy hideOnClick when clicking current reference / wrapper
        const t = e.target as HTMLElement;
        if (this.root.contains(t)) e.stopPropagation();
      }, true),
      on(document, 'keydown', (e) => {
        if (e.key === '/' && !this.isEditableTarget(e.target) && !this.tippy?.isShown()) {
          e.preventDefault();
          this.focus();
        }
      }),
      on(document, 'mousedown', (e) => {
        this.lastPointerTarget = e.target;
      }, true),
    );
  }

  mount(parent: HTMLElement) {
    parent.appendChild(this.root);
    this.root.appendChild(this.listEl);
    if (this.ctx.placeholderSlot) this.root.appendChild(this.ctx.placeholderSlot);
    this.tippy = createTippyPopover(this.hiddenAnchor, {
      content: this.panel.root,
      // Vue 默认 top；检索条靠页顶时 flip 到下方，避免面板裁切
      placement: 'top',
      theme: 'log-light',
      arrow: true,
      maxWidth: 800,
      hideOnClick: true,
      delay: [0, 300],
      newInstance: true,
      appendTo: this.ctx.tippyAppendTo || (() => document.body),
      zIndex: this.ctx.tippyZIndex ?? 99999,
      onShow: () => {
        this.panel.beforeShow({
          isInputFocus: this.openFromInputFocus,
          seed: this.pendingSeed,
        });
        const fuzzy = this.panel.isFuzzyMatchAvailable();
        this.tippy?.setProps({ maxWidth: fuzzy ? 1000 : 800 });
        this.ctx.onPopupChange(true);
        return true;
      },
      onHide: () => {
        // 点击挂在 body 上的值候选/条件下拉时，阻止父 tippy 关闭
        const t = this.lastPointerTarget as HTMLElement | null;
        if (t?.closest?.('.condition-value-options, .ui-value-select, .bklog-sib-batch-dialog')) {
          this.tippy?.setProps({ hideOnClick: false });
          return false;
        }
        this.panel.beforeHide();
      },
      onHidden: () => {
        this.panel.afterHide();
        if (!this.suppressStateReset) {
          this.activeEditIndex = null;
          this.pendingSeed = null;
          this.openFromInputFocus = false;
          this.ctx.onPopupChange(false);
        }
      },
    });
    this.resizeObserver = new ResizeObserver(() => {
      this.tippy?.reposition();
      this.ctx.onHeightChange?.(this.root.getBoundingClientRect().height);
    });
    this.resizeObserver.observe(this.root);
    this.renderTags();
  }

  update() {
    this.renderTags();
    this.syncUiPlaceholder();
  }

  focus() {
    this.openFromInputFocus = true;
    this.focusInput.focus();
    this.showPopup(this.hiddenAnchor);
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.destroyTagMenus();
    this.tippy?.destroy();
    this.panel.destroy();
    this.cleanups.forEach(fn => fn());
    this.root.remove();
  }

  private destroyTagMenus() {
    this.tagMenus.forEach(m => m.destroy());
    this.tagMenus = [];
  }

  private isEditableTarget(target: EventTarget | null) {
    const node = target as HTMLElement | null;
    if (!node) return false;
    const tag = node.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || node.isContentEditable;
  }

  private handleSave(item: UiQueryItem) {
    if (item.field === IP_SELECT_FIELD) {
      const list = [...this.ctx.getValue()];
      if (!list.some(f => f.field === IP_SELECT_FIELD)) {
        list.push({ ...item, disabled: false });
        this.ctx.setValue(list, true);
        this.renderTags();
      }
      this.tippy?.reposition();
      this.focusInput.focus();
      return;
    }

    if (this.activeEditIndex !== null && this.activeEditIndex >= 0) {
      const next = [...this.ctx.getValue()];
      next[this.activeEditIndex] = { ...next[this.activeEditIndex], ...item, disabled: false };
      this.ctx.setValue(next, true);
      this.activeEditIndex = null;
      this.pendingSeed = null;
      this.renderTags();
      this.hidePopup();
      return;
    }

    this.ctx.setValue([...this.ctx.getValue(), { ...item, disabled: false }], true);
    this.renderTags();
    this.pendingSeed = null;
    this.openFromInputFocus = false;
    this.panel.resetForNextAdd();
    this.tippy?.setProps({ maxWidth: this.panel.isFuzzyMatchAvailable() ? 1000 : 800 });
    this.tippy?.reposition();
    this.focusInput.focus();
  }

  private showPopup(anchor: HTMLElement) {
    this.suppressStateReset = true;
    try {
      this.tippy?.show(anchor);
    } finally {
      this.suppressStateReset = false;
    }
  }

  private hidePopup() {
    this.focusInput.value = '';
    this.syncUiPlaceholder();
    this.resizeFocusInput();
    this.tippy?.hide(180);
  }

  /** 对齐 Vue inputPlaceholder：有输入时清空 data-attr-txt */
  private syncUiPlaceholder() {
    const text = this.ctx.texts.uiPlaceholder || '';
    const empty = !(this.focusInput.value?.length);
    this.focusLi.dataset.attrTxt = empty ? text : '';
  }

  private handleFocusKeydown(e: KeyboardEvent) {
    if (e.isComposing || this.isComposing) return;

    if (e.key === 'Escape') {
      this.openFromInputFocus = false;
      this.hidePopup();
      return;
    }

    if (e.key === 'Backspace' && !this.focusInput.value) {
      const list = this.ctx.getValue();
      if (!list.length) return;
      if (!this.needDeleteItem) {
        this.needDeleteItem = true;
        return;
      }
      this.needDeleteItem = false;
      this.ctx.setValue(list.slice(0, -1), true);
      this.renderTags();
      this.tippy?.reposition();
      return;
    }

    if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const text = this.focusInput.value.trim();
      if (!text) {
        // 空 Enter：仅 focus 面板，不触发检索（对齐 Vue）
        this.focusInput.focus();
        return;
      }
      this.handleSave(getInputQueryDefaultItem([text]));
      this.focusInput.value = '';
      this.resizeFocusInput();
    }
  }

  private resizeFocusInput() {
    const len = this.focusInput.value.length || 0;
    const width = Math.min(500, Math.max(12, len * 12 + (len ? 8 : 12)));
    this.focusInput.style.width = `${Math.max(width, len ? 24 : 12)}px`;
    if (!len) this.focusInput.style.width = '160px';
  }

  private getFieldDisplayName(field: string) {
    if (field === '*') return '全文';
    if (field === IP_SELECT_FIELD) return 'IP目标';
    const info = this.ctx.services.getFields?.().find(f => f.field_name === field);
    return info?.query_alias || info?.field_alias || field;
  }

  private formatValue(value: string, fieldType?: string) {
    return this.ctx.formatFieldValue?.(value, fieldType) ?? value;
  }

  private patchItem(index: number, next: UiQueryItem) {
    const list = [...this.ctx.getValue()];
    list[index] = next;
    this.ctx.setValue(list, true);
    this.renderTags();
  }

  private cloneItem(item: UiQueryItem): UiQueryItem {
    return {
      ...item,
      value: Array.isArray(item.value) ? [...item.value] as string[] : [],
      hidden_values: [...(item.hidden_values || [])],
      relation: item.relation || 'OR',
    };
  }

  private renderTags() {
    this.destroyTagMenus();
    this.listEl.replaceChildren();
    this.listEl.appendChild(this.addBtn);

    const dict = this.ctx.services.getOperatorDictionary?.();

    this.ctx.getValue().forEach((item, index) => {
      if (item.is_focus_input) return;
      const li = el(
        'li',
        `search-item tag-item${item.disabled ? ' is-disabled' : ''}${item.isCommonFixed ? ' is-common-fixed' : ''}`,
      );

      const nameRow = el('div', 'tag-row match-name');
      const nameLabel = el('span', 'match-name-label');
      nameLabel.textContent = this.getFieldDisplayName(item.field);
      const symbol = el('span', 'symbol');
      symbol.dataset.operator = item.operator || '';
      symbol.textContent = getOperatorDisplayLabel(item.operator || '', dict);
      if (isNegateOperator(item.operator || '')) symbol.classList.add('is-negate');
      nameRow.append(nameLabel, symbol);

      const valueRow = el('div', 'tag-row match-value');
      if (item.field === IP_SELECT_FIELD) {
        const text = el('span', 'match-value-text');
        text.textContent = 'IP目标';
        valueRow.appendChild(text);
      } else {
        const values = (item.value || []).map(String);
        const shown = item.showAll ? values : values.slice(0, 3);
        shown.forEach((v, i) => {
          const span = el('span');
          const text = el(
            'span',
            `match-value-text${item.hidden_values?.includes(v) ? ' delete-line' : ''}${v.length > 20 ? ' has-ellipsis' : ''}`,
          );
          text.textContent = this.formatValue(v, item.field_type);
          if (v.length > 20) text.title = values.join(', ');
          const menu = new ValueTagMenu({
            getItem: () => this.ctx.getValue()[index],
            onChange: next => this.patchItem(index, next),
          });
          menu.attach(text, v);
          this.tagMenus.push(menu);
          span.appendChild(text);
          if (i < shown.length - 1 && (i < 2 || item.showAll)) {
            const rel = el('span', 'match-value-relation');
            rel.textContent = (item.relation || 'OR').toUpperCase();
            span.appendChild(rel);
          }
          valueRow.appendChild(span);
        });
        if (!item.showAll && values.length > 3) {
          const more = el('span', 'match-value-more');
          more.textContent = `+${values.length - 3}`;
          const moreMenu = new MoreValuesMenu({
            getItem: () => this.ctx.getValue()[index],
            onChange: next => this.patchItem(index, next),
          });
          moreMenu.attach(more, values.slice(3));
          this.tagMenus.push(moreMenu);
          valueRow.appendChild(more);
        }
      }

      const options = el('div', 'tag-options');
      const eye = el('span', `bklog-icon ${item.disabled ? 'bklog-eye-slash' : 'bklog-eye'}`);
      on(eye, 'click', (e) => {
        e.stopPropagation();
        const cur = this.ctx.getValue()[index];
        const disabled = !cur.disabled;
        this.patchItem(index, {
          ...cur,
          disabled,
          hidden_values: disabled ? [...(cur.value || []).map(String)] : [],
        });
      });
      const close = el('span', 'bklog-icon bklog-shanchu tag-options-close');
      on(close, 'click', (e) => {
        e.stopPropagation();
        this.ctx.setValue(this.ctx.getValue().filter((_, i) => i !== index), true);
        this.renderTags();
      });
      options.append(eye, close);
      li.append(nameRow, valueRow, options);

      on(li, 'click', (e) => {
        e.stopPropagation();
        if (item.field === IP_SELECT_FIELD) return;
        this.openFromInputFocus = false;
        this.activeEditIndex = index;
        this.pendingSeed = this.cloneItem(item);
        this.showPopup(li);
      });
      this.listEl.appendChild(li);
    });

    this.listEl.append(this.hiddenAnchor, this.focusLi);
  }
}
