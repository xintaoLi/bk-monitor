import {
  FulltextOperator,
  IP_SELECT_FIELD,
  excludesFields,
  getInputQueryDefaultItem,
  withoutValueConditionList,
} from '../../core/const.common';
import type { FieldInfo, SearchInputBarServices, UiQueryItem } from '../../types';
import { createTippyPopover, type TippyPopoverInstance } from '../../utils/popover';
import { debounce, el, on } from '../../utils/dom';
import { BatchInput } from './batch-input';
import { getFieldTypeVisual } from './field-type';
import { FuzzyMatchPanel } from './fuzzy-match';
import {
  getFuzzyOperator,
  getOperatorDisplayLabel,
  isFuzzyFieldType,
  isFuzzyOperator,
} from './operator-labels';

/** 对齐 Vue `src/common/util.js` getCharLength：全角计 2、半角计 1。 */
function getCharLength(str: string): number {
  let bitLen = 0;
  for (let i = 0; i < str.length; i++) {
    if ((str.charCodeAt(i) & 0xff00) !== 0) bitLen += 1;
    bitLen += 1;
  }
  return bitLen;
}

export interface UiOptionsPanelContext {
  services: SearchInputBarServices;
  texts: Record<string, string>;
  onSave: (item: UiQueryItem) => void;
  onCancel: () => void;
  onFuzzyAvailableChange?: (available: boolean) => void;
  onBatchShowChange?: (isShow: boolean) => void;
  /** nested tippy open → parent tippy should not hideOnClick */
  onNestedPopoverChange?: (isShow: boolean) => void;
  ipSlot?: HTMLElement;
  fuzzyEngine?: 'es' | 'doris';
}

export interface UiOptionsOpenOptions {
  isInputFocus?: boolean;
  seed?: Partial<UiQueryItem> | null;
}

interface ActiveField extends FieldInfo {
  first_name?: string;
  last_name?: string;
  matchType?: 'exact' | 'partial';
  matchIndex?: number;
}

const NUM_TYPES = ['long', 'integer', 'float', 'double', 'number'];
const NUM_REG = /^-?\d+(\.\d+)?$/;

/**
 * Dual-column UI query options — full interaction parity with ui-input-option.vue.
 */
export class UiOptionsPanel {
  root: HTMLElement;
  private fieldFilterInput: HTMLInputElement;
  private fieldListEl: HTMLElement;
  private valueListEl: HTMLElement;
  private saveBtn: HTMLButtonElement;
  private activeIndex: number | null = 0;
  private fields: ActiveField[] = [];
  private filtered: ActiveField[] = [];
  private activeField: ActiveField | null = null;
  private condition: UiQueryItem = getInputQueryDefaultItem();
  private operatorTippy: TippyPopoverInstance | null = null;
  private valueTippy: TippyPopoverInstance | null = null;
  private fieldTippy: TippyPopoverInstance | null = null;
  private eggItems: string[] = [];
  private eggActiveIndex = -1;
  private operatorActiveIndex = -1;
  private requesting = false;
  private cleanups: Array<() => void> = [];
  private valueInput: HTMLInputElement | null = null;
  private valueContainer: HTMLElement | null = null;
  private valueUl: HTMLElement | null = null;
  private operatorBtn: HTMLElement | null = null;
  private operatorListEl: HTMLElement | null = null;
  private valueOptionsEl: HTMLUListElement | null = null;
  private errorEl: HTMLElement | null = null;
  private listenersMounted = false;
  private isComposing = false;
  private conditionBlurTimer: ReturnType<typeof setTimeout> | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private docClickHandler: ((e: MouseEvent) => void) | null = null;
  private openOpts: UiOptionsOpenOptions = {};
  private fuzzyPanel: FuzzyMatchPanel | null = null;
  private batchInput: BatchInput | null = null;
  private needDeleteValue = false;
  private editTagIndex: number | null = null;
  private invalidTags = new Set<number>();

  constructor(private ctx: UiOptionsPanelContext) {
    this.root = el('div', 'ui-query-options');
    const content = el('div', 'ui-query-option-content');
    const fieldCol = el('div', 'field-list');
    const searchWrap = el('div', 'ui-search-input');
    this.fieldFilterInput = el('input', 'ui-search-input__native') as HTMLInputElement;
    this.fieldFilterInput.placeholder = ctx.texts.searchKeyword || '请输入关键字';
    searchWrap.appendChild(this.fieldFilterInput);
    this.fieldListEl = el('div', 'ui-search-result bklog-v3-popover-tag');
    fieldCol.append(searchWrap, this.fieldListEl);

    this.valueListEl = el('div', 'value-list');
    content.append(fieldCol, this.valueListEl);

    const footer = el('div', 'ui-query-option-footer');
    const shortcuts = el('div', 'ui-shortcut-key');
    shortcuts.innerHTML = `
      <div class="ui-shortcut-item">
        <span class="bklog-icon bklog-arrow-down-filled label up"></span>
        <span class="bklog-icon bklog-arrow-down-filled label"></span>
        <span class="value">移动光标</span>
      </div>
      <div class="ui-shortcut-item"><span class="label">Enter</span><span class="value">选中</span></div>
      <div class="ui-shortcut-item"><span class="label">Esc</span><span class="value">收起查询</span></div>
      <div class="ui-shortcut-item"><span class="label">⌘/Ctrl+Enter</span><span class="value">提交查询</span></div>
    `;
    const btns = el('div', 'ui-btn-opts');
    this.saveBtn = el('button', 'save-btn bklog-sib-btn bklog-sib-btn--primary') as HTMLButtonElement;
    this.saveBtn.type = 'button';
    this.saveBtn.textContent = '确定 ⌘/Ctrl + Enter';
    const cancelBtn = el('button', 'cancel-btn bklog-sib-btn');
    cancelBtn.type = 'button';
    cancelBtn.textContent = ctx.texts.cancel || '取消';
    btns.append(this.saveBtn, cancelBtn);
    footer.append(shortcuts, btns);
    this.root.append(content, footer);

    this.cleanups.push(
      on(this.fieldFilterInput, 'input', () => this.filterFields()),
      on(this.fieldFilterInput, 'compositionstart', () => { this.isComposing = true; }),
      on(this.fieldFilterInput, 'compositionend', () => { this.isComposing = false; }),
      on(this.saveBtn, 'click', () => this.save()),
      on(cancelBtn, 'click', () => this.ctx.onCancel()),
      on(this.root, 'click', (e) => {
        e.stopPropagation();
        this.handlePanelClick(e);
      }),
    );
  }

