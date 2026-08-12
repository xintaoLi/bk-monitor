import { createSearchBar, type SearchBarInstance } from './shell/search-bar';
import type { SearchInputBarOptions, SearchMode, UiQueryItem } from './types';
import { TAG_NAME } from './types';

export class BklogSearchInputBarElement extends HTMLElement {
  static get observedAttributes() {
    return ['mode', 'disabled', 'searching', 'loading'];
  }

  private instance: SearchBarInstance | null = null;
  private pendingOptions: SearchInputBarOptions | null = null;

  connectedCallback() {
    if (this.instance) return;
    const partial = this.pendingOptions || this.readOptionsFromDataset();
    const fallbackServices = {
      getFields: () => [],
      requestFieldValues: async () => ({ aggs_items: [] }),
      convertUiToSql: async () => ({ querystring: '' }),
    };
    if (!partial?.services) {
      console.warn('[bklog-search-input-bar] services is required. Call setOptions(options) before/after mount.');
    }
    const options: SearchInputBarOptions = {
      ...partial,
      services: partial?.services ?? fallbackServices,
    };
    this.instance = createSearchBar(this, options);
  }

  disconnectedCallback() {
    this.instance?.destroy();
    this.instance = null;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (!this.instance) return;
    if (name === 'mode' && value) this.instance.setMode(value as SearchMode);
    if (name === 'disabled') this.instance.setOptions({ disabled: value !== null && value !== 'false' });
    if (name === 'searching') this.instance.setOptions({ searching: value !== null && value !== 'false' });
    if (name === 'loading') this.instance.setOptions({ loading: value !== null && value !== 'false' });
  }

  setOptions(options: SearchInputBarOptions) {
    this.pendingOptions = options;
    if (this.instance) this.instance.setOptions(options);
    else if (this.isConnected) this.connectedCallback();
  }

  setMode(mode: SearchMode) {
    this.instance?.setMode(mode);
  }

  setValue(value: { uiValue?: UiQueryItem[]; sqlValue?: string }) {
    this.instance?.setValue(value);
  }

  getValue() {
    return this.instance?.getValue();
  }

  addValue(item: UiQueryItem) {
    this.instance?.addValue(item);
  }

  getRect() {
    return this.instance?.getRect() ?? this.getBoundingClientRect();
  }

  focus(options?: FocusOptions) {
    super.focus(options);
    this.instance?.focus();
  }

  destroy() {
    this.instance?.destroy();
    this.instance = null;
  }

  private readOptionsFromDataset(): Partial<SearchInputBarOptions> {
    return {
      mode: (this.getAttribute('mode') as SearchMode) || 'ui',
      disabled: this.hasAttribute('disabled'),
      searching: this.hasAttribute('searching'),
      loading: this.hasAttribute('loading'),
    };
  }
}

export function registerSearchInputBar(tagName = TAG_NAME) {
  if (typeof customElements === 'undefined') return tagName;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, BklogSearchInputBarElement);
  }
  return tagName;
}

declare global {
  interface HTMLElementTagNameMap {
    'bklog-search-input-bar': BklogSearchInputBarElement;
  }
}
