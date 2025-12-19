/**
 * StatusBar - Bottom status bar with zoom controls and info.
 *
 * Shows:
 * - Zoom level with quick controls
 * - Shape count
 * - Current active tool
 */

import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useDocumentStore } from '../store/documentStore';
import { calculateCombinedBounds } from '../shapes/utils/bounds';
import './StatusBar.css';

/**
 * Zoom preset values.
 */
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/**
 * StatusBar component.
 */
export function StatusBar() {
  const camera = useSessionStore((state) => state.camera);
  const setCamera = useSessionStore((state) => state.setCamera);
  const activeTool = useSessionStore((state) => state.activeTool);
  const cursorWorldPosition = useSessionStore((state) => state.cursorWorldPosition);
  const shapeCount = useDocumentStore((state) => state.shapeOrder.length);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const currentZoom = camera.zoom;
    const nextZoom = ZOOM_PRESETS.find((z) => z > currentZoom) || currentZoom * 1.25;
    setCamera({ zoom: Math.min(10, nextZoom) });
  }, [camera.zoom, setCamera]);

  const handleZoomOut = useCallback(() => {
    const currentZoom = camera.zoom;
    const nextZoom = [...ZOOM_PRESETS].reverse().find((z) => z < currentZoom) || currentZoom / 1.25;
    setCamera({ zoom: Math.max(0.1, nextZoom) });
  }, [camera.zoom, setCamera]);

  const handleZoomFit = useCallback(() => {
    // Get all shapes and calculate combined bounds
    const documentState = useDocumentStore.getState();
    const shapes = Object.values(documentState.shapes);

    if (shapes.length === 0) {
      // No shapes, reset to default view
      setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }

    const bounds = calculateCombinedBounds(shapes);
    if (!bounds) {
      setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }

    // Get viewport size (approximate from document body or use defaults)
    // StatusBar doesn't have direct access to viewport, so we use window
    const viewportWidth = window.innerWidth * 0.7; // Approximate canvas width
    const viewportHeight = window.innerHeight - 100; // Approximate canvas height

    // Add padding (10% on each side)
    const padding = 0.1;
    const contentWidth = bounds.width * (1 + padding * 2);
    const contentHeight = bounds.height * (1 + padding * 2);

    // Calculate zoom to fit content
    const zoomX = viewportWidth / contentWidth;
    const zoomY = viewportHeight / contentHeight;
    const zoom = Math.min(zoomX, zoomY, 2); // Cap at 2x zoom

    // Center camera on content bounds center
    const centerX = bounds.center.x;
    const centerY = bounds.center.y;

    setCamera({ x: centerX, y: centerY, zoom: Math.max(0.1, zoom) });
  }, [setCamera]);

  const handleZoom100 = useCallback(() => {
    setCamera({ zoom: 1 });
  }, [setCamera]);

  // Format zoom percentage
  const zoomPercent = Math.round(camera.zoom * 100);

  // Format tool name
  const toolDisplayName = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);

  return (
    <div className="status-bar">
      {/* Left Section: Cursor Position */}
      <div className="status-bar-section status-bar-left">
        <span className="status-bar-label">X:</span>
        <span className="status-bar-value">{cursorWorldPosition ? Math.round(cursorWorldPosition.x) : '—'}</span>
        <span className="status-bar-label">Y:</span>
        <span className="status-bar-value">{cursorWorldPosition ? Math.round(cursorWorldPosition.y) : '—'}</span>
      </div>

      {/* Center Section: Zoom Controls */}
      <div className="status-bar-section status-bar-center">
        <button className="status-bar-zoom-btn" onClick={handleZoomOut} title="Zoom out">
          -
        </button>
        <span className="status-bar-zoom-value">{zoomPercent}%</span>
        <button className="status-bar-zoom-btn" onClick={handleZoomIn} title="Zoom in">
          +
        </button>
        <div className="status-bar-divider" />
        <button className="status-bar-btn" onClick={handleZoomFit} title="Fit to center">
          Fit
        </button>
        <button className="status-bar-btn" onClick={handleZoom100} title="Reset to 100%">
          100%
        </button>
      </div>

      {/* Right Section: Info */}
      <div className="status-bar-section status-bar-right">
        <span className="status-bar-info">
          <span className="status-bar-label">Shapes:</span>
          <span className="status-bar-value">{shapeCount.toLocaleString()}</span>
        </span>
        <div className="status-bar-divider" />
        <span className="status-bar-tool">{toolDisplayName}</span>
      </div>
    </div>
  );
}

export default StatusBar;
