/**
 * DocumentEditorPanel - Container panel for the rich text editor.
 *
 * Contains:
 * - Header with title and collapse button
 * - Tab bar for multi-page support
 * - Formatting toolbar
 * - Tiptap editor
 */

import { useEffect, useRef } from 'react';
import { DocumentEditorToolbar } from './DocumentEditorToolbar';
import { TiptapEditor, getTiptapEditor } from './TiptapEditor';
import { RichTextTabBar } from './RichTextTabBar';
import { useRichTextPagesStore, initializeRichTextPages } from '../store/richTextPagesStore';
import './DocumentEditorPanel.css';

export interface DocumentEditorPanelProps {
  /** Optional callback when collapse button is clicked */
  onCollapse?: () => void;
}

export function DocumentEditorPanel({ onCollapse }: DocumentEditorPanelProps) {
  const { activePageId, pages, updatePageContent } = useRichTextPagesStore();
  const lastActivePageRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Initialize pages on mount
  useEffect(() => {
    initializeRichTextPages();
  }, []);

  // Handle page switching - save current content and load new page content
  useEffect(() => {
    const editor = getTiptapEditor();
    if (!editor || !activePageId) return;

    // If this is the first load or same page, skip
    if (lastActivePageRef.current === activePageId) return;

    // Save current page content before switching
    if (lastActivePageRef.current && !isLoadingRef.current) {
      const currentContent = editor.getHTML();
      updatePageContent(lastActivePageRef.current, currentContent);
    }

    // Load new page content
    isLoadingRef.current = true;
    const newPage = pages[activePageId];
    if (newPage) {
      // Use setTimeout to ensure editor is ready
      setTimeout(() => {
        const ed = getTiptapEditor();
        if (ed) {
          ed.commands.setContent(newPage.content || '<p></p>');
        }
        isLoadingRef.current = false;
      }, 0);
    }

    lastActivePageRef.current = activePageId;
  }, [activePageId, pages, updatePageContent]);

  // Auto-save current page content periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const editor = getTiptapEditor();
      const pageId = useRichTextPagesStore.getState().activePageId;
      if (editor && pageId && !isLoadingRef.current) {
        const content = editor.getHTML();
        updatePageContent(pageId, content);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [updatePageContent]);

  // Save on unmount
  useEffect(() => {
    return () => {
      const editor = getTiptapEditor();
      const pageId = useRichTextPagesStore.getState().activePageId;
      if (editor && pageId) {
        const content = editor.getHTML();
        updatePageContent(pageId, content);
      }
    };
  }, [updatePageContent]);

  return (
    <div className="document-editor-panel">
      <div className="document-editor-panel-header">
        <span className="document-editor-panel-title">Document</span>
        {onCollapse && (
          <button
            className="document-editor-panel-collapse"
            onClick={onCollapse}
            title="Hide document editor"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
            </svg>
          </button>
        )}
      </div>
      <RichTextTabBar />
      <DocumentEditorToolbar />
      <div className="document-editor-panel-content">
        <TiptapEditor />
      </div>
    </div>
  );
}
