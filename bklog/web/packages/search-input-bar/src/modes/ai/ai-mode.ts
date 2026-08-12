import {
  AI_SHELL_VERTICAL_PADDING,
  AI_TEXTAREA_MIN_HEIGHT,
  INPUT_MAX_HEIGHT,
} from '../../config';
import type { AiQueryResult } from '../../types';
import { el, on } from '../../utils/dom';

const AI_TEXTAREA_MAX_HEIGHT = INPUT_MAX_HEIGHT - AI_SHELL_VERTICAL_PADDING;

export interface AiModeContext {
  texts: Record<string, string>;
  getFilterList: () => string[];
  setFilterList: (next: string[]) => void;
  getResult: () => AiQueryResult | null;
  isLoading: () => boolean;
  onSubmit: (text: string) => void;
  onClearResult: () => void;
  onExitAi?: () => void;
}

export class AiModeView {
  root: HTMLElement;
  private chipsEl: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private bannerEl: HTMLElement;
  private loadingEl: HTMLElement;
  private cleanups: Array<() => void> = [];
  private composing = false;

  constructor(private ctx: AiModeContext) {
    this.root = el('div', 'bklog-sib-ai-shell v3-ai-mode-container');
    const inner = el('div', 'ai-mode-inner');
    const inputWrapper = el('div', 'ai-input-wrapper');
    const inputContainer = el('div', 'ai-input-container');

    this.chipsEl = el('div', 'bklog-sib-ai__chips ai-filter-chips');
    this.textarea = el('textarea', 'ai-input') as HTMLTextAreaElement;
    this.textarea.rows = 1;
    this.textarea.placeholder = ctx.texts.aiPlaceholder || '';

    this.bannerEl = el('div', 'bklog-sib-ai__banner');
    this.loadingEl = el('div', 'ai-loading-info');
    const loadingText = el('div', 'ai-loading-text');
    loadingText.textContent = 'AI 解析中...';
    this.loadingEl.appendChild(loadingText);
    this.loadingEl.style.display = 'none';

    const clearIcon = el('span', 'bklog-icon bklog-qingkong');
    clearIcon.title = ctx.texts.clear;
    on(clearIcon, 'click', () => {
      this.textarea.value = '';
      this.ctx.setFilterList([]);
      this.ctx.onClearResult();
      this.update();
    });

    const toggleBtn = el('button', 'ai-mode-toggle-btn');
    toggleBtn.type = 'button';
    const toggleText = el('span', 'ai-mode-text');
    toggleText.textContent = '退出 AI';
    toggleBtn.appendChild(toggleText);
    on(toggleBtn, 'click', () => this.ctx.onExitAi?.());

    const executeBtn = el('button', 'ai-execute-btn');
    executeBtn.type = 'button';
    executeBtn.title = '执行';
    const execIcon = el('span', 'bklog-icon bklog-shoudongchaxun');
    executeBtn.appendChild(execIcon);
    on(executeBtn, 'click', () => {
      const text = this.textarea.value.trim();
      if (text) this.ctx.onSubmit(text);
    });

    inputContainer.append(this.chipsEl, this.textarea);
    inputWrapper.append(inputContainer, clearIcon, toggleBtn);
    inner.append(inputWrapper, this.loadingEl, this.bannerEl);
    this.root.append(inner, executeBtn);

    this.cleanups.push(
      on(this.textarea, 'compositionstart', () => { this.composing = true; }),
      on(this.textarea, 'compositionend', () => { this.composing = false; }),
      on(this.textarea, 'keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !this.composing) {
          e.preventDefault();
          const text = this.textarea.value.trim();
          if (text) this.ctx.onSubmit(text);
        }
      }),
      on(this.textarea, 'input', () => this.resizeTextarea()),
    );
  }

  private resizeTextarea() {
    this.textarea.style.height = 'auto';
    const next = Math.min(
      AI_TEXTAREA_MAX_HEIGHT,
      Math.max(AI_TEXTAREA_MIN_HEIGHT, this.textarea.scrollHeight),
    );
    this.textarea.style.height = `${next}px`;
  }

  mount(parent: HTMLElement) {
    parent.appendChild(this.root);
    this.update();
    this.resizeTextarea();
  }

  update() {
    this.renderChips();
    this.renderBanner();
    this.loadingEl.style.display = this.ctx.isLoading() ? 'flex' : 'none';
    this.textarea.disabled = this.ctx.isLoading();
    this.resizeTextarea();
  }

  focus() {
    this.textarea.focus();
  }

  clearInput() {
    this.textarea.value = '';
  }

  destroy() {
    this.cleanups.forEach(fn => fn());
    this.root.remove();
  }

  private renderChips() {
    this.chipsEl.replaceChildren();
    const list = this.ctx.getFilterList();
    list.forEach((item, index) => {
      const chip = el('div', 'ai-filter-chip');
      const text = el('span', 'ai-filter-chip__text');
      text.textContent = item;
      const close = el('button', 'ai-filter-chip__close');
      close.type = 'button';
      close.textContent = '×';
      on(close, 'click', () => {
        this.ctx.setFilterList(list.filter((_, i) => i !== index));
      });
      chip.append(text, close);
      this.chipsEl.appendChild(chip);
    });
  }

  private renderBanner() {
    this.bannerEl.replaceChildren();
    const result = this.ctx.getResult();
    if (!result?.parseResult && !result?.queryString) return;

    const ok = result.parseResult !== 'FAILED';
    const box = el('div', `ai-parse-result-banner ${ok ? 'is-success' : 'is-failed'} show-border`);
    const title = el('div', ok ? 'ai-parse-success-label' : 'ai-parse-failed-label');
    title.textContent = `AI 解析: ${result.parseResult || 'SUCCESS'}`;
    const query = el('div', 'ai-parse-success-text');
    query.textContent = result.queryString || '';
    const explain = el('div', 'ai-parse-explain');
    explain.textContent = result.explain || '';
    box.append(title);
    if (result.queryString) box.appendChild(query);
    if (result.explain) box.appendChild(explain);
    this.bannerEl.appendChild(box);
  }
}
