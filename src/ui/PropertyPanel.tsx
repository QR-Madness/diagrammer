import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useDocumentStore } from '../store/documentStore';
import { useUIPreferencesStore } from '../store/uiPreferencesStore';
import {
  Shape,
  isRectangle,
  isEllipse,
  isLine,
  isText,
  isGroup,
  GroupShape,
  TextAlign,
  VerticalAlign,
} from '../shapes/Shape';
import { PropertySection } from './PropertySection';
import { CompactColorInput } from './CompactColorInput';
import { AlignmentPanel } from './AlignmentPanel';
import { StyleProfilePanel } from './StyleProfilePanel';
import { shapeRegistry } from '../shapes/ShapeRegistry';
import './PropertyPanel.css';

/** Constraints for panel width */
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

/**
 * Compact number input component.
 */
function CompactNumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="compact-number-row">
      <label className="compact-number-label">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="compact-number-input"
        min={min}
        max={max}
        step={step}
      />
      {suffix && <span className="compact-number-suffix">{suffix}</span>}
    </div>
  );
}

/**
 * Compact slider input component.
 */
function CompactSliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  formatValue,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (value: number) => string;
}) {
  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="compact-slider-row">
      <label className="compact-slider-label">{label}</label>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="compact-slider"
        min={min}
        max={max}
        step={step}
      />
      <span className="compact-slider-value">{displayValue}</span>
    </div>
  );
}

/**
 * Info row for read-only values.
 */
function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

/**
 * PropertyPanel component for editing selected shape properties.
 *
 * Features:
 * - Collapsible sections with persisted state
 * - Compact color inputs with palette dropdown
 * - Organized property grouping
 * - Multi-selection support
 */
