import { Camera } from './Camera';
import { Box } from '../math/Box';

/**
 * Configuration options for the Renderer.
 */
export interface RendererOptions {
  /** Whether to draw the background grid. Default: true */
  showGrid?: boolean;
  /** Grid spacing in world units. Default: 50 */
  gridSpacing?: number;
  /** Major grid line interval (every N lines). Default: 5 */
  majorGridInterval?: number;
  /** Minor grid line color. Default: '#e0e0e0' */
  gridColor?: string;
  /** Major grid line color. Default: '#c0c0c0' */
  majorGridColor?: string;
  /** Background color. Default: '#ffffff' */
  backgroundColor?: string;
  /** Whether to show FPS counter. Default: false */
  showFps?: boolean;
}

/**
 * Performance metrics for the renderer.
 */
export interface RenderMetrics {
  /** Current frames per second */
  fps: number;
  /** Time spent on last frame in milliseconds */
  frameTime: number;
  /** Number of render calls since last reset */
  frameCount: number;
}

/**
 * Callback type for tool overlay rendering.
 * Tools can use this to draw their overlays (e.g., selection box, guides).
 */
export type ToolOverlayCallback = (ctx: CanvasRenderingContext2D) => void;

const DEFAULT_OPTIONS: Required<RendererOptions> = {
  showGrid: true,
  gridSpacing: 50,
  majorGridInterval: 5,
  gridColor: '#e0e0e0',
  majorGridColor: '#c0c0c0',
  backgroundColor: '#ffffff',
  showFps: false,
};

