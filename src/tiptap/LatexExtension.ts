/**
 * LaTeX/Math extension for Tiptap.
 *
 * Supports both inline and block math equations using KaTeX.
 * - Inline: $equation$ or wrap selection
 * - Block: $$equation$$ on its own line
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import katex from 'katex';

export interface MathOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      setMathInline: (latex: string) => ReturnType;
      setMathBlock: (latex: string) => ReturnType;
    };
  }
}

/**
 * Render LaTeX to HTML using KaTeX.
 */
function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      trust: false,
      strict: false,
    });
  } catch {
    return `<span class="math-error">Invalid equation</span>`;
  }
}

/**
 * Inline math node ($...$)
 */
export const MathInline = Node.create<MathOptions>({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-math-inline]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const latex = node.attrs['latex'] as string;

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-math-inline': '',
        'data-latex': latex,
        class: 'math-inline',
        contenteditable: 'false',
      }),
      ['span', { class: 'math-rendered' }],
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('span');
      Object.entries(
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-math-inline': '',
          'data-latex': node.attrs['latex'],
          class: 'math-inline',
          contenteditable: 'false',
        })
      ).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          dom.setAttribute(key, String(value));
        }
      });

      dom.innerHTML = renderLatex(node.attrs['latex'] as string, false);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          dom.innerHTML = renderLatex(updatedNode.attrs['latex'] as string, false);
          dom.setAttribute('data-latex', updatedNode.attrs['latex'] as string);
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setMathInline:
        (latex: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [MathInputRules];
  },
});

/**
 * Block math node ($$...$$)
 */
export const MathBlock = Node.create<MathOptions>({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-math-block]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const latex = node.attrs['latex'] as string;

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-math-block': '',
        'data-latex': latex,
        class: 'math-block',
        contenteditable: 'false',
      }),
      ['div', { class: 'math-rendered' }],
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('div');
      Object.entries(
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-math-block': '',
          'data-latex': node.attrs['latex'],
          class: 'math-block',
          contenteditable: 'false',
        })
      ).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          dom.setAttribute(key, String(value));
        }
      });

      dom.innerHTML = renderLatex(node.attrs['latex'] as string, true);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          dom.innerHTML = renderLatex(updatedNode.attrs['latex'] as string, true);
          dom.setAttribute('data-latex', updatedNode.attrs['latex'] as string);
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setMathBlock:
        (latex: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    };
  },
});

/**
 * Input rule plugin to convert $...$ and $$...$$ to math nodes.
 */
export const MathInputRules = new Plugin({
  key: new PluginKey('mathInputRules'),
  props: {
    handleTextInput(view, from, to, text) {
      // Only trigger on $ input
      if (text !== '$') return false;

      const { state } = view;
      const $from = state.doc.resolve(from);
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

      // Check for block math: $$...$
      const blockMatch = textBefore.match(/\$\$([^$]+)$/);
      if (blockMatch) {
        const latex = blockMatch[1] ?? '';
        const start = from - latex.length - 2; // Account for $$

        view.dispatch(
          state.tr
            .delete(start, to)
            .insert(
              start,
              state.schema.nodes['mathBlock']!.create({ latex })
            )
        );
        return true;
      }

      // Check for inline math: $...$
      const inlineMatch = textBefore.match(/\$([^$]+)$/);
      if (inlineMatch) {
        const latex = inlineMatch[1] ?? '';
        const start = from - latex.length - 1; // Account for $

        view.dispatch(
          state.tr
            .delete(start, to)
            .insert(
              start,
              state.schema.nodes['mathInline']!.create({ latex })
            )
        );
        return true;
      }

      return false;
    },
  },
});
