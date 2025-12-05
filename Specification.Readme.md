# Whiteboard Foundation

A foundational architecture for building a high-performance diagramming and whiteboard application. This project prioritizes correctness, extensibility, and performance over rapid feature accumulation.

## Project Goals

1. **Performance**: Handle 10,000+ shapes at 60fps with smooth pan/zoom
2. **Extensibility**: New shape types and tools should require minimal boilerplate
3. **Collaboration-ready**: Architecture supports real-time sync (CRDT-compatible state design)
4. **Undo/Redo**: Full history with branching support
5. **Offline-first**: All state serializable, no server dependency for core function

## Technology Stack

- **Language**: TypeScript (strict mode)
- **UI Framework**: React 18+ (for chrome only, not canvas rendering)
- **State Management**: Zustand with Immer middleware
- **Rendering**: Canvas 2D API (no abstraction libraries)
- **Spatial Indexing**: RBush (R-tree implementation)
- **Build Tool**: Vite
- **Testing**: Vitest + Playwright for e2e

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         React UI Layer                          │
│  (Toolbar, PropertyPanel, LayerPanel, ContextMenu, Dialogs)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Bridge Layer                             │
│  (CanvasContainer.tsx - mounts canvas, forwards events)         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Engine Core                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │  Camera   │ │  Renderer │ │InputHandler│ │ToolManager│       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                     │
│  │SpatialIndex│ │ShapeRegistry│ │HitTester │                     │
│  └───────────┘ └───────────┘ └───────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Store Layer                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │ DocumentStore │ │ SessionStore  │ │ HistoryStore  │         │
│  │ (shapes, etc) │ │(selection,cam)│ │ (undo/redo)   │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
/src
├── /engine
│   ├── Camera.ts              # Viewport transformation logic
│   ├── Renderer.ts            # Canvas rendering loop
│   ├── InputHandler.ts        # Pointer/keyboard event normalization
│   ├── SpatialIndex.ts        # R-tree wrapper for hit testing
│   ├── HitTester.ts           # Point-in-shape, shape-in-rect tests
│   ├── ToolManager.ts         # Tool state machine orchestrator
│   ├── Engine.ts              # Main engine class, coordinates all above
│   └── /tools
│       ├── Tool.ts            # Base tool interface
│       ├── SelectTool.ts      # Selection, move, resize
│       ├── PanTool.ts         # Hand/pan tool
│       ├── RectangleTool.ts   # Rectangle creation
│       ├── EllipseTool.ts     # Ellipse creation
│       ├── LineTool.ts        # Line/arrow creation
│       └── TextTool.ts        # Text block creation
│
├── /shapes
│   ├── Shape.ts               # Base shape interface and types
│   ├── ShapeRegistry.ts       # Shape type registration
│   ├── Rectangle.ts           # Rectangle implementation
│   ├── Ellipse.ts             # Ellipse implementation
│   ├── Line.ts                # Line/arrow implementation
│   ├── Text.ts                # Text block implementation
│   └── /utils
│       ├── bounds.ts          # Bounding box calculations
│       ├── transforms.ts      # Shape transformation utilities
│       └── path.ts            # Path construction helpers
│
├── /store
│   ├── documentStore.ts       # Shape data, connections, groups
│   ├── sessionStore.ts        # Selection, camera, active tool
│   ├── historyStore.ts        # Undo/redo stack management
│   └── types.ts               # Store type definitions
│
├── /ui
│   ├── App.tsx                # Root component
│   ├── CanvasContainer.tsx    # Canvas mount point, event bridge
│   ├── Toolbar.tsx            # Tool selection bar
│   ├── PropertyPanel.tsx      # Shape property editor
│   ├── LayerPanel.tsx         # Z-order management
│   └── /components
│       ├── ColorPicker.tsx
│       ├── IconButton.tsx
│       └── Tooltip.tsx
│
├── /math
│   ├── Vec2.ts                # 2D vector operations
│   ├── Mat3.ts                # 3x3 matrix (2D affine transforms)
│   ├── Box.ts                 # Axis-aligned bounding box
│   └── geometry.ts            # Intersection, distance functions
│
├── /utils
│   ├── id.ts                  # ID generation (nanoid)
│   ├── color.ts               # Color parsing/conversion
│   └── debounce.ts            # Utility functions
│
└── main.tsx                   # Application entry point
```

---

## Core Specifications

### 1. Coordinate Systems

All coordinate transforms flow through the Camera. Never manually apply pan/zoom elsewhere.

```
Screen Space (pixels from canvas top-left)
     │
     │  camera.screenToWorld(point)
     ▼
World Space (infinite 2D plane, origin at center)
     │
     │  shape.worldToLocal(point)  [for shapes with rotation]
     ▼
