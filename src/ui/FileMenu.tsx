/**
 * File menu component with export options.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { ExportDialog } from './ExportDialog';
import './FileMenu.css';

export function FileMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'selection'>('all');
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedIds = useSessionStore((s) => s.selectedIds);
  const hasSelection = selectedIds.size > 0;

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Close menu on escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const handleExport = useCallback((scope: 'all' | 'selection') => {
    setExportScope(scope);
    setExportDialogOpen(true);
    setIsMenuOpen(false);
  }, []);

  const handleCloseExportDialog = useCallback(() => {
    setExportDialogOpen(false);
  }, []);

  return (
    <>
      <div className="file-menu" ref={menuRef}>
        <button
          className={`file-menu-trigger ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
        >
          File
          <svg width="10" height="6" viewBox="0 0 10 6" className="file-menu-arrow">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="file-menu-dropdown">
            <button
              className="file-menu-item"
              onClick={() => handleExport('all')}
            >
              <span className="file-menu-item-label">Export as PNG...</span>
              <span className="file-menu-item-shortcut">Ctrl+Shift+E</span>
            </button>
            <button
              className="file-menu-item"
              onClick={() => handleExport('all')}
            >
              <span className="file-menu-item-label">Export as SVG...</span>
            </button>

            <div className="file-menu-separator" />

            <button
              className={`file-menu-item ${!hasSelection ? 'disabled' : ''}`}
              onClick={() => hasSelection && handleExport('selection')}
              disabled={!hasSelection}
            >
              <span className="file-menu-item-label">Export Selection as PNG...</span>
            </button>
            <button
              className={`file-menu-item ${!hasSelection ? 'disabled' : ''}`}
              onClick={() => hasSelection && handleExport('selection')}
              disabled={!hasSelection}
            >
              <span className="file-menu-item-label">Export Selection as SVG...</span>
            </button>
          </div>
        )}
      </div>

      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={handleCloseExportDialog}
        scope={exportScope}
        defaultFilename="diagram"
      />
    </>
  );
}
