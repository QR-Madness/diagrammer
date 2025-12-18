import { useState, useCallback, useRef, useEffect } from 'react';
import { useColorPaletteStore } from '../store/colorPaletteStore';
import { ColorPalette } from './ColorPalette';
import './CompactColorInput.css';

/**
 * Props for the CompactColorInput component.
 */
interface CompactColorInputProps {
  /** Current color value */
  value: string;
  /** Callback when color changes */
  onChange: (color: string) => void;
  /** Label for the input */
  label: string;
  /** Whether to show palette on click */
  showPalette?: boolean;
  /** Whether to show the "no fill" option in palette */
  showNoFill?: boolean;
}

/**
 * Compact color input component with inline picker and hex display.
 *
 * Features:
 * - Native color picker
 * - Hex value display/input
 * - Click to expand color palette
 * - Recent colors tracking
 *
 * Usage:
 * ```tsx
 * <CompactColorInput
 *   label="Fill"
 *   value={shape.fill}
 *   onChange={(color) => updateShape({ fill: color })}
 *   showNoFill
 * />
 * ```
 */
export function CompactColorInput({
  value,
  onChange,
  label,
  showPalette = true,
  showNoFill = false,
}: CompactColorInputProps) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addRecentColor } = useColorPaletteStore();

  // Close palette when clicking outside
  useEffect(() => {
    if (!isPaletteOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPaletteOpen]);

  // Handle native picker change
  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value;
      onChange(color);
      addRecentColor(color);
    },
    [onChange, addRecentColor]
  );

  // Handle hex input click
  const handleHexClick = useCallback(() => {
    if (showPalette) {
      setIsPaletteOpen((prev) => !prev);
    } else {
      setIsEditing(true);
      setEditValue(value || '');
    }
  }, [showPalette, value]);

  // Handle starting edit mode
  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
      setEditValue(value || '');
      setIsPaletteOpen(false);
    },
    [value]
  );

  // Handle edit input change
  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val && !val.startsWith('#')) {
      val = '#' + val;
    }
    setEditValue(val);
  }, []);

  // Handle edit input blur
  const handleEditBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(editValue)) {
      onChange(editValue.toLowerCase());
      addRecentColor(editValue.toLowerCase());
    } else {
      setEditValue(value || '');
    }
  }, [editValue, onChange, addRecentColor, value]);

  // Handle edit input keydown
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleEditBlur();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditValue(value || '');
      }
    },
    [handleEditBlur, value]
  );

  // Handle palette color selection
  const handlePaletteSelect = useCallback(
    (color: string) => {
      onChange(color);
      setIsPaletteOpen(false);
    },
    [onChange]
  );

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const displayValue = value || '';
  const hasValue = displayValue && displayValue !== 'transparent';

  return (
    <div className="compact-color-input" ref={containerRef}>
      <label className="compact-color-label">{label}</label>
      <div className="compact-color-controls">
        <input
          type="color"
          value={hasValue ? displayValue : '#000000'}
          onChange={handlePickerChange}
          className="compact-color-picker"
          title={`Pick ${label.toLowerCase()} color`}
        />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={handleEditChange}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            className="compact-color-hex-input editing"
            maxLength={7}
          />
        ) : (
          <button
            className="compact-color-hex-input"
            onClick={handleHexClick}
            title={showPalette ? 'Open color palette' : 'Edit color'}
          >
            {hasValue ? displayValue : 'none'}
          </button>
        )}
        {hasValue && showPalette && !isEditing && (
          <button
            className="compact-color-edit"
            onClick={handleStartEdit}
            title="Edit hex value"
          >
            #
          </button>
        )}
      </div>

      {/* Color Palette Dropdown */}
      {isPaletteOpen && showPalette && (
        <div className="compact-color-palette-dropdown">
          <ColorPalette
            value={displayValue}
            onChange={handlePaletteSelect}
            showNoFill={showNoFill}
            compact
          />
        </div>
      )}
    </div>
  );
}

export default CompactColorInput;