Local Space (shape's own coordinate system)
```

#### Camera Implementation

```typescript
// Camera.ts
interface CameraState {
  x: number;      // world X at screen center
  y: number;      // world Y at screen center
  zoom: number;   // scale factor (1 = 100%)
}

class Camera {
  private state: CameraState = { x: 0, y: 0, zoom: 1 };
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  // Core transforms
  screenToWorld(screen: Vec2): Vec2;
  worldToScreen(world: Vec2): Vec2;

  // Viewport queries
  getVisibleBounds(): Box;  // AABB in world coords

  // Mutations
  pan(deltaScreen: Vec2): void;
  zoomAt(screenPoint: Vec2, factor: number): void;  // zoom centered on point
  setViewport(width: number, height: number): void;

  // For renderer
  getTransformMatrix(): Mat3;
}
```

**Zoom constraints**: Clamp zoom to [0.1, 10] range. Implement smooth zoom (lerp toward target).

---

### 2. Shape System

Shapes are plain data objects. Behavior is implemented via the ShapeRegistry pattern.

#### Base Shape Interface

```typescript
// Shape.ts
interface BaseShape {
  id: string;
  type: string;           // 'rectangle' | 'ellipse' | 'line' | 'text' | ...
  x: number;              // world position (center for rect/ellipse, start for line)
  y: number;
  rotation: number;       // radians
  opacity: number;        // 0-1
  locked: boolean;
  
  // Style
  fill: string | null;    // CSS color or null for no fill
  stroke: string | null;  // CSS color or null for no stroke
  strokeWidth: number;
}

interface RectangleShape extends BaseShape {
  type: 'rectangle';
  width: number;
  height: number;
  cornerRadius: number;
}

interface EllipseShape extends BaseShape {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

interface LineShape extends BaseShape {
  type: 'line';
  x2: number;             // end point
  y2: number;
  startArrow: boolean;
  endArrow: boolean;
}

interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  width: number;          // text box width (for wrapping)
}

type Shape = RectangleShape | EllipseShape | LineShape | TextShape;
```

#### Shape Registry

Each shape type registers handlers for rendering, hit testing, and bounds calculation:

```typescript
// ShapeRegistry.ts
interface ShapeHandler<T extends Shape> {
  // Render shape to canvas context (context is already transformed)
  render(ctx: CanvasRenderingContext2D, shape: T): void;
  
  // Return true if worldPoint is inside shape
  hitTest(shape: T, worldPoint: Vec2): boolean;
  
  // Return axis-aligned bounding box in world coordinates
  getBounds(shape: T): Box;
  
  // Return control points for resize handles
  getHandles(shape: T): Handle[];
  
  // Create default shape at position
  create(position: Vec2): T;
}

class ShapeRegistry {
  private handlers: Map<string, ShapeHandler<any>> = new Map();
  
  register<T extends Shape>(type: string, handler: ShapeHandler<T>): void;
  getHandler(type: string): ShapeHandler<Shape>;
}
```

---

### 3. Store Architecture

Three separate Zustand stores with clear responsibilities:

#### Document Store

```typescript
// documentStore.ts
interface DocumentState {
  shapes: Record<string, Shape>;
  shapeOrder: string[];           // z-order, first = bottom
  
  // Future: connections, groups
  // connections: Record<string, Connection>;
  // groups: Record<string, Group>;
}

interface DocumentActions {
  // Shape CRUD
  addShape(shape: Shape): void;
  updateShape(id: string, partial: Partial<Shape>): void;
  deleteShape(id: string): void;
  deleteShapes(ids: string[]): void;
  
  // Batch operations
  updateShapes(updates: Array<{ id: string; partial: Partial<Shape> }>): void;
  
  // Z-order
  bringToFront(id: string): void;
  sendToBack(id: string): void;
  bringForward(id: string): void;
  sendBackward(id: string): void;
  
  // Serialization
  getSnapshot(): DocumentState;
  loadSnapshot(state: DocumentState): void;
}
```

#### Session Store

```typescript
// sessionStore.ts
interface SessionState {
  // Selection
  selectedIds: Set<string>;
  
  // Camera (or reference to Camera instance)
  camera: CameraState;
  
  // Tool
  activeTool: ToolType;
  
  // Interaction state
  isPanning: boolean;
  isDrawing: boolean;
  
  // Cursor
  cursor: string;  // CSS cursor value
}

interface SessionActions {
  // Selection
  select(ids: string[]): void;
  addToSelection(ids: string[]): void;
  removeFromSelection(ids: string[]): void;
  clearSelection(): void;
  selectAll(): void;
  
  // Camera
  setCamera(state: Partial<CameraState>): void;
  
  // Tool
  setActiveTool(tool: ToolType): void;
  
  // Cursor
  setCursor(cursor: string): void;
}
```

#### History Store

```typescript
// historyStore.ts
interface HistoryEntry {
  timestamp: number;
  documentState: DocumentState;
  label?: string;  // e.g., "Add rectangle", "Delete 3 shapes"
}

interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  
  canUndo: boolean;  // derived
  canRedo: boolean;  // derived
}