  isFuzzyMatchAvailable() {
    return this.computeFuzzyAvailable();
  }

  beforeShow(opts: UiOptionsOpenOptions = {}) {
    this.openOpts = opts;
    this.buildFields();
    this.fieldFilterInput.value = '';
    this.mountDocumentListeners();
    this.restoreFieldAndCondition(opts.seed, opts.isInputFocus);
    this.renderFields();
    this.renderValuePanel();
    this.syncSaveBtn();
    this.notifyFuzzyWidth();
    if (!opts.isInputFocus) {
      setTimeout(() => this.fieldFilterInput.focus(), 0);
    }
    return true;
  }

  beforeHide() {
    if (this.valueInput) this.valueInput.value = '';
    this.valueTippy?.hide(100);
    if (this.conditionBlurTimer) {
      clearTimeout(this.conditionBlurTimer);
      this.conditionBlurTimer = null;
    }
  }

  afterHide() {
    this.unmountDocumentListeners();
    this.resetParams();
  }

  open(seed?: Partial<UiQueryItem>, opts: UiOptionsOpenOptions = {}) {
    this.beforeShow({ ...opts, seed: seed ?? opts.seed });
  }

  resetForNextAdd() {
    this.openOpts = { isInputFocus: false, seed: null };
    this.condition = getInputQueryDefaultItem();
    this.activeIndex = 0;
    this.buildFields();
    this.selectField(this.filtered[0], true);
    this.renderFields();
    this.renderValuePanel();
    this.syncSaveBtn();
    this.notifyFuzzyWidth();
    setTimeout(() => this.fieldFilterInput.focus(), 0);
  }

  destroy() {
    this.afterHide();
    this.fuzzyPanel?.destroy();
    this.batchInput?.destroy();
    this.operatorTippy?.destroy();
    this.valueTippy?.destroy();
    this.fieldTippy?.destroy();
    this.cleanups.forEach(fn => fn());
    this.root.remove();
  }

  private notifyFuzzyWidth() {
    this.root.classList.toggle('is-fuzzy-match', this.computeFuzzyAvailable());
    this.ctx.onFuzzyAvailableChange?.(this.computeFuzzyAvailable());
  }

  private computeFuzzyAvailable() {
    const field = this.activeField;
    if (!field || field.field_name === '*' || field.field_name === IP_SELECT_FIELD) return false;
    return isFuzzyFieldType(field.field_type) && isFuzzyOperator(this.condition.operator);
  }

  /**
   * 对齐 Vue ui-input-option：FuzzyMatchMode 收到的是由 isInclude 推导的 operator，
   * 条件下拉展示/存储仍用 condition.operator，匹配模式切换只改 isInclude。
   */
  private getFuzzyMatchOperator() {
    return getFuzzyOperator(this.condition.operator, Boolean(this.condition.isInclude));
  }

  private resetParams() {
    this.condition = getInputQueryDefaultItem();
    this.activeField = null;
    this.activeIndex = 0;
    this.eggActiveIndex = -1;
    this.operatorActiveIndex = -1;
    this.eggItems = [];
    this.invalidTags.clear();
    this.editTagIndex = null;
    this.fuzzyPanel?.destroy();
    this.fuzzyPanel = null;
  }

  private mountDocumentListeners() {
    if (this.listenersMounted) return;
    this.listenersMounted = true;
    this.keyHandler = e => this.handleKeydown(e);
    this.docClickHandler = e => this.handleDocumentClick(e);
    document.addEventListener('keydown', this.keyHandler, true);
    document.addEventListener('click', this.docClickHandler, true);
  }

