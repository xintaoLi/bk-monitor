import { excludesFields } from '../../core/const.common';
import type {
  FavoriteSqlSuggestion,
  FieldInfo,
  SearchInputBarServices,
} from '../../types';
import { el, on } from '../../utils/dom';

export type SqlOptionKind = 'Fields' | 'Value' | 'Colon' | 'Operator' | 'Continue';

export interface SqlOptionsPanelContext {
  services: SearchInputBarServices;
  texts: Record<string, string>;
  enableAi: boolean;
  sqlSyntaxUrl: string;
  enableFavoriteSuggestions: boolean;
  /** tippy 底部收藏列表 slot（与工具栏 favorites 不同） */
  favoriteListSlot?: HTMLElement;
  onChange: (value: string, focusPosition?: number) => void;
  onRetrieve: () => void;
  onTextToQuery: (text: string) => void;
  /** 选中联想项后回写并检索（收藏） */
  onFavoriteSelect?: (keyword: string) => void;
}

interface ListItem {
  kind: string;
  text: string;
  description?: string;
  iconClass: string;
  onClick: () => void;
}

const OPERATORS = [
  { operator: '>', label: '大于' },
  { operator: '<', label: '小于' },
  { operator: '>=', label: '大于或等于' },
  { operator: '<=', label: '小于或等于' },
];

const ICON_BY_KIND: Record<string, string> = {
  'field-list-item': 'bklog-field',
  'value-list-item': 'bklog-value',
  'colon-list-item': 'bklog-equal',
  'continue-list-item': 'bklog-and',
};

/**
 * SQL query tippy content (ported from sql-query-options.vue).
 */
export class SqlOptionsPanel {
  root: HTMLElement;
  private optionsEl: HTMLElement;
  private favoriteFooter: HTMLElement | null = null;
  private activeTypes: SqlOptionKind[] = [];
  private items: ListItem[] = [];
  private activeIndex: number | null = null;
  private requesting = false;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private cleanups: Array<() => void> = [];
  private value = '';
  private focusPosition: number | null = null;
  private favoriteToken = 0;

  constructor(private ctx: SqlOptionsPanelContext) {
    this.root = el('div', 'sql-query-container');
    this.root.setAttribute('data-bklog-v3-pop-click-item', '');
    const fieldList = el('div', 'sql-field-list');
    const header = el('div', 'sql-query-header');
    const shortcuts = el('div', 'ui-shortcut-key');
    const isMac = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
    const modIcon = isMac ? 'bklog-command' : 'bklog-ctrl';
    const t = ctx.texts;

    // 对齐 Vue sql-query-options.vue header 结构
    shortcuts.innerHTML = `
      <div class="ui-shortcut-item direct-retrieve-item">
        <span class="bklog-icon bklog-enter-3 label"></span>
        <span class="value">${t.sqlDirectRetrieve || '直接检索'}</span>
      </div>
      <div class="ui-shortcut-item">
        <span class="bklog-icon bklog-arrow-down-filled label up"></span>
        <span class="bklog-icon bklog-arrow-down-filled label"></span>
        <span class="value">${t.sqlMoveCursor || '移动光标'}</span>
      </div>
      ${ctx.enableAi ? `
      <div class="ui-shortcut-item ai-shortcut-item">
        <span class="label">
          <i class="bklog-icon ${modIcon}"></i>
          <i class="bklog-icon bklog-plus"></i>
          <i class="bklog-icon bklog-enter-3"></i>
        </span>
        <span class="value">${t.sqlAiParse || 'AI 解析'}</span>
      </div>` : ''}
    `;
    const syntax = el('div', 'sql-syntax-link');
    // Vue：文案在前，jump 图标在后
    syntax.innerHTML = `<span>${t.sqlSyntaxLink || '查询语法'}</span><span class="fold-title-icon bklog-icon bklog-jump"></span>`;
    on(syntax, 'click', () => {
      window.open(ctx.sqlSyntaxUrl, '_blank');
    });
    header.append(shortcuts, syntax);

    this.optionsEl = el('ul', 'sql-query-options');
    fieldList.append(header, this.optionsEl);

    if (ctx.enableFavoriteSuggestions) {
      this.favoriteFooter = el('div', 'favorite-footer');
      fieldList.appendChild(this.favoriteFooter);
    }

    this.root.appendChild(fieldList);

    const retrieveItem = shortcuts.querySelector('.direct-retrieve-item');
    if (retrieveItem) {
      on(retrieveItem as HTMLElement, 'click', () => this.ctx.onRetrieve());
    }

    this.cleanups.push(
      on(this.root, 'click', e => e.stopPropagation()),
    );
  }

