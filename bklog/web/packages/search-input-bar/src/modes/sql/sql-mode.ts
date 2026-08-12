import type { SearchInputBarServices } from '../../types';
import { createTippyPopover, type TippyPopoverInstance } from '../../utils/popover';
import { debounce, el, on } from '../../utils/dom';
import { createLuceneEditor, type LuceneEditorApi } from './codemirror-lucene';
import { SqlOptionsPanel } from './sql-options-panel';

export interface SqlModeContext {
  services: SearchInputBarServices;
  texts: Record<string, string>;
  enableAi: boolean;
  disabled?: boolean;
  sqlSyntaxUrl: string;
  enableFavoriteSuggestions: boolean;
  favoriteListSlot?: HTMLElement;
  placeholderSlot?: HTMLElement;
  getValue: () => string;
  setValue: (next: string, emit?: boolean) => void;
  onSearch: () => void;
  onTextToQuery: (text: string) => void;
  onPopupChange: (isShow: boolean) => void;
}

/**
 * SQL mode aligned with retrieve-v2/sql-query.vue + tippy sql-query-options.
 */
export class SqlModeView {
  root: HTMLElement;
  private editorHost: HTMLElement;
  private placeholderEl: HTMLElement;
  private customPlaceholderEl: HTMLElement;
  /** tippy 左右贴齐的锚点：整条搜索白底容器（.bklog-sib-container） */
  private alignTarget: HTMLElement | null = null;
  private editor: LuceneEditorApi | null = null;
  private panel: SqlOptionsPanel;
  private tippy: TippyPopoverInstance | null = null;
  private cleanups: Array<() => void> = [];
  private alignResizeObserver: ResizeObserver | null = null;
  private isFocused = false;
  private isSelectedText = false;
  private focusPosition: number | null = null;
  private debounceRetrieve: () => void;
  /** 弹出层相对检索框底边间距（px） */
  private static readonly POPUP_GAP_PX = 1;

  constructor(private ctx: SqlModeContext) {
    this.root = el('div', 'bklog-sib-sql search-sql-query');
    this.editorHost = el('div', 'bklog-sib-sql__editor search-sql-editor');
    this.placeholderEl = el('span', 'empty-placeholder-text');
    this.customPlaceholderEl = el('span', 'custom-placeholder');
    this.placeholderEl.appendChild(this.customPlaceholderEl);
    if (ctx.placeholderSlot) this.customPlaceholderEl.appendChild(ctx.placeholderSlot);
    this.root.append(this.editorHost, this.placeholderEl);

    this.debounceRetrieve = debounce(() => this.ctx.onSearch(), 100);

    this.panel = new SqlOptionsPanel({
      services: ctx.services,
      texts: ctx.texts,
      enableAi: ctx.enableAi,
      sqlSyntaxUrl: ctx.sqlSyntaxUrl,
      enableFavoriteSuggestions: ctx.enableFavoriteSuggestions,
      favoriteListSlot: ctx.favoriteListSlot,
      onChange: (value, focusPosition) => {
        this.ctx.setValue(value, true);
        this.editor?.setValue(value, focusPosition);
        this.focusPosition = focusPosition ?? value.length;
        this.panel.update(value, this.focusPosition);
        this.syncPlaceholder();
        this.tippy?.reposition();
      },
      onRetrieve: () => this.closeAndRetrieve(),
      onTextToQuery: text => this.ctx.onTextToQuery(text),
      onFavoriteSelect: (keyword) => {
        this.ctx.setValue(keyword, true);
        this.editor?.setValue(keyword, keyword.length);
        this.syncPlaceholder();
        this.closeAndRetrieve();
      },
    });
  }

