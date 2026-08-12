import { el } from '../utils/dom';

export type SlotName =
  | 'toolbar-extra'
  | 'favorites'
  | 'sql-favorite-list'
  | 'ip-selector'
  | 'custom-placeholder'
  | 'default';

const SLOT_NAMES: SlotName[] = [
  'toolbar-extra',
  'favorites',
  'sql-favorite-list',
  'ip-selector',
  'custom-placeholder',
  'default',
];

/**
 * Light-DOM named slot host.
 * Hosts can append elements with `data-slot="favorites"` (or slot attribute).
 */
export class SlotHost {
  private containers = new Map<SlotName, HTMLElement>();

  createContainer(name: SlotName, className = '') {
    const box = el('div', `bklog-sib-slot bklog-sib-slot--${name} ${className}`.trim());
    box.dataset.slotHost = name;
    this.containers.set(name, box);
    return box;
  }

  get(name: SlotName) {
    return this.containers.get(name);
  }

  /**
   * Move projected children from host root into named containers.
   */
  projectFrom(host: HTMLElement) {
    const children = Array.from(host.children);
    children.forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (child.classList.contains('bklog-sib-root')) return;
      const name = (child.getAttribute('data-slot') || child.getAttribute('slot') || '') as SlotName;
      if (!SLOT_NAMES.includes(name)) return;
      const container = this.containers.get(name);
      if (container) container.appendChild(child);
    });
  }

  setContent(name: SlotName, node: Node | null) {
    const container = this.containers.get(name);
    if (!container) return;
    container.replaceChildren();
    if (node) container.appendChild(node);
  }
}
