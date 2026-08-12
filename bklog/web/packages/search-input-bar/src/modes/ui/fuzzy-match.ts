import { el, on } from '../../utils/dom';
import { BatchInput } from './batch-input';

export type FuzzyMode = 'exact' | 'prefix' | 'suffix' | 'contains' | 'custom';
export type FuzzyEngine = 'es' | 'doris';

export interface FuzzyMatchCallbacks {
  onValueChange: (values: string[]) => void;
  onRelationChange: (relation: 'AND' | 'OR') => void;
  onWildcardChange: (isWildcard: boolean) => void;
  onBatchShowChange?: (isShow: boolean) => void;
  getOperator: () => string;
  getRelation: () => string;
  engine?: FuzzyEngine;
}

const MODE_BUTTONS: Array<{ id: FuzzyMode; label: string; sample: string }> = [
  { id: 'exact', label: '精确', sample: '' },
  { id: 'prefix', label: '前缀', sample: 'abc*' },
  { id: 'suffix', label: '后缀', sample: '*abc' },
  { id: 'contains', label: '包含', sample: '*abc*' },
  { id: 'custom', label: '自定义', sample: '' },
];

function isAsteriskEscaped(text: string, index: number) {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) slashCount++;
  return slashCount % 2 === 1;
}

function startsWithUnescapedAsterisk(text: string) {
  return text.startsWith('*') && !isAsteriskEscaped(text, 0);
}
function endsWithUnescapedAsterisk(text: string) {
  return text.endsWith('*') && !isAsteriskEscaped(text, text.length - 1);
}
function hasUnescapedWildcard(text: string) {
  for (let i = 0; i < text.length; i++) {
    if ((text[i] === '*' || text[i] === '?') && !isAsteriskEscaped(text, i)) return true;
  }
  return false;
}

function escapeEdgeAsterisks(text: string) {
  if (!text) return '';
  const chars = text.split('');
  const escapeIndexSet = new Set<number>();
  for (let i = 0; i < chars.length && chars[i] === '*'; i++) escapeIndexSet.add(i);
  for (let i = chars.length - 1; i >= 0 && chars[i] === '*'; i--) {
    if (!isAsteriskEscaped(text, i)) escapeIndexSet.add(i);
  }
  return chars.map((char, index) => (escapeIndexSet.has(index) ? `\\${char}` : char)).join('');
}

function normalizeKeyword(value: string) {
  return escapeEdgeAsterisks(String(value ?? '').trim());
}

function isExactOperator(operator: string) {
  return ['contains match phrase', 'not contains match phrase'].includes(operator);
}
function isWildcardOperator(operator: string) {
  return ['=~', '!=~', '&=~', '&!=~'].includes(operator);
}
function isSimpleText(text: string) {
  return !hasUnescapedWildcard(text);
}

export function computeQuery(mode: FuzzyMode, text: string) {
  const value = normalizeKeyword(text);
  if (!value) return '';
  switch (mode) {
    case 'prefix': return `${value}*`;
    case 'suffix': return `*${value}`;
    case 'contains': return `*${value}*`;
    default: return value;
  }
}

export function inferModeAndKeywords(
  value: string | string[],
  operator: string,
): { mode: FuzzyMode; keywords: string[] } {
  const values = Array.isArray(value)
    ? value.filter(v => v != null).map(String)
    : String(value ?? '') ? [String(value)] : [];
  if (isExactOperator(operator)) return { mode: 'exact', keywords: values };
  if (!values.length) return { mode: 'exact', keywords: [] };

  const containsKeywords = values.map(item =>
    (startsWithUnescapedAsterisk(item) && endsWithUnescapedAsterisk(item) && item.length >= 2
      ? item.slice(1, -1)
      : null));
  if (containsKeywords.every(item => item !== null && isSimpleText(item))) {
    return { mode: 'contains', keywords: containsKeywords as string[] };
  }

  const suffixKeywords = values.map(item =>
    (startsWithUnescapedAsterisk(item) && !endsWithUnescapedAsterisk(item) ? item.slice(1) : null));
  if (suffixKeywords.every(item => item !== null && isSimpleText(item))) {
    return { mode: 'suffix', keywords: suffixKeywords as string[] };
  }

  const prefixKeywords = values.map(item =>
    (!startsWithUnescapedAsterisk(item) && endsWithUnescapedAsterisk(item) ? item.slice(0, -1) : null));
  if (prefixKeywords.every(item => item !== null && isSimpleText(item))) {
    return { mode: 'prefix', keywords: prefixKeywords as string[] };
  }

  if (values.some(item => hasUnescapedWildcard(item)) || isWildcardOperator(operator)) {
    return { mode: 'custom', keywords: values };
  }
  return { mode: 'exact', keywords: values };
}

