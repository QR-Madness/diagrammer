/**
 * TiptapEditor component - Core rich text editor wrapper.
 *
 * Uses Tiptap (ProseMirror) for rich text editing with:
 * - Headings (H1, H2, H3)
 * - Bold, italic, inline code
 * - Bullet and numbered lists
 * - Horizontal rules
 */

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useRichTextStore } from '../store/richTextStore';
import './TiptapEditor.css';

/**
 * Configure Tiptap extensions for initial scope.
 */
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    // These are enabled by default, no need to set true
    // bulletList, orderedList, horizontalRule, bold, italic, code
    // Disabled for initial scope
    blockquote: false,
    codeBlock: false,
    strike: false,
  }),
  Placeholder.configure({
    placeholder: 'Start writing your document...',
  }),
];

export interface TiptapEditorProps {
  /** Optional class name */
  className?: string;
}

export function TiptapEditor({ className }: TiptapEditorProps) {
  const content = useRichTextStore((state) => state.content);
  const setContent = useRichTextStore((state) => state.setContent);

  const editor = useEditor({
    extensions,
    content: content.content,
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-prose',
      },
    },
  });

  // Update editor content when loaded from document
  useEffect(() => {
    if (editor && content.content) {
      // Only update if content is different to avoid cursor jump
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content.content);
      if (currentContent !== newContent) {
        editor.commands.setContent(content.content);
      }
    }
  }, [editor, content.content]);

  // Expose editor instance for toolbar
  useEffect(() => {
    if (editor) {
      // Store editor reference for toolbar access
      (window as unknown as { __tiptapEditor?: typeof editor }).__tiptapEditor = editor;
    }
    return () => {
      delete (window as unknown as { __tiptapEditor?: typeof editor }).__tiptapEditor;
    };
  }, [editor]);

  return (
    <div className={`tiptap-editor ${className ?? ''}`}>
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Get the current Tiptap editor instance.
 * Used by the toolbar to execute commands.
 */
export function getTiptapEditor() {
  return (window as unknown as { __tiptapEditor?: ReturnType<typeof useEditor> }).__tiptapEditor;
}