interface HistoryActions {
  push(state: DocumentState, label?: string): void;
  undo(): DocumentState | null;
  redo(): DocumentState | null;
  clear(): void;
}
```

**Important**: History stores complete document snapshots. For large documents, implement structural sharing or operation-based history later.

---

### 4. Input Handling

Normalize all pointer events to a consistent format. Handle mouse, touch, and pen uniformly.

```typescript
// InputHandler.ts
interface NormalizedPointerEvent {
  type: 'down' | 'move' | 'up';
  screenPoint: Vec2;
  worldPoint: Vec2;
  button: 'left' | 'middle' | 'right' | 'none';
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  pressure: number;      // 0-1, for pen input
  pointerId: number;     // for multi-touch
  isPrimary: boolean;
  timestamp: number;
}

class InputHandler {
  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    onPointerEvent: (event: NormalizedPointerEvent) => void,
    onKeyEvent: (event: KeyboardEvent) => void,
    onWheelEvent: (event: WheelEvent, worldPoint: Vec2) => void
  );
  
  // Call on unmount
  destroy(): void;
}
```

**Critical behaviors**:
- Capture pointer on down, release on up
- Prevent default on wheel to stop page scroll
- Handle right-click (context menu) explicitly
- Normalize wheel delta across browsers (Firefox uses different units)

---

### 5. Tool State Machine

Each tool is a state machine responding to input events.

```typescript
// Tool.ts
interface ToolContext {
  camera: Camera;
  documentStore: DocumentStore;
  sessionStore: SessionStore;
  hitTester: HitTester;
  requestRender: () => void;
}

interface Tool {
  name: string;
  cursor: string;  // default cursor for this tool
  
  // Lifecycle
  onActivate?(ctx: ToolContext): void;
  onDeactivate?(ctx: ToolContext): void;
  
  // Input handlers (return true if event was handled)
  onPointerDown?(ctx: ToolContext, event: NormalizedPointerEvent): boolean;
  onPointerMove?(ctx: ToolContext, event: NormalizedPointerEvent): boolean;
  onPointerUp?(ctx: ToolContext, event: NormalizedPointerEvent): boolean;
  onKeyDown?(ctx: ToolContext, event: KeyboardEvent): boolean;
  onKeyUp?(ctx: ToolContext, event: KeyboardEvent): boolean;
  onWheel?(ctx: ToolContext, event: WheelEvent, worldPoint: Vec2): boolean;
  
  // Render overlay (selection box, guides, etc.)
  renderOverlay?(ctx: ToolContext, canvasCtx: CanvasRenderingContext2D): void;
}
```

#### Select Tool States

```
                    ┌────────────────────┐
                    │       Idle         │
                    └────────────────────┘
                              │
              pointerDown     │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ ClickOnEmpty  │   │ClickOnShape  │   │ClickOnHandle │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        │ drag                │ drag                │ drag
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Marquee      │   │ Translating   │   │  Resizing    │
│  Selection    │   │   Shapes      │   │   Shape      │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        │ pointerUp           │ pointerUp           │ pointerUp
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌────────────────────┐
                    │       Idle         │
                    └────────────────────┘
```

---

### 6. Rendering Pipeline

```typescript
// Renderer.ts
class Renderer {
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private shapeRegistry: ShapeRegistry;
  private frameId: number | null = null;
  private needsRender: boolean = false;
  
  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    shapeRegistry: ShapeRegistry
  );
  
  // Request a render on next frame (debounced)
  requestRender(): void {
    if (this.needsRender) return;
    this.needsRender = true;
    this.frameId = requestAnimationFrame(() => this.render());
  }
  
  private render(): void {
    this.needsRender = false;
    
    const { ctx, camera } = this;
    const { width, height } = ctx.canvas;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Apply camera transform
    ctx.save();
    const matrix = camera.getTransformMatrix();
    ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    
    // Draw grid (optional, behind shapes)
    this.drawGrid();
    
    // Draw shapes in z-order
    const { shapes, shapeOrder } = documentStore.getState();
    for (const id of shapeOrder) {
      const shape = shapes[id];
      if (!shape) continue;
      
      // Culling: skip shapes outside viewport
      const bounds = this.shapeRegistry.getHandler(shape.type).getBounds(shape);
      if (!camera.getVisibleBounds().intersects(bounds)) continue;
      
      this.renderShape(shape);
    }
    
    ctx.restore();
    
    // Draw selection overlay (in screen space)
    this.drawSelectionOverlay();
    
    // Let active tool draw its overlay
    this.toolOverlayCallback?.(ctx);
  }
  
  private renderShape(shape: Shape): void;
  private drawGrid(): void;
  private drawSelectionOverlay(): void;
}
```

**Performance considerations**:
- Implement viewport culling (don't render off-screen shapes)
- For static shapes, consider caching to off-screen canvas
- Batch similar draw calls where possible

---

### 7. Hit Testing

```typescript
// HitTester.ts
class HitTester {
  private spatialIndex: SpatialIndex;
  private shapeRegistry: ShapeRegistry;
  