  mount(parent: HTMLElement) {
    parent.appendChild(this.root);
    // 弹出层左右贴齐整条搜索栏白底容器（含模式切换区），即 left:0 / right:0
    this.alignTarget = (this.root.closest('.bklog-sib-container') as HTMLElement)
      || (parent.closest('.bklog-sib-container') as HTMLElement)
      || this.root;

    this.editor = createLuceneEditor({
      target: this.editorHost,
      value: this.ctx.getValue(),
      disabled: !!this.ctx.disabled,
      onChange: (value) => {
        this.ctx.setValue(value, true);
        this.syncPlaceholder();
        if (this.tippy?.isShown()) {
          this.panel.update(value, this.focusPosition ?? this.editor?.getCursor() ?? value.length);
          this.tippy.reposition();
          this.syncPopupAlign();
        } else if (!this.isSelectedText && value.trim()) {
          this.tryShowPopup();
        }
      },
      onFocusChange: (focused) => {
        this.isFocused = focused;
        this.syncPlaceholder();
        if (focused && !this.ctx.disabled) this.tryShowPopup();
      },
      onFocusPosChange: ({ cursor, hasSelection }) => {
        this.focusPosition = cursor;
        this.isSelectedText = hasSelection;
        if (this.tippy?.isShown() && !hasSelection) {
          this.panel.update(this.ctx.getValue(), cursor);
          this.tippy.reposition();
          this.syncPopupAlign();
        }
      },
      onKeyEnter: () => {
        // 对齐 Vue closeAndRetrieve：有高亮项时由 panel capture 处理；无高亮则检索
        if (this.tippy?.isShown() && this.panel.getActiveIndex() !== null) {
          return false;
        }
        this.closeAndRetrieve();
        return true;
      },
      onCtrlEnter: () => {
        if (!this.ctx.enableAi) return false;
        const value = this.ctx.getValue();
        if (!value.length) return false;
        this.hidePopup();
        this.ctx.onTextToQuery(value);
        return true;
      },
      stopDefaultKeyboard: () => this.tippy?.isShown() ?? false,
    });

    this.tippy = createTippyPopover(this.alignTarget, {
      content: this.panel.root,
      placement: 'bottom-start',
      theme: 'log-light',
      arrow: false,
      maxWidth: 'none',
      // 相对检索框底边 1px；高度变化由锚点 rect + ResizeObserver 自适应
      offset: [0, SqlModeView.POPUP_GAP_PX],
      hideOnClick: false,
      newInstance: false,
      // 贴齐整条搜索栏时勿被 viewport overflow 左右顶开
      disablePreventOverflow: true,
      popperModifiers: [
        {
          // 相对 .bklog-sib-container：左右贴边 + 紧贴底边 1px
          name: 'alignToSearchContainer',
          enabled: true,
          phase: 'beforeWrite',
          requires: ['computeStyles'],
          fn: ({ state }) => {
            const ref = state.rects.reference;
            state.styles.popper.width = `${ref.width}px`;
            state.styles.popper.maxWidth = 'none';
            if (state.modifiersData.popperOffsets) {
              state.modifiersData.popperOffsets.x = ref.x;
              state.modifiersData.popperOffsets.y = ref.y + ref.height + SqlModeView.POPUP_GAP_PX;
            }
          },
        },
      ],
      onShow: () => {
        if (this.ctx.disabled) return false;
        if (this.isSelectedText || this.editor?.hasSelection()) return false;
        const ok = this.panel.beforeShow(
          this.ctx.getValue(),
          this.focusPosition ?? this.editor?.getCursor() ?? null,
        );
        if (ok) {
          this.ctx.onPopupChange(true);
          requestAnimationFrame(() => this.syncPopupAlign());
        }
        return ok;
      },
      onHide: () => {
        this.panel.beforeHide();
        return true;
      },
      onHidden: () => this.ctx.onPopupChange(false),
    });

    // 检索框（含多行）高度变化时，弹出层跟随底边，保持 1px 间距
    if (typeof ResizeObserver !== 'undefined' && this.alignTarget) {
      this.alignResizeObserver = new ResizeObserver(() => {
        if (!this.tippy?.isShown()) return;
        this.tippy.reposition();
        this.syncPopupAlign();
      });
      this.alignResizeObserver.observe(this.alignTarget);
    }

    this.cleanups.push(
      on(this.root, 'click', () => {
        if (this.ctx.disabled) return;
        this.tryShowPopup();
      }),
      on(document, 'click', (e) => {
        if (!this.tippy?.isShown()) return;
        const target = e.target as Node | null;
        if (!target) return;
        if (
          this.alignTarget?.contains(target)
          || this.editorHost.contains(target)
          || this.panel.root.contains(target)
        ) return;
        if ((target as HTMLElement).closest?.('[data-bklog-v3-pop-click-item]')) return;
        this.hidePopup();
      }),
      on(document, 'keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!this.tippy?.isShown()) return;
        this.hidePopup();
      }),
      on(window, 'resize', () => {
        if (this.tippy?.isShown()) {
          this.tippy.reposition();
          this.syncPopupAlign();
        }
      }),
      () => {
        this.alignResizeObserver?.disconnect();
        this.alignResizeObserver = null;
      },
    );

