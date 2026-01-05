/**
 * EmbeddedGroupExtension - Tiptap extension for embedding canvas groups in the rich text editor.
 *
 * This extension creates a custom node that can display a rendered preview of a canvas group.
 * The group is stored by ID and rendered as a PNG image on demand.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { EmbeddedGroupComponent } from '../ui/EmbeddedGroupComponent';

/**
 * Attributes stored on embedded group nodes.
 */
export interface EmbeddedGroupAttrs {
  /** The group ID referencing a GroupShape in documentStore */
  groupId: string;
  /** Optional display name for the group (for accessibility) */
  groupName?: string;
  /** Cached PNG data URL for rendering (updated when group changes) */
  cachedImageUrl?: string;
}

/**
 * EmbeddedGroup Tiptap extension.
 *
 * Usage in editor:
 * ```
 * editor.chain().focus().insertEmbeddedGroup({ groupId: 'some-group-id' }).run()
 * ```
 */
export const EmbeddedGroup = Node.create({
  name: 'embeddedGroup',

  group: 'block',

  atom: true, // Cannot contain other content

  draggable: true,

  addAttributes() {
    return {
      groupId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-group-id'),
        renderHTML: (attributes) => {
          if (!attributes['groupId']) {
            return {};
          }
          return { 'data-group-id': attributes['groupId'] };
        },
      },
      groupName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-group-name'),
        renderHTML: (attributes) => {
          if (!attributes['groupName']) {
            return {};
          }
          return { 'data-group-name': attributes['groupName'] };
        },
      },
      cachedImageUrl: {
        default: null,
        // Don't persist to HTML - this is runtime-only
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="embedded-group"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'embedded-group' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbeddedGroupComponent);
  },

  addCommands() {
    return {
      insertEmbeddedGroup:
        (attrs: { groupId: string; groupName?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});

/**
 * Extend Tiptap's Commands interface for TypeScript support.
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embeddedGroup: {
      /**
       * Insert an embedded group at the current cursor position.
       */
      insertEmbeddedGroup: (attrs: {
        groupId: string;
        groupName?: string;
      }) => ReturnType;
    };
  }
}