/**
 * DocumentEditorPanel - Container panel for the rich text editor.
 *
 * Contains:
 * - Header with title and collapse button
 * - Tab bar for multi-page support
 * - Formatting toolbar
 * - Tiptap editor
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { DocumentEditorToolbar } from './DocumentEditorToolbar';
import { TiptapEditor } from './TiptapEditor';
import { TiptapEditorProvider } from './TiptapEditorContext';
import { RichTextTabBar } from './RichTextTabBar';
import { useRichTextPagesStore, initializeRichTextPages } from '../store/richTextPagesStore';
import { useRichTextStore } from '../store/richTextStore';
import { useSessionStore } from '../store/sessionStore';
import { RICH_TEXT_VERSION } from '../types/RichText';
import './DocumentEditorPanel.css';

export interface DocumentEditorPanelProps {
  /** Optional callback when collapse button is clicked */
  onCollapse?: () => void;
  /** Whether the editor is in full-screen mode */
  isFullscreen?: boolean;
  /** Toggle full-screen mode */
  onToggleFullscreen?: () => void;
}

export function DocumentEditorPanel({ onCollapse, isFullscreen, onToggleFullscreen }: DocumentEditorPanelProps) {
  const { activePageId, updatePageContent } = useRichTextPagesStore();
  const lastActivePageRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const pendingLoadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const editorRef = useRef<Editor | null>(null);

  // The actual scroll container is `.tiptap-editor` (overflow-y: auto), which is
  // the parent of the ProseMirror DOM node. The wrapper `.document-editor-panel-content`
  // is `overflow: hidden`, so reading scrollTop on it always gives 0.
  const getScrollEl = useCallback((): HTMLElement | null => {
    return (editorRef.current?.view.dom.parentElement as HTMLElement | null) ?? null;
  }, []);

  // Keep ref in sync for use in effects/callbacks that shouldn't re-trigger
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Initialize pages on mount
  useEffect(() => {
    initializeRichTextPages();
  }, []);

  // Handle editor ready callback from TiptapEditor
  const handleEditorReady = useCallback((ed: Editor | null) => {
    setEditor(ed);
    // Also keep window global for PDFExportDialog (non-component context)
    if (ed) {
      (window as unknown as { __tiptapEditor?: Editor }).__tiptapEditor = ed;
    } else {
      delete (window as unknown as { __tiptapEditor?: Editor }).__tiptapEditor;
    }
  }, []);

  // Handle page switching - save current content and load new page content
  useEffect(() => {
    if (!editor || !activePageId) return;

    // Same page — nothing to do
    if (lastActivePageRef.current === activePageId) return;

    // Cancel any in-flight load from a previous (now-superseded) switch
    if (pendingLoadRef.current !== null) {
      clearTimeout(pendingLoadRef.current);
      pendingLoadRef.current = null;
    }

    // Save the page we are leaving (skip if we were already mid-load)
    if (lastActivePageRef.current && !isLoadingRef.current) {
      const currentContent = editor.getHTML();
      updatePageContent(lastActivePageRef.current, currentContent);
      const el = getScrollEl();
      if (el) {
        useSessionStore.getState().saveEditorScroll(lastActivePageRef.current, el.scrollTop);
      }
    }

    const targetPageId = activePageId;
    isLoadingRef.current = true;
    lastActivePageRef.current = targetPageId;

    pendingLoadRef.current = setTimeout(() => {
      pendingLoadRef.current = null;

      // Read the freshest page content from the store, not from a stale closure
      const freshPage = useRichTextPagesStore.getState().pages[targetPageId];
      if (editorRef.current) {
        editorRef.current.commands.setContent(freshPage?.content ?? '<p></p>');
        // Keep richTextStore in sync so TiptapEditor's content-watcher
        // never sees a mismatch and overwrites the freshly-loaded page.
        useRichTextStore.getState().loadContent({
          content: editorRef.current.getJSON(),
          version: RICH_TEXT_VERSION,
        });
        // Restore scroll position after layout settles. Tiptap reports `scrollHeight`
        // in stages while it paints, so we retry until the target is reachable —
        // and abort the moment the user scrolls (so we don't fight live input).
        const savedScroll = useSessionStore.getState().getEditorScroll(targetPageId) ?? 0;
        const restoreEl = getScrollEl();
        if (restoreEl) {
          let attempts = 0;
          let cancelled = false;
          const cancel = () => { cancelled = true; };
          restoreEl.addEventListener('wheel', cancel, { once: true, passive: true });
          restoreEl.addEventListener('touchmove', cancel, { once: true, passive: true });
          restoreEl.addEventListener('keydown', cancel, { once: true });
          const tryRestore = () => {
            if (cancelled) return;
            restoreEl.scrollTop = savedScroll;
            attempts++;
            if (restoreEl.scrollTop < savedScroll - 1 && attempts < 30) {
              requestAnimationFrame(tryRestore);
            } else {
              restoreEl.removeEventListener('wheel', cancel);
              restoreEl.removeEventListener('touchmove', cancel);
              restoreEl.removeEventListener('keydown', cancel);
            }
          };
          requestAnimationFrame(tryRestore);
        }
      }
      isLoadingRef.current = false;
    }, 0);
    // `pages` is intentionally excluded from deps — it is read imperatively
    // inside the timeout to avoid stale closures and spurious re-runs.
  }, [activePageId, updatePageContent, editor]);

  // Continuously persist scroll position of the active page (debounced).
  // Re-attaches whenever the editor instance changes since the scroll container
  // is owned by Tiptap (`editor.view.dom.parentElement`).
  useEffect(() => {
    const el = getScrollEl();
    if (!el) return;
    let frame: number | null = null;
    const onScroll = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const pageId = useRichTextPagesStore.getState().activePageId;
        if (pageId && !isLoadingRef.current) {
          useSessionStore.getState().saveEditorScroll(pageId, el.scrollTop);
        }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [editor, getScrollEl]);

  // Auto-save current page content periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const pageId = useRichTextPagesStore.getState().activePageId;
      if (editorRef.current && pageId && !isLoadingRef.current) {
        const content = editorRef.current.getHTML();
        updatePageContent(pageId, content);
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [updatePageContent]);

  // Save on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending page load before unmounting
      if (pendingLoadRef.current !== null) {
        clearTimeout(pendingLoadRef.current);
        pendingLoadRef.current = null;
      }
      const pageId = useRichTextPagesStore.getState().activePageId;
      if (editorRef.current && pageId) {
        const content = editorRef.current.getHTML();
        updatePageContent(pageId, content);
        const el = getScrollEl();
        if (el) {
          useSessionStore.getState().saveEditorScroll(pageId, el.scrollTop);
        }
      }
    };
  }, [updatePageContent, getScrollEl]);

  // Exit full-screen on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && onToggleFullscreen) {
        onToggleFullscreen();
      }
    },
    [isFullscreen, onToggleFullscreen]
  );

  useEffect(() => {
    if (!isFullscreen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleKeyDown]);

  return (
    <TiptapEditorProvider value={editor}>
      <div className={`document-editor-panel ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="document-editor-panel-header">
          <span className="document-editor-panel-title">Document</span>
          <div className="document-editor-panel-actions">
            {onToggleFullscreen && (
              <button
                className="document-editor-panel-collapse"
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit full-screen (Esc)' : 'Full-screen editor'}
              >
                {isFullscreen ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 1a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H5V1.5a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5V4h2.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5zM2 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V11H2.5a.5.5 0 0 1-.5-.5zm8 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H11v2.5a.5.5 0 0 1-1 0v-3z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0V2h2.5a.5.5 0 0 0 0-1h-3zm11 0a.5.5 0 0 0 0 1H15v2.5a.5.5 0 0 0 1 0v-3a.5.5 0 0 0-.5-.5h-3zM.5 11a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 0-1H1v-2.5a.5.5 0 0 0-1 0zm15 0a.5.5 0 0 0-1 0V14h-2.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 .5-.5v-3z" />
                  </svg>
                )}
              </button>
            )}
            {onCollapse && !isFullscreen && (
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
        </div>
        <RichTextTabBar />
        <DocumentEditorToolbar />
        <div className="document-editor-panel-content">
          <TiptapEditor onEditorReady={handleEditorReady} />
        </div>
      </div>
    </TiptapEditorProvider>
  );
}
