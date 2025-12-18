/**
 * UnifiedToolbar - Consolidated toolbar combining all top-level controls.
 *
 * Notion/Linear-style minimal top bar with:
 * - File menu dropdown
 * - Tool buttons with tooltips
 * - Document name + save status
 * - Inline page tabs
 * - Theme toggle
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSessionStore, ToolType } from '../store/sessionStore';
import { usePageStore } from '../store/pageStore';
import { useHistoryStore } from '../store/historyStore';
import { usePersistenceStore } from '../store/persistenceStore';
import { useThemeStore } from '../store/themeStore';
import { useAutoSave } from '../hooks/useAutoSave';
import './UnifiedToolbar.css';

/**
 * Tool definition.
 */
interface ToolDef {
  type: ToolType;
  name: string;
  icon: string;
  shortcut: string;
}

/**
 * Available tools.
 */
const TOOLS: ToolDef[] = [
  { type: 'select', name: 'Select', icon: '\u2B1C', shortcut: 'V' },
  { type: 'pan', name: 'Pan', icon: '\u270B', shortcut: 'H' },
  { type: 'rectangle', name: 'Rectangle', icon: '\u25AD', shortcut: 'R' },
  { type: 'ellipse', name: 'Ellipse', icon: '\u25EF', shortcut: 'O' },
  { type: 'line', name: 'Line', icon: '\u2571', shortcut: 'L' },
  { type: 'connector', name: 'Connector', icon: '\u27F7', shortcut: 'C' },
  { type: 'text', name: 'Text', icon: 'T', shortcut: 'T' },
];

/**
 * Compact tool button with hover tooltip.
 */
function ToolButton({
  tool,
  isActive,
  onClick,
}: {
  tool: ToolDef;
  isActive: boolean;
  onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="tool-button-wrapper">
      <button
        className={`tool-button ${isActive ? 'active' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`${tool.name} (${tool.shortcut})`}
      >
        <span className="tool-button-icon">{tool.icon}</span>
      </button>
      {showTooltip && (
        <div className="tool-button-tooltip">
          {tool.name}
          <span className="tool-button-tooltip-shortcut">{tool.shortcut}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact file menu dropdown.
 */
function FileMenuButton({ onOpenDocumentManager }: { onOpenDocumentManager: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const saveDocument = usePersistenceStore((state) => state.saveDocument);
  const newDocument = usePersistenceStore((state) => state.newDocument);
  const exportJSON = usePersistenceStore((state) => state.exportJSON);
  const importJSON = usePersistenceStore((state) => state.importJSON);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleNewDocument = useCallback(() => {
    newDocument();
    setIsOpen(false);
  }, [newDocument]);

  const handleSave = useCallback(() => {
    saveDocument();
    setIsOpen(false);
  }, [saveDocument]);

  const handleOpen = useCallback(() => {
    onOpenDocumentManager();
    setIsOpen(false);
  }, [onOpenDocumentManager]);

  const handleExport = useCallback(() => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.json';
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }, [exportJSON]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          importJSON(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setIsOpen(false);
  }, [importJSON]);

  return (
    <div className="file-menu-button" ref={menuRef}>
      <button
        className={`file-menu-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        File
        <span className="file-menu-arrow">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>
      {isOpen && (
        <div className="file-menu-dropdown">
          <button onClick={handleNewDocument}>
            New<span className="file-menu-shortcut">Ctrl+N</span>
          </button>
          <button onClick={handleOpen}>
            Open...<span className="file-menu-shortcut">Ctrl+O</span>
          </button>
          <button onClick={handleSave}>
            Save<span className="file-menu-shortcut">Ctrl+S</span>
          </button>
          <div className="file-menu-divider" />
          <button onClick={handleImport}>Import...</button>
          <button onClick={handleExport}>Export...</button>
        </div>
      )}
    </div>
  );
}

/**
 * Inline document name with save status.
 */
function DocumentInfo() {
  const currentDocumentName = usePersistenceStore((state) => state.currentDocumentName);
  const renameDocument = usePersistenceStore((state) => state.renameDocument);
  const { isDirty, saveNow } = useAutoSave();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = useCallback(() => {
    setEditValue(currentDocumentName);
    setIsEditing(true);
  }, [currentDocumentName]);

  const handleSubmit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== currentDocumentName) {
      renameDocument(trimmed);
    }
    setIsEditing(false);
  }, [editValue, currentDocumentName, renameDocument]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
      else if (e.key === 'Escape') handleCancel();
    },
    [handleSubmit, handleCancel]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className="document-info">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="document-name-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button className="document-name-button" onClick={handleStartEdit} title="Click to rename">
          {currentDocumentName}
        </button>
      )}
      <span
        className={`document-status ${isDirty ? 'dirty' : 'saved'}`}
        onClick={isDirty ? saveNow : undefined}
        title={isDirty ? 'Unsaved changes - click to save' : 'Saved'}
      >
        {isDirty ? '\u25CF' : '\u2713'}
      </span>
    </div>
  );
}

