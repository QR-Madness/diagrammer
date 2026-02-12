/**
 * Version Conflict Dialog
 *
 * Modal dialog shown when a document version conflict is detected.
 * Presents resolution options to the user.
 *
 * Phase 16 - Document Version Tracking UI
 */

import { useState } from 'react';
import type { VersionConflict, ConflictResolution } from '../types/VersionConflict';
import { getResolutionDescription, canAutoMerge } from '../types/VersionConflict';
import './VersionConflictDialog.css';

export interface VersionConflictDialogProps {
  isOpen: boolean;
  conflict: VersionConflict | null;
  onResolve: (resolution: ConflictResolution) => void;
  onClose: () => void;
}

export function VersionConflictDialog({
  isOpen,
  conflict,
  onResolve,
  onClose,
}: VersionConflictDialogProps) {
  const [selected, setSelected] = useState<ConflictResolution>('cancel');

  if (!isOpen || !conflict) return null;

  const mergeAvailable = canAutoMerge(conflict);
  const timeSinceConflict = Math.round((Date.now() - conflict.detectedAt) / 1000);

  const options: { value: ConflictResolution; label: string; icon: string; danger?: boolean; disabled?: boolean }[] = [
    { value: 'reload', label: 'Load server version', icon: '↓' },
    { value: 'overwrite', label: 'Overwrite with my changes', icon: '↑', danger: true },
    { value: 'save-as-copy', label: 'Save my version as a copy', icon: '⎘' },
    { value: 'merge', label: 'Auto-merge', icon: '⇄', disabled: !mergeAvailable },
    { value: 'cancel', label: 'Cancel', icon: '✕' },
  ];

  const handleResolve = () => {
    onResolve(selected);
    onClose();
  };

  return (
    <div className="version-conflict-dialog__overlay" onClick={onClose}>
      <div
        className="version-conflict-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="version-conflict-title"
      >
        <div className="version-conflict-dialog__header">
          <h3 id="version-conflict-title">⚠ Document Version Conflict</h3>
          <button className="version-conflict-dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="version-conflict-dialog__content">
          <p className="version-conflict-dialog__message">
            This document was modified externally. Your version (v{conflict.localVersion})
            conflicts with the server version (v{conflict.serverVersion}).
          </p>

          {timeSinceConflict > 0 && (
            <p className="version-conflict-dialog__time">
              Detected {timeSinceConflict}s ago
            </p>
          )}

          <div className="version-conflict-dialog__options">
            {options.map((option) => (
              <label
                key={option.value}
                className={`version-conflict-dialog__option${
                  selected === option.value ? ' version-conflict-dialog__option--selected' : ''
                }${option.disabled ? ' version-conflict-dialog__option--disabled' : ''}${
                  option.danger ? ' version-conflict-dialog__option--danger' : ''
                }`}
              >
                <input
                  type="radio"
                  name="conflict-resolution"
                  value={option.value}
                  checked={selected === option.value}
                  onChange={() => setSelected(option.value)}
                  disabled={option.disabled}
                />
                <span className="version-conflict-dialog__option-icon">{option.icon}</span>
                <span className="version-conflict-dialog__option-label">{option.label}</span>
                {option.disabled && (
                  <span className="version-conflict-dialog__option-note">(not available)</span>
                )}
              </label>
            ))}
          </div>

          <p className="version-conflict-dialog__description">
            {getResolutionDescription(selected)}
          </p>

          <div className="version-conflict-dialog__actions">
            <button
              className="version-conflict-dialog__btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`version-conflict-dialog__btn version-conflict-dialog__btn--primary${
                selected === 'overwrite' ? ' version-conflict-dialog__btn--danger' : ''
              }`}
              onClick={handleResolve}
            >
              {selected === 'cancel' ? 'Close' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
