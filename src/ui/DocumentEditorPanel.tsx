/**
 * DocumentEditorPanel - Container panel for the rich text editor.
 *
 * Contains:
 * - Header with title and collapse button
 * - Formatting toolbar
 * - Tiptap editor
 */

import { DocumentEditorToolbar } from './DocumentEditorToolbar';
import { TiptapEditor } from './TiptapEditor';
import './DocumentEditorPanel.css';

export interface DocumentEditorPanelProps {
  /** Optional callback when collapse button is clicked */
  onCollapse?: () => void;
}

export function DocumentEditorPanel({ onCollapse }: DocumentEditorPanelProps) {
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
      <DocumentEditorToolbar />
      <div className="document-editor-panel-content">
        <TiptapEditor />
      </div>
    </div>
  );
}
