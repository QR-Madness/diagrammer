import { useEffect, useRef, useCallback } from 'react';
import { Camera } from '../engine/Camera';
import { Renderer } from '../engine/Renderer';
import { InputHandler, NormalizedPointerEvent } from '../engine/InputHandler';
import { Vec2 } from '../math/Vec2';

/**
 * Props for the CanvasContainer component.
 */
export interface CanvasContainerProps {
  /** Whether to show the background grid. Default: true */
  showGrid?: boolean;
  /** Whether to show the FPS counter. Default: false */
  showFps?: boolean;
  /** Callback when a pointer event occurs */
  onPointerEvent?: (event: NormalizedPointerEvent) => void;
  /** Callback when a keyboard event occurs */
  onKeyEvent?: (event: KeyboardEvent) => void;
  /** Callback when a wheel event occurs */
  onWheelEvent?: (event: WheelEvent, worldPoint: Vec2) => void;
  /** Additional CSS class names */
  className?: string;
}

/** Zoom factor per wheel delta unit */
const ZOOM_SENSITIVITY = 0.001;

/**
 * CanvasContainer is the bridge between React and the canvas engine.
 *
 * Responsibilities:
 * - Mounts and manages the canvas element
 * - Handles DPI scaling for crisp rendering on high-DPI displays
 * - Observes container resize and updates canvas dimensions
 * - Initializes Camera, Renderer, and InputHandler
 * - Forwards input events to registered callbacks
 * - Cleans up resources on unmount
 *
 * Usage:
 * ```tsx
 * <CanvasContainer
 *   showGrid={true}
 *   showFps={process.env.NODE_ENV === 'development'}
 *   onPointerEvent={(e) => toolManager.handlePointerEvent(e)}
 *   onKeyEvent={(e) => toolManager.handleKeyEvent(e)}
 * />
 * ```
 */
export function CanvasContainer({
  showGrid = true,
  showFps = false,
  onPointerEvent,
  onKeyEvent,
  onWheelEvent,
  className,
}: CanvasContainerProps) {
  // Refs for DOM elements and engine components
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);

  // Track current DPI for resize handling
  const dpiRef = useRef<number>(1);

  /**
   * Update canvas size to match container, accounting for DPI.
   */
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    if (!container || !canvas || !camera || !renderer) return;

    // Get container dimensions (CSS pixels)
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Get device pixel ratio for high-DPI displays
    const dpi = window.devicePixelRatio || 1;
    dpiRef.current = dpi;

    // Set canvas buffer size (actual pixels)
    const bufferWidth = Math.floor(width * dpi);
    const bufferHeight = Math.floor(height * dpi);

    // Only update if size changed (avoid unnecessary work)
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;

      // Set CSS size to match container
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Update camera viewport (in CSS pixels, not buffer pixels)
      // The camera works in logical coordinates
      camera.setViewport(width, height);

      // Scale context to account for DPI
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
      }

      // Request re-render
      renderer.requestRender();
    }
  }, []);

  /**
   * Handle pointer events from InputHandler.
   */
  const handlePointerEvent = useCallback(
    (event: NormalizedPointerEvent) => {
      onPointerEvent?.(event);

      // Request render for visual feedback
      rendererRef.current?.requestRender();
    },
    [onPointerEvent]
  );

  /**
   * Handle keyboard events from InputHandler.
   */
  const handleKeyEvent = useCallback(
    (event: KeyboardEvent) => {
      onKeyEvent?.(event);
    },
    [onKeyEvent]
  );

  /**
   * Handle wheel events for zoom.
   */
  const handleWheelEvent = useCallback(
    (event: WheelEvent, worldPoint: Vec2) => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;

      if (!camera || !renderer) return;

      // Call custom handler if provided
      if (onWheelEvent) {
        onWheelEvent(event, worldPoint);
      } else {
        // Default zoom behavior
        const delta = -event.deltaY * ZOOM_SENSITIVITY;
        const factor = 1 + delta;

        // Get screen point for zoom center
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const screenPoint = new Vec2(
            event.clientX - rect.left,
            event.clientY - rect.top
          );
          camera.zoomAt(screenPoint, factor);
        }
      }

      // Request render after zoom
      renderer.requestRender();
    },
    [onWheelEvent]
  );

  /**
   * Initialize engine components on mount.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create Camera
    const camera = new Camera();
    cameraRef.current = camera;

    // Create Renderer
    const renderer = new Renderer(canvas, camera, {
      showGrid,
      showFps,
    });
    rendererRef.current = renderer;

    // Create InputHandler
    const inputHandler = new InputHandler(
      canvas,
      camera,
      handlePointerEvent,
      handleKeyEvent,
      handleWheelEvent
    );
    inputHandlerRef.current = inputHandler;

    // Set initial canvas size
    updateCanvasSize();

    // Initial render
    renderer.requestRender();

    // Cleanup on unmount
    return () => {
      inputHandler.destroy();
      renderer.destroy();
      cameraRef.current = null;
      rendererRef.current = null;
      inputHandlerRef.current = null;
    };
  }, []); // Only run on mount/unmount

  /**
   * Update renderer options when props change.
   */
  useEffect(() => {
    rendererRef.current?.setOptions({ showGrid, showFps });
    rendererRef.current?.requestRender();
  }, [showGrid, showFps]);

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
    </div>
  );
}

export default CanvasContainer;
