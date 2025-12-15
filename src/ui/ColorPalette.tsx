import './ColorPalette.css';

/**
 * Predefined color palette with common colors organized by hue.
 */
const PALETTE_COLORS = [
  // Row 1: Grayscale
  '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
  // Row 2: Warm colors (red, orange, yellow)
  '#ff0000', '#ff6600', '#ffcc00', '#ffff00', '#ff3366', '#ff9999',
  // Row 3: Cool colors (green, cyan, blue)
  '#00ff00', '#00cc66', '#00ffff', '#0099ff', '#0066cc', '#003399',
  // Row 4: Purple, pink, and earth tones
  '#6600cc', '#9933ff', '#cc66ff', '#ff66cc', '#996633', '#663300',
];

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
}

/**
 * ColorPalette component for quick color selection.
 * Displays a grid of predefined colors that can be clicked to select.
 */
export function ColorPalette({ value, onChange, showNoFill = false }: ColorPaletteProps) {
  return (
    <div className="color-palette">
      {showNoFill && (
        <button
          className={`color-swatch no-fill ${value === '' || value === 'transparent' ? 'selected' : ''}`}
          onClick={() => onChange('')}
          title="No fill"
          aria-label="No fill"
        >
          <span className="no-fill-icon">/</span>
        </button>
      )}
      {PALETTE_COLORS.map((color) => (
        <button
          key={color}
          className={`color-swatch ${value.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          title={color}
          aria-label={color}
        />
      ))}
    </div>
  );
}

export default ColorPalette;
