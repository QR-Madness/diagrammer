/**
 * DocumentEditorToolbar - Formatting toolbar for the rich text editor.
 *
 * Provides buttons for:
 * - Heading levels (H1-H6, Paragraph)
 * - Text formatting (bold, italic, underline, strikethrough, code)
 * - Text color and highlight
 * - Subscript and superscript
 * - Lists (bullet, numbered, task)
 * - Tables with style controls
 * - LaTeX equations
 * - Search and replace
 * - Image upload
 */

import { useState, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { getTiptapEditor } from './TiptapEditor';
import { ImageUploadButton } from './ImageUploadButton';
import { SearchReplacePanel } from './SearchReplacePanel';
import { ToolbarDropdown } from './ToolbarDropdown';
import './DocumentEditorToolbar.css';

/** Color palette for text and highlight colors */
const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
];

const HIGHLIGHT_PALETTE = [
  '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff',
  '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

export function DocumentEditorToolbar() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [, forceUpdate] = useState({});
  
  // Modal states
  const [showMathInput, setShowMathInput] = useState(false);
  const [mathInput, setMathInput] = useState('');
  const [mathIsBlock, setMathIsBlock] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'highlight' | null>(null);
  const [showTableStyles, setShowTableStyles] = useState(false);
  const [showSearchReplace, setShowSearchReplace] = useState(false);

  // Get editor instance
  useEffect(() => {
    const checkEditor = () => {
      const ed = getTiptapEditor();
      if (ed) {
        setEditor(ed);
        ed.on('selectionUpdate', () => forceUpdate({}));
        ed.on('transaction', () => forceUpdate({}));
      }
    };

    checkEditor();
    const interval = setInterval(checkEditor, 100);
    setTimeout(() => clearInterval(interval), 2000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchReplace(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowSearchReplace(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Basic formatting handlers
  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
  const toggleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const toggleCode = useCallback(() => editor?.chain().focus().toggleCode().run(), [editor]);
  const toggleSubscript = useCallback(() => editor?.chain().focus().toggleSubscript().run(), [editor]);
  const toggleSuperscript = useCallback(() => editor?.chain().focus().toggleSuperscript().run(), [editor]);
  
  // List handlers
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const toggleTaskList = useCallback(() => editor?.chain().focus().toggleTaskList().run(), [editor]);
  
  const insertHorizontalRule = useCallback(() => editor?.chain().focus().setHorizontalRule().run(), [editor]);

  // Heading handlers
  const setHeading = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  }, [editor]);
  const setParagraph = useCallback(() => editor?.chain().focus().setParagraph().run(), [editor]);

  // Color handlers
  const setTextColor = useCallback((color: string) => {
    editor?.chain().focus().setColor(color).run();
    setShowColorPicker(null);
  }, [editor]);

  const setHighlight = useCallback((color: string) => {
    editor?.chain().focus().setHighlight({ color }).run();
    setShowColorPicker(null);
  }, [editor]);

  const clearFormatting = useCallback(() => {
    editor?.chain().focus().unsetAllMarks().run();
  }, [editor]);

  // Table handlers
  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);
  const addColumnAfter = useCallback(() => editor?.chain().focus().addColumnAfter().run(), [editor]);
  const addRowAfter = useCallback(() => editor?.chain().focus().addRowAfter().run(), [editor]);
  const deleteColumn = useCallback(() => editor?.chain().focus().deleteColumn().run(), [editor]);
  const deleteRow = useCallback(() => editor?.chain().focus().deleteRow().run(), [editor]);
  const deleteTable = useCallback(() => editor?.chain().focus().deleteTable().run(), [editor]);
  const toggleHeaderRow = useCallback(() => editor?.chain().focus().toggleHeaderRow().run(), [editor]);
  const toggleHeaderColumn = useCallback(() => editor?.chain().focus().toggleHeaderColumn().run(), [editor]);
  const mergeCells = useCallback(() => editor?.chain().focus().mergeCells().run(), [editor]);
  const splitCell = useCallback(() => editor?.chain().focus().splitCell().run(), [editor]);

  // Math handlers
  const openMathInput = useCallback((isBlock: boolean) => {
    setMathIsBlock(isBlock);
    setMathInput('');
    setShowMathInput(true);
  }, []);

  const insertMath = useCallback(() => {
    if (!mathInput.trim()) return;
    if (mathIsBlock) {
      editor?.chain().focus().setMathBlock(mathInput).run();
    } else {
      editor?.chain().focus().setMathInline(mathInput).run();
    }
    setShowMathInput(false);
    setMathInput('');
  }, [editor, mathInput, mathIsBlock]);

  // Check active states
  const isActive = (type: string, attrs?: Record<string, unknown>) => {
    return editor?.isActive(type, attrs) ?? false;
  };

  const isInTable = editor?.isActive('table') ?? false;

  return (
    <div className="document-editor-toolbar">
      {/* Text type dropdown */}
      <div className="document-editor-toolbar-group">
        <select
          className="document-editor-toolbar-select"
          value={
            isActive('heading', { level: 1 }) ? 'h1' :
            isActive('heading', { level: 2 }) ? 'h2' :
            isActive('heading', { level: 3 }) ? 'h3' :
            isActive('heading', { level: 4 }) ? 'h4' :
            isActive('heading', { level: 5 }) ? 'h5' :
            isActive('heading', { level: 6 }) ? 'h6' : 'p'
          }
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'h1') setHeading(1);
            else if (value === 'h2') setHeading(2);
            else if (value === 'h3') setHeading(3);
            else if (value === 'h4') setHeading(4);
            else if (value === 'h5') setHeading(5);
            else if (value === 'h6') setHeading(6);
            else setParagraph();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
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
          className={`document-editor-toolbar-btn ${isActive('underline') ? 'active' : ''}`}
          onClick={toggleUnderline}
          title="Underline (Ctrl+U)"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <button
          className={`document-editor-toolbar-btn ${isActive('strike') ? 'active' : ''}`}
          onClick={toggleStrike}
          title="Strikethrough"
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </button>
        <button
          className={`document-editor-toolbar-btn ${isActive('code') ? 'active' : ''}`}
          onClick={toggleCode}
          title="Inline Code"
        >
          <code>&lt;/&gt;</code>
        </button>
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Subscript/Superscript */}
      <div className="document-editor-toolbar-group">
        <button
          className={`document-editor-toolbar-btn ${isActive('subscript') ? 'active' : ''}`}
          onClick={toggleSubscript}
          title="Subscript"
        >
          <span>X<sub>2</sub></span>
        </button>
        <button
          className={`document-editor-toolbar-btn ${isActive('superscript') ? 'active' : ''}`}
          onClick={toggleSuperscript}
          title="Superscript"
        >
          <span>X<sup>2</sup></span>
        </button>
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Color controls */}
      <div className="document-editor-toolbar-group">
        <ToolbarDropdown
          trigger={<span className="color-btn-icon">A<span className="color-underline" style={{ background: 'var(--text-primary)' }} /></span>}
          isOpen={showColorPicker === 'text'}
          onToggle={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')}
          onClose={() => setShowColorPicker(null)}
          triggerClassName="document-editor-toolbar-btn"
          title="Text Color"
        >
          <div className="color-picker-grid">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                className="color-picker-swatch"
                style={{ backgroundColor: color }}
                onClick={() => setTextColor(color)}
                title={color}
              />
            ))}
          </div>
        </ToolbarDropdown>
        
        <ToolbarDropdown
          trigger={<span className="highlight-btn-icon">🖍</span>}
          isOpen={showColorPicker === 'highlight'}
          onToggle={() => setShowColorPicker(showColorPicker === 'highlight' ? null : 'highlight')}
          onClose={() => setShowColorPicker(null)}
          triggerClassName="document-editor-toolbar-btn"
          title="Highlight"
        >
          <div className="color-picker-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {HIGHLIGHT_PALETTE.map((color) => (
              <button
                key={color}
                className="color-picker-swatch"
                style={{ backgroundColor: color }}
                onClick={() => setHighlight(color)}
                title={color}
              />
            ))}
          </div>
          <button
            className="color-picker-clear"
            onClick={() => {
              editor?.chain().focus().unsetHighlight().run();
              setShowColorPicker(null);
            }}
          >
            Remove Highlight
          </button>
        </ToolbarDropdown>
        
        <button
          className="document-editor-toolbar-btn"
          onClick={clearFormatting}
          title="Clear Formatting"
        >
          <span className="toolbar-icon">⌫</span>
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
        <button
          className={`document-editor-toolbar-btn ${isActive('taskList') ? 'active' : ''}`}
          onClick={toggleTaskList}
          title="Task List"
        >
          <span className="toolbar-icon">☑</span>
        </button>
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Table controls */}
      <div className="document-editor-toolbar-group">
        <button
          className="document-editor-toolbar-btn"
          onClick={insertTable}
          title="Insert Table"
        >
          <span className="toolbar-icon">⊞</span>
        </button>
        {isInTable && (
          <>
            <ToolbarDropdown
              trigger={<span className="toolbar-icon">⚙</span>}
              isOpen={showTableStyles}
              onToggle={() => setShowTableStyles(!showTableStyles)}
              onClose={() => setShowTableStyles(false)}
              triggerClassName="document-editor-toolbar-btn"
              title="Table Options"
            >
              <div className="table-styles-menu">
                <button onClick={() => { toggleHeaderRow(); setShowTableStyles(false); }}>Toggle Header Row</button>
                <button onClick={() => { toggleHeaderColumn(); setShowTableStyles(false); }}>Toggle Header Column</button>
                <button onClick={() => { mergeCells(); setShowTableStyles(false); }}>Merge Cells</button>
                <button onClick={() => { splitCell(); setShowTableStyles(false); }}>Split Cell</button>
              </div>
            </ToolbarDropdown>
            <button className="document-editor-toolbar-btn" onClick={addColumnAfter} title="Add Column">
              <span className="toolbar-icon">+⇥</span>
            </button>
            <button className="document-editor-toolbar-btn" onClick={addRowAfter} title="Add Row">
              <span className="toolbar-icon">+↓</span>
            </button>
            <button className="document-editor-toolbar-btn" onClick={deleteColumn} title="Delete Column">
              <span className="toolbar-icon">-⇥</span>
            </button>
            <button className="document-editor-toolbar-btn" onClick={deleteRow} title="Delete Row">
              <span className="toolbar-icon">-↓</span>
            </button>
            <button className="document-editor-toolbar-btn" onClick={deleteTable} title="Delete Table">
              <span className="toolbar-icon">⊟</span>
            </button>
          </>
        )}
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Math/LaTeX */}
      <div className="document-editor-toolbar-group">
        <button
          className="document-editor-toolbar-btn"
          onClick={() => openMathInput(false)}
          title="Insert Inline Equation ($...$)"
        >
          <span className="toolbar-icon">∑</span>
        </button>
        <button
          className="document-editor-toolbar-btn"
          onClick={() => openMathInput(true)}
          title="Insert Block Equation ($$...$$)"
        >
          <span className="toolbar-icon">∫</span>
        </button>
      </div>

      <div className="document-editor-toolbar-divider" />

      {/* Search */}
      <div className="document-editor-toolbar-group">
        <button
          className={`document-editor-toolbar-btn ${showSearchReplace ? 'active' : ''}`}
          onClick={() => setShowSearchReplace(!showSearchReplace)}
          title="Search & Replace (Ctrl+F)"
        >
          <span className="toolbar-icon">🔍</span>
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

      {/* Math input modal */}
      {showMathInput && (
        <div className="math-input-modal" onClick={() => setShowMathInput(false)}>
          <div className="math-input-content" onClick={(e) => e.stopPropagation()}>
            <label>
              {mathIsBlock ? 'Block Equation (LaTeX):' : 'Inline Equation (LaTeX):'}
            </label>
            {mathIsBlock ? (
              <textarea
                value={mathInput}
                onChange={(e) => setMathInput(e.target.value)}
                placeholder={'\\int_0^\\infty e^{-x} dx\n\n\\frac{d}{dx} \\sin(x) = \\cos(x)'}
                autoFocus
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    insertMath();
                  } else if (e.key === 'Escape') {
                    setShowMathInput(false);
                  }
                }}
              />
            ) : (
              <input
                type="text"
                value={mathInput}
                onChange={(e) => setMathInput(e.target.value)}
                placeholder="x^2 + y^2 = z^2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    insertMath();
                  } else if (e.key === 'Escape') {
                    setShowMathInput(false);
                  }
                }}
              />
            )}
            <div className="math-input-hint">
              {mathIsBlock ? 'Press Ctrl+Enter to insert, Escape to cancel' : 'Press Enter to insert, Escape to cancel'}
            </div>
            <div className="math-input-actions">
              <button onClick={() => setShowMathInput(false)}>Cancel</button>
              <button onClick={insertMath} className="primary">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Replace Panel */}
      {showSearchReplace && editor && (
        <SearchReplacePanel
          editor={editor}
          onClose={() => setShowSearchReplace(false)}
        />
      )}
    </div>
  );
}