  getActiveIndex() {
    return this.activeIndex;
  }

  /**
   * @returns whether tippy should show
   */
  beforeShow(value: string, focusPosition: number | null): boolean {
    this.value = value;
    this.focusPosition = focusPosition;
    this.calculateDropdown();
    this.activeIndex = null;
    this.render();
    void this.refreshFavorites();
    const show = this.shouldShow();
    if (show) this.bindKeydown();
    return show;
  }

  beforeHide() {
    this.activeIndex = null;
    this.unbindKeydown();
  }

  update(value: string, focusPosition: number | null) {
    this.value = value;
    this.focusPosition = focusPosition;
    this.calculateDropdown();
    this.render();
    void this.refreshFavorites();
  }

  destroy() {
    this.unbindKeydown();
    this.cleanups.forEach(fn => fn());
    this.root.remove();
  }

  private shouldShow() {
    return this.activeTypes.some(t =>
      ['Fields', 'Value', 'Colon', 'Continue', 'Operator'].includes(t));
  }

  private getFocusLeft() {
    if (this.focusPosition !== null && this.focusPosition >= 0) {
      return this.value.slice(0, this.focusPosition);
    }
    return this.value;
  }

  private getFocusRight() {
    if (this.focusPosition !== null && this.focusPosition >= 0) {
      return this.value.slice(this.focusPosition);
    }
    return '';
  }

  private getFields(): FieldInfo[] {
    return (this.ctx.services.getFields?.() || []).filter(
      f => f.field_name !== '__virtual__' && !excludesFields.includes(f.field_name),
    );
  }

  private fieldNames() {
    return this.getFields().map(f => f.field_name);
  }

  private isNumTypeField(name: string) {
    const field = this.getFields().find(f => f.field_name === name);
    return ['long', 'integer', 'float', 'double'].includes(field?.field_type || '');
  }

  private showWhich(...types: SqlOptionKind[]) {
    this.activeTypes = types;
  }

  private calculateDropdown() {
    this.items = [];
    const left = this.getFocusLeft();
    const names = this.fieldNames();

    if (!left.trim()) {
      this.showWhich('Fields');
      this.items = names.map(name => this.fieldItem(name));
      return;
    }

    if (/^\s*(AND|OR|AND\s+NOT)\s+$/i.test(left) || /\s+(AND|OR|AND\s+NOT)\s+$/i.test(left)) {
      this.showWhich('Fields');
      this.items = names.map(name => this.fieldItem(name));
      return;
    }

    const fragments = left.split(/\s+(AND\s+NOT|OR|AND)\s+/i);
    const lastFragment = fragments[fragments.length - 1] ?? '';

    const valueMatch = /(?<field>[\w.]+)\s*(?<op>:|>=|<=|>|<)\s*(?<value>(?:\d+|\w+|"((?:[^"\\]|\\.)*)")?)$/
      .exec(lastFragment);
    if (valueMatch?.groups) {
      const { field, op, value: matchValue } = valueMatch.groups;
      if (names.includes(field) && (op === ':' || this.isNumTypeField(field))) {
        this.showWhich('Value');
        void this.loadValues(field, matchValue ?? '');
        return;
      }
    }

    const colonReady = /(?<field>[\w.]+)\s*(?<op>:|>=|<=|>|<)\s*$/.exec(lastFragment);
    if (colonReady?.groups) {
      const { field, op } = colonReady.groups;
      if (names.includes(field) && (op === ':' || this.isNumTypeField(field))) {
        this.showWhich('Value');
        void this.loadValues(field, '');
        return;
      }
    }

