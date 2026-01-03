import { useCallback } from 'react';
import type { GroupLabelPosition } from '../shapes/GroupStyles';
import { LABEL_POSITION_LABELS } from '../shapes/GroupStyles';
import './LabelPositionPicker.css';

interface LabelPositionPickerProps {
  value: GroupLabelPosition | undefined;
  onChange: (position: GroupLabelPosition) => void;
}

/**
 * 9-grid position layout for label positioning.
 */
const POSITION_GRID: GroupLabelPosition[][] = [
  ['top-left', 'top', 'top-right'],
  ['left', 'center', 'right'],
  ['bottom-left', 'bottom', 'bottom-right'],
];

/**
 * LabelPositionPicker component for selecting label anchor position.
 * Displays a visual 9-grid for intuitive position selection.
 */
export function LabelPositionPicker({ value, onChange }: LabelPositionPickerProps) {
  const currentPosition = value || 'top';

  const handlePositionClick = useCallback(
    (position: GroupLabelPosition) => {
      onChange(position);
    },
    [onChange]
  );

  return (
    <div className="label-position-picker">
      <div className="label-position-row">
        <span className="label-position-label">Position</span>
        <div className="label-position-grid">
          {POSITION_GRID.map((row, rowIndex) => (
            <div key={rowIndex} className="label-position-grid-row">
              {row.map((position) => (
                <button
                  key={position}
                  className={`label-position-cell ${position === currentPosition ? 'selected' : ''}`}
                  onClick={() => handlePositionClick(position)}
                  title={LABEL_POSITION_LABELS[position]}
                >
                  <span className="label-position-dot" />
                </button>
              ))}
            </div>
          ))}
        </div>
        <span className="label-position-value">
          {LABEL_POSITION_LABELS[currentPosition]}
        </span>
      </div>
    </div>
  );
}
