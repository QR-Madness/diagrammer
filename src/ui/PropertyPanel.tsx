import { useState, useCallback, useEffect, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useDocumentStore } from '../store/documentStore';
import { Shape, isRectangle, isEllipse, isLine, isText } from '../shapes/Shape';
import { ColorPalette } from './ColorPalette';
import './PropertyPanel.css';

/** Default and constraints for panel width */
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

/**
 * PropertyPanel component for editing selected shape properties.
 *
 * Shows and allows editing of:
 * - Fill color
 * - Stroke color
 * - Stroke width
 * - Opacity
 * - Shape-specific properties (corner radius, font size, etc.)
 */
export function PropertyPanel() {
  const selectedIds = useSessionStore((state) => state.selectedIds);
  const shapes = useDocumentStore((state) => state.shapes);
  const updateShape = useDocumentStore((state) => state.updateShape);

  // Resize state
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  // Handle resize move and end
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Dragging left edge: moving left increases width, moving right decreases
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Get selected shapes
  const selectedShapes = Array.from(selectedIds)
    .map((id) => shapes[id])
    .filter((s): s is Shape => s !== undefined);

  // No selection
  if (selectedShapes.length === 0) {
    return (
      <div className="property-panel" style={{ width }}>
        <div
          className={`property-panel-resize-handle ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleResizeStart}
        />
        <div className="property-panel-header">Properties</div>
        <div className="property-panel-empty">No shape selected</div>
      </div>
    );
  }

  // Get first selected shape for display (multi-selection shows first)
  const shape = selectedShapes[0]!;
  const isMultiple = selectedShapes.length > 1;

  const handleFillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    selectedShapes.forEach((s) => updateShape(s.id, { fill: value }));
  };

  const handleStrokeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    selectedShapes.forEach((s) => updateShape(s.id, { stroke: value }));
  };

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    selectedShapes.forEach((s) => updateShape(s.id, { strokeWidth: value }));
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    selectedShapes.forEach((s) => updateShape(s.id, { opacity: value }));
  };

  const handleCornerRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    selectedShapes.forEach((s) => {
      if (isRectangle(s)) {
        updateShape(s.id, { cornerRadius: value });
      }
    });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 16;
    selectedShapes.forEach((s) => {
      if (isText(s)) {
        updateShape(s.id, { fontSize: value });
      }
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    selectedShapes.forEach((s) => {
      if (isText(s)) {
        updateShape(s.id, { text: value });
      }
    });
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    selectedShapes.forEach((s) => {
      if (isRectangle(s) || isEllipse(s)) {
        // Use empty string check instead of undefined for TypeScript compatibility
        updateShape(s.id, value ? { label: value } : { label: '' });
      }
    });
  };

  const handleLabelFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 14;
    selectedShapes.forEach((s) => {
      if (isRectangle(s) || isEllipse(s)) {
        updateShape(s.id, { labelFontSize: value });
      }
    });
  };

  return (
    <div className="property-panel" style={{ width }}>
      <div
        className={`property-panel-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleResizeStart}
      />
      <div className="property-panel-header">
        Properties {isMultiple && `(${selectedShapes.length} shapes)`}
      </div>

      <div className="property-panel-content">
        {/* Shape Type */}
        <div className="property-row">
          <label className="property-label">Type</label>
          <span className="property-value">{shape.type}</span>
        </div>

        {/* Fill Color */}
        {shape.fill !== null && (
          <>
            <div className="property-row">
              <label className="property-label">Fill</label>
              <div className="property-input-group">
                <input
                  type="color"
                  value={shape.fill || '#000000'}
                  onChange={handleFillChange}
                  className="property-color"
                />
                <input
                  type="text"
                  value={shape.fill || ''}
                  onChange={(e) => handleFillChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                  className="property-text"
                  placeholder="#000000"
                />
              </div>
            </div>
            <ColorPalette
              value={shape.fill || ''}
              onChange={(color) => selectedShapes.forEach((s) => updateShape(s.id, { fill: color }))}
              showNoFill={true}
            />
          </>
        )}

        {/* Stroke Color */}
        {shape.stroke !== null && (
          <>
            <div className="property-row">
              <label className="property-label">Stroke</label>
              <div className="property-input-group">
                <input
                  type="color"
                  value={shape.stroke || '#000000'}
                  onChange={handleStrokeChange}
                  className="property-color"
                />
                <input
                  type="text"
                  value={shape.stroke || ''}
                  onChange={(e) => handleStrokeChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                  className="property-text"
                  placeholder="#000000"
                />
              </div>
            </div>
            <ColorPalette
              value={shape.stroke || ''}
              onChange={(color) => selectedShapes.forEach((s) => updateShape(s.id, { stroke: color }))}
            />
          </>
        )}

        {/* Stroke Width */}
        <div className="property-row">
          <label className="property-label">Stroke Width</label>
          <input
            type="number"
            value={shape.strokeWidth}
            onChange={handleStrokeWidthChange}
            className="property-number"
            min={0}
            max={50}
            step={1}
          />
        </div>

        {/* Opacity */}
        <div className="property-row">
          <label className="property-label">Opacity</label>
          <div className="property-input-group">
            <input
              type="range"
              value={shape.opacity}
              onChange={handleOpacityChange}
              className="property-slider"
              min={0}
              max={1}
              step={0.05}
            />
            <span className="property-value">{Math.round(shape.opacity * 100)}%</span>
          </div>
        </div>

        {/* Rectangle-specific: Corner Radius */}
        {isRectangle(shape) && (
          <div className="property-row">
            <label className="property-label">Corner Radius</label>
            <input
              type="number"
              value={shape.cornerRadius}
              onChange={handleCornerRadiusChange}
              className="property-number"
              min={0}
              max={100}
              step={1}
            />
          </div>
        )}

        {/* Label properties for Rectangle and Ellipse */}
        {(isRectangle(shape) || isEllipse(shape)) && (
          <>
            <div className="property-section">Label</div>
            <div className="property-row">
              <label className="property-label">Text</label>
              <input
                type="text"
                value={shape.label || ''}
                onChange={handleLabelChange}
                className="property-text"
                placeholder="Enter label..."
                style={{ flex: 1 }}
              />
            </div>
            <div className="property-row">
              <label className="property-label">Font Size</label>
              <input
                type="number"
                value={shape.labelFontSize || 14}
                onChange={handleLabelFontSizeChange}
                className="property-number"
                min={8}
                max={100}
                step={1}
              />
            </div>
          </>
        )}

        {/* Text-specific properties */}
        {isText(shape) && (
          <>
            <div className="property-row">
              <label className="property-label">Font Size</label>
              <input
                type="number"
                value={shape.fontSize}
                onChange={handleFontSizeChange}
                className="property-number"
                min={8}
                max={200}
                step={1}
              />
            </div>
            <div className="property-row property-row-full">
              <label className="property-label">Text</label>
              <textarea
                value={shape.text}
                onChange={handleTextChange}
                className="property-textarea"
                rows={3}
              />
            </div>
          </>
        )}

        {/* Position (read-only for now) */}
        <div className="property-section">Position</div>
        <div className="property-row">
          <label className="property-label">X</label>
          <span className="property-value">{Math.round(shape.x)}</span>
        </div>
        <div className="property-row">
          <label className="property-label">Y</label>
          <span className="property-value">{Math.round(shape.y)}</span>
        </div>
        <div className="property-row">
          <label className="property-label">Rotation</label>
          <span className="property-value">{Math.round((shape.rotation * 180) / Math.PI)}°</span>
        </div>

        {/* Size info for shapes with dimensions */}
        {(isRectangle(shape) || isEllipse(shape)) && (
          <>
            <div className="property-section">Size</div>
            {isRectangle(shape) && (
              <>
                <div className="property-row">
                  <label className="property-label">Width</label>
                  <span className="property-value">{Math.round(shape.width)}</span>
                </div>
                <div className="property-row">
                  <label className="property-label">Height</label>
                  <span className="property-value">{Math.round(shape.height)}</span>
                </div>
              </>
            )}
            {isEllipse(shape) && (
              <>
                <div className="property-row">
                  <label className="property-label">Radius X</label>
                  <span className="property-value">{Math.round(shape.radiusX)}</span>
                </div>
                <div className="property-row">
                  <label className="property-label">Radius Y</label>
                  <span className="property-value">{Math.round(shape.radiusY)}</span>
                </div>
              </>
            )}
          </>
        )}

        {/* Line endpoints */}
        {isLine(shape) && (
          <>
            <div className="property-section">Endpoints</div>
            <div className="property-row">
              <label className="property-label">Start</label>
              <span className="property-value">({Math.round(shape.x)}, {Math.round(shape.y)})</span>
            </div>
            <div className="property-row">
              <label className="property-label">End</label>
              <span className="property-value">({Math.round(shape.x2)}, {Math.round(shape.y2)})</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