    if (/\S+\s+$/.test(left)) {
      this.showWhich('Continue');
      this.items = [
        this.continueItem('AND', '需要两个参数都为真'),
        this.continueItem('OR', '需要一个或多个参数为真'),
        this.continueItem('AND NOT', '需要一个或多个参数为真'),
      ];
      return;
    }

    if (lastFragment && names.includes(lastFragment)) {
      this.showColon(lastFragment);
      return;
    }

    const inputField = /^\s*(?<field>[\w.]+)$/.exec(lastFragment)?.groups?.field;
    if (inputField) {
      const inputLower = inputField.toLowerCase();
      const matched = names
        .map((name) => {
          const field = this.getFields().find(f => f.field_name === name);
          const display = field?.query_alias ? `${field.query_alias}(${name})` : name;
          return { name, idx: display.toLowerCase().indexOf(inputLower), display };
        })
        .filter(x => x.idx >= 0)
        .sort((a, b) => a.idx - b.idx)
        .map(x => x.name);
      if (matched.length) {
        this.showWhich('Fields');
        this.items = matched.map(name => this.fieldItem(name));
        return;
      }
    }

    this.showWhich();
  }

  private showColon(field: string) {
    const types: SqlOptionKind[] = ['Colon'];
    if (this.isNumTypeField(field)) types.push('Operator');
    this.showWhich(...types);
    this.items = [
      this.colonItem(':', '等于某一值'),
      this.colonItem(': *', '存在任意形式'),
    ];
    if (types.includes('Operator')) {
      OPERATORS.forEach((op) => {
        this.items.push(this.colonItem(op.operator, `${op.label}某一值`, 'continue-list-item'));
      });
    }
  }

  private fieldDisplay(name: string) {
    const field = this.getFields().find(f => f.field_name === name);
    if (field?.query_alias) return `${field.query_alias}(${name})`;
    if (field?.field_alias && field.field_alias !== name) return `${field.field_alias}(${name})`;
    return name;
  }

  private fieldItem(name: string): ListItem {
    return {
      kind: 'field-list-item',
      text: this.fieldDisplay(name),
      iconClass: ICON_BY_KIND['field-list-item'],
      onClick: () => this.handleClickField(name),
    };
  }

  private colonItem(type: string, description: string, kind = 'colon-list-item'): ListItem {
    return {
      kind,
      text: type === ': *' ? ':*' : type,
      description,
      iconClass: ICON_BY_KIND[kind] || ICON_BY_KIND['colon-list-item'],
      onClick: () => this.handleClickColon(type),
    };
  }

  private continueItem(type: string, description: string): ListItem {
    return {
      kind: 'continue-list-item',
      text: type,
      description,
      iconClass: ICON_BY_KIND['continue-list-item'],
      onClick: () => this.handleClickContinue(type),
    };
  }

  private async loadValues(field: string, query: string) {
    this.requesting = true;
    this.render();
    try {
      const fn = this.ctx.services.requestFieldValues;
      if (typeof fn !== 'function') {
        this.items = [];
        return;
      }
      const res = await fn({ field, query, size: 30 });
      this.items = (res?.aggs_items || [])
        .map(i => String(i.value ?? i.label ?? ''))
        .filter(Boolean)
        .map(v => ({
          kind: 'value-list-item',
          text: v.startsWith('"') ? v : `"${v}"`,
          iconClass: ICON_BY_KIND['value-list-item'],
          onClick: () => this.handleClickValue(v),
        }));
    } catch {
      this.items = [];
    } finally {
      this.requesting = false;
      this.render();
    }
  }

  private handleClickField(field: string) {
    const sqlValue = this.getFocusLeft();
    const lastFieldStr = sqlValue.split(/\s+(AND\s+NOT|OR|AND)\s+/i)?.pop() ?? '';
    let leftValue = sqlValue.slice(0, sqlValue.length - lastFieldStr.replace(/^\s/, '').length);
    if (leftValue.length && !/\s$/.test(leftValue)) leftValue = `${leftValue} `;
    const isEndWithConnection = /\s(AND|OR|AND\s+NOT)\s*$/i.test(leftValue);
    const rightValue = this.getFocusRight();
    const rightEndPosition = isEndWithConnection ? 0 : rightValue.indexOf(':');
    const targetPosition = rightEndPosition >= 0 ? rightEndPosition : 0;
    const rightFieldStr = rightValue.slice(targetPosition);
    const result = `${leftValue}${field}${rightFieldStr}`;
    this.ctx.onChange(result, leftValue.length + field.length);
    this.showColon(field);
    this.render();
  }

  private handleClickColon(type: string) {
    let target = type;
    if (type === ': *') target = `${target} `;
    const sqlValue = this.getFocusLeft();
    const rightValue = this.getFocusRight();
    const result = `${sqlValue}${target}${rightValue}`;
    this.ctx.onChange(result, sqlValue.length + target.length);
    this.focusPosition = sqlValue.length + target.length;
    this.value = result;
    this.calculateDropdown();
    this.render();
  }

  private handleClickValue(value: string) {
    const sqlValue = this.getFocusLeft();
    const rightValue = this.getFocusRight();
    const lastFragment = sqlValue.split(/\s+(AND\s+NOT|OR|AND)\s+/i)?.pop() ?? '';
    const lastValues = /(:|>=|<=|>|<)\s*(\d+|\w+|"((?:[^"\\]|\\.)*)"?)/.exec(lastFragment);
    const matchValueWithQuotes = lastValues?.[2] ?? '';
    const matchLeft = sqlValue.slice(0, sqlValue.length - matchValueWithQuotes.length);
    const targetValue = value.replace(/^"|"$/g, '').replace(/"/g, '\\"');
    const rightFirstValue = matchValueWithQuotes.length >= 1
      ? rightValue.split(/\s+(AND\s+NOT|OR|AND)\s+/i)?.shift() ?? ''
      : '';
    const formatRightValue = `${rightValue.slice(rightFirstValue.length).replace(/\s+$/, '')}`;
    const appendSpace = formatRightValue === '' ? ' ' : '';
    const result = `${matchLeft}"${targetValue}"${formatRightValue}${appendSpace}`;
    this.ctx.onChange(result, matchLeft.length + targetValue.length + 3);
  }

  private handleClickContinue(type: string) {
    const sqlValue = this.getFocusLeft();
    const rightValue = this.getFocusRight();
    const result = `${sqlValue}${type} ${rightValue}`;
    this.ctx.onChange(result, sqlValue.length + type.length + 1);
    this.showWhich('Fields');
    this.items = this.fieldNames().map(name => this.fieldItem(name));
    this.render();
  }

  private render() {
    this.optionsEl.classList.toggle('is-loading', this.requesting);
    this.optionsEl.replaceChildren();
    if (this.requesting && !this.items.length) {
      const loading = el('li', 'list-item');
      loading.setAttribute('data-bklog-v3-pop-click-item', '');
      loading.textContent = this.ctx.texts.sqlLoading || '加载中...';
      this.optionsEl.appendChild(loading);
      return;
    }
    const wrap = el('div', 'control-list');
    this.items.forEach((item, idx) => {
      const li = el('li', `list-item ${item.kind}${idx === this.activeIndex ? ' active' : ''}`);
      li.setAttribute('data-bklog-v3-pop-click-item', '');
      const icon = el('div', 'item-type-icon');
      icon.appendChild(el('span', `bklog-icon ${item.iconClass} item-type-letter`));
      const text = el('div', 'item-text text-overflow-hidden');
      text.textContent = item.text;
      li.append(icon, text);
      if (item.description) {
        const desc = el('div', 'item-description text-overflow-hidden');
        desc.innerHTML = item.description.replace(
          /(等于|存在|大于|小于|大于或等于|小于或等于|两个参数都|一个或多个参数)/g,
          '<span class="item-callout">$1</span>',
        );
        li.appendChild(desc);
      }
      on(li, 'mousedown', (e) => {
        e.preventDefault();
        item.onClick();
      });
      wrap.appendChild(li);
    });
    this.optionsEl.appendChild(wrap);
  }

  private async refreshFavorites() {
    if (!this.favoriteFooter || !this.ctx.enableFavoriteSuggestions) return;

    const slot = this.ctx.favoriteListSlot;
    const hasSlotContent = !!(slot && slot.childElementCount > 0);
    if (hasSlotContent) {
      if (slot!.parentElement !== this.favoriteFooter) {
        this.favoriteFooter.replaceChildren();
        this.favoriteFooter.appendChild(slot!);
      }
      return;
    }

    const token = ++this.favoriteToken;
    const fn = this.ctx.services.getFavoriteSqlSuggestions;
    let list: FavoriteSqlSuggestion[] = [];
    if (typeof fn === 'function') {
      try {
        list = await Promise.resolve(fn(this.value));
      } catch {
        list = [];
      }
    }
    if (token !== this.favoriteToken) return;
    this.renderFavoriteList(list || []);
  }

  private renderFavoriteList(list: FavoriteSqlSuggestion[]) {
    if (!this.favoriteFooter) return;
    const t = this.ctx.texts;
    const wrap = el('div', `favorite-query-list${list.length ? '' : ' no-data'}`);
    if (list.length) {
      const title = el('div', 'query-list-title');
      title.innerHTML = `${t.sqlFavoriteTitlePrefix || '联想到以下'} <span class="count">${list.length}</span> ${t.sqlFavoriteTitleSuffix || '个收藏'}:`;
      wrap.appendChild(title);
    }
    const listEl = el('div', 'favorite-list');
    if (list.length) {
      list.forEach((item) => {
        const row = el('div', 'list-item');
        row.setAttribute('data-bklog-v3-pop-click-item', '');
        const iconWrap = el('div', '');
        iconWrap.appendChild(el('span', 'active bklog-icon bklog-table-2'));
        const type = el('div', 'list-item-type');
        type.textContent = item.name || t.sqlFavoriteType || '检索语句';
        const info = el('div', 'list-item-information');
        info.textContent = item.keyword;
        row.append(iconWrap, type, info);
        on(row, 'mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.ctx.onFavoriteSelect?.(item.keyword);
        });
        listEl.appendChild(row);
      });
    } else {
      const empty = el('div', 'favorite-empty');
      empty.textContent = t.sqlFavoriteEmpty || '暂无匹配的收藏项';
      listEl.appendChild(empty);
    }
    wrap.appendChild(listEl);
    this.favoriteFooter.replaceChildren(wrap);
  }

  private bindKeydown() {
    this.unbindKeydown();
    this.keyHandler = (e: KeyboardEvent) => {
      const code = e.code;
      if (!['ArrowUp', 'ArrowDown', 'Enter', 'NumpadEnter', 'Escape'].includes(code)) return;
      if (code === 'Escape') return;
      const list = this.optionsEl.querySelectorAll('.control-list > .list-item');
      if (!list.length) return;
      if (code === 'Enter' || code === 'NumpadEnter') {
        if (e.ctrlKey || e.metaKey) return;
        // 有高亮才拦截选中；无高亮交给编辑器 closeAndRetrieve
        if (this.activeIndex !== null && list[this.activeIndex]) {
          e.preventDefault();
          e.stopPropagation();
          (list[this.activeIndex] as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (code === 'ArrowUp') {
        this.activeIndex = this.activeIndex ? this.activeIndex - 1 : list.length - 1;
      } else {
        this.activeIndex = this.activeIndex === null || this.activeIndex === list.length - 1
          ? 0
          : this.activeIndex + 1;
      }
      this.render();
      this.optionsEl.querySelector('.list-item.active')?.scrollIntoView({ block: 'nearest' });
    };
    document.addEventListener('keydown', this.keyHandler, true);
  }

  private unbindKeydown() {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
  }
}