    this.syncPlaceholder();
  }

  update() {
    this.editor?.setValue(this.ctx.getValue());
    this.editor?.setDisabled(!!this.ctx.disabled);
    this.syncPlaceholder();
  }

  focus() {
    if (this.ctx.disabled) return;
    this.editor?.focus();
    this.tryShowPopup();
  }

  destroy() {
    this.hidePopup();
    this.tippy?.destroy();
    this.panel.destroy();
    this.editor?.destroy();
    this.cleanups.forEach(fn => fn());
    this.root.remove();
  }

  private closeAndRetrieve() {
    // 对齐 Vue：无高亮或 tippy 未开时关闭 tippy，再 debounce 检索
    if (!this.tippy?.isShown() || this.panel.getActiveIndex() === null) {
      this.hidePopup();
    }
    this.debounceRetrieve();
  }

  private tryShowPopup() {
    if (this.ctx.disabled || this.isSelectedText) return;
    this.tippy?.show(this.alignTarget || this.root);
    requestAnimationFrame(() => this.syncPopupAlign());
  }

  private hidePopup() {
    this.tippy?.hide();
  }

  /**
   * 弹出层相对 `.bklog-sib-container` 左右贴齐（等效 left:0 / right:0）。
   * tippy appendTo body + fixed 时用容器像素宽兜底。
   */
  private syncPopupAlign() {
    const target = this.alignTarget;
    const tip = this.tippy?.getInstance();
    const popper = tip?.popper as HTMLElement | undefined;
    if (!target || !popper || !tip?.state.isVisible) return;

    const rect = target.getBoundingClientRect();
    popper.style.setProperty('width', `${rect.width}px`);
    popper.style.setProperty('max-width', 'none');

    const box = popper.querySelector('.tippy-box') as HTMLElement | null;
    if (box) {
      box.style.setProperty('width', '100%');
      box.style.setProperty('max-width', 'none');
    }
  }

  private syncPlaceholder() {
    const empty = /^\s*$/.test(this.ctx.getValue());
    this.placeholderEl.style.display = empty ? 'flex' : 'none';
    if (!empty) return;

    const t = this.ctx.texts;
    const isMac = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
    const shortcut = isMac ? 'CMD' : 'Ctrl';
    // placeholders.sql / sqlFocus（及 AI 变体）均可配置
    const idle = t.sqlPlaceholderIdle || t.sqlPlaceholder || ' / 唤起， 输入检索内容';
    const focus = t.sqlPlaceholderFocus || idle;
    if (this.isFocused && this.ctx.enableAi) {
      const text = (t.sqlPlaceholderFocusAi || '可输入自然语言，{shortcut} + Enter 触发 AI 解析')
        .replace('{shortcut}', shortcut);
      this.setPlaceholderText(text);
      return;
    }
    if (this.isFocused) {
      this.setPlaceholderText(focus);
      return;
    }
    if (this.ctx.enableAi) {
      this.setPlaceholderText(t.sqlPlaceholderIdleAi || idle);
      return;
    }
    this.setPlaceholderText(idle);
  }

  private setPlaceholderText(text: string) {
    this.placeholderEl.childNodes.forEach((n) => {
      if (n !== this.customPlaceholderEl) n.remove();
    });
    this.placeholderEl.insertBefore(document.createTextNode(text), this.customPlaceholderEl);
  }
}