/** Full fuzzy-match-mode.vue port */
export class FuzzyMatchPanel {
  root: HTMLElement;
  private mode: FuzzyMode = 'exact';
  private keywords: string[] = [];
  private relation: 'AND' | 'OR' = 'OR';
  private input: HTMLInputElement;
  private tagWrap: HTMLElement;
  private previewValue: HTMLElement;
  private descEl: HTMLElement;
  private customTip: HTMLElement;
  private relationRow: HTMLElement;
  private batch: BatchInput;
  private editIndex: number | null = null;
  private emitting = false;
  private cleanups: Array<() => void> = [];

  constructor(private cb: FuzzyMatchCallbacks) {
    this.root = el('div', 'fuzzy-match-mode');
    this.relation = (cb.getRelation()?.toUpperCase() === 'AND' ? 'AND' : 'OR');

    const header = el('div', 'fuzzy-match-header');
    const actions = el('span', 'fuzzy-match-actions');
    const label = el('span', 'fuzzy-match-label');
    label.textContent = '检索内容';
    this.batch = new BatchInput({
      onShowChange: isShow => this.cb.onBatchShowChange?.(isShow),
      onConfirm: (values) => {
        values.forEach(v => this.appendKeyword(v));
        this.emitValue();
      },
    });
    const clearBtn = el('button', 'fuzzy-match-clear-btn ui-value-clear-btn');
    clearBtn.type = 'button';
    clearBtn.textContent = '清空';
    on(clearBtn, 'click', () => this.handleClear());
    actions.append(label, this.batch.trigger, clearBtn);

    const titleWrap = el('span', 'fuzzy-match-title-wrap');
    const title = el('span', 'fuzzy-match-title');
    title.textContent = '匹配模式';
    const help = el('span', 'fuzzy-match-help');
    help.textContent = '?';
    help.title = [
      '匹配模式说明',
      '精确匹配：完整等于关键词。',
      '前缀 / 后缀 / 包含：在关键词前后自动添加通配。',
      '自定义：允许手写 * / ?。',
      'ES 受分词限制；Doris 可带符号查询。',
    ].join('\n');
    titleWrap.append(title, help);
    header.append(actions, titleWrap);

    const buttons = el('div', 'fuzzy-match-buttons');
    MODE_BUTTONS.forEach((btn) => {
      const b = el('button', 'fuzzy-match-button');
      b.type = 'button';
      b.dataset.mode = btn.id;
      const ml = el('span', 'mode-label');
      ml.textContent = btn.label;
      b.appendChild(ml);
      if (btn.sample) {
        const s = el('span', 'mode-sample');
        s.textContent = btn.sample;
        b.appendChild(s);
      }
      on(b, 'click', (e) => {
        e.stopPropagation();
        this.mode = btn.id;
        this.renderModes();
        this.emitValue();
      });
      buttons.appendChild(b);
    });

    this.tagWrap = el('div', 'fuzzy-match-tag-input');
    this.input = el('input', 'fuzzy-match-input') as HTMLInputElement;
    on(this.tagWrap, 'click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.fuzzy-match-tag, .fuzzy-match-tag-edit, .fuzzy-match-tag-del')) return;
      this.input.focus();
    });
    on(this.input, 'keydown', (e) => {
      if (e.key === 'Enter' && !(e as any).isComposing) {
        e.preventDefault();
        this.appendKeyword(this.input.value);
        this.input.value = '';
        this.emitValue();
        this.renderTags();
      } else if (e.key === 'Backspace' && !this.input.value && this.keywords.length) {
        e.preventDefault();
        this.keywords.pop();
        this.emitValue();
        this.renderTags();
      }
    });
    on(this.input, 'blur', () => {
      if (!this.input.value.trim()) return;
      this.appendKeyword(this.input.value);
      this.input.value = '';
      this.emitValue();
      this.renderTags();
    });

    this.relationRow = el('div', 'fuzzy-match-relation');
    const relLabel = el('span', 'fuzzy-match-relation-label');
    relLabel.textContent = '组间关系';
    const relBox = el('div', 'ui-value-relation');
    ['AND', 'OR'].forEach((rel) => {
      const lab = el('label', 'ui-radio');
      const radio = el('input') as HTMLInputElement;
      radio.type = 'radio';
      radio.name = 'fuzzy-relation';
      radio.value = rel;
      radio.checked = this.relation === rel;
      on(radio, 'change', () => {
        this.relation = rel as 'AND' | 'OR';
        this.cb.onRelationChange(this.relation);
        this.updatePreview();
      });
      lab.append(radio, document.createTextNode(` ${rel}`));
      relBox.appendChild(lab);
    });
    this.relationRow.append(relLabel, relBox);

    const previewCard = el('div', 'fuzzy-match-preview-card');
    const preview = el('div', 'fuzzy-match-preview');
    const pl = el('span', 'preview-label');
    pl.textContent = '实际下发查询：';
    this.previewValue = el('span', 'preview-value');
    preview.append(pl, this.previewValue);
    this.customTip = el('div', 'fuzzy-match-custom-tip');
    this.customTip.textContent = '自定义模式下可手写 *（任意字符串）、?（任意单字符）';
    this.descEl = el('div', 'fuzzy-match-desc');
    previewCard.append(preview, this.customTip, this.descEl);

    this.root.append(header, buttons, this.tagWrap, this.relationRow, previewCard);
    this.renderModes();
    this.renderTags();
    this.updatePreview();
  }

  setValue(values: string[], operator: string, relation?: string) {
    if (this.emitting) return;
    const inferred = inferModeAndKeywords(values, operator);
    this.mode = inferred.mode;
    this.keywords = [...inferred.keywords];
    if (relation) this.relation = relation.toUpperCase() === 'AND' ? 'AND' : 'OR';
    this.renderModes();
    this.renderTags();
    this.updatePreview();
  }

  destroy() {
    this.batch.destroy();
    this.cleanups.forEach(fn => fn());
    this.root.remove();
  }

  private appendKeyword(value: string) {
    const text = normalizeKeyword(value);
    if (!text) return;
    if (!this.keywords.includes(text)) this.keywords.push(text);
  }

  private handleClear() {
    this.keywords = [];
    this.input.value = '';
    this.editIndex = null;
    this.emitValue();
    this.renderTags();
  }

  private emitValue() {
    // 对齐 Vue emitValue：先 wildcard-change / input，再用 isEmitting 挡住回写 sync
    this.emitting = true;
    const queries = this.keywords.map(k => computeQuery(this.mode, k)).filter(Boolean);
    this.cb.onWildcardChange(this.mode !== 'exact');
    this.cb.onValueChange(queries);
    this.updatePreview();
    setTimeout(() => { this.emitting = false; }, 0);
  }

  private actualQueryText() {
    const list = this.keywords.map(k => computeQuery(this.mode, k)).filter(Boolean);
    return list.length ? list.join(` ${this.relation} `) : '';
  }

  private updatePreview() {
    this.previewValue.textContent = this.actualQueryText() || '(空)';
    this.customTip.style.display = this.mode === 'custom' ? 'block' : 'none';
    this.relationRow.style.display = this.keywords.length > 1 ? 'flex' : 'none';
    const engine = this.cb.engine === 'doris' ? 'doris' : 'es';
    const engineDesc = engine === 'doris'
      ? 'Doris 引擎下，可携带符号 / 空格，且无视分词。'
      : 'ES 引擎下，关键词必须是一个完整的词，中间不能包含符号或空格。';
    const map: Record<FuzzyMode, string> = {
      exact: '精确匹配，与关键词完全相等的内容才会命中。',
      prefix: `前缀匹配，命中所有以关键词开头的内容。${engineDesc}`,
      suffix: `后缀匹配，命中所有以关键词结尾的内容。${engineDesc}`,
      contains: `包含匹配，命中所有含有关键词的内容。${engineDesc}`,
      custom: '自定义模式，按你输入的 * / ? 直接匹配。',
    };
    this.descEl.textContent = map[this.mode];
    this.input.placeholder = this.keywords.length
      ? ''
      : (this.mode === 'custom'
        ? '可手写 * / ?，如 user_*_error'
        : this.mode === 'exact'
          ? '请输入关键词，Enter 生成标签'
          : '只输入关键词即可，无需自己写 *，Enter 生成标签');
  }

  private renderModes() {
    this.root.querySelectorAll('.fuzzy-match-button').forEach((node) => {
      const btn = node as HTMLElement;
      btn.classList.toggle('active', btn.dataset.mode === this.mode);
    });
  }

  private renderTags() {
    this.tagWrap.replaceChildren();
    this.keywords.forEach((item, index) => {
      const tag = el('span', 'fuzzy-match-tag');
      if (this.editIndex === index) {
        const edit = el('input', 'fuzzy-match-tag-edit') as HTMLInputElement;
        edit.value = item;
        edit.dataset.fuzzyEditIndex = String(index);
        on(edit, 'blur', () => this.commitEdit(index, edit.value));
        on(edit, 'keydown', (e) => {
          if (e.key === 'Enter' && !(e as any).isComposing) {
            e.preventDefault();
            this.commitEdit(index, edit.value);
          }
        });
        on(edit, 'click', e => e.stopPropagation());
        tag.appendChild(edit);
        this.tagWrap.appendChild(tag);
        setTimeout(() => { edit.focus(); edit.select(); }, 0);
        return;
      }
      const text = el('span', 'fuzzy-match-tag-text');
      text.textContent = item;
      text.title = item;
      on(text, 'dblclick', (e) => {
        e.stopPropagation();
        this.editIndex = index;
        this.renderTags();
      });
      const del = el('span', 'fuzzy-match-tag-del');
      del.textContent = '×';
      on(del, 'click', (e) => {
        e.stopPropagation();
        this.keywords.splice(index, 1);
        this.emitValue();
        this.renderTags();
      });
      tag.append(text, del);
      this.tagWrap.appendChild(tag);
    });
    this.tagWrap.appendChild(this.input);
    this.updatePreview();
  }

  private commitEdit(index: number, raw: string) {
    const text = normalizeKeyword(raw);
    if (text) this.keywords.splice(index, 1, text);
    else this.keywords.splice(index, 1);
    this.editIndex = null;
    this.emitValue();
    this.renderTags();
  }
}