/**
 * Inline page tabs with horizontal scroll.
 */
function InlinePageTabs() {
  const pages = usePageStore((state) => state.pages);
  const pageOrder = usePageStore((state) => state.pageOrder);
  const activePageId = usePageStore((state) => state.activePageId);
  const createPage = usePageStore((state) => state.createPage);
  const setActivePage = usePageStore((state) => state.setActivePage);

  const tabsRef = useRef<HTMLDivElement>(null);

  const handleTabClick = useCallback(
    (pageId: string) => {
      setActivePage(pageId);
      useHistoryStore.getState().setActivePage(pageId);
    },
    [setActivePage]
  );

  const handleAddPage = useCallback(() => {
    const newPageId = createPage();
    setActivePage(newPageId);
    useHistoryStore.getState().setActivePage(newPageId);
  }, [createPage, setActivePage]);

  // Scroll active tab into view
  useEffect(() => {
    if (!activePageId || !tabsRef.current) return;
    const activeTab = tabsRef.current.querySelector('.inline-tab.active');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [activePageId]);

  return (
    <div className="inline-page-tabs">
      <div className="inline-tabs-scroll" ref={tabsRef}>
        {pageOrder.map((pageId) => {
          const page = pages[pageId];
          if (!page) return null;

          return (
            <button
              key={pageId}
              className={`inline-tab ${pageId === activePageId ? 'active' : ''}`}
              onClick={() => handleTabClick(pageId)}
              title={page.name}
            >
              {page.name}
            </button>
          );
        })}
      </div>
      <button className="inline-tab-add" onClick={handleAddPage} title="Add page">
        +
      </button>
    </div>
  );
}

/**
 * Props for UnifiedToolbar.
 */
interface UnifiedToolbarProps {
  onOpenDocumentManager: () => void;
}

/**
 * UnifiedToolbar component.
 */
export function UnifiedToolbar({ onOpenDocumentManager }: UnifiedToolbarProps) {
  const activeTool = useSessionStore((state) => state.activeTool);
  const setActiveTool = useSessionStore((state) => state.setActiveTool);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const toggleTheme = useThemeStore((state) => state.toggle);

  return (
    <div className="unified-toolbar">
      {/* Left Section: File Menu + Tools */}
      <div className="unified-toolbar-left">
        <FileMenuButton onOpenDocumentManager={onOpenDocumentManager} />
        <div className="toolbar-divider" />
        <div className="tool-buttons">
          {TOOLS.map((tool) => (
            <ToolButton
              key={tool.type}
              tool={tool}
              isActive={activeTool === tool.type}
              onClick={() => setActiveTool(tool.type)}
            />
          ))}
        </div>
      </div>

      {/* Center Section: Document Info */}
      <div className="unified-toolbar-center">
        <DocumentInfo />
      </div>

      {/* Right Section: Page Tabs + Actions */}
      <div className="unified-toolbar-right">
        <InlinePageTabs />
        <div className="toolbar-divider" />
        <button
          className="toolbar-action-button"
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
        >
          {resolvedTheme === 'light' ? '\u263E' : '\u2600'}
        </button>
      </div>
    </div>
  );
}

export default UnifiedToolbar;
