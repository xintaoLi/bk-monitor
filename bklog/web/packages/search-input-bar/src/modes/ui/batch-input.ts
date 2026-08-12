import { el, on } from '../../utils/dom';

export interface BatchInputOptions {
  onShowChange?: (isShow: boolean) => void;
  onConfirm: (values: string[]) => void;
}

/** Native port of retrieve-v2/components/batch-input */
export class BatchInput {
  trigger: HTMLElement;
  private dialog: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private resultList: HTMLElement | null = null;
  private confirmBtn: HTMLButtonElement | null = null;
  private splitResult: string[] = [];
  private selected = new Set<number>();
  private cleanups: Array<() => void> = [];

  constructor(private opts: BatchInputOptions) {
    this.trigger = el('span', 'bklog-sib-batch-trigger');
    this.trigger.textContent = '批量输入';
    this.cleanups.push(on(this.trigger, 'click', (e) => {
      e.stopPropagation();
      this.open();
    }));
  }

  destroy() {
    this.close(false);
    this.cleanups.forEach(fn => fn());
    this.trigger.remove();
  }

  private open() {
    this.close(false);
    this.splitResult = [];
    this.selected.clear();
    this.opts.onShowChange?.(true);

    this.overlay = el('div', 'bklog-sib-batch-overlay');
    this.dialog = el('div', 'bklog-sib-batch-dialog');
    const title = el('div', 'bklog-sib-batch-dialog__title');
    title.textContent = '批量输入';

    const body = el('div', 'bklog-sib-batch-dialog__body');
    const left = el('div', 'bklog-sib-batch-left');
    const leftLabel = el('div', 'bklog-sib-batch-label');
    leftLabel.innerHTML = '解析文本<span class="req">*</span>';
    this.textarea = el('textarea', 'bklog-sib-batch-textarea') as HTMLTextAreaElement;
    this.textarea.placeholder = '请使用，；｜换行等进行分隔';
    this.textarea.maxLength = 1000;
    this.textarea.rows = 16;
    const leftBtns = el('div', 'bklog-sib-batch-left-btns');
    const parseBtn = el('button', 'bklog-sib-btn bklog-sib-btn--primary bklog-sib-batch-parse') as HTMLButtonElement;
    parseBtn.type = 'button';
    parseBtn.textContent = '点击解析';
    const clearBtn = el('button', 'bklog-sib-btn') as HTMLButtonElement;
    clearBtn.type = 'button';
    clearBtn.textContent = '清空';
    leftBtns.append(parseBtn, clearBtn);
    left.append(leftLabel, this.textarea, leftBtns);

    const right = el('div', 'bklog-sib-batch-right');
    const rightLabel = el('div', 'bklog-sib-batch-label');
    rightLabel.textContent = '选择解析结果';
    this.resultList = el('div', 'bklog-sib-batch-result');
    this.renderResults();
    right.append(rightLabel, this.resultList);
    body.append(left, right);

    const footer = el('div', 'bklog-sib-batch-dialog__footer');
    this.confirmBtn = el('button', 'bklog-sib-btn bklog-sib-btn--primary') as HTMLButtonElement;
    this.confirmBtn.type = 'button';
    this.confirmBtn.textContent = '确认';
    this.confirmBtn.disabled = true;
    const cancelBtn = el('button', 'bklog-sib-btn') as HTMLButtonElement;
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    footer.append(this.confirmBtn, cancelBtn);

    this.dialog.append(title, body, footer);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    on(parseBtn, 'click', () => {
      const text = this.textarea?.value || '';
      if (!text.length) return;
      this.splitResult = splitComplexTextEnhanced(text);
      this.selected = new Set(this.splitResult.map((_, i) => i));
      this.renderResults();
      this.syncConfirm();
    });
    on(clearBtn, 'click', () => {
      if (this.textarea) this.textarea.value = '';
      this.splitResult = [];
      this.selected.clear();
      this.renderResults();
      this.syncConfirm();
    });
    on(this.confirmBtn, 'click', () => {
      const values = [...this.selected].sort((a, b) => a - b).map(i => this.splitResult[i]).filter(Boolean);
      this.opts.onConfirm(values);
      this.close(true);
    });
    on(cancelBtn, 'click', () => this.close(true));
    on(this.overlay, 'click', (e) => {
      if (e.target === this.overlay) this.close(true);
    });
  }

  private close(emit: boolean) {
    this.overlay?.remove();
    this.overlay = null;
    this.dialog = null;
    this.textarea = null;
    this.resultList = null;
    this.confirmBtn = null;
    if (emit) this.opts.onShowChange?.(false);
  }

  private syncConfirm() {
    if (this.confirmBtn) this.confirmBtn.disabled = this.selected.size === 0;
  }

  private renderResults() {
    if (!this.resultList) return;
    this.resultList.replaceChildren();
    if (!this.splitResult.length) {
      const empty = el('div', 'bklog-sib-batch-empty');
      empty.textContent = '请先在左侧输入并解析';
      this.resultList.appendChild(empty);
      return;
    }
    const allRow = el('label', 'bklog-sib-batch-row is-all');
    const allCb = el('input') as HTMLInputElement;
    allCb.type = 'checkbox';
    allCb.checked = this.selected.size === this.splitResult.length;
    on(allCb, 'change', () => {
      if (allCb.checked) this.selected = new Set(this.splitResult.map((_, i) => i));
      else this.selected.clear();
      this.renderResults();
      this.syncConfirm();
    });
    allRow.append(allCb, document.createTextNode(' 全选'));
    this.resultList.appendChild(allRow);

    this.splitResult.forEach((item, index) => {
      const row = el('label', 'bklog-sib-batch-row');
      const cb = el('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.checked = this.selected.has(index);
      on(cb, 'change', () => {
        if (cb.checked) this.selected.add(index);
        else this.selected.delete(index);
        this.syncConfirm();
      });
      const text = el('span');
      text.textContent = item;
      row.append(cb, text);
      this.resultList!.appendChild(row);
    });
  }
}

export function splitComplexTextEnhanced(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const result: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|([^,，;；|｜\r\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    let content = match[1] ?? match[2] ?? match[3];
    if (match[3]) content = content.trim();
    if (content !== undefined && content !== '') result.push(content);
  }
  return result;
}