  constructor(spatialIndex: SpatialIndex, shapeRegistry: ShapeRegistry);
  
  // Find topmost shape at point (respects z-order)
  hitTestPoint(worldPoint: Vec2, shapes: Shape[], shapeOrder: string[]): Shape | null;
  
  // Find all shapes intersecting rect
  hitTestRect(worldRect: Box, shapes: Shape[], shapeOrder: string[]): Shape[];
  
  // Find if point hits a resize handle
  hitTestHandles(worldPoint: Vec2, shape: Shape): Handle | null;
}

// SpatialIndex.ts
class SpatialIndex {
  private tree: RBush<{ id: string; minX: number; minY: number; maxX: number; maxY: number }>;
  
  rebuild(shapes: Record<string, Shape>, shapeRegistry: ShapeRegistry): void;
  update(shape: Shape, shapeRegistry: ShapeRegistry): void;
  remove(id: string): void;
  
  // Query candidates (still need precise hit test after)
  queryPoint(point: Vec2): string[];
  queryRect(rect: Box): string[];
}
```

---

### 8. React Integration

```typescript
// CanvasContainer.tsx
function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Initialize engine
    engineRef.current = new Engine(canvas);
    
    // Subscribe to store changes
    const unsubDoc = documentStore.subscribe(() => {
      engineRef.current?.onDocumentChange();
    });
    
    const unsubSession = sessionStore.subscribe(() => {
      engineRef.current?.onSessionChange();
    });
    
    return () => {
      unsubDoc();
      unsubSession();
      engineRef.current?.destroy();
    };
  }, []);
  
  // Handle resize
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Set actual pixel size (for DPI scaling)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      engineRef.current?.onResize(width, height, dpr);
    });
    
    if (canvasRef.current) {
      observer.observe(canvasRef.current.parentElement!);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
      tabIndex={0}  // For keyboard events
    />
  );
}
```

---

## Implementation Phases

### Phase 1: Core Foundation
1. ✅ Project setup (Vite, TypeScript, React, Zustand)
2. Math utilities (Vec2, Mat3, Box)
3. Camera with pan/zoom
4. Basic Renderer (clear, draw grid, apply camera transform)
5. InputHandler with event normalization
6. CanvasContainer with resize handling

### Phase 2: Shape System
1. Base shape types and interfaces
2. ShapeRegistry
3. Rectangle shape (render, hit test, bounds)
4. DocumentStore with shape CRUD
5. SessionStore with selection
6. SpatialIndex integration

### Phase 3: Tools
1. Tool interface and ToolManager
2. PanTool (middle-click or spacebar drag)
3. SelectTool (click select, marquee, translate)
4. RectangleTool (click-drag creation)
5. Selection overlay rendering

### Phase 4: Full Shape Suite
1. Ellipse shape
2. Line/Arrow shape
3. Text shape (basic, no inline editing yet)
4. Resize handles and ResizeTool behavior
5. Rotation handles

### Phase 5: History & Polish
1. HistoryStore with undo/redo
2. Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, etc.)
3. Copy/paste
4. Toolbar UI
5. Property panel

### Phase 6: Advanced Features (Future)
- Text inline editing
- Connectors (shapes that attach to other shapes)
- Grouping
- Multi-page documents
- Export (PNG, SVG, PDF)
- Real-time collaboration

---

## Code Style Guidelines

1. **No `any` types** - Use `unknown` and type guards
2. **Immutable updates** - Never mutate state directly
3. **Pure functions** - Shape handlers should be pure where possible
4. **Small files** - Each file should have one clear responsibility
5. **Explicit over implicit** - Prefer verbose, clear code over clever shortcuts
6. **Test the math** - Vec2, Mat3, geometry functions should have unit tests

---

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Type checking
npm run typecheck

# Run tests
npm run test

# Build for production
npm run build
```

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "immer": "^10.0.0",
    "rbush": "^3.0.1",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vitest": "^1.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

---

## References

- [tldraw source code](https://github.com/tldraw/tldraw) - Excellent architecture reference
- [Excalidraw source code](https://github.com/excalidraw/excalidraw) - Production whiteboard app
- [Canvas API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [RBush documentation](https://github.com/mourner/rbush)
- [Zustand documentation](https://github.com/pmndrs/zustand)
