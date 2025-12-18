import { useState, useCallback } from 'react';
import { useColorPaletteStore } from '../store/colorPaletteStore';
import './ColorPalette.css';

/**
 * Color palette organized by family.
 */
const COLOR_FAMILIES = {
  grayscale: ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff'],
  warm: ['#ff0000', '#ff6600', '#ffcc00', '#ffff00', '#ff3366', '#ff9999'],
  cool: ['#00ff00', '#00cc66', '#00ffff', '#0099ff', '#0066cc', '#003399'],
  accent: ['#6600cc', '#9933ff', '#cc66ff', '#ff66cc', '#996633', '#663300'],
};

/**
 * Props for the ColorPalette component.
 */
interface ColorPaletteProps {
  /** Currently selected color */
  value: string;
  /** Callback when a color is selected */
  onChange: (color: string) => void;
  /** Whether to show the "no fill" option */
  showNoFill?: boolean;
  /** Compact mode - hide labels and reduce spacing */
  compact?: boolean;
}

/**
 * Color swatch button component.
 */
function ColorSwatch({
  color,
  selected,
  onClick,
  title,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      className={`color-swatch ${selected ? 'selected' : ''}`}
      style={{ backgroundColor: color }}
      onClick={onClick}
      title={title || color}
      aria-label={title || color}
    />
  );
}

/**
 * Enhanced ColorPalette component with recent colors and organized families.
 *
 * Features:
 * - Recent colors section (persisted across sessions)
 * - Custom color input with hex support
 * - Colors organized by family (grayscale, warm, cool, accent)
 * - No fill option
 */
export function ColorPalette({
  value,
  onChange,
  showNoFill = false,
  compact = false,
}: ColorPaletteProps) {
  const { recentColors, customColor, addRecentColor, setCustomColor } =
    useColorPaletteStore();

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState(customColor);

  const normalizedValue = value?.toLowerCase() || '';

  // Handle color selection
  const handleColorSelect = useCallback(
    (color: string) => {
      onChange(color);
      if (color && color !== 'transparent' && color !== '') {
        addRecentColor(color);
      }
    },
    [onChange, addRecentColor]
  );

  // Handle custom color apply
  const handleCustomApply = useCallback(() => {
    if (customInputValue && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(customInputValue)) {
      setCustomColor(customInputValue);
      handleColorSelect(customInputValue);
      setShowCustomInput(false);
    }
  }, [customInputValue, setCustomColor, handleColorSelect]);

  // Handle native color picker change
  const handleNativePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value;
      setCustomInputValue(color);
      setCustomColor(color);
    },
    [setCustomColor]
  );

  // Handle custom input change
  const handleCustomInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      // Auto-add # prefix if missing
      if (val && !val.startsWith('#')) {
        val = '#' + val;
      }
      setCustomInputValue(val);
    },
    []
  );

  // Handle custom input keydown
  const handleCustomInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleCustomApply();
      } else if (e.key === 'Escape') {
        setShowCustomInput(false);
        setCustomInputValue(customColor);
      }
    },
    [handleCustomApply, customColor]
  );

  return (
    <div className={`color-palette-container ${compact ? 'compact' : ''}`}>
      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="color-palette-section">
          {!compact && <div className="color-palette-label">Recent</div>}
          <div className="color-palette-row">
            {recentColors.map((color, index) => (
              <ColorSwatch
                key={`recent-${index}-${color}`}
                color={color}
                selected={normalizedValue === color.toLowerCase()}
                onClick={() => handleColorSelect(color)}
                title={`Recent: ${color}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Color */}
      <div className="color-palette-section">
        {!compact && <div className="color-palette-label">Custom</div>}
        <div className="color-palette-custom">
          <input
            type="color"
            value={customColor}
            onChange={handleNativePickerChange}
            className="color-palette-picker"
            title="Pick a custom color"
          />
          {showCustomInput ? (
            <div className="color-palette-custom-input-group">
              <input
                type="text"
                value={customInputValue}
                onChange={handleCustomInputChange}
                onKeyDown={handleCustomInputKeyDown}
                className="color-palette-custom-input"
                placeholder="#000000"
                maxLength={7}
                autoFocus
              />
              <button
                className="color-palette-custom-apply"
                onClick={handleCustomApply}
                title="Apply color"
              >
                Apply
              </button>
            </div>
          ) : (
            <button
              className="color-palette-custom-toggle"
              onClick={() => {
                setShowCustomInput(true);
                setCustomInputValue(customColor);
              }}
              title="Enter hex color"
            >
              {customColor}
            </button>
          )}
        </div>
      </div>

      {/* Color Families */}
      {Object.entries(COLOR_FAMILIES).map(([family, colors]) => (
        <div key={family} className="color-palette-section">
          {!compact && (
            <div className="color-palette-label">
              {family.charAt(0).toUpperCase() + family.slice(1)}
            </div>
          )}
          <div className="color-palette-row">
            {colors.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={normalizedValue === color.toLowerCase()}
                onClick={() => handleColorSelect(color)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* No Fill Option */}
      {showNoFill && (
        <div className="color-palette-section">
          <button
            className={`color-swatch no-fill ${
              normalizedValue === '' || normalizedValue === 'transparent' ? 'selected' : ''
            }`}
            onClick={() => onChange('')}
            title="No fill"
            aria-label="No fill"
          >
            <span className="no-fill-icon">/</span>
          </button>
          {!compact && <span className="color-palette-nofill-label">No Fill</span>}
        </div>
      )}
    </div>
  );
}

export default ColorPalette;
