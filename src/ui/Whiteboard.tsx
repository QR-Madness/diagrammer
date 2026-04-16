/**
 * Whiteboard overlay component.
 *
 * Full-viewport overlay for sticky notes, accessible via Ctrl+I.
 * Intended for idea tracking, not optimized for PDF export.
 */

import React, { useCallback, useEffect } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore';
import { StickyNote } from './StickyNote';
import './Whiteboard.css';

export const Whiteboard: React.FC = () => {
  const isVisible = useWhiteboardStore((state) => state.isVisible);
  const setVisibility = useWhiteboardStore((state) => state.setVisibility);
  const addNote = useWhiteboardStore((state) => state.addNote);
  const noteOrder = useWhiteboardStore((state) => state.noteOrder);

  const handleClose = useCallback(() => {
    setVisibility(false);
  }, [setVisibility]);

  const handleAddNote = useCallback(() => {
    const x = 100 + Math.random() * 200;
    const y = 100 + Math.random() * 200;
    addNote(x, y);
  }, [addNote]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, handleClose]);

  if (!isVisible) return null;

  return (
    <div className="whiteboard-overlay" onClick={handleClose}>
      <div className="whiteboard-backdrop" />
      <div className="whiteboard-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="whiteboard-header">
          <h2 className="whiteboard-title">Whiteboard</h2>
          <button
            className="whiteboard-close-btn"
            onClick={handleClose}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Notes */}
        <div className="whiteboard-notes">
          {noteOrder.map((noteId) => (
            <StickyNote key={noteId} id={noteId} />
          ))}
        </div>

        {/* Add Note button */}
        <button className="whiteboard-add-btn" onClick={handleAddNote} title="Add note">
          +
        </button>
      </div>
    </div>
  );
};
