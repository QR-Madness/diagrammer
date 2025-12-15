import { useCallback } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useSessionStore, getSelectedShapes } from '../store/sessionStore';
import { useHistoryStore } from '../store/historyStore';
import {
  alignHorizontal,
  alignVertical,
  distribute,
  HorizontalAlignment,
  VerticalAlignment,
  DistributionDirection,
} from '../shapes/utils/alignment';
import './AlignmentPanel.css';

/**
 * Panel showing alignment and distribution controls for selected shapes.
 * Only visible when 2+ shapes are selected.
 */
export function AlignmentPanel() {
  const selectedIds = useSessionStore((state) => state.selectedIds);
  const updateShapes = useDocumentStore((state) => state.updateShapes);
  const push = useHistoryStore((state) => state.push);

  const selectedCount = selectedIds.size;

  const handleAlign = useCallback(
    (horizontal: HorizontalAlignment | null, vertical: VerticalAlignment | null) => {
      const selectedShapes = getSelectedShapes();
      if (selectedShapes.length < 2) return;

      // Save current state for undo
      push('Align shapes');

      if (horizontal) {
        const updates = alignHorizontal(selectedShapes, horizontal);
        if (updates.length > 0) {
          updateShapes(updates);
        }
      }

      if (vertical) {
        const updates = alignVertical(selectedShapes, vertical);
        if (updates.length > 0) {
          updateShapes(updates);
        }
      }
    },
    [push, updateShapes]
  );

  const handleDistribute = useCallback(
    (direction: DistributionDirection) => {
      const selectedShapes = getSelectedShapes();
      if (selectedShapes.length < 3) return;

      // Save current state for undo
      push('Distribute shapes');

      const updates = distribute(selectedShapes, direction);
      if (updates.length > 0) {
        updateShapes(updates);
      }
    },
    [push, updateShapes]
  );

  // Only show when 2+ shapes selected
  if (selectedCount < 2) {
    return null;
  }

  return (
    <div className="alignment-panel">
      <div className="alignment-section">
        <div className="alignment-label">Align</div>
        <div className="alignment-buttons">
          <button
            className="alignment-button"
            onClick={() => handleAlign('left', null)}
            title="Align Left"
          >
            <AlignLeftIcon />
          </button>
          <button
            className="alignment-button"
            onClick={() => handleAlign('center', null)}
            title="Align Center"
          >
            <AlignCenterHIcon />
          </button>
          <button
            className="alignment-button"
            onClick={() => handleAlign('right', null)}
            title="Align Right"
          >
            <AlignRightIcon />
          </button>
          <button
            className="alignment-button"
            onClick={() => handleAlign(null, 'top')}
            title="Align Top"
          >
            <AlignTopIcon />
          </button>
          <button
            className="alignment-button"
            onClick={() => handleAlign(null, 'middle')}
            title="Align Middle"
          >
            <AlignCenterVIcon />
          </button>
          <button
            className="alignment-button"
            onClick={() => handleAlign(null, 'bottom')}
            title="Align Bottom"
          >
            <AlignBottomIcon />
          </button>
        </div>
      </div>

      {selectedCount >= 3 && (
        <div className="alignment-section">
          <div className="alignment-label">Distribute</div>
          <div className="alignment-buttons">
            <button
              className="alignment-button"
              onClick={() => handleDistribute('horizontal')}
              title="Distribute Horizontally"
            >
              <DistributeHIcon />
            </button>
            <button
              className="alignment-button"
              onClick={() => handleDistribute('vertical')}
              title="Distribute Vertically"
            >
              <DistributeVIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// SVG Icons for alignment buttons

function AlignLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="2" width="1" height="12" />
      <rect x="4" y="4" width="8" height="3" />
      <rect x="4" y="9" width="5" height="3" />
    </svg>
  );
}

function AlignCenterHIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="7.5" y="2" width="1" height="12" />
      <rect x="3" y="4" width="10" height="3" />
      <rect x="5" y="9" width="6" height="3" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="13" y="2" width="1" height="12" />
      <rect x="4" y="4" width="8" height="3" />
      <rect x="7" y="9" width="5" height="3" />
    </svg>
  );
}

function AlignTopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="2" width="12" height="1" />
      <rect x="4" y="4" width="3" height="8" />
      <rect x="9" y="4" width="3" height="5" />
    </svg>
  );
}

function AlignCenterVIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="7.5" width="12" height="1" />
      <rect x="4" y="3" width="3" height="10" />
      <rect x="9" y="5" width="3" height="6" />
    </svg>
  );
}

function AlignBottomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="13" width="12" height="1" />
      <rect x="4" y="4" width="3" height="8" />
      <rect x="9" y="7" width="3" height="5" />
    </svg>
  );
}

function DistributeHIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="4" width="3" height="8" />
      <rect x="6.5" y="5" width="3" height="6" />
      <rect x="11" y="4" width="3" height="8" />
    </svg>
  );
}

function DistributeVIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="4" y="2" width="8" height="3" />
      <rect x="5" y="6.5" width="6" height="3" />
      <rect x="4" y="11" width="8" height="3" />
    </svg>
  );
}
