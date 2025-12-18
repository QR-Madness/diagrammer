/**
 * SaveStatusIndicator component for displaying document name and save status.
 *
 * Shows:
 * - Document name (editable on click)
 * - Save status indicator (dirty/saving/saved)
 * - Last saved timestamp
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePersistenceStore } from '../store/persistenceStore';
import { useAutoSave, formatLastSaved } from '../hooks/useAutoSave';
import './SaveStatusIndicator.css';

export function SaveStatusIndicator() {
  const currentDocumentName = usePersistenceStore((state) => state.currentDocumentName);
  const renameDocument = usePersistenceStore((state) => state.renameDocument);

  const { status, isDirty, lastSavedAt, saveNow } = useAutoSave();

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Time display state (for updating "X minutes ago")
  const [, setTick] = useState(0);

  // Update time display periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Start editing
  const handleStartEdit = useCallback(() => {
    setEditValue(currentDocumentName);
    setIsEditing(true);
  }, [currentDocumentName]);

  // Submit edit
  const handleSubmit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== currentDocumentName) {
      renameDocument(trimmed);
    }
    setIsEditing(false);
  }, [editValue, currentDocumentName, renameDocument]);

  // Cancel edit
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
  }, []);

  // Handle key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSubmit, handleCancel]
  );

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Get status icon and text
  const getStatusDisplay = () => {
    if (status === 'saving') {
      return { icon: '↻', text: 'Saving...', className: 'saving' };
    }
    if (isDirty) {
      return { icon: '●', text: 'Unsaved', className: 'dirty' };
    }
    if (status === 'saved' || lastSavedAt) {
      return { icon: '✓', text: formatLastSaved(lastSavedAt), className: 'saved' };
    }
    return { icon: '', text: '', className: '' };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="save-status-indicator">
      <div className="save-status-name">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="save-status-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <button
            className="save-status-name-button"
            onClick={handleStartEdit}
            title="Click to rename document"
          >
            {currentDocumentName}
            {isDirty && <span className="save-status-dirty-dot">●</span>}
          </button>
        )}
      </div>

      {statusDisplay.text && (
        <div className={`save-status-badge ${statusDisplay.className}`}>
          <span className="save-status-icon">{statusDisplay.icon}</span>
          <span className="save-status-text">{statusDisplay.text}</span>
        </div>
      )}

      {isDirty && (
        <button className="save-status-save-button" onClick={saveNow} title="Save now (Ctrl+S)">
          Save
        </button>
      )}
    </div>
  );
}
