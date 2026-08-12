import type { UiQueryItem } from '../../types';
import { createTippyPopover, type TippyPopoverInstance } from '../../utils/popover';
import { el, on } from '../../utils/dom';

export interface ValueTagMenuHost {
  getItem: () => UiQueryItem;
  onChange: (next: UiQueryItem) => void;
}

/**
 * Per-value hide/restore + only-this menu (ui-input.vue bk-popover content).
 */
export class ValueTagMenu {
  private tippy: TippyPopoverInstance | null = null;
  private content: HTMLElement;
  private cleanups: Array<() => void> = [];

  constructor(private host: ValueTagMenuHost) {
    this.content = el('div', 'match-value-menu');
  }

  attach(anchor: HTMLElement, value: string) {
    const show = () => this.open(anchor, value);
    this.cleanups.push(on(anchor, 'click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      show();
    }));
  }

  destroy() {
    this.tippy?.destroy();
    this.tippy = null;
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
  }

  private open(anchor: HTMLElement, value: string) {
    const item = this.host.getItem();
    const hidden = item.hidden_values || [];
    const hideText = hidden.includes(value) ? '恢复这个选项' : '隐藏这个选项';

    this.content.replaceChildren();
    const hideBtn = el('div', 'match-value-select');
    hideBtn.textContent = hideText;
    on(hideBtn, 'click', (e) => {
      e.stopPropagation();
      this.toggleHidden(value);
      this.tippy?.hide();
    });
    const onlyBtn = el('div', 'match-value-select');
    onlyBtn.textContent = '只看这个选项';
    on(onlyBtn, 'click', (e) => {
      e.stopPropagation();
      this.onlyThis(value);
      this.tippy?.hide();
    });
    this.content.append(hideBtn, onlyBtn);

    if (!this.tippy) {
      this.tippy = createTippyPopover(anchor, {
        content: this.content,
        placement: 'bottom',
        theme: 'log-light',
        arrow: false,
        maxWidth: 200,
        hideOnClick: true,
        newInstance: true,
      });
    }
    this.tippy.show(anchor);
  }

  private toggleHidden(value: string) {
    const item = { ...this.host.getItem() };
    const hidden = [...(item.hidden_values || [])];
    const idx = hidden.indexOf(value);
    if (idx >= 0) {
      hidden.splice(idx, 1);
      item.disabled = false;
    } else {
      hidden.push(value);
    }
    item.hidden_values = hidden;
    this.host.onChange(item);
  }

  private onlyThis(value: string) {
    const item = { ...this.host.getItem() };
    const values = (item.value || []).map(String);
    item.hidden_values = values.filter(v => v !== value);
    item.disabled = false;
    this.host.onChange(item);
  }
}

export interface MoreValuesMenuHost {
  getItem: () => UiQueryItem;
  onChange: (next: UiQueryItem) => void;
}

/** +N nested list with per-value menus */
export class MoreValuesMenu {
  private tippy: TippyPopoverInstance | null = null;
  private content: HTMLElement;
  private childMenus: ValueTagMenu[] = [];
  private cleanup: (() => void) | null = null;

  constructor(private host: MoreValuesMenuHost) {
    this.content = el('div', 'match-value-content');
  }

  attach(anchor: HTMLElement, overflowValues: string[]) {
    this.cleanup = on(anchor, 'click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.open(anchor, overflowValues);
    });
  }

  destroy() {
    this.childMenus.forEach(m => m.destroy());
    this.childMenus = [];
    this.tippy?.destroy();
    this.tippy = null;
    this.cleanup?.();
  }

  private open(anchor: HTMLElement, overflowValues: string[]) {
    this.childMenus.forEach(m => m.destroy());
    this.childMenus = [];
    this.content.replaceChildren();
    overflowValues.forEach((value) => {
      const row = el(
        'div',
        `match-value-child${(this.host.getItem().hidden_values || []).includes(value) ? ' delete-line' : ''}`,
      );
      row.textContent = value;
      const menu = new ValueTagMenu({
        getItem: () => this.host.getItem(),
        onChange: (next) => {
          this.host.onChange(next);
          this.tippy?.hide();
        },
      });
      menu.attach(row, value);
      this.childMenus.push(menu);
      this.content.appendChild(row);
    });
    if (!this.tippy) {
      this.tippy = createTippyPopover(anchor, {
        content: this.content,
        placement: 'bottom',
        theme: 'log-light',
        arrow: false,
        maxWidth: 280,
        hideOnClick: true,
        newInstance: true,
      });
    }
    this.tippy.show(anchor);
  }
}
