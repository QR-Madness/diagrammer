import { Camera } from './Camera';
import { Renderer } from './Renderer';
import { InputHandler, NormalizedPointerEvent } from './InputHandler';
import { SpatialIndex } from './SpatialIndex';
import { HitTester } from './HitTester';
import { ToolManager } from './ToolManager';
import { ToolContext } from './tools/Tool';
import { PanTool } from './tools/PanTool';
import { SelectTool } from './tools/SelectTool';
import { RectangleTool } from './tools/RectangleTool';
import { EllipseTool } from './tools/EllipseTool';
import { LineTool } from './tools/LineTool';
import { TextTool } from './tools/TextTool';
import { Vec2 } from '../math/Vec2';
import { Shape } from '../shapes/Shape';
import { useDocumentStore } from '../store/documentStore';
import { useSessionStore, ToolType, deleteSelected } from '../store/sessionStore';
import { useHistoryStore, pushHistory } from '../store/historyStore';
import { nanoid } from 'nanoid';

// Import shape handlers to register them
import '../shapes/Rectangle';
import '../shapes/Ellipse';
import '../shapes/Line';
import '../shapes/Text';

// Clipboard for copy/paste (module-level to persist across operations)
let clipboard: Shape[] = [];

/**
 * Configuration options for the Engine.
 */
export interface EngineOptions {
  /** Whether to show the background grid */
  showGrid?: boolean;
  /** Whether to show the FPS counter */
  showFps?: boolean;
  /** Initial tool type */
  initialTool?: ToolType;
}

const DEFAULT_OPTIONS: Required<EngineOptions> = {
  showGrid: true,
  showFps: false,
  initialTool: 'select',
};

/**
 * Main engine class that coordinates all components.
 *
 * The Engine:
 * - Initializes and owns all core components (Camera, Renderer, InputHandler, etc.)
 * - Wires up event handlers between components
 * - Subscribes to store changes and updates renderer
 * - Provides the ToolContext for tools to interact with the system
 * - Manages the application lifecycle
 *
 * Usage:
 * ```typescript
 * const engine = new Engine(canvas, {
 *   showGrid: true,
 *   showFps: true,
 *   initialTool: 'select',
 * });
 *
 * // Engine auto-registers default tools and subscribes to stores
 *
 * // Set canvas size on resize
 * engine.resize(width, height);
 *
 * // Clean up
 * engine.destroy();
 * ```
 */
export class Engine {
  // Core components
  readonly camera: Camera;
  readonly renderer: Renderer;
  readonly inputHandler: InputHandler;
  readonly spatialIndex: SpatialIndex;
  readonly hitTester: HitTester;
  readonly toolManager: ToolManager;

  // State
  private canvas: HTMLCanvasElement;
  private options: Required<EngineOptions>;
  private destroyed = false;

