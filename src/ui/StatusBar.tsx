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
    // Reset to default view
    setCamera({ x: 0, y: 0, zoom: 1 });
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
      {/* Left Section: Position (placeholder) */}
      <div className="status-bar-section status-bar-left">
        <span className="status-bar-label">X:</span>
        <span className="status-bar-value">{Math.round(camera.x)}</span>
        <span className="status-bar-label">Y:</span>
        <span className="status-bar-value">{Math.round(camera.y)}</span>
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
