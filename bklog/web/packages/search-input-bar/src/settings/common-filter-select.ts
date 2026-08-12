import type { CommonFilterItem, FieldInfo, SearchInputBarServices } from '../types';
import { el, on } from '../utils/dom';

export interface CommonFilterSelectContext {
  services: SearchInputBarServices;
  getFields: () => FieldInfo[];
  getAddition: () => CommonFilterItem[];
  onChange: (addition: CommonFilterItem[]) => void;
}

export class CommonFilterSelect {
  root: HTMLElement;

  constructor(private ctx: CommonFilterSelectContext) {
    this.root = el('div', 'bklog-sib-common-filter');
  }

  mount(parent: HTMLElement) {
    parent.appendChild(this.root);
    this.render();
  }

  update() {
    this.render();
  }

  destroy() {
    this.root.remove();
  }

  private render() {
    this.root.replaceChildren();
    const fields = this.ctx.getFields();
    const addition = this.ctx.getAddition();

    if (!fields.length) {
      const empty = el('div', 'bklog-sib-common-filter__empty');
      empty.textContent = '请先在设置中选择常驻筛选字段';
      this.root.appendChild(empty);
      return;
    }

    fields.forEach((field) => {
      const row = el('div', 'bklog-sib-common-filter__item');
      const label = el('div', 'bklog-sib-common-filter__label');
      label.textContent = field.query_alias || field.field_alias || field.field_name;

      const current = addition.find(item => item.field === field.field_name) || {
        field: field.field_name,
        operator: field.field_operator?.[0]?.operator || '=',
        value: [] as string[],
        field_type: field.field_type,
      };

      const opSelect = el('select', 'bklog-sib-common-filter__op') as HTMLSelectElement;
      const ops = field.field_operator?.length
        ? field.field_operator
        : [{ operator: '=' }, { operator: '!=' }, { operator: 'contains match phrase' }];
      ops.forEach((op) => {
        const option = el('option') as HTMLOptionElement;
        option.value = op.operator;
        option.textContent = op.label || op.operator;
        if (op.operator === current.operator) option.selected = true;
        opSelect.appendChild(option);
      });

      const valueInput = el('input', 'bklog-sib-common-filter__value') as HTMLInputElement;
      valueInput.placeholder = '输入值，逗号分隔';
      valueInput.value = (current.value || []).join(',');

      const apply = () => {
        const nextItem: CommonFilterItem = {
          field: field.field_name,
          operator: opSelect.value,
          value: valueInput.value
            .split(',')
            .map(v => v.trim())
            .filter(Boolean),
          field_type: field.field_type,
        };
        const others = addition.filter(item => item.field !== field.field_name);
        const next = nextItem.value.length ? [...others, nextItem] : others;
        this.ctx.onChange(next);
      };

      on(opSelect, 'change', apply);
      on(valueInput, 'change', apply);
      on(valueInput, 'keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          apply();
        }
      });

      // prefetch eggs on focus for UX
      on(valueInput, 'focus', () => {
        void this.ctx.services.requestFieldValues({ field: field.field_name, size: 10 });
      });

      row.append(label, opSelect, valueInput);
      this.root.appendChild(row);
    });
  }
}
