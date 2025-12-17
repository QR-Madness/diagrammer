import { useEffect, useRef, useCallback, useState } from 'react';
import { Engine } from '../engine/Engine';
import { Camera } from '../engine/Camera';
import { TextEditor } from './TextEditor';
import { ContextMenu } from './ContextMenu';
import { ExportDialog } from './ExportDialog';
import { useThemeStore } from '../store/themeStore';
import { useSessionStore } from '../store/sessionStore';

/**
 * Props for the CanvasContainer component.
 */
export interface CanvasContainerProps {
  /** Whether to show the background grid. Default: true */
  showGrid?: boolean;
  /** Whether to show the FPS counter. Default: false */
  showFps?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * CanvasContainer is the bridge between React and the canvas engine.
 *
 * Responsibilities:
 * - Mounts and manages the canvas element
 * - Handles DPI scaling for crisp rendering on high-DPI displays
 * - Observes container resize and updates canvas dimensions
 * - Initializes the Engine which coordinates all components
 * - Cleans up resources on unmount
 *
 * Usage:
 * ```tsx
 * <CanvasContainer
 *   showGrid={true}
 *   showFps={process.env.NODE_ENV === 'development'}
 * />
 * ```
 */
export function CanvasContainer({
  showGrid = true,
  showFps = false,
  className,
}: CanvasContainerProps) {
  // Refs for DOM elements and engine
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  // State for camera reference (for TextEditor positioning)
  const [camera, setCamera] = useState<Camera | null>(null);

  // Track canvas focus state for visual indicator
  const [isFocused, setIsFocused] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  /**
   * Update canvas size to match container, accounting for DPI.
   */
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const engine = engineRef.current;

    if (!container || !canvas || !engine) return;

    // Get container dimensions (CSS pixels)
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width > 0 && height > 0) {
      engine.resize(width, height);
    }
  }, []);

  /**
   * Initialize engine on mount.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create Engine
    const engine = new Engine(canvas, {
      showGrid,
      showFps,
      initialTool: 'select',
    });
    engineRef.current = engine;
    setCamera(engine.camera);

    // Set initial canvas size
    updateCanvasSize();

    // Cleanup on unmount
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []); // Only run on mount/unmount

  /**
   * Update renderer options when props change.
   */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.renderer.setOptions({ showGrid, showFps });
    engine.requestRender();
  }, [showGrid, showFps]);

  /**
   * Subscribe to theme changes and update renderer colors.
   */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // Update renderer with theme colors
    const updateThemeColors = () => {
      const { colors } = useThemeStore.getState();
      engine.renderer.setOptions({
        backgroundColor: colors.backgroundColor,
        gridColor: colors.gridColor,
        majorGridColor: colors.majorGridColor,
        originColor: colors.originColor,
        selectionColor: colors.selectionColor,
        handleFillColor: colors.handleFillColor,
        handleStrokeColor: colors.handleStrokeColor,
      });
      engine.requestRender();
    };

    // Initial update
    updateThemeColors();

    // Subscribe to theme changes
    const unsubscribe = useThemeStore.subscribe(updateThemeColors);

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Subscribe to emphasis changes for focus animation.
   */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let lastEmphasis: string | null = null;

    // Update renderer with emphasis state
    const updateEmphasis = () => {
      const { emphasizedShapeId } = useSessionStore.getState();
      if (emphasizedShapeId !== lastEmphasis) {
        lastEmphasis = emphasizedShapeId;
        engine.renderer.setEmphasis(emphasizedShapeId);
        engine.requestRender();
      }
    };

    // Initial update
    updateEmphasis();

    // Subscribe to session store changes
    const unsubscribe = useSessionStore.subscribe(updateEmphasis);

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Set up ResizeObserver to handle container resize.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(container);

    // Also listen for DPI changes (e.g., moving window between monitors)
    const mediaQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );

    const handleDpiChange = () => {
      updateCanvasSize();
    };

    mediaQuery.addEventListener('change', handleDpiChange);

    return () => {
      resizeObserver.disconnect();
      mediaQuery.removeEventListener('change', handleDpiChange);
    };
  }, [updateCanvasSize]);

  /**
   * Handle focus for keyboard events.
   * Canvas needs tabIndex to be focusable.
   */
  const handleCanvasClick = useCallback(() => {
    canvasRef.current?.focus();
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  /**
   * Handle right-click to show context menu.
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleExportSelection = useCallback(() => {
    setExportDialogOpen(true);
  }, []);

  const handleCloseExportDialog = useCallback(() => {
    setExportDialogOpen(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onClick={handleCanvasClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContextMenu={handleContextMenu}
        style={{
          display: 'block',
          outline: 'none',
          touchAction: 'none', // Prevent browser touch gestures
        }}
      />
      {/* Focus indicator - shows when canvas is not focused */}
      {!isFocused && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 0 3px rgba(239, 68, 68, 0.5)',
            borderRadius: '2px',
          }}
        />
      )}
      <TextEditor camera={camera} />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onExport={handleExportSelection}
        />
      )}
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={handleCloseExportDialog}
        scope="selection"
        defaultFilename="selection"
      />
    </div>
  );
}

export default CanvasContainer;
