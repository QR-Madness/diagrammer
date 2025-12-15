import { useEffect, useRef, useCallback, useState } from 'react';
import { Engine } from '../engine/Engine';
import { Camera } from '../engine/Camera';
import { TextEditor } from './TextEditor';
import { useThemeStore } from '../store/themeStore';

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
        style={{
          display: 'block',
          outline: 'none',
          touchAction: 'none', // Prevent browser touch gestures
        }}
      />
      <TextEditor camera={camera} />
    </div>
  );
}

export default CanvasContainer;