  private unmountDocumentListeners() {
    if (!this.listenersMounted) return;
    this.listenersMounted = false;
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler, true);
    if (this.docClickHandler) document.removeEventListener('click', this.docClickHandler, true);
    this.keyHandler = null;
    this.docClickHandler = null;
  }

  private getFieldWeight(f: ActiveField) {
    if (f.field_weight != null) return f.field_weight;
    if (f.field_name === '*') return 101;
    if (f.field_name === 'log') return 100;
    if (f.query_alias && f.query_alias !== f.field_name) return 102;
    if (f.field_type === 'text') return 50;
    return 0;
  }

  private restoreFieldAndCondition(seed?: Partial<UiQueryItem> | null, isInputFocus?: boolean) {
    if (isInputFocus && !seed?.field) {
      this.activeIndex = null;
      this.activeField = null;
      this.condition = getInputQueryDefaultItem();
      return;
    }
    if (seed?.field) {
      const idx = this.filtered.findIndex(f => f.field_name === seed.field);
      this.activeIndex = idx >= 0 ? idx : 0;
      this.condition = {
        ...getInputQueryDefaultItem(),
        ...seed,
        value: Array.isArray(seed.value)
          ? [...seed.value] as string[]
          : typeof seed.value === 'string'
            ? String(seed.value).split(',').filter(Boolean)
            : [],
        hidden_values: [...(seed.hidden_values || [])],
        relation: seed.relation || 'OR',
        isInclude: seed.isInclude ?? false,
      } as UiQueryItem;
      this.selectField(this.filtered[this.activeIndex!] || this.filtered[0], false);
      return;
    }
    this.activeIndex = 0;
    this.condition = getInputQueryDefaultItem();
    this.selectField(this.filtered[0], true);
  }

  private buildFields() {
    const list = (this.ctx.services.getFields?.() ?? []).filter(
      f => f.field_type !== '__virtual__' && !excludesFields.includes(f.field_name),
    );
    const fullText: ActiveField = {
      field_name: '*',
      is_full_text: true,
      field_alias: '全文检索',
      query_alias: '全文检索',
      field_type: 'text',
      first_name: '全文检索',
      last_name: '全文检索',
      field_operator: [{ operator: FulltextOperator, label: '包含' }],
      field_weight: 101,
    };
    const mapped: ActiveField[] = list.map((f) => {
      const alias = f.query_alias || f.field_alias || f.field_name;
      return { ...f, first_name: alias, last_name: f.field_name };
    });
    mapped.sort((a, b) => this.getFieldWeight(b) - this.getFieldWeight(a));
    const hasContainer = list.some(f => f.field_name === '__ext.container_id');
    this.fields = [fullText, ...mapped];
    if (this.ctx.ipSlot && !hasContainer) {
      this.fields.push({
        field_name: IP_SELECT_FIELD,
        is_full_text: true,
        field_alias: 'IP目标',
        first_name: 'IP目标',
        last_name: IP_SELECT_FIELD,
        field_type: '',
        field_operator: [],
      });
    }
    this.filtered = [...this.fields];
  }

  private filterFields() {
    const kw = this.fieldFilterInput.value.trim().toLowerCase();
    if (!kw) {
      this.filtered = [...this.fields];
    } else {
      this.filtered = this.fields
        .map((f) => {
          const alias = (f.query_alias || f.field_alias || '').toLowerCase();
          const name = f.field_name.toLowerCase();
          let matchType: 'exact' | 'partial' | null = null;
          let matchIndex = 999;
          if (alias === kw || name === kw) {
            matchType = 'exact';
            matchIndex = 0;
          } else {
            const aIdx = alias.indexOf(kw);
            const nIdx = name.indexOf(kw);
            const idx = aIdx >= 0 && nIdx >= 0 ? Math.min(aIdx, nIdx) : aIdx >= 0 ? aIdx : nIdx;
            if (idx >= 0) {
              matchType = 'partial';
              matchIndex = idx;
            }
          }
          return matchType ? { ...f, matchType, matchIndex } : null;
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a!.matchType !== b!.matchType) return a!.matchType === 'exact' ? -1 : 1;
          return (a!.matchIndex ?? 0) - (b!.matchIndex ?? 0);
        }) as ActiveField[];
    }
    if (this.openOpts.isInputFocus && !kw) {
      this.activeIndex = null;
    } else {
      this.activeIndex = this.filtered.length ? 0 : null;
      if (this.filtered[0]) this.selectField(this.filtered[0], true);
    }
    this.renderFields();
    this.renderValuePanel();
  }

  private renderFields() {
    this.fieldListEl.replaceChildren();
    if (!this.filtered.length) {
      const empty = el('div', 'ui-search-empty');
      empty.textContent = this.ctx.texts.emptySearch || '搜索为空';
      this.fieldListEl.appendChild(empty);
      return;
    }
    this.filtered.forEach((item, index) => {
      const row = el('div', `ui-search-result-row${index === this.activeIndex ? ' active' : ''}`);
      const isFull = !!item.is_full_text || item.field_name === '*' || item.field_name === IP_SELECT_FIELD;
      const visual = getFieldTypeVisual(item.field_type);
      const icon = el(
        'span',
        `field-type-icon${isFull ? ' full-text' : ''} ${isFull ? '' : visual.iconClass}`.trim(),
      );
      if (!isFull) {
        icon.style.background = visual.color;
        icon.style.color = visual.textColor;
      }
      const display = el('div', 'display-container');
      const bdi = el('bdi');
      const alias = el('span', 'field-alias');
      alias.textContent = item.first_name || item.field_name;
      bdi.appendChild(alias);
      if (!isFull && item.first_name !== item.last_name) {
        const name = el('span', 'field-name');
        name.textContent = `(${item.last_name})`;
        bdi.appendChild(name);
      }
      display.appendChild(bdi);
      row.append(icon, display);
      on(row, 'click', () => {
        this.activeIndex = index;
        this.openOpts.isInputFocus = false;
        this.selectField(item, true);
        this.renderFields();
      });
      on(row, 'mouseenter', () => {
        this.activeIndex = index;
        this.fieldListEl.querySelectorAll('.ui-search-result-row').forEach((n, i) => {
          n.classList.toggle('active', i === index);
        });
        const overflow = display.scrollWidth > display.clientWidth;
        if (overflow) {
          this.fieldTippy?.destroy();
          const tip = el('div');
          tip.textContent = `${item.first_name}(${item.last_name})`;
          this.fieldTippy = createTippyPopover(row, {
            content: tip,
            theme: 'log-dark',
            placement: 'auto',
            arrow: true,
            maxWidth: 360,
            newInstance: true,
          });
          this.fieldTippy.show(row);
        }
      });
      on(row, 'mouseleave', () => this.fieldTippy?.hide());
      this.fieldListEl.appendChild(row);
    });
    this.fieldListEl.querySelector('.ui-search-result-row.active')
      ?.scrollIntoView({ block: 'nearest' });
  }

  private selectField(field: ActiveField | undefined, resetValue: boolean) {
    if (!field) {
      this.activeField = null;
      this.renderValuePanel();
      return;
    }
    this.activeField = field;
    if (resetValue) {
      const op = field.field_operator?.[0];
      this.condition = {
        field: field.field_name,
        operator: op?.operator || (field.field_name === '*' ? FulltextOperator : '='),
        value: [],
        relation: 'OR',
        // 对齐 Vue handleFieldItemClick：text/string → false，其它类型 → null
        isInclude: ['text', 'string'].includes(field.field_type || '') ? false : null,
        field_type: field.field_type,
        disabled: false,
        hidden_values: [],
      };
    } else {
      this.condition.field = field.field_name;
      this.condition.field_type = field.field_type;
      if (!this.condition.operator) {
        this.condition.operator = field.field_operator?.[0]?.operator || FulltextOperator;
      }
    }
    this.invalidTags.clear();
    this.renderValuePanel();
    this.notifyFuzzyWidth();
    this.syncSaveBtn();
    // 对齐 Vue handleFieldItemClick → handleConditionValueClick(autoFocus) + show eggs tippy
    if (
      field.field_name !== '*'
      && field.field_name !== IP_SELECT_FIELD
      && !withoutValueConditionList.includes(this.condition.operator)
      && !this.computeFuzzyAvailable()
    ) {
      void this.loadEggs().then(() => {
        this.handleConditionValueClick(true);
      });
    }
  }

  /** 对齐 Vue：v-for="option in activeFieldItem.field_operator"，操作符完全来自 API */
  private getOperators() {
    return this.activeField?.field_operator ?? [];
  }

  private renderValuePanel() {
    this.valueTippy?.destroy();
    this.valueTippy = null;
    this.operatorTippy?.destroy();
    this.operatorTippy = null;
    this.fuzzyPanel?.destroy();
    this.fuzzyPanel = null;
    this.batchInput?.destroy();
    this.batchInput = null;
    this.valueListEl.replaceChildren();
    this.valueInput = null;
    this.valueContainer = null;
    this.valueUl = null;
    this.operatorBtn = null;
    this.operatorListEl = null;
    this.valueOptionsEl = null;
    this.errorEl = null;
    this.eggActiveIndex = -1;

    // help state: outer focus, no field selected
    if (this.activeIndex === null || !this.activeField) {
      this.valueListEl.className = 'value-list is-full-text';
      if (!this.filtered.length) {
        const empty = el('div', 'ui-search-empty');
        empty.textContent = '无需条件设置';
        this.valueListEl.appendChild(empty);
        return;
      }
      const title = el('div', 'full-text-title');
      title.textContent = '全文检索';
      const tip = el('div', 'full-text-content');
      tip.innerHTML = `
        <div>在左侧选择字段开始设置条件</div>
        <div style="margin-top:8px">快捷键：↑↓ 切换字段 · ⌘/Ctrl+Enter 提交 · Esc 收起</div>
      `;
      this.valueListEl.append(title, tip);
      return;
    }

    const field = this.activeField;
    const isFullMsg = field.field_name === '*' || field.field_name === IP_SELECT_FIELD;
    this.valueListEl.className = `value-list${isFullMsg ? ' is-full-text' : ''}`;

    if (field.field_name === IP_SELECT_FIELD) {
      const title = el('div', 'full-text-title');
      title.textContent = 'IP目标';
      const content = el('div', 'full-text-content');
      content.textContent = '通过 IP 选择器选择主机，快速过滤日志（宿主 slot 注入）。Enter / 确定 可添加 IP 条件。';
      this.valueListEl.append(title, content);
      if (this.ctx.ipSlot) this.valueListEl.appendChild(this.ctx.ipSlot);
      return;
    }

    if (field.field_name === '*') {
      // outer focus help already handled; when selected show textarea
      if (this.openOpts.isInputFocus && !this.condition.value?.length) {
        const title = el('div', 'full-text-title');
        title.textContent = '全文检索';
        const tip = el('div', 'full-text-content');
        tip.textContent = '可在检索框直接输入全文关键词后 Enter；或在此输入后 ⌘/Ctrl+Enter 提交。';
        this.valueListEl.append(title, tip);
        return;
      }
      const title = el('div', 'full-text-title');
      title.textContent = '全文检索';
      const tip = el('div', 'full-text-content');
      tip.textContent = '输入文本后按 ⌘/Ctrl + Enter 提交；可用上下键切换字段';
      const ta = el('textarea', 'ui-value-search-textarea') as HTMLTextAreaElement;
      ta.rows = 12;
      ta.maxLength = 100;
      ta.value = String(this.condition.value[0] ?? '');
      on(ta, 'input', () => {
        this.condition.value = ta.value ? [ta.value] : [];
        this.syncSaveBtn();
      });
      this.valueListEl.append(title, tip, ta);
      return;
    }

    // operator
    const opRow = el('div', 'ui-value-row');
    const opLabel = el('div', 'ui-value-label');
    opLabel.textContent = '条件';
    const opComp = el('div', 'ui-value-component');
    this.operatorBtn = el('div', 'ui-value-operator');
    const opText = el('span', 'operator-content');
    const dict = this.ctx.services.getOperatorDictionary?.();
    opText.textContent = getOperatorDisplayLabel(this.condition.operator, dict);
    const arrow = el('span', 'bklog-icon bklog-arrow-down-filled op-arrow');
    this.operatorBtn.append(opText, arrow);
    opComp.appendChild(this.operatorBtn);
    opRow.append(opLabel, opComp);
    this.valueListEl.appendChild(opRow);

    this.operatorListEl = el('div', 'ui-value-select');
    const ops = this.getOperators();
    if (!ops.length) {
      const empty = el('div', 'ui-search-empty');
      empty.textContent = '暂无操作符';
      this.operatorListEl.appendChild(empty);
    } else {
      this.renderOperatorList(opText);
    }
    this.operatorTippy = createTippyPopover(this.operatorBtn, {
      content: this.operatorListEl,
      placement: 'bottom-start',
      arrow: false,
      theme: 'log-light',
      maxWidth: 'none',
      offset: [0, 4],
      hideOnClick: true,
      delay: [0, 300],
      newInstance: false,
      zIndex: 100001,
      // 挂 body：父 tippy 有 transform 时 appendTo 面板内会破坏 fixed 定位
      // 关闭误关靠 onNestedPopoverChange → 父 hideOnClick=false
      onShow: (inst) => {
        arrow.classList.add('is-up');
        const w = Math.ceil(this.operatorBtn!.getBoundingClientRect().width);
        this.operatorListEl!.style.width = '100%';
        this.operatorListEl!.style.boxSizing = 'border-box';
        // tippy-box 默认 content-box + 1px border，用 border-box 与触发器同宽
        inst.popper.style.width = `${w}px`;
        const box = inst.popper.querySelector('.tippy-box') as HTMLElement | null;
        if (box) {
          box.style.boxSizing = 'border-box';
          box.style.width = `${w}px`;
          box.style.maxWidth = 'none';
        }
        this.ctx.onNestedPopoverChange?.(true);
        return true;
      },
      onHidden: () => {
        arrow.classList.remove('is-up');
        this.ctx.onNestedPopoverChange?.(false);
      },
    });
    on(this.operatorBtn, 'mousedown', (e) => e.stopPropagation());
    on(this.operatorBtn, 'click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.valueTippy?.hide();
      // 先禁父层 hideOnClick，再 show，避免挂 body 时点击过程误关
      this.ctx.onNestedPopoverChange?.(true);
      this.operatorTippy?.show(this.operatorBtn!);
    });

    if (withoutValueConditionList.includes(this.condition.operator)) {
      this.syncSaveBtn();
      return;
    }

    // fuzzy mode — 对齐 Vue：:operator="fuzzyMatchOperator"，wildcard-change 只写 isInclude
    if (this.computeFuzzyAvailable()) {
      this.fuzzyPanel = new FuzzyMatchPanel({
        engine: this.ctx.fuzzyEngine,
        getOperator: () => this.getFuzzyMatchOperator(),
        getRelation: () => this.condition.relation || 'OR',
        onValueChange: (values) => {
          this.condition.value = values;
          this.syncSaveBtn();
        },
        onRelationChange: (rel) => {
          this.condition.relation = rel;
        },
        onWildcardChange: (isWildcard) => {
          // Vue handleFuzzyWildcardChange：只更新 isInclude，不改条件下拉上的 operator
          this.condition.isInclude = isWildcard;
          this.notifyFuzzyWidth();
        },
        onBatchShowChange: isShow => this.ctx.onBatchShowChange?.(isShow),
      });
      this.fuzzyPanel.setValue(
        (this.condition.value as string[]) || [],
        this.getFuzzyMatchOperator(),
        this.condition.relation,
      );
      this.valueListEl.appendChild(this.fuzzyPanel.root);
      this.syncSaveBtn();
      return;
    }

    // normal value row
    const valRow = el('div', 'ui-value-row');
    const valLabel = el('div', 'ui-value-label');
    const labelLeft = el('span');
    labelLeft.textContent = '检索内容';
    const labelRight = el('span', 'ui-value-label-actions');
    this.batchInput = new BatchInput({
      onShowChange: isShow => this.ctx.onBatchShowChange?.(isShow),
      onConfirm: (values) => {
        values.forEach(v => this.addValue(v, false));
        this.renderValuePanel();
        this.handleConditionValueClick(true);
      },
    });
    const clearBtn = el('button', 'ui-value-clear-btn');
    clearBtn.type = 'button';
    clearBtn.textContent = '清空';
    clearBtn.disabled = !(this.condition.value as string[]).length;
    on(clearBtn, 'click', () => {
      this.condition.value = [];
      this.invalidTags.clear();
      this.renderValuePanel();
      this.handleConditionValueClick(true);
    });
    labelRight.append(this.batchInput.trigger, clearBtn);
    valLabel.append(labelLeft, labelRight);

    this.valueContainer = el('div', 'condition-value-container');
    this.valueUl = el('ul', 'condition-value-input');
    // 对齐 Vue @click.stop="handleConditionValueClick(e, true)"
    on(this.valueUl, 'click', (e) => {
      e.stopPropagation();
      this.handleConditionValueClick(true);
    });
    this.renderValueTags();
    this.valueContainer.appendChild(this.valueUl);
    valRow.append(valLabel, this.valueContainer);
    this.valueListEl.appendChild(valRow);

    this.errorEl = el('div', 'ui-value-error');
    this.errorEl.style.display = 'none';
    this.valueListEl.appendChild(this.errorEl);

    if (
      (this.condition.value as string[]).length > 1
      && field.field_type === 'text'
    ) {
      const relRow = el('div', 'ui-value-row');
      const relLabel = el('div', 'ui-value-label');
      relLabel.textContent = '组间关系';
      const relBox = el('div', 'ui-value-relation');
      ['AND', 'OR'].forEach((rel) => {
        const label = el('label', 'ui-radio');
        const radio = el('input') as HTMLInputElement;
        radio.type = 'radio';
        radio.name = 'sib-relation';
        radio.value = rel;
        radio.checked = (this.condition.relation || 'OR') === rel;
        on(radio, 'change', () => { this.condition.relation = rel; });
        label.append(radio, document.createTextNode(` ${rel}`));
        relBox.appendChild(label);
      });
      relRow.append(relLabel, relBox);
      this.valueListEl.appendChild(relRow);
    }

    this.valueOptionsEl = el('ul', 'condition-value-options') as HTMLUListElement;
    // 对齐 Vue：tippy 挂在 condition-value-container（ul.parentNode），newInstance: true
    this.valueTippy = createTippyPopover(this.valueContainer, {
      content: this.valueOptionsEl,
      placement: 'bottom-start',
      arrow: false,
      theme: 'log-light',
      hideOnClick: false,
      maxWidth: 'none',
      offset: [0, 4],
      newInstance: true,
      zIndex: 100001,
      onShow: (inst) => {
        if (this.conditionBlurTimer) {
          clearTimeout(this.conditionBlurTimer);
          this.conditionBlurTimer = null;
        }
        const w = Math.ceil(this.valueContainer!.getBoundingClientRect().width);
        this.valueOptionsEl!.style.width = `${w}px`;
        inst.popper.style.width = `${w}px`;
        this.ctx.onNestedPopoverChange?.(true);
        return true;
      },
      onHidden: () => {
        this.valueOptionsEl?.querySelector('li.is-hover')?.classList.remove('is-hover');
        this.ctx.onNestedPopoverChange?.(false);
      },
    });
    this.syncSaveBtn();
  }

  private renderOperatorList(opText: HTMLElement) {
    if (!this.operatorListEl) return;
    this.operatorListEl.replaceChildren();
    const dict = this.ctx.services.getOperatorDictionary?.();
    this.getOperators().forEach((op, idx) => {
      const item = el(
        'div',
        `ui-value-option${op.operator === this.condition.operator ? ' active' : ''}${idx === this.operatorActiveIndex ? ' is-hover' : ''}`,
      );
      item.textContent = getOperatorDisplayLabel(op.label || op.operator, dict);
      on(item, 'click', () => this.applyOperator(op.operator, opText));
      this.operatorListEl!.appendChild(item);
    });
  }

  /**
   * 对齐 Vue handleUiValueOptionClick + FuzzyMatchMode watch(props.operator)
   * —— 不新增业务规则，仅复刻 Vue 已有副作用。
   */
  private applyOperator(operator: string, opText?: HTMLElement) {
    const prevFuzzy = this.computeFuzzyAvailable();

    // handleUiValueOptionClick
    if (this.condition.operator !== operator) {
      this.condition.operator = operator;
    }
    if (['contains match phrase', 'not contains match phrase'].includes(operator)) {
      this.condition.isInclude = false;
    }
    if (['=~', '!=~'].includes(operator)) {
      this.condition.isInclude = true;
    }

    const dict = this.ctx.services.getOperatorDictionary?.();
    if (opText) opText.textContent = getOperatorDisplayLabel(operator, dict);
    this.operatorTippy?.hide();
    this.renderOperatorList(opText || (this.operatorBtn?.querySelector('.operator-content') as HTMLElement));

    const nextFuzzy = this.computeFuzzyAvailable();

    // Vue 不销毁 FuzzyMatchMode：props.operator(=fuzzyMatchOperator) 变化时组件内 syncFromValue
    if (prevFuzzy && nextFuzzy && this.fuzzyPanel) {
      this.fuzzyPanel.setValue(
        (this.condition.value as string[]) || [],
        this.getFuzzyMatchOperator(),
        this.condition.relation,
      );
      this.notifyFuzzyWidth();
      this.syncSaveBtn();
      return;
    }

    this.renderValuePanel();
    this.notifyFuzzyWidth();
    // afterOperatorValueEnter：非 fuzzy 且需要填值时展开候选
    if (
      !nextFuzzy
      && !withoutValueConditionList.includes(operator)
      && !(this.condition.value as string[]).length
    ) {
      setTimeout(() => this.openValueTippy(), 0);
    }
  }

  private isNumField() {
    return NUM_TYPES.includes(this.activeField?.field_type || '');
  }

  private validateValue(v: string) {
    if (!this.isNumField()) return true;
    return NUM_REG.test(v);
  }

  private renderValueTags() {
    if (!this.valueUl) return;
    this.valueUl.replaceChildren();
    (this.condition.value as string[]).forEach((v, index) => {
      if (this.editTagIndex === index) {
        const li = el('li', 'tag-item is-editing');
        const edit = el('textarea', 'tag-item-edit') as HTMLTextAreaElement;
        edit.value = v;
        edit.rows = 1;
        on(edit, 'blur', () => this.commitTagEdit(index, edit.value));
        on(edit, 'keydown', (e) => {
          if (e.key === 'Enter' && !(e as any).isComposing) {
            e.preventDefault();
            this.commitTagEdit(index, edit.value);
          }
        });
        li.appendChild(edit);
        this.valueUl!.appendChild(li);
        setTimeout(() => { edit.focus(); edit.select(); }, 0);
        return;
      }
      const li = el('li', `tag-item${this.invalidTags.has(index) ? ' tag-validate-error' : ''}`);
      const text = el('span', 'tag-item-text');
      text.textContent = v;
      on(text, 'dblclick', (e) => {
        e.stopPropagation();
        this.editTagIndex = index;
        this.renderValueTags();
      });
      const del = el('span', 'bklog-icon bklog-shanchu tag-item-del');
      on(del, 'click', (e) => {
        e.stopPropagation();
        this.condition.value = (this.condition.value as string[]).filter((_, i) => i !== index);
        this.invalidTags.delete(index);
        this.refreshValueTagsOnly();
      });
      li.append(text, del);
      this.valueUl!.appendChild(li);
    });
    const inputLi = el('li', 'tag-item no-selected-tag-item');
    this.valueInput = el('input', 'tag-option-focus-input') as HTMLInputElement;
    this.valueInput.type = 'text';
    // 对齐 fuzzy-match：有标签时不展示 placeholder，仅空列表时显示
    this.syncValueInputPlaceholder();
    inputLi.appendChild(this.valueInput);
    this.valueUl.appendChild(inputLi);

    on(this.valueInput, 'compositionstart', () => { this.isComposing = true; });
    on(this.valueInput, 'compositionend', () => { this.isComposing = false; });
    on(this.valueInput, 'focus', () => {
      this.valueContainer?.classList.add('is-focus');
      this.openValueTippy();
    });
    on(this.valueInput, 'blur', (e) => {
      // 点击候选 tippy（挂 body）时 relatedTarget 在 popper 内，不收起
      const next = (e as FocusEvent).relatedTarget as Node | null;
      const popper = this.valueTippy?.getInstance()?.popper;
      if (next && (this.valueContainer?.contains(next) || popper?.contains(next))) {
        return;
      }
      // 对齐 Vue handleTagInputBlur 延迟
      this.conditionBlurTimer = setTimeout(() => {
        this.valueContainer?.classList.remove('is-focus');
        const v = this.valueInput?.value.trim();
        if (v && this.validateValue(v)) this.addValue(v);
        else if (v) this.showError('请输入合法数值');
        this.valueTippy?.hide(100);
      }, 180);
    });
    on(this.valueInput, 'input', () => {
      this.needDeleteValue = false;
      this.resizeValueInput();
      const typed = this.valueInput?.value || '';
      // 对齐 Vue：有输入时 activeIndex=null，避免 Enter 误选 eggs
      if (typed.length) this.eggActiveIndex = -1;
      else if (this.eggActiveIndex < 0) this.eggActiveIndex = 0;
      debounce(() => {
        void this.loadEggs(typed).then(() => {
          this.renderEggsList();
          if (this.valueContainer) this.valueTippy?.show(this.valueContainer);
        });
      }, 120)();
    });
    on(this.valueInput, 'keydown', (e) => {
      if (e.key === 'Backspace' && !this.valueInput?.value) {
        const values = this.condition.value as string[];
        if (!values.length) return;
        if (!this.needDeleteValue) {
          this.needDeleteValue = true;
          return;
        }
        this.needDeleteValue = false;
        values.pop();
        this.condition.value = values;
        this.refreshValueTagsOnly();
      }
    });
    this.updateErrorDisplay();
  }

  /** 对齐 Vue handleConditionValueClick */
  private handleConditionValueClick(autoFocus = false) {
    this.valueTippy?.cancelHide();
    if (this.conditionBlurTimer) {
      clearTimeout(this.conditionBlurTimer);
      this.conditionBlurTimer = null;
    }
    this.eggActiveIndex = -1;
    if (autoFocus) {
      this.valueInput?.focus();
      this.eggActiveIndex = 0;
    }
    this.openValueTippy();
  }

  /** 仅刷新标签行，不销毁 tippy（对齐 Vue 响应式更新 tags） */
  private refreshValueTagsOnly() {
    this.renderValueTags();
    // 用已缓存 eggItems 过滤已选，避免 click 后重新请求出现「加载中」并打闪 tippy
    this.renderEggsList();
    this.syncSaveBtn();
    const clearBtn = this.valueListEl.querySelector('.ui-value-clear-btn') as HTMLButtonElement | null;
    if (clearBtn) clearBtn.disabled = !(this.condition.value as string[]).length;
  }

  private static readonly VALUE_INPUT_PLACEHOLDER = '请选择或直接输入，Enter分隔';

  /** 仅当检索内容为空时显示 placeholder（对齐 fuzzy-match keywords 逻辑）。 */
  private syncValueInputPlaceholder() {
    if (!this.valueInput) return;
    const hasTags = (this.condition.value as string[]).length > 0;
    this.valueInput.placeholder = hasTags ? '' : UiOptionsPanel.VALUE_INPUT_PLACEHOLDER;
    this.resizeValueInput();
  }

  /**
   * 对齐 Vue handleInputValueChange：width = getCharLength(text) * 12。
   * 空值且有 placeholder 时按 placeholder 计宽，避免显示不全。
   */
  private resizeValueInput() {
    if (!this.valueInput) return;
    const value = this.valueInput.value;
    const basis = value || this.valueInput.placeholder || '';
    const charLen = Math.max(getCharLength(basis), 1);
    this.valueInput.style.width = `${Math.min(560, charLen * 12)}px`;
  }

  private commitTagEdit(index: number, raw: string) {
    const v = raw.trim();
    if (!v) {
      this.condition.value = (this.condition.value as string[]).filter((_, i) => i !== index);
    } else if (this.validateValue(v)) {
      (this.condition.value as string[])[index] = v;
      this.invalidTags.delete(index);
    } else {
      this.invalidTags.add(index);
      this.showError('请输入合法数值');
    }
    this.editTagIndex = null;
    this.refreshValueTagsOnly();
  }

  private showError(msg: string) {
    if (!this.errorEl) return;
    this.errorEl.textContent = msg;
    this.errorEl.style.display = 'block';
  }

  private updateErrorDisplay() {
    if (!this.errorEl) return;
    if (this.invalidTags.size) {
      this.errorEl.textContent = '存在非法数值，请修改后再提交';
      this.errorEl.style.display = 'block';
    } else {
      this.errorEl.style.display = 'none';
    }
  }

  private openValueTippy() {
    if (!this.valueContainer || !this.valueTippy) return;
    if (this.conditionBlurTimer) {
      clearTimeout(this.conditionBlurTimer);
      this.conditionBlurTimer = null;
    }
    this.valueContainer.classList.add('is-focus');
    this.valueInput?.focus();
    this.renderEggsList();
    // Vue：conditionValueInstance.show(refConditionInput.parentNode)
    this.valueTippy.show(this.valueContainer);
  }

  private getMatchList(): string[] {
    const typed = this.valueInput?.value.trim() || '';
    const selected = new Set((this.condition.value as string[]).map(String));
    const eggs = this.eggItems.filter(i => !selected.has(i));
    if (typed && !selected.has(typed) && !eggs.includes(typed)) {
      return [`__custom__:${typed}`, ...eggs];
    }
    return eggs;
  }

  private renderEggsList() {
    if (!this.valueOptionsEl) return;
    this.valueOptionsEl.replaceChildren();
    const typed = this.valueInput?.value.trim() || '';
    const matchList = this.getMatchList();
    if (typed && matchList[0]?.startsWith('__custom__')) {
      const custom = el('li', `is-custom-tag active${this.eggActiveIndex === 0 ? ' is-hover' : ''}`);
      custom.textContent = `生成“${typed}”标签`;
      custom.dataset.eggIndex = '0';
      custom.dataset.eggValue = typed;
      this.bindEggItemEvents(custom, typed, 0);
      this.valueOptionsEl.appendChild(custom);
    }
    if (this.requesting) {
      const loading = el('li');
      loading.textContent = '加载中...';
      this.valueOptionsEl.appendChild(loading);
      return;
    }
    const eggs = matchList.filter(i => !i.startsWith('__custom__'));
    if (!eggs.length && !typed) {
      const empty = el('li');
      empty.textContent = '暂无数据';
      this.valueOptionsEl.appendChild(empty);
      return;
    }
    eggs.forEach((item, i) => {
      const listIdx = typed && matchList[0]?.startsWith('__custom__') ? i + 1 : i;
      const li = el('li', `is-system-tag${listIdx === this.eggActiveIndex ? ' is-hover' : ''}`);
      li.textContent = item;
      li.dataset.eggIndex = String(listIdx);
      li.dataset.eggValue = item;
      this.bindEggItemEvents(li, item, listIdx);
      this.valueOptionsEl!.appendChild(li);
    });
  }

  /**
   * 对齐 Vue @click.stop="handleTagItemClick"。
   * mousedown.prevent 阻止 input blur；hover 只改 class，禁止重建 DOM（否则点击目标被销毁导致点击无效）。
   */
  private bindEggItemEvents(li: HTMLElement, value: string, listIdx: number) {
    on(li, 'mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.conditionBlurTimer) {
        clearTimeout(this.conditionBlurTimer);
        this.conditionBlurTimer = null;
      }
    });
    on(li, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.conditionBlurTimer) {
        clearTimeout(this.conditionBlurTimer);
        this.conditionBlurTimer = null;
      }
      this.addValue(value);
    });
    on(li, 'mouseenter', () => {
      if (this.eggActiveIndex === listIdx) return;
      this.eggActiveIndex = listIdx;
      this.syncEggHoverClass();
    });
  }

  private syncEggHoverClass() {
    this.valueOptionsEl?.querySelectorAll('li[data-egg-index]').forEach((node) => {
      const elNode = node as HTMLElement;
      const idx = Number(elNode.dataset.eggIndex);
      elNode.classList.toggle('is-hover', idx === this.eggActiveIndex);
    });
  }

  private addValue(v: string, reRender = true) {
    if (!this.validateValue(v)) {
      this.showError('请输入合法数值');
      return;
    }
    const values = [...(this.condition.value as string[])];
    if (!values.includes(v)) values.push(v);
    this.condition.value = values;
    if (this.valueInput) this.valueInput.value = '';
    this.eggActiveIndex = 0;
    if (reRender) {
      // 多值时可能要补「组间关系」行，仅 tags 刷新不够则整页重建
      const needRelationRow = values.length > 1 && this.activeField?.field_type === 'text';
      const hasRelationRow = !!this.valueListEl.querySelector('.ui-value-relation');
      if (needRelationRow !== hasRelationRow) {
        this.renderValuePanel();
      } else {
        this.refreshValueTagsOnly();
      }
      this.openValueTippy();
    }
    this.syncSaveBtn();
  }

  private async loadEggs(query = '') {
    if (!this.activeField || this.activeField.field_name === '*' || this.activeField.field_name === IP_SELECT_FIELD) {
      this.eggItems = [];
      return;
    }
    this.requesting = true;
    try {
      const res = await this.ctx.services.requestFieldValues({
        field: this.activeField.field_name,
        query,
        size: 30,
      });
      this.eggItems = (res.aggs_items || [])
        .map(i => String(i.value ?? i.label ?? i.id ?? ''))
        .filter(Boolean);
    } catch {
      this.eggItems = [];
    } finally {
      this.requesting = false;
    }
  }

  private syncSaveBtn() {
    const ok = this.canSave();
    this.saveBtn.disabled = !ok;
    this.saveBtn.classList.toggle('is-disabled', !ok);
  }

  private canSave() {
    const field = this.activeField;
    if (!field && this.activeIndex === null) return false;
    if (!field) return false;
    if (field.field_name === IP_SELECT_FIELD) return true;
    if (this.invalidTags.size) return false;
    if (withoutValueConditionList.includes(this.condition.operator)) return true;
    if (field.field_name === '*') return !!(this.condition.value as string[]).filter(Boolean).length;
    return !!(this.condition.value as string[]).length;
  }

  private isValueTippyShown() {
    return this.valueTippy?.isShown() ?? false;
  }

  private isOperatorTippyShown() {
    return this.operatorTippy?.isShown() ?? false;
  }

  /** 对齐 Vue isConditionValueFocus：输入聚焦且候选 tippy 已展开 */
  private isConditionValueFocus() {
    return document.activeElement === this.valueInput && this.isValueTippyShown();
  }

  private handlePanelClick(e: MouseEvent) {
    if (this.isClickInConditionValueArea(e.target)) return;
    this.valueTippy?.hide(100);
  }

  private handleDocumentClick(e: MouseEvent) {
    if (this.fieldListEl.contains(e.target as Node) || this.isClickInConditionValueArea(e.target)) {
      return;
    }
    this.valueTippy?.hide(100);
  }

  private isClickInConditionValueArea(target: EventTarget | null) {
    const node = target as Node | null;
    if (!node) return false;
    if (this.valueContainer?.contains(node)) return true;
    if (this.fuzzyPanel?.root.contains(node)) return true;
    const popper = this.valueTippy?.getInstance()?.popper;
    if (popper?.contains(node)) return true;
    return false;
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.isComposing || this.isComposing) return;
    const target = e.target as HTMLElement;
    if (target?.closest?.('.fuzzy-match-mode') && !((e.ctrlKey || e.metaKey) && e.keyCode === 13) && e.keyCode !== 27) {
      return;
    }

    const stop = () => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
    };

    if (e.key === 'ArrowUp' || e.keyCode === 38) {
      stop();
      this.handleArrow(-1);
      return;
    }
    if (e.key === 'ArrowDown' || e.keyCode === 40) {
      stop();
      this.handleArrow(1);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.keyCode === 13)) {
      stop();
      this.save();
      return;
    }
    if (e.key === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
      stop();
      this.resolveEnter();
      return;
    }
    if (e.key === 'Escape' || e.keyCode === 27) {
      this.handleEsc(e);
    }
  }

  private handleArrow(dir: 1 | -1) {
    if (this.isConditionValueFocus() || this.isValueTippyShown()) {
      const list = this.getMatchList();
      if (!list.length) return;
      if (this.eggActiveIndex < 0) this.eggActiveIndex = dir > 0 ? 0 : list.length - 1;
      else this.eggActiveIndex = (this.eggActiveIndex + dir + list.length) % list.length;
      this.syncEggHoverClass();
      return;
    }
    if (this.isOperatorTippyShown()) {
      const ops = this.getOperators();
      if (!ops.length) return;
      if (this.operatorActiveIndex < 0) this.operatorActiveIndex = dir > 0 ? 0 : ops.length - 1;
      else this.operatorActiveIndex = (this.operatorActiveIndex + dir + ops.length) % ops.length;
      this.condition.operator = ops[this.operatorActiveIndex].operator;
      const opText = this.operatorBtn?.querySelector('.operator-content') as HTMLElement | null;
      if (opText) this.renderOperatorList(opText);
      return;
    }
    if (!this.filtered.length) return;
    const cur = this.activeIndex ?? (dir > 0 ? -1 : this.filtered.length);
    this.activeIndex = Math.max(0, Math.min(this.filtered.length - 1, cur + dir));
    this.openOpts.isInputFocus = false;
    this.selectField(this.filtered[this.activeIndex], true);
    this.renderFields();
  }

  private resolveEnter() {
    if (this.isOperatorTippyShown()) {
      this.operatorTippy?.hide();
      if (
        !withoutValueConditionList.includes(this.condition.operator)
        && !(this.condition.value as string[]).length
        && !this.computeFuzzyAvailable()
      ) {
        this.openValueTippy();
      }
      return;
    }

    // 对齐 Vue resolveConditonValueInputEnter
    if (this.valueInput && this.activeField && this.activeField.field_name !== '*') {
      if (document.activeElement !== this.valueInput) {
        this.handleConditionValueClick(true);
        return;
      }
      const matchList = this.getMatchList();
      if (this.isValueTippyShown() && this.eggActiveIndex >= 0 && matchList[this.eggActiveIndex] !== undefined) {
        const raw = matchList[this.eggActiveIndex];
        const v = raw.startsWith('__custom__:') ? raw.slice('__custom__:'.length) : raw;
        this.addValue(v);
        return;
      }
      if (!this.isValueTippyShown() && matchList.length) {
        this.handleConditionValueClick(false);
        return;
      }
      const typed = this.valueInput.value.trim();
      if (typed) {
        this.addValue(typed);
        return;
      }
      return;
    }

    if (this.activeField?.field_name === '*') {
      const ta = this.valueListEl.querySelector('textarea') as HTMLTextAreaElement | null;
      ta?.focus();
    }
  }

  private handleEsc(e: KeyboardEvent) {
    if (this.isConditionValueFocus() || this.isValueTippyShown()) {
      e.preventDefault();
      e.stopPropagation();
      this.valueInput?.blur();
      this.valueTippy?.hide(100);
      return;
    }
    if (this.isOperatorTippyShown()) {
      e.preventDefault();
      e.stopPropagation();
      this.operatorTippy?.hide();
    }
  }

  private save() {
    if (!this.canSave()) return;
    const field = this.activeField;
    if (!field) return;
    if (field.field_name === IP_SELECT_FIELD) {
      this.ctx.onSave({
        field: IP_SELECT_FIELD,
        operator: '',
        value: [{}],
        relation: '',
        disabled: false,
        hidden_values: [],
      });
      return;
    }
    const value = withoutValueConditionList.includes(this.condition.operator)
      ? []
      : [...(this.condition.value as string[])];
    this.ctx.onSave({
      ...this.condition,
      field: field.field_name,
      field_type: field.field_type,
      value,
    });
  }
}