/**
 * Renderer handles all canvas rendering operations.
 *
 * The renderer uses requestAnimationFrame for efficient rendering,
 * coalescing multiple render requests into a single frame.
 *
 * Rendering flow:
 * 1. Clear canvas with background color
 * 2. Apply camera transform
 * 3. Draw grid (in world space)
 * 4. (Future) Draw shapes in z-order
 * 5. Restore transform
 * 6. (Future) Draw selection overlay (in screen space)
 * 7. Let active tool draw its overlay
 * 8. Draw FPS counter if enabled
 *
 * Usage:
 * ```typescript
 * const renderer = new Renderer(canvas, camera, { showGrid: true });
 *
 * // Request render when something changes
 * renderer.requestRender();
 *
 * // Set tool overlay callback
 * renderer.setToolOverlayCallback((ctx) => {
 *   // Draw tool-specific overlay
 * });
 *
 * // Clean up
 * renderer.destroy();
 * ```
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private options: Required<RendererOptions>;

  // Render state
  private frameId: number | null = null;
  private needsRender: boolean = false;
  private destroyed: boolean = false;

  // Tool overlay callback
  private toolOverlayCallback: ToolOverlayCallback | null = null;

  // Performance metrics
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;
  private lastFrameDuration: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    options?: RendererOptions
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;

    // Initialize timing
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
  }

  /**
   * Request a render on the next animation frame.
   * Multiple requests within a single frame are coalesced.
   */
  requestRender(): void {
    if (this.destroyed) return;
    if (this.needsRender) return;

    this.needsRender = true;
    this.frameId = requestAnimationFrame((timestamp) => this.render(timestamp));
  }

  /**
   * Force an immediate synchronous render.
   * Use sparingly - prefer requestRender() for most cases.
   */
  renderNow(): void {
    if (this.destroyed) return;

    // Cancel any pending frame
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.needsRender = false;

    this.render(performance.now());
  }

  /**
   * Set the callback for tool overlay rendering.
   * The callback receives the canvas context with screen-space transform.
   */
  setToolOverlayCallback(callback: ToolOverlayCallback | null): void {
    this.toolOverlayCallback = callback;
  }

  /**
   * Update renderer options.
   */
  setOptions(options: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current performance metrics.
   */
  getMetrics(): RenderMetrics {
    return {
      fps: this.currentFps,
      frameTime: this.lastFrameDuration,
      frameCount: this.frameCount,
    };
  }

  /**
   * Reset performance metrics.
   */
  resetMetrics(): void {
    this.frameCount = 0;
    this.currentFps = 0;
    this.lastFrameDuration = 0;
    this.fpsUpdateTime = performance.now();
  }

  /**
   * Update the camera reference.
   */
  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  /**
   * Check if a render is pending.
   */
  get isPending(): boolean {
    return this.needsRender;
  }

  /**
   * Check if the renderer has been destroyed.
   */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Clean up the renderer.
   * Cancels any pending animation frame.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.needsRender = false;
    this.toolOverlayCallback = null;
  }

  /**
   * Main render loop.
   */
  private render(timestamp: number): void {
    this.needsRender = false;
    this.frameId = null;

    if (this.destroyed) return;

    // Update performance metrics
    this.updateMetrics(timestamp);

    const { ctx, canvas, options } = this;
    const { width, height } = canvas;

    // Skip rendering if canvas has no size
    if (width === 0 || height === 0) return;

    // 1. Clear canvas with background color
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Apply camera transform and draw world-space content
    ctx.save();
    this.applyCameraTransform();

    // 3. Draw grid in world space
    if (options.showGrid) {
      this.drawGrid();
    }

    // 4. (Future) Draw shapes in z-order - will be implemented in Phase 2
    // This is where shape rendering will be added

    // 5. Restore transform for screen-space drawing
    ctx.restore();

    // 6. (Future) Draw selection overlay - will be implemented in Phase 2

    // 7. Let active tool draw its overlay (screen space)
    if (this.toolOverlayCallback) {
      ctx.save();
      this.toolOverlayCallback(ctx);
      ctx.restore();
    }

    // 8. Draw FPS counter if enabled
    if (options.showFps) {
      this.drawFpsCounter();
    }
  }

  /**
   * Apply the camera transformation to the canvas context.
   */
  private applyCameraTransform(): void {
    const matrix = this.camera.getTransformMatrix();
    // Mat3 provides setOnContext method to apply transform directly
    matrix.setOnContext(this.ctx);
  }

  /**
   * Draw the background grid.
   * Grid is drawn in world space with both minor and major lines.
   */
  private drawGrid(): void {
    const { ctx, options } = this;
    const { gridSpacing, majorGridInterval, gridColor, majorGridColor } =
      options;

    // Get visible bounds in world space
    const bounds = this.camera.getVisibleBounds();

    // Expand bounds slightly to ensure grid covers edges during pan
    const padding = gridSpacing;
    const gridBounds = new Box(
      bounds.minX - padding,
      bounds.minY - padding,
      bounds.maxX + padding,
      bounds.maxY + padding
    );

    // Calculate grid line positions (snap to grid spacing)
    const startX = Math.floor(gridBounds.minX / gridSpacing) * gridSpacing;
    const startY = Math.floor(gridBounds.minY / gridSpacing) * gridSpacing;
    const endX = Math.ceil(gridBounds.maxX / gridSpacing) * gridSpacing;
    const endY = Math.ceil(gridBounds.maxY / gridSpacing) * gridSpacing;

    // Adaptive line width based on zoom
    const zoom = this.camera.zoom;
    const baseLineWidth = 1 / zoom; // Constant screen-space width

    // Draw minor grid lines
    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = baseLineWidth;

    for (let x = startX; x <= endX; x += gridSpacing) {
      // Skip major lines (will be drawn separately)
      const gridIndex = Math.round(x / gridSpacing);
      if (gridIndex % majorGridInterval === 0) continue;

      ctx.moveTo(x, gridBounds.minY);
      ctx.lineTo(x, gridBounds.maxY);
    }

    for (let y = startY; y <= endY; y += gridSpacing) {
      const gridIndex = Math.round(y / gridSpacing);
      if (gridIndex % majorGridInterval === 0) continue;

      ctx.moveTo(gridBounds.minX, y);
      ctx.lineTo(gridBounds.maxX, y);
    }

    ctx.stroke();

    // Draw major grid lines
    ctx.beginPath();
    ctx.strokeStyle = majorGridColor;
    ctx.lineWidth = baseLineWidth * 1.5;

    const majorSpacing = gridSpacing * majorGridInterval;
    const majorStartX = Math.floor(gridBounds.minX / majorSpacing) * majorSpacing;
    const majorStartY = Math.floor(gridBounds.minY / majorSpacing) * majorSpacing;

    for (let x = majorStartX; x <= endX; x += majorSpacing) {
      ctx.moveTo(x, gridBounds.minY);
      ctx.lineTo(x, gridBounds.maxY);
    }

    for (let y = majorStartY; y <= endY; y += majorSpacing) {
      ctx.moveTo(gridBounds.minX, y);
      ctx.lineTo(gridBounds.maxX, y);
    }

    ctx.stroke();

    // Draw origin crosshair (thicker line at x=0 and y=0)
    if (gridBounds.minX <= 0 && gridBounds.maxX >= 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#808080';
      ctx.lineWidth = baseLineWidth * 2;
      ctx.moveTo(0, gridBounds.minY);
      ctx.lineTo(0, gridBounds.maxY);
      ctx.stroke();
    }

    if (gridBounds.minY <= 0 && gridBounds.maxY >= 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#808080';
      ctx.lineWidth = baseLineWidth * 2;
      ctx.moveTo(gridBounds.minX, 0);
      ctx.lineTo(gridBounds.maxX, 0);
      ctx.stroke();
    }
  }

  /**
   * Draw FPS counter in screen space.
   */
  private drawFpsCounter(): void {
    const { ctx } = this;
    const text = `${Math.round(this.currentFps)} FPS`;

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 10, 70, 24);

    // Text
    ctx.fillStyle = '#00ff00';
    ctx.font = '14px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 16, 22);

    ctx.restore();
  }

  /**
   * Update performance metrics.
   */
  private updateMetrics(timestamp: number): void {
    // Calculate frame duration
    this.lastFrameDuration = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.frameCount++;

    // Update FPS every 500ms
    const fpsElapsed = timestamp - this.fpsUpdateTime;
    if (fpsElapsed >= 500) {
      // Calculate FPS from last frame time
      this.currentFps = this.lastFrameDuration > 0 ? 1000 / this.lastFrameDuration : 0;
      this.fpsUpdateTime = timestamp;
    }
  }
}