  // Store unsubscribe functions
  private unsubscribeDocument: (() => void) | null = null;
  private unsubscribeSession: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, options?: EngineOptions) {
    this.canvas = canvas;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize camera
    this.camera = new Camera();

    // Initialize renderer
    this.renderer = new Renderer(canvas, this.camera, {
      showGrid: this.options.showGrid,
      showFps: this.options.showFps,
    });

    // Initialize spatial index and hit tester
    this.spatialIndex = new SpatialIndex();
    this.hitTester = new HitTester(this.spatialIndex);

    // Create tool context
    const toolContext = this.createToolContext();

    // Initialize tool manager
    this.toolManager = new ToolManager(toolContext);

    // Register default tools
    this.registerDefaultTools();

    // Initialize input handler
    this.inputHandler = new InputHandler(
      canvas,
      this.camera,
      (event) => this.handlePointerEvent(event),
      (event) => this.handleKeyDown(event),
      (event, worldPoint) => this.handleWheel(event, worldPoint)
    );

    // Subscribe to stores
    this.subscribeToStores();

    // Set initial tool
    this.toolManager.setActiveTool(this.options.initialTool);

    // Initial render
    this.syncFromStores();
    this.renderer.requestRender();
  }

  /**
   * Resize the canvas and update camera viewport.
   * @param width - CSS pixel width
   * @param height - CSS pixel height
   */
  resize(width: number, height: number): void {
    // Update camera viewport
    this.camera.setViewport(width, height);

    // Update canvas size (handling DPI)
    const dpi = window.devicePixelRatio || 1;
    this.canvas.width = width * dpi;
    this.canvas.height = height * dpi;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Update renderer DPI
    this.renderer.setDpi(dpi);

    // Request render
    this.renderer.requestRender();
  }

  /**
   * Set the active tool.
   */
  setActiveTool(type: ToolType): void {
    this.toolManager.setActiveTool(type);
    useSessionStore.getState().setActiveTool(type);
  }

  /**
   * Get the active tool type.
   */
  getActiveTool(): ToolType | null {
    return this.toolManager.getActiveToolType();
  }

  /**
   * Force a render on the next animation frame.
   */
  requestRender(): void {
    this.renderer.requestRender();
  }

  /**
   * Clean up the engine and all components.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Unsubscribe from stores
    this.unsubscribeDocument?.();
    this.unsubscribeSession?.();

    // Destroy components
    this.toolManager.destroy();
    this.inputHandler.destroy();
    this.renderer.destroy();
  }

  // Private methods

  /**
   * Create the tool context that provides tools access to engine components.
   */
  private createToolContext(): ToolContext {
    const documentStore = useDocumentStore;
    const sessionStore = useSessionStore;

    return {
      camera: this.camera,
      renderer: this.renderer,
      hitTester: this.hitTester,
      spatialIndex: this.spatialIndex,

      // Store accessors
      getShapes: () => documentStore.getState().shapes,
      getShapeOrder: () => documentStore.getState().shapeOrder,
      getSelectedIds: () => sessionStore.getState().getSelectedIds(),
      getSelectedShapes: () => {
        const selectedIds = sessionStore.getState().getSelectedIds();
        const shapes = documentStore.getState().shapes;
        return selectedIds
          .map((id) => shapes[id])
          .filter((s): s is Shape => s !== undefined);
      },

      // Store mutations
      select: (ids) => sessionStore.getState().select(ids),
      addToSelection: (ids) => sessionStore.getState().addToSelection(ids),
      removeFromSelection: (ids) => sessionStore.getState().removeFromSelection(ids),
      clearSelection: () => sessionStore.getState().clearSelection(),
      addShape: (shape) => documentStore.getState().addShape(shape),
      updateShape: (id, updates) => documentStore.getState().updateShape(id, updates),
      updateShapes: (updates) => documentStore.getState().updateShapes(updates),
      deleteShape: (id) => documentStore.getState().deleteShape(id),
      deleteShapes: (ids) => documentStore.getState().deleteShapes(ids),

      // UI state
      setCursor: (cursor) => {
        sessionStore.getState().setCursor(cursor);
        this.canvas.style.cursor = cursor;
      },
      setIsInteracting: (isInteracting) =>
        sessionStore.getState().setIsInteracting(isInteracting),
      setActiveTool: (tool) => {
        this.toolManager.setActiveTool(tool);
        sessionStore.getState().setActiveTool(tool);
      },
      startTextEdit: (id) => {
        sessionStore.getState().startTextEdit(id);
      },

      // Rendering
      requestRender: () => this.renderer.requestRender(),

      // History
      pushHistory: (description) => pushHistory(description),
    };
  }

  /**
   * Register the default tools.
   */
  private registerDefaultTools(): void {
    this.toolManager.register(new SelectTool());
    this.toolManager.register(new PanTool());
    this.toolManager.register(new RectangleTool());
    this.toolManager.register(new EllipseTool());
    this.toolManager.register(new LineTool());
    this.toolManager.register(new TextTool());
  }

  /**
   * Subscribe to document and session store changes.
   */
  private subscribeToStores(): void {
    // Subscribe to document store
    this.unsubscribeDocument = useDocumentStore.subscribe((state) => {
      // Update renderer with new shape data
      this.renderer.setShapes(state.shapes, state.shapeOrder);

      // Update spatial index
      this.spatialIndex.rebuild(Object.values(state.shapes));

      // Request render
      this.renderer.requestRender();
    });

    // Subscribe to session store
    let previousTool = useSessionStore.getState().activeTool;
    this.unsubscribeSession = useSessionStore.subscribe((state) => {
      // Sync tool changes from sessionStore to toolManager
      if (state.activeTool !== previousTool) {
        previousTool = state.activeTool;
        // Only update if different from current tool manager state
        if (this.toolManager.getActiveToolType() !== state.activeTool) {
          this.toolManager.setActiveTool(state.activeTool);
        }
      }

      // Update renderer with selection
      this.renderer.setSelection(state.selectedIds);

      // Update canvas cursor
      this.canvas.style.cursor = state.cursor;

      // Update tool overlay callback
      this.renderer.setToolOverlayCallback(
        this.toolManager.getToolOverlayCallback()
      );

      // Request render
      this.renderer.requestRender();
    });
  }

  /**
   * Sync renderer state from stores (initial sync).
   */
  private syncFromStores(): void {
    const documentState = useDocumentStore.getState();
    const sessionState = useSessionStore.getState();

    this.renderer.setShapes(documentState.shapes, documentState.shapeOrder);
    this.renderer.setSelection(sessionState.selectedIds);
    this.spatialIndex.rebuild(Object.values(documentState.shapes));
    this.renderer.setToolOverlayCallback(
      this.toolManager.getToolOverlayCallback()
    );
  }

  // Event handlers

  private handlePointerEvent(event: NormalizedPointerEvent): void {
    this.toolManager.handlePointerEvent(event);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Let tool manager handle first
    const handled = this.toolManager.handleKeyDown(event);

    if (!handled) {
      // Handle global shortcuts
      this.handleGlobalShortcuts(event);
    }
  }

  /**
   * Handle global keyboard shortcuts.
   */
  private handleGlobalShortcuts(event: KeyboardEvent): void {
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    // Ctrl+Z / Cmd+Z: Undo
    if (isCtrl && !isShift && event.key === 'z') {
      event.preventDefault();
      if (useHistoryStore.getState().canUndo()) {
        useHistoryStore.getState().undo();
        this.renderer.requestRender();
      }
      return;
    }

    // Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y: Redo
    if ((isCtrl && isShift && event.key === 'z') || (isCtrl && event.key === 'y')) {
      event.preventDefault();
      if (useHistoryStore.getState().canRedo()) {
        useHistoryStore.getState().redo();
        this.renderer.requestRender();
      }
      return;
    }

    // Ctrl+A / Cmd+A: Select All
    if (isCtrl && event.key === 'a') {
      event.preventDefault();
      useSessionStore.getState().selectAll();
      this.renderer.requestRender();
      return;
    }

    // Delete / Backspace: Delete selected shapes
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedIds = useSessionStore.getState().getSelectedIds();
      if (selectedIds.length > 0) {
        event.preventDefault();
        pushHistory('Delete shapes');
        deleteSelected();
        this.renderer.requestRender();
      }
      return;
    }

    // Escape: Clear selection
    if (event.key === 'Escape') {
      if (useSessionStore.getState().hasSelection()) {
        event.preventDefault();
        useSessionStore.getState().clearSelection();
        this.renderer.requestRender();
      }
      return;
    }

    // Ctrl+C / Cmd+C: Copy selected shapes
    if (isCtrl && event.key === 'c') {
      const selectedIds = useSessionStore.getState().getSelectedIds();
      if (selectedIds.length > 0) {
        event.preventDefault();
        const shapes = useDocumentStore.getState().shapes;
        clipboard = selectedIds.map((id) => ({ ...shapes[id]! }));
      }
      return;
    }

    // Ctrl+V / Cmd+V: Paste shapes
    if (isCtrl && event.key === 'v') {
      if (clipboard.length > 0) {
        event.preventDefault();
        pushHistory('Paste shapes');

        const newIds: string[] = [];
        const offset = 20; // Offset pasted shapes slightly

        for (const shape of clipboard) {
          const newId = nanoid();
          const newShape: Shape = {
            ...shape,
            id: newId,
            x: shape.x + offset,
            y: shape.y + offset,
          };
          useDocumentStore.getState().addShape(newShape);
          this.spatialIndex.insert(newShape);
          newIds.push(newId);
        }

        // Select pasted shapes
        useSessionStore.getState().select(newIds);

        // Update clipboard with new positions for subsequent pastes
        clipboard = clipboard.map((s) => ({ ...s, x: s.x + offset, y: s.y + offset }));

        this.renderer.requestRender();
      }
      return;
    }
  }

  private handleWheel(event: WheelEvent, worldPoint: Vec2): void {
    // Let tool manager handle first
    const handled = this.toolManager.handleWheel(event, worldPoint);

    if (!handled) {
      // Default wheel behavior: zoom with linear acceleration
      // Use smaller base factor for smoother zooming
      const baseZoomStep = 0.02; // 2% per unit of delta
      const maxZoomStep = 0.15; // Cap maximum zoom change per event

      // Normalize deltaY (different browsers/devices have different scales)
      // Typical values: ~100 for mouse wheel, ~1-4 for trackpad
      const normalizedDelta = Math.abs(event.deltaY) / 100;

      // Linear acceleration: larger scroll = larger zoom change
      const zoomStep = Math.min(baseZoomStep * normalizedDelta, maxZoomStep);

      // Calculate zoom factor (zoom in for negative delta, out for positive)
      const zoomFactor = event.deltaY > 0 ? 1 - zoomStep : 1 + zoomStep;

      this.camera.zoomAt(worldPoint, zoomFactor);
      this.renderer.requestRender();
    }
  }
}

/**
 * Create and initialize an engine instance.
 * Convenience factory function.
 */
export function createEngine(
  canvas: HTMLCanvasElement,
  options?: EngineOptions
): Engine {
  return new Engine(canvas, options);
}
