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
import { ConnectorTool } from './tools/ConnectorTool';
import { Vec2 } from '../math/Vec2';
import { Shape, isConnector } from '../shapes/Shape';
import { updateConnectorEndpoints } from '../shapes/Connector';
import { useDocumentStore } from '../store/documentStore';
import { useSessionStore, ToolType, deleteSelected } from '../store/sessionStore';
import { useHistoryStore, pushHistory } from '../store/historyStore';
import { nanoid } from 'nanoid';

// Import shape handlers to register them
import '../shapes/Rectangle';
import '../shapes/Ellipse';
import '../shapes/Line';
import '../shapes/Text';
import '../shapes/Connector';

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

/** Pan speed in world units per frame */
const PAN_SPEED = 10;

/** Zoom speed per frame (multiplier) */
const ZOOM_SPEED = 0.02;

/** Keys that trigger panning */
const PAN_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'w', 'W', 'a', 'A', 's', 'S', 'd', 'D',
]);

/** Keys that trigger zooming */
const ZOOM_KEYS = new Set(['q', 'Q', 'e', 'E']);

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

  // Keyboard panning state
  private activePanKeys: Set<string> = new Set();
  private panAnimationId: number | null = null;

  // Global keyboard handler for shortcuts that need to intercept browser defaults
  private boundGlobalKeyDown: (e: KeyboardEvent) => void;

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
      (event) => this.handleKeyEvent(event),
      (event, screenPoint, _worldPoint) => this.handleWheel(event, screenPoint)
    );

    // Subscribe to stores
    this.subscribeToStores();

    // Set initial tool
    this.toolManager.setActiveTool(this.options.initialTool);

    // Add global keyboard handler for shortcuts that need to intercept browser defaults
    this.boundGlobalKeyDown = this.handleGlobalKeyDown.bind(this);
    window.addEventListener('keydown', this.boundGlobalKeyDown);

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

    // Stop keyboard pan animation
    if (this.panAnimationId !== null) {
      cancelAnimationFrame(this.panAnimationId);
      this.panAnimationId = null;
    }
    this.activePanKeys.clear();

    // Remove global keyboard listener
    window.removeEventListener('keydown', this.boundGlobalKeyDown);

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

      // Snapping
      getSnapSettings: () => sessionStore.getState().snapSettings,
      setSnapGuides: (guides) => sessionStore.getState().setSnapGuides(guides),
      clearSnapGuides: () => sessionStore.getState().clearSnapGuides(),

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
    this.toolManager.register(new ConnectorTool());
  }

  /**
   * Subscribe to document and session store changes.
   */
  private subscribeToStores(): void {
    // Subscribe to document store
    this.unsubscribeDocument = useDocumentStore.subscribe((state) => {
      // Update connector endpoints when shapes move
      this.updateConnectors(state.shapes);

      // Update renderer with new shape data
      this.renderer.setShapes(state.shapes, state.shapeOrder);

      // Update spatial index
      this.spatialIndex.rebuild(Object.values(state.shapes));

      // Request render
      this.renderer.requestRender();
    });

    // Subscribe to session store
    let previousTool = useSessionStore.getState().activeTool;
    let previousCamera = useSessionStore.getState().camera;
    this.unsubscribeSession = useSessionStore.subscribe((state) => {
      // Sync tool changes from sessionStore to toolManager
      if (state.activeTool !== previousTool) {
        previousTool = state.activeTool;
        // Only update if different from current tool manager state
        if (this.toolManager.getActiveToolType() !== state.activeTool) {
          this.toolManager.setActiveTool(state.activeTool);
        }
      }

      // Sync camera changes from sessionStore to Engine camera
      if (
        state.camera.x !== previousCamera.x ||
        state.camera.y !== previousCamera.y ||
        state.camera.zoom !== previousCamera.zoom
      ) {
        previousCamera = state.camera;
        this.camera.setState({
          x: state.camera.x,
          y: state.camera.y,
          zoom: state.camera.zoom,
        });
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

  /**
   * Update connector endpoints based on connected shapes.
   * Called when shapes change to keep connectors attached.
   */
  private updateConnectors(shapes: Record<string, Shape>): void {
    const updates: Array<{ id: string; updates: Partial<Shape> }> = [];

    for (const shape of Object.values(shapes)) {
      if (isConnector(shape)) {
        // Check if this connector has any connected shapes
        if (shape.startShapeId || shape.endShapeId) {
          const endpointUpdates = updateConnectorEndpoints(shape, shapes);

          // Only include updates where positions actually changed
          const hasRealChanges =
            (endpointUpdates.x !== undefined && Math.abs(endpointUpdates.x - shape.x) > 0.001) ||
            (endpointUpdates.y !== undefined && Math.abs(endpointUpdates.y - shape.y) > 0.001) ||
            (endpointUpdates.x2 !== undefined && Math.abs(endpointUpdates.x2 - shape.x2) > 0.001) ||
            (endpointUpdates.y2 !== undefined && Math.abs(endpointUpdates.y2 - shape.y2) > 0.001);

          if (hasRealChanges) {
            updates.push({ id: shape.id, updates: endpointUpdates });
          }
        }
      }
    }

    // Apply updates if any
    if (updates.length > 0) {
      const updateShape = useDocumentStore.getState().updateShape;
      for (const { id, updates: shapeUpdates } of updates) {
        updateShape(id, shapeUpdates);
      }
    }
  }

  // Event handlers

  /**
   * Global keyboard handler to intercept browser defaults like Ctrl+A.
   * This runs on window, not canvas, so it works even when canvas isn't focused.
   */
  private handleGlobalKeyDown(event: KeyboardEvent): void {
    if (this.destroyed) return;

    const isCtrl = event.ctrlKey || event.metaKey;

    // Ctrl+A: Select all - must intercept at window level to prevent browser select all
    if (isCtrl && event.key === 'a') {
      event.preventDefault();
      useSessionStore.getState().selectAll();
      this.renderer.requestRender();
      return;
    }
  }

  private handlePointerEvent(event: NormalizedPointerEvent): void {
    this.toolManager.handlePointerEvent(event);
  }

  /**
   * Handle keyboard events (both keydown and keyup).
   */
  private handleKeyEvent(event: KeyboardEvent): void {
    if (event.type === 'keydown') {
      this.handleKeyDown(event);
    } else if (event.type === 'keyup') {
      this.handleKeyUp(event);
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Handle keyboard panning
    if (this.handleKeyboardPanDown(event)) {
      return;
    }

    // Let tool manager handle first
    const handled = this.toolManager.handleKeyDown(event);

    if (!handled) {
      // Handle global shortcuts
      this.handleGlobalShortcuts(event);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle keyboard panning
    this.handleKeyboardPanUp(event);

    // Let tool manager handle
    this.toolManager.handleKeyUp(event);
  }

  /**
   * Handle keydown for keyboard navigation (pan and zoom).
   * Returns true if the event was handled.
   */
  private handleKeyboardPanDown(event: KeyboardEvent): boolean {
    // Don't handle if modifiers are pressed (allow shortcuts)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    // Check if this is a navigation key (pan or zoom)
    const isPanKey = PAN_KEYS.has(event.key);
    const isZoomKey = ZOOM_KEYS.has(event.key);

    if (!isPanKey && !isZoomKey) {
      return false;
    }

    // Don't handle if we're editing text
    if (useSessionStore.getState().isEditingText()) {
      return false;
    }

    // Prevent page scrolling
    event.preventDefault();

    // Add key to active set
    this.activePanKeys.add(event.key);

    // Start pan animation if not already running
    if (this.panAnimationId === null) {
      this.startPanAnimation();
    }

    return true;
  }

  /**
   * Handle keyup for keyboard panning.
   */
  private handleKeyboardPanUp(event: KeyboardEvent): void {
    // Remove key from active set
    this.activePanKeys.delete(event.key);

    // Stop animation if no keys are pressed
    if (this.activePanKeys.size === 0 && this.panAnimationId !== null) {
      cancelAnimationFrame(this.panAnimationId);
      this.panAnimationId = null;
    }
  }

  /**
   * Start the keyboard navigation animation loop.
   */
  private startPanAnimation(): void {
    const animate = () => {
      if (this.destroyed || this.activePanKeys.size === 0) {
        this.panAnimationId = null;
        return;
      }

      // Calculate pan direction and zoom from active keys
      let dx = 0;
      let dy = 0;
      let zoomDir = 0;

      for (const key of this.activePanKeys) {
        switch (key) {
          // Pan keys - signs are flipped because camera.pan() subtracts the delta
          // W/Up = move view up = see content above = camera moves up (negative Y)
          case 'ArrowUp':
          case 'w':
          case 'W':
            dy += 1;
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            dy -= 1;
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            dx += 1;
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            dx -= 1;
            break;
          // Zoom keys
          case 'q':
          case 'Q':
            zoomDir -= 1; // Zoom out
            break;
          case 'e':
          case 'E':
            zoomDir += 1; // Zoom in
            break;
        }
      }

      let needsRender = false;

      // Apply pan (adjust for zoom to maintain consistent screen speed)
      if (dx !== 0 || dy !== 0) {
        const panAmount = PAN_SPEED / this.camera.zoom;
        this.camera.pan(new Vec2(dx * panAmount, dy * panAmount));
        needsRender = true;
      }

      // Apply zoom centered on viewport center (use screen coordinates for zoomAt)
      if (zoomDir !== 0) {
        const zoomFactor = 1 + zoomDir * ZOOM_SPEED;
        const screenCenter = new Vec2(
          this.camera.screenWidth / 2,
          this.camera.screenHeight / 2
        );
        this.camera.zoomAt(screenCenter, zoomFactor);
        needsRender = true;
      }

      if (needsRender) {
        this.renderer.requestRender();
      }

      // Continue animation
      this.panAnimationId = requestAnimationFrame(animate);
    };

    this.panAnimationId = requestAnimationFrame(animate);
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

  private handleWheel(event: WheelEvent, screenPoint: Vec2): void {
    // Let tool manager handle first
    const worldPoint = this.camera.screenToWorld(screenPoint);
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

      // Use screenPoint for zoomAt (it internally converts to world coordinates)
      this.camera.zoomAt(screenPoint, zoomFactor);
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
