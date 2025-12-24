/**
 * DocumentEditorToolbar - Formatting toolbar for the rich text editor.
 *
 * Provides buttons for:
 * - Heading levels (H1, H2, H3, Paragraph)
 * - Bold, italic, inline code
 * - Bullet and numbered lists
 * - Horizontal rule
 * - Image upload
 */

import { useState, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { getTiptapEditor } from './TiptapEditor';
import { ImageUploadButton } from './ImageUploadButton';
import './DocumentEditorToolbar.css';

export function DocumentEditorToolbar() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [, forceUpdate] = useState({});

  // Get editor instance
  useEffect(() => {
    const checkEditor = () => {
      const ed = getTiptapEditor();
      if (ed) {
        setEditor(ed);
        // Subscribe to selection/transaction updates
        ed.on('selectionUpdate', () => forceUpdate({}));
        ed.on('transaction', () => forceUpdate({}));
      }
    };

    // Check immediately and poll briefly for editor init
    checkEditor();
    const interval = setInterval(checkEditor, 100);
    setTimeout(() => clearInterval(interval), 2000);

    return () => clearInterval(interval);
  }, []);

  // Toolbar button handlers
  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleCode = useCallback(() => {
    editor?.chain().focus().toggleCode().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const insertHorizontalRule = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run();
  }, [editor]);

  const setHeading = useCallback(
    (level: 1 | 2 | 3) => {
      editor?.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  const setParagraph = useCallback(() => {
    editor?.chain().focus().setParagraph().run();
  }, [editor]);

  // Check active states
  const isActive = (type: string, attrs?: Record<string, unknown>) => {
    return editor?.isActive(type, attrs) ?? false;
  };

  return (
    <div className="document-editor-toolbar">
      {/* Text type dropdown */}
      <div className="document-editor-toolbar-group">
        <select
          className="document-editor-toolbar-select"
          value={
            isActive('heading', { level: 1 })
              ? 'h1'
              : isActive('heading', { level: 2 })
                ? 'h2'
                : isActive('heading', { level: 3 })
                  ? 'h3'
                  : 'p'
          }
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'h1') setHeading(1);
            else if (value === 'h2') setHeading(2);
            else if (value === 'h3') setHeading(3);
            else setParagraph();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Text formatting */}
      <div className="document-editor-toolbar-group">
        <button
          className={`document-editor-toolbar-btn ${isActive('bold') ? 'active' : ''}`}
          onClick={toggleBold}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          className={`document-editor-toolbar-btn ${isActive('italic') ? 'active' : ''}`}
          onClick={toggleItalic}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          className={`document-editor-toolbar-btn ${isActive('code') ? 'active' : ''}`}
          onClick={toggleCode}
          title="Inline Code (Ctrl+E)"
        >
          <code>&lt;/&gt;</code>
        </button>
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Lists */}
      <div className="document-editor-toolbar-group">
        <button
          className={`document-editor-toolbar-btn ${isActive('bulletList') ? 'active' : ''}`}
          onClick={toggleBulletList}
          title="Bullet List"
        >
          <span className="toolbar-icon">•≡</span>
        </button>
        <button
          className={`document-editor-toolbar-btn ${isActive('orderedList') ? 'active' : ''}`}
          onClick={toggleOrderedList}
          title="Numbered List"
        >
          <span className="toolbar-icon">1.</span>
        </button>
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Horizontal rule */}
      <div className="document-editor-toolbar-group">
        <button
          className="document-editor-toolbar-btn"
          onClick={insertHorizontalRule}
          title="Horizontal Rule"
        >
          <span className="toolbar-icon">—</span>
        </button>
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Image upload */}
      <div className="document-editor-toolbar-group">
        <ImageUploadButton className="document-editor-toolbar-btn" />
      </div>
    </div>
  );
}
