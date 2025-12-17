import { useEffect, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useDocumentStore } from '../store/documentStore';
import { useHistoryStore } from '../store/historyStore';
import { isGroup } from '../shapes/Shape';
import { nanoid } from 'nanoid';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onExport?: () => void;
}

/**
 * Context menu for shape operations.
 * Shows contextual actions based on current selection.
 */
export function ContextMenu({ x, y, onClose, onExport }: ContextMenuProps) {
  const selectedIds = useSessionStore((state) => state.selectedIds);
  const shapes = useDocumentStore((state) => state.shapes);
  const select = useSessionStore((state) => state.select);
  const clearSelection = useSessionStore((state) => state.clearSelection);
  const groupShapes = useDocumentStore((state) => state.groupShapes);
  const ungroupShape = useDocumentStore((state) => state.ungroupShape);
  const deleteShapes = useDocumentStore((state) => state.deleteShapes);
  const bringToFrontMultiple = useDocumentStore((state) => state.bringToFrontMultiple);
  const sendToBackMultiple = useDocumentStore((state) => state.sendToBackMultiple);
  const push = useHistoryStore((state) => state.push);

  const selectedArray = Array.from(selectedIds);
  const hasSelection = selectedArray.length > 0;
  const canGroup = selectedArray.length >= 2;

  // Check if a single group is selected
  const singleGroupSelected = selectedArray.length === 1 &&
    shapes[selectedArray[0]!] &&
    isGroup(shapes[selectedArray[0]!]!);

  // Close menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Use setTimeout to avoid immediate close from the right-click event
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleGroup = useCallback(() => {
    if (canGroup) {
      push('Group shapes');
      const groupId = nanoid();
      groupShapes(selectedArray, groupId);
      select([groupId]);
    }
    onClose();
  }, [canGroup, selectedArray, push, groupShapes, select, onClose]);

  const handleUngroup = useCallback(() => {
    if (singleGroupSelected) {
      const shape = shapes[selectedArray[0]!]!;
      if (isGroup(shape)) {
        push('Ungroup shapes');
        const childIds = [...shape.childIds];
        ungroupShape(shape.id);
        select(childIds);
      }
    }
    onClose();
  }, [singleGroupSelected, selectedArray, shapes, push, ungroupShape, select, onClose]);

  const handleDelete = useCallback(() => {
    if (hasSelection) {
      push('Delete shapes');
      deleteShapes(selectedArray);
      clearSelection();
    }
    onClose();
  }, [hasSelection, selectedArray, push, deleteShapes, clearSelection, onClose]);

  const handleBringToFront = useCallback(() => {
    if (hasSelection) {
      push('Bring to front');
      bringToFrontMultiple(selectedArray);
    }
    onClose();
  }, [hasSelection, selectedArray, push, bringToFrontMultiple, onClose]);

  const handleSendToBack = useCallback(() => {
    if (hasSelection) {
      push('Send to back');
      sendToBackMultiple(selectedArray);
    }
    onClose();
  }, [hasSelection, selectedArray, push, sendToBackMultiple, onClose]);

  const handleExport = useCallback(() => {
    if (hasSelection && onExport) {
      onExport();
    }
    onClose();
  }, [hasSelection, onExport, onClose]);

  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {canGroup && (
        <button className="context-menu-item" onClick={handleGroup}>
          <span className="context-menu-label">Group</span>
          <span className="context-menu-shortcut">Ctrl+G</span>
        </button>
      )}

      {singleGroupSelected && (
        <button className="context-menu-item" onClick={handleUngroup}>
          <span className="context-menu-label">Ungroup</span>
          <span className="context-menu-shortcut">Ctrl+Shift+G</span>
        </button>
      )}

      {(canGroup || singleGroupSelected) && hasSelection && (
        <div className="context-menu-separator" />
      )}

      {hasSelection && (
        <>
          <button className="context-menu-item" onClick={handleBringToFront}>
            <span className="context-menu-label">Bring to Front</span>
          </button>
          <button className="context-menu-item" onClick={handleSendToBack}>
            <span className="context-menu-label">Send to Back</span>
          </button>
          <div className="context-menu-separator" />
          {onExport && (
            <>
              <button className="context-menu-item" onClick={handleExport}>
                <span className="context-menu-label">Export Selection...</span>
              </button>
              <div className="context-menu-separator" />
            </>
          )}
          <button className="context-menu-item danger" onClick={handleDelete}>
            <span className="context-menu-label">Delete</span>
            <span className="context-menu-shortcut">Del</span>
          </button>
        </>
      )}

      {!hasSelection && (
        <div className="context-menu-item disabled">
          <span className="context-menu-label">No selection</span>
        </div>
      )}
    </div>
  );
}
