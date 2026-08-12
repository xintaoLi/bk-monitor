import { sql } from '@codemirror/lang-sql';
import { Compartment, EditorSelection, EditorState, type EditorState as EditorStateType } from '@codemirror/state';
import { Decoration, EditorView, keymap } from '@codemirror/view';
import { minimalSetup } from 'codemirror';
import { INPUT_MAX_HEIGHT } from '../../config';

const notKeywordDecorator = Decoration.mark({
  class: 'cm-not-keyword',
});

function highlightNotKeywords() {
  return EditorView.decorations.of((view) => {
    const decorations: ReturnType<typeof notKeywordDecorator.range>[] = [];
    const text = view.state.doc.toString();
    const regex = /\bNOT\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      decorations.push(notKeywordDecorator.range(match.index, match.index + match[0].length));
    }
    return Decoration.set(decorations);
  });
}

export interface LuceneEditorApi {
  view: EditorView;
  setValue: (value: string, cursor?: number) => void;
  getValue: () => string;
  getCursor: () => number;
  hasSelection: () => boolean;
  setDisabled: (disabled: boolean) => void;
  focus: () => void;
  destroy: () => void;
}

export function createLuceneEditor(params: {
  target: HTMLElement;
  value?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onFocusChange?: (focused: boolean) => void;
  /** 对齐 Vue onFocusPosChange：光标/选区变化 */
  onFocusPosChange?: (info: { cursor: number; hasSelection: boolean; state: EditorStateType }) => void;
  onKeyEnter?: () => boolean;
  onCtrlEnter?: () => boolean;
  stopDefaultKeyboard?: () => boolean;
}): LuceneEditorApi {
  let isComposing = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const editableCompartment = new Compartment();

  const stopKeyboardList = ['ArrowUp', 'ArrowDown'].map(key => ({
    key,
    run: () => params.stopDefaultKeyboard?.() ?? false,
  }));

  const emitFocusPos = (state: EditorStateType) => {
    const main = state.selection.main;
    params.onFocusPosChange?.({
      cursor: main.head,
      hasSelection: main.to > main.from,
      state,
    });
  };

  const state = EditorState.create({
    doc: params.value ?? '',
    extensions: [
      keymap.of([
        {
          key: 'Enter',
          run: (view) => {
            if (isComposing || view.dom.getAttribute('data-composing') === 'true') return false;
            return params.onKeyEnter?.() ?? false;
          },
        },
        {
          key: 'Ctrl-Enter',
          mac: 'Cmd-Enter',
          run: (view) => {
            if (isComposing || view.dom.getAttribute('data-composing') === 'true') return false;
            return params.onCtrlEnter?.() ?? false;
          },
        },
        ...stopKeyboardList,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          emitFocusPos(update.state);
        }
        if (update.docChanged) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            params.onChange?.(update.state.doc.toString());
            emitFocusPos(update.state);
          }, 120);
        }
        if (update.focusChanged) {
          params.onFocusChange?.(update.view.hasFocus);
        }
      }),
      EditorView.domEventHandlers({
        compositionstart: (_e, view) => {
          isComposing = true;
          view.dom.setAttribute('data-composing', 'true');
        },
        compositionend: (_e, view) => {
          isComposing = false;
          view.dom.removeAttribute('data-composing');
        },
      }),
      EditorView.theme({
        '&': {
          width: '100%',
          maxHeight: `${INPUT_MAX_HEIGHT}px`,
          fontSize: '12px',
        },
        '.cm-content': {
          padding: '10px 0',
          fontFamily: 'Menlo, Monaco, Consolas, Courier, "PingFang SC", "Microsoft Yahei", monospace',
        },
        '.cm-scroller': {
          overflow: 'auto',
          maxHeight: `${INPUT_MAX_HEIGHT}px`,
          fontFamily: 'Menlo, Monaco, Consolas, Courier, "PingFang SC", "Microsoft Yahei", monospace',
        },
        '.cm-activeLine': { backgroundColor: 'transparent' },
        '.cm-not-keyword': { color: '#ea3636', fontWeight: '600', fontStyle: 'italic' },
      }),
      editableCompartment.of(EditorView.editable.of(!params.disabled)),
      minimalSetup,
      sql(),
      highlightNotKeywords(),
      EditorView.lineWrapping,
    ],
  });

  const view = new EditorView({
    state,
    parent: params.target,
  });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    getCursor: () => view.state.selection.main.head,
    hasSelection: () => {
      const main = view.state.selection.main;
      return main.to > main.from;
    },
    setDisabled: (disabled: boolean) => {
      view.dispatch({
        effects: editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
      });
    },
    setValue: (value: string, cursor?: number) => {
      const current = view.state.doc.toString();
      const next = value ?? '';
      const pos = Math.max(0, Math.min(cursor ?? next.length, next.length));
      if (current === next) {
        if (view.state.selection.main.head !== pos) {
          view.dispatch({ selection: EditorSelection.cursor(pos) });
        }
        return;
      }
      view.dispatch({
        changes: { from: 0, to: current.length, insert: next },
        selection: EditorSelection.cursor(pos),
      });
    },
    focus: () => view.focus(),
    destroy: () => {
      if (timer) clearTimeout(timer);
      view.destroy();
    },
  };
}