export function PropertyPanel() {
  const selectedIds = useSessionStore((state) => state.selectedIds);
  const shapes = useDocumentStore((state) => state.shapes);
  const updateShape = useDocumentStore((state) => state.updateShape);
  const { propertyPanelWidth, setPropertyPanelWidth } = useUIPreferencesStore();

  // Resize state
  const [width, setWidth] = useState(propertyPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(propertyPanelWidth);

  // Sync width with store
  useEffect(() => {
    setWidth(propertyPanelWidth);
  }, [propertyPanelWidth]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  // Handle resize move and end
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setPropertyPanelWidth(width);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, width, setPropertyPanelWidth]);

  // Get selected shapes
  const selectedShapes = Array.from(selectedIds)
    .map((id) => shapes[id])
    .filter((s): s is Shape => s !== undefined);

  // Get first selected shape for display
  const shape = selectedShapes[0];
  const isMultiple = selectedShapes.length > 1;
  const isGroupSelected = shape ? isGroup(shape) : false;

  // Calculate group bounds
  const groupBounds = useMemo(() => {
    if (!shape || !isGroupSelected) return null;
    const handler = shapeRegistry.getHandler('group');
    return handler.getBounds(shape as GroupShape);
  }, [isGroupSelected, shape]);

  // Update handlers
  const handleBulkUpdate = useCallback(
    (updates: Partial<Shape>) => {
      selectedShapes.forEach((s) => updateShape(s.id, updates));
    },
    [selectedShapes, updateShape]
  );

  // No selection state
  if (!shape) {
    return (
      <div className="property-panel" style={{ width }}>
        <div
          className={`property-panel-resize-handle ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleResizeStart}
        />
        <div className="property-panel-header">Properties</div>
        <div className="property-panel-empty">No shape selected</div>
        <StyleProfilePanel />
      </div>
    );
  }

  return (
    <div className="property-panel" style={{ width }}>
      <div
        className={`property-panel-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleResizeStart}
      />
      <div className="property-panel-header">
        Properties{isMultiple && ` (${selectedShapes.length})`}
      </div>

      {/* Alignment Panel for multi-selection */}
      <AlignmentPanel />

      <div className="property-panel-content">
        {/* Shape Type Badge */}
        <div className="property-type-badge">
          {isGroupSelected ? 'Group' : shape.type}
          {isGroupSelected && ` (${(shape as GroupShape).childIds.length})`}
        </div>

        {/* Group-specific properties */}
        {isGroupSelected && (
          <PropertySection id="group" title="Group" defaultExpanded>
            <CompactSliderInput
              label="Opacity"
              value={shape.opacity}
              onChange={(val) => handleBulkUpdate({ opacity: val })}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />
            {groupBounds && (
              <>
                <InfoRow label="Size" value={`${Math.round(groupBounds.width)} × ${Math.round(groupBounds.height)}`} />
                <InfoRow label="Position" value={`${Math.round(groupBounds.minX)}, ${Math.round(groupBounds.minY)}`} />
              </>
            )}
            <div className="property-hint">Ctrl+Shift+G to ungroup</div>
          </PropertySection>
        )}

        {/* Appearance Section - only for non-group shapes */}
        {!isGroupSelected && (
          <PropertySection id="appearance" title="Appearance" defaultExpanded>
            {/* Fill Color */}
            {shape.fill !== null && (
              <CompactColorInput
                label="Fill"
                value={shape.fill || ''}
                onChange={(color) => handleBulkUpdate({ fill: color })}
                showNoFill
              />
            )}

            {/* Stroke Color & Width */}
            {shape.stroke !== null && (
              <div className="stroke-row">
                <CompactColorInput
                  label="Stroke"
                  value={shape.stroke || ''}
                  onChange={(color) => handleBulkUpdate({ stroke: color })}
                />
                <CompactNumberInput
                  label="W"
                  value={shape.strokeWidth}
                  onChange={(val) => handleBulkUpdate({ strokeWidth: val })}
                  min={0}
                  max={50}
                />
              </div>
            )}

            {/* Opacity */}
            <CompactSliderInput
              label="Opacity"
              value={shape.opacity}
              onChange={(val) => handleBulkUpdate({ opacity: val })}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />

            {/* Corner Radius for rectangles */}
            {isRectangle(shape) && (
              <CompactNumberInput
                label="Radius"
                value={shape.cornerRadius}
                onChange={(val) => {
                  selectedShapes.forEach((s) => {
                    if (isRectangle(s)) updateShape(s.id, { cornerRadius: val });
                  });
                }}
                min={0}
                max={100}
              />
            )}
          </PropertySection>
        )}

        {/* Label Section for Rectangle and Ellipse */}
        {(isRectangle(shape) || isEllipse(shape)) && (
          <PropertySection id="label" title="Label" defaultExpanded>
            <input
              type="text"
              value={shape.label || ''}
              onChange={(e) => {
                const val = e.target.value;
                selectedShapes.forEach((s) => {
                  if (isRectangle(s) || isEllipse(s)) {
                    updateShape(s.id, { label: val || '' });
                  }
                });
              }}
              className="property-text-input"
              placeholder="Enter label..."
            />
            <CompactNumberInput
              label="Font Size"
              value={shape.labelFontSize || 14}
              onChange={(val) => {
                selectedShapes.forEach((s) => {
                  if (isRectangle(s) || isEllipse(s)) {
                    updateShape(s.id, { labelFontSize: val });
                  }
                });
              }}
              min={8}
              max={100}
              suffix="px"
            />
          </PropertySection>
        )}

        {/* Text Shape Properties */}
        {isText(shape) && (
          <PropertySection id="text" title="Text" defaultExpanded>
            <textarea
              value={shape.text}
              onChange={(e) => {
                const val = e.target.value;
                selectedShapes.forEach((s) => {
                  if (isText(s)) updateShape(s.id, { text: val });
                });
              }}
              className="property-textarea"
              rows={3}
            />
            <CompactNumberInput
              label="Font Size"
              value={shape.fontSize}
              onChange={(val) => {
                selectedShapes.forEach((s) => {
                  if (isText(s)) updateShape(s.id, { fontSize: val });
                });
              }}
              min={8}
              max={200}
              suffix="px"
            />
            <div className="align-row">
              <label className="align-label">Align</label>
              <div className="align-buttons">
                {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                  <button
                    key={align}
                    className={`align-button ${shape.textAlign === align ? 'active' : ''}`}
                    onClick={() => {
                      selectedShapes.forEach((s) => {
                        if (isText(s)) updateShape(s.id, { textAlign: align });
                      });
                    }}
                    title={align}
                  >
                    {align === 'left' ? '\u2190' : align === 'center' ? '\u2194' : '\u2192'}
                  </button>
                ))}
              </div>
              <div className="align-buttons">
                {(['top', 'middle', 'bottom'] as VerticalAlign[]).map((align) => (
                  <button
                    key={align}
                    className={`align-button ${shape.verticalAlign === align ? 'active' : ''}`}
                    onClick={() => {
                      selectedShapes.forEach((s) => {
                        if (isText(s)) updateShape(s.id, { verticalAlign: align });
                      });
                    }}
                    title={align}
                  >
                    {align === 'top' ? '\u2191' : align === 'middle' ? '\u2195' : '\u2193'}
                  </button>
                ))}
              </div>
            </div>
          </PropertySection>
        )}

        {/* Position Section - collapsed by default */}
        {!isGroupSelected && (
          <PropertySection id="position" title="Position" defaultExpanded={false}>
            <InfoRow label="X" value={Math.round(shape.x)} />
            <InfoRow label="Y" value={Math.round(shape.y)} />
            <InfoRow label="Rotation" value={`${Math.round((shape.rotation * 180) / Math.PI)}°`} />
          </PropertySection>
        )}

        {/* Size Section - collapsed by default */}
        {(isRectangle(shape) || isEllipse(shape)) && (
          <PropertySection id="size" title="Size" defaultExpanded={false}>
            {isRectangle(shape) && (
              <>
                <InfoRow label="Width" value={Math.round(shape.width)} />
                <InfoRow label="Height" value={Math.round(shape.height)} />
              </>
            )}
            {isEllipse(shape) && (
              <>
                <InfoRow label="Radius X" value={Math.round(shape.radiusX)} />
                <InfoRow label="Radius Y" value={Math.round(shape.radiusY)} />
              </>
            )}
          </PropertySection>
        )}

        {/* Line Endpoints - collapsed by default */}
        {isLine(shape) && (
          <PropertySection id="endpoints" title="Endpoints" defaultExpanded={false}>
            <InfoRow label="Start" value={`(${Math.round(shape.x)}, ${Math.round(shape.y)})`} />
            <InfoRow label="End" value={`(${Math.round(shape.x2)}, ${Math.round(shape.y2)})`} />
          </PropertySection>
        )}
      </div>

      {/* Style Profiles */}
      <StyleProfilePanel />
    </div>
  );
}
