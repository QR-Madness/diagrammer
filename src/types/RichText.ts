/**
 * Rich text document types for the document editor.
 *
 * Uses Tiptap's JSON format for serialization.
 */

import type { JSONContent } from '@tiptap/core';

/**
 * Rich text document content stored with each DiagramDocument.
 */
export interface RichTextContent {
  /** Tiptap JSON content structure */
  content: JSONContent;
  /** Schema version for migration support */
  version: number;
}

/**
 * Current rich text schema version.
 */
export const RICH_TEXT_VERSION = 1;

/**
 * Create default empty rich text content.
 */
export function createEmptyRichTextContent(): RichTextContent {
  return {
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    version: RICH_TEXT_VERSION,
  };
}

/**
 * Check if rich text content is empty.
 */
export function isRichTextEmpty(content: RichTextContent): boolean {
  if (!content.content.content || content.content.content.length === 0) {
    return true;
  }

  // Check if it's just an empty paragraph
  if (content.content.content.length === 1) {
    const firstBlock = content.content.content[0];
    if (firstBlock && firstBlock.type === 'paragraph') {
      if (!firstBlock.content || firstBlock.content.length === 0) {
        return true;
      }
    }
  }

  return false;
}
