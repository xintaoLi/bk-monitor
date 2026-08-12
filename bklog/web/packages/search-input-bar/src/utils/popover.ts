import tippy, { type Instance, type Props } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

export interface TippyPopoverOptions {
  content: HTMLElement | string;
  placement?: Props['placement'];
  theme?: string;
  arrow?: boolean;
  maxWidth?: number | 'none';
  offset?: [number, number];
  hideOnClick?: boolean | 'toggle';
  appendTo?: HTMLElement | (() => Element) | 'parent';
  delay?: number | [number, number];
  interactive?: boolean;
  zIndex?: number;
  /** When true (default), recreate tippy on each show(anchor) like PopInstanceUtil */
  newInstance?: boolean;
  /**
   * 额外 popper modifiers（追加到默认 preventOverflow / flip 之后）。
   * 用于语句模式弹出层相对锚点左右贴齐等场景。
   */
  popperModifiers?: NonNullable<NonNullable<Props['popperOptions']>['modifiers']>;
  /** 关闭默认 preventOverflow（水平贴齐容器时避免被顶开） */
  disablePreventOverflow?: boolean;
  onShow?: (instance: Instance) => boolean | void;
  onHide?: (instance: Instance) => boolean | void;
  onHidden?: (instance: Instance) => void;
  onClickOutside?: (instance: Instance, event: Event) => void;
}

export interface TippyPopoverInstance {
  show: (anchor?: HTMLElement) => void;
  hide: (delay?: number) => void;
  cancelHide: () => void;
  reposition: () => void;
  setContent: (content: HTMLElement | string) => void;
  setProps: (props: Partial<Props>) => void;
  isShown: () => boolean;
  destroy: () => void;
  getInstance: () => Instance | null;
  content: HTMLElement;
}

/**
 * Tippy.js wrapper aligned with PopInstanceUtil defaults (log-light / manual).
 */
export function createTippyPopover(
  defaultAnchor: HTMLElement,
  options: TippyPopoverOptions,
): TippyPopoverInstance {
  const contentEl = typeof options.content === 'string'
    ? (() => {
        const d = document.createElement('div');
        d.innerHTML = options.content;
        return d;
      })()
    : options.content;

  let currentAnchor = defaultAnchor;
  let instance: Instance | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let extraProps: Partial<Props> = {};
  const newInstance = options.newInstance !== false;

  const buildProps = (): Partial<Props> => ({
    content: contentEl,
    trigger: 'manual',
    theme: options.theme ?? 'log-light',
    placement: options.placement ?? 'bottom-start',
    interactive: options.interactive ?? true,
    arrow: options.arrow ?? true,
    maxWidth: options.maxWidth ?? 800,
    offset: options.offset ?? [0, 8],
    hideOnClick: options.hideOnClick ?? true,
    delay: options.delay ?? [0, 0],
    zIndex: options.zIndex ?? 99999,
    appendTo: options.appendTo === 'parent'
      ? 'parent'
      : (options.appendTo as HTMLElement) || (() => document.body),
    popperOptions: {
      strategy: 'fixed',
      modifiers: [
        ...(options.disablePreventOverflow
          ? []
          : [{
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 8,
                altAxis: true,
              },
            }]),
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['bottom-start', 'top-start', 'bottom', 'top'],
            padding: 8,
          },
        },
        ...(options.popperModifiers ?? []),
      ],
    },
    onShow: (inst) => {
      if (options.onShow && options.onShow(inst) === false) return false;
    },
    onHide: (inst) => {
      if (options.onHide && options.onHide(inst) === false) return false;
    },
    onHidden: (inst) => {
      options.onHidden?.(inst);
    },
    onClickOutside: (inst, event) => {
      options.onClickOutside?.(inst, event);
    },
    ...extraProps,
  });

  const ensureInstance = (anchor: HTMLElement) => {
    if (instance && (!newInstance || anchor === currentAnchor)) {
      if (extraProps && Object.keys(extraProps).length) {
        instance.setProps(extraProps);
      }
      return instance;
    }
    if (instance) {
      instance.destroy();
      instance = null;
    }
    currentAnchor = anchor;
    instance = tippy(anchor, buildProps());
    return instance;
  };

  // warm-up default instance
  ensureInstance(defaultAnchor);

  return {
    content: contentEl,
    show(anchor) {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      const target = anchor || currentAnchor;
      const inst = ensureInstance(target);
      if (inst.state.isVisible) {
        inst.popperInstance?.update();
        return;
      }
      inst.show();
    },
    hide(delay = 0) {
      if (hideTimer) clearTimeout(hideTimer);
      if (delay > 0) {
        hideTimer = setTimeout(() => instance?.hide(), delay);
        return;
      }
      instance?.hide();
    },
    cancelHide() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    },
    reposition() {
      if (instance?.state.isVisible) instance.popperInstance?.update();
    },
    setContent(content) {
      instance?.setContent(content);
    },
    setProps(props) {
      extraProps = { ...extraProps, ...props };
      instance?.setProps(props);
    },
    isShown: () => instance?.state.isVisible ?? false,
    destroy() {
      if (hideTimer) clearTimeout(hideTimer);
      instance?.destroy();
      instance = null;
    },
    getInstance: () => instance,
  };
}

/** Compatibility helper for settings / legacy callers */
export function createPopover(options?: { className?: string; placement?: 'bottom-start' | 'bottom-end' }) {
  const content = document.createElement('div');
  if (options?.className) content.className = options.className;
  const anchor = document.createElement('div');
  anchor.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none;';
  document.body.appendChild(anchor);
  const tip = createTippyPopover(anchor, {
    content,
    placement: options?.placement ?? 'bottom-start',
    arrow: false,
    newInstance: true,
  });
  return {
    content,
    show: (el: HTMLElement) => tip.show(el),
    hide: () => tip.hide(),
    isOpen: () => tip.isShown(),
    destroy: () => {
      tip.destroy();
      anchor.remove();
    },
  };
}
