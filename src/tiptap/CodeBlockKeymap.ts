import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

const INDENT = '  ';

export const CodeBlockKeymap = Extension.create({
  name: 'codeBlockKeymap',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { state } = this.editor;
        const { $from, from, to, empty } = state.selection;
        if ($from.parent.type.name !== 'codeBlock') return false;

        if (empty) {
          this.editor
            .chain()
            .insertContentAt(from, INDENT)
            .run();
          return true;
        }

        // Multi-line block selection: indent each line in range
        return this.editor
          .chain()
          .command(({ tr, dispatch }) => {
            const text = state.doc.textBetween(from, to, '\n');
            const indented = text
              .split('\n')
              .map((line) => INDENT + line)
              .join('\n');
            if (dispatch) {
              tr.replaceWith(from, to, state.schema.text(indented));
              tr.setSelection(TextSelection.create(tr.doc, from, from + indented.length));
            }
            return true;
          })
          .run();
      },

      'Shift-Tab': () => {
        const { state } = this.editor;
        const { $from, from, to, empty } = state.selection;
        if ($from.parent.type.name !== 'codeBlock') return false;

        if (empty) {
          // Dedent the current line — find line start within the code block
          const blockStart = $from.start();
          const offsetInBlock = from - blockStart;
          const blockText = $from.parent.textContent;
          const lineStartOffset = blockText.lastIndexOf('\n', Math.max(0, offsetInBlock - 1)) + 1;
          const lineStartPos = blockStart + lineStartOffset;
          const lineEndOffset = blockText.indexOf('\n', lineStartOffset);
          const lineEnd = lineEndOffset === -1 ? blockStart + blockText.length : blockStart + lineEndOffset;
          const line = blockText.slice(lineStartOffset, lineEndOffset === -1 ? blockText.length : lineEndOffset);
          const stripped = line.replace(/^( {1,2}|\t)/, '');
          const removed = line.length - stripped.length;
          if (removed === 0) return true;

          return this.editor
            .chain()
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                tr.replaceWith(lineStartPos, lineEnd, stripped ? state.schema.text(stripped) : []);
                const newCursor = Math.max(lineStartPos, from - removed);
                tr.setSelection(TextSelection.create(tr.doc, newCursor));
              }
              return true;
            })
            .run();
        }

        // Multi-line range: dedent each line
        return this.editor
          .chain()
          .command(({ tr, dispatch }) => {
            const text = state.doc.textBetween(from, to, '\n');
            const dedented = text
              .split('\n')
              .map((line) => line.replace(/^( {1,2}|\t)/, ''))
              .join('\n');
            if (dispatch) {
              tr.replaceWith(from, to, state.schema.text(dedented));
              tr.setSelection(TextSelection.create(tr.doc, from, from + dedented.length));
            }
            return true;
          })
          .run();
      },
    };
  },
});
