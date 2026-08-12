import { excludesFields } from '../core/const.common';
import type { FieldInfo } from '../types';
import { createPopover } from '../utils/popover';
import { el, on } from '../utils/dom';

export interface SettingsPanelContext {
  texts: Record<string, string>;
  getFields: () => FieldInfo[];
  getSelected: () => FieldInfo[];
  onConfirm: (selected: FieldInfo[]) => void;
}

export class CommonFilterSetting {
  private popover = createPopover({ className: 'bklog-sib-settings-pop', placement: 'bottom-end' });
  private shadowTotal: FieldInfo[] = [];
  private shadowVisible: FieldInfo[] = [];
  private keyword = '';
  private cleanups: Array<() => void> = [];

  constructor(private ctx: SettingsPanelContext) {}

  open(anchor: HTMLElement) {
    this.keyword = '';
    const selectedNames = new Set(this.ctx.getSelected().map(f => f.field_name));
    this.shadowVisible = [...this.ctx.getSelected()];
    this.shadowTotal = this.ctx
      .getFields()
      .filter(f => !excludesFields.includes(f.field_name) && !selectedNames.has(f.field_name));
    this.render();
    this.popover.show(anchor);
  }

  close() {
    this.popover.hide();
  }

  destroy() {
    this.cleanups.forEach(fn => fn());
    this.popover.destroy();
  }

  private filteredTotal() {
    const kw = this.keyword.trim().toLowerCase();
    if (!kw) return this.shadowTotal;
    return this.shadowTotal.filter((f) => {
      const text = `${f.field_name} ${f.field_alias || ''} ${f.query_alias || ''}`.toLowerCase();
      return text.includes(kw);
    });
  }

  private render() {
    const root = el('div', 'bklog-sib-settings');
    const title = el('div', 'bklog-sib-settings__title');
    title.textContent = this.ctx.texts.settingsTitle;

    const body = el('div', 'bklog-sib-settings__body');
    const left = el('div', 'bklog-sib-settings__col');
    const right = el('div', 'bklog-sib-settings__col');

    const leftTitle = el('div', 'bklog-sib-settings__col-title');
    leftTitle.innerHTML = `<span>${this.ctx.texts.availableList}(${this.filteredTotal().length})</span>`;
    const addAll = el('button', 'bklog-sib-btn-text');
    addAll.type = 'button';
    addAll.textContent = this.ctx.texts.addAll;
    on(addAll, 'click', () => {
      this.shadowVisible = [...this.shadowVisible, ...this.filteredTotal()];
      const visibleSet = new Set(this.shadowVisible.map(f => f.field_name));
      this.shadowTotal = this.shadowTotal.filter(f => !visibleSet.has(f.field_name));
      this.render();
    });
    leftTitle.appendChild(addAll);

    const search = el('input', 'bklog-sib-settings__search') as HTMLInputElement;
    search.placeholder = this.ctx.texts.searchKeyword;
    search.value = this.keyword;
    on(search, 'input', () => {
      this.keyword = search.value;
      this.render();
      const input = this.popover.content.querySelector('.bklog-sib-settings__search') as HTMLInputElement | null;
      input?.focus();
      if (input) input.selectionStart = input.selectionEnd = input.value.length;
    });

    const leftList = el('ul', 'bklog-sib-settings__list');
    const total = this.filteredTotal();
    if (!total.length) {
      const empty = el('li', 'bklog-sib-settings__empty');
      empty.textContent = this.ctx.texts.emptySearch;
      leftList.appendChild(empty);
    } else {
      total.forEach((field) => {
        const li = el('li', 'bklog-sib-settings__item');
        li.textContent = field.query_alias || field.field_alias || field.field_name;
        on(li, 'click', () => {
          this.shadowVisible.push(field);
          this.shadowTotal = this.shadowTotal.filter(f => f.field_name !== field.field_name);
          this.render();
        });
        leftList.appendChild(li);
      });
    }
    left.append(leftTitle, search, leftList);

    const rightTitle = el('div', 'bklog-sib-settings__col-title');
    rightTitle.innerHTML = `<span>${this.ctx.texts.fixedFilter}(${this.shadowVisible.length})</span>`;
    const clearAll = el('button', 'bklog-sib-btn-text');
    clearAll.type = 'button';
    clearAll.textContent = this.ctx.texts.clearAll;
    on(clearAll, 'click', () => {
      this.shadowTotal = [...this.shadowTotal, ...this.shadowVisible];
      this.shadowVisible = [];
      this.render();
    });
    rightTitle.appendChild(clearAll);

    const rightList = el('ul', 'bklog-sib-settings__list');
    this.shadowVisible.forEach((field, index) => {
      const li = el('li', 'bklog-sib-settings__item is-draggable');
      li.draggable = true;
      li.textContent = field.query_alias || field.field_alias || field.field_name;
      on(li, 'dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', String(index));
      });
      on(li, 'dragover', (e) => e.preventDefault());
      on(li, 'drop', (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer?.getData('text/plain'));
        if (Number.isNaN(from) || from === index) return;
        const next = [...this.shadowVisible];
        const [moved] = next.splice(from, 1);
        next.splice(index, 0, moved);
        this.shadowVisible = next;
        this.render();
      });
      on(li, 'click', () => {
        this.shadowVisible = this.shadowVisible.filter(f => f.field_name !== field.field_name);
        this.shadowTotal.push(field);
        this.render();
      });
      rightList.appendChild(li);
    });
    right.append(rightTitle, rightList);

    const footer = el('div', 'bklog-sib-settings__footer');
    const cancel = el('button', 'bklog-sib-btn');
    cancel.type = 'button';
    cancel.textContent = this.ctx.texts.cancel;
    on(cancel, 'click', () => this.close());
    const confirm = el('button', 'bklog-sib-btn bklog-sib-btn--primary');
    confirm.type = 'button';
    confirm.textContent = this.ctx.texts.confirm;
    on(confirm, 'click', () => {
      this.ctx.onConfirm([...this.shadowVisible]);
      this.close();
    });
    footer.append(cancel, confirm);

    body.append(left, right);
    root.append(title, body, footer);
    this.popover.content.replaceChildren(root);
  }
}
