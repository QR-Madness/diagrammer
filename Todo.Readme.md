# Development Todo List

This document tracks the implementation tasks for building the Whiteboard Foundation prototype. Tasks are organized by implementation phase as defined in Specification.Readme.md.

## Phase 1: Core Foundation

### Project Setup
- [x] Initial project structure created
- [ ] Initialize npm project with package.json
- [ ] Install dependencies (React, Zustand, Immer, RBush, nanoid)
- [ ] Install dev dependencies (TypeScript, Vite, Vitest, @vitejs/plugin-react)
- [ ] Configure TypeScript with strict mode enabled
- [ ] Configure Vite build tool
- [ ] Set up Vitest test configuration
- [ ] Create basic HTML template with canvas container
- [ ] Set up project directory structure (/src with subdirectories)

### Math Utilities (`/src/math`)
- [ ] Implement Vec2.ts
  - [ ] Constructor and basic properties (x, y)
  - [ ] Static methods: add, subtract, multiply, divide, dot, cross
  - [ ] Instance methods: length, normalize, rotate, lerp
  - [ ] Unit tests for all vector operations
- [ ] Implement Mat3.ts
  - [ ] Constructor for 3x3 matrix (2D affine transforms)
  - [ ] Static methods: identity, translation, rotation, scale
  - [ ] Matrix multiplication
  - [ ] transformPoint method for applying to Vec2
  - [ ] Unit tests for matrix operations
- [ ] Implement Box.ts
  - [ ] Constructor (minX, minY, maxX, maxY)
  - [ ] Static methods: fromPoints, fromCenter
  - [ ] containsPoint, intersects, union, intersection methods
  - [ ] Unit tests for AABB operations
- [ ] Implement geometry.ts
  - [ ] pointInRect function
  - [ ] pointInCircle function
  - [ ] lineIntersection function
  - [ ] distanceToLine function
  - [ ] Unit tests for geometry functions

### Camera System (`/src/engine/Camera.ts`)
- [ ] Define CameraState interface (x, y, zoom)
- [ ] Implement Camera class constructor
- [ ] Implement screenToWorld transform
- [ ] Implement worldToScreen transform
- [ ] Implement getVisibleBounds method
- [ ] Implement pan method
- [ ] Implement zoomAt method (zoom centered on point)
- [ ] Implement setViewport method
- [ ] Implement getTransformMatrix for renderer
- [ ] Add zoom constraints (clamp to [0.1, 10])
- [ ] Add smooth zoom interpolation
- [ ] Unit tests for coordinate transforms

### Input Handler (`/src/engine/InputHandler.ts`)
- [ ] Define NormalizedPointerEvent interface
- [ ] Implement InputHandler class constructor
- [ ] Normalize pointer down events (mouse, touch, pen)
- [ ] Normalize pointer move events
- [ ] Normalize pointer up events
- [ ] Implement pointer capture on down
- [ ] Implement pointer release on up
- [ ] Normalize wheel events (handle Firefox delta units)
- [ ] Add keyboard event handling
- [ ] Prevent default on wheel to stop page scroll
- [ ] Handle right-click context menu
- [ ] Implement destroy method for cleanup
- [ ] Convert screen coordinates to world coordinates

### Basic Renderer (`/src/engine/Renderer.ts`)
- [ ] Implement Renderer class constructor
- [ ] Implement requestRender method with requestAnimationFrame
- [ ] Implement basic render loop
- [ ] Clear canvas each frame
- [ ] Apply camera transform to canvas context
- [ ] Implement drawGrid method (optional background grid)
- [ ] Handle canvas restoration after transforms
- [ ] Add basic performance monitoring (FPS counter)

### React Integration (`/src/ui/CanvasContainer.tsx`)
- [ ] Create CanvasContainer component
- [ ] Set up canvas ref
- [ ] Implement resize observer for canvas
- [ ] Handle DPI scaling (devicePixelRatio)
- [ ] Initialize engine on mount
- [ ] Clean up engine on unmount
- [ ] Handle canvas focus for keyboard events
- [ ] Forward resize events to engine

### App Structure (`/src/ui/App.tsx`)
- [ ] Create basic App component
- [ ] Set up layout structure (toolbar, canvas, panels)
- [ ] Add CanvasContainer to layout
- [ ] Set up basic CSS/styling
- [ ] Create main.tsx entry point

## Phase 2: Shape System

### Base Shape Types (`/src/shapes`)
- [ ] Define BaseShape interface in Shape.ts
- [ ] Define RectangleShape interface
- [ ] Define EllipseShape interface
- [ ] Define LineShape interface
- [ ] Define TextShape interface
- [ ] Create Shape union type
- [ ] Define Handle interface for resize handles
- [ ] Create shape type utilities (type guards)

### Shape Registry (`/src/shapes/ShapeRegistry.ts`)
- [ ] Define ShapeHandler interface
- [ ] Implement ShapeRegistry class
- [ ] Implement register method
- [ ] Implement getHandler method
- [ ] Add error handling for unknown shape types

### Rectangle Shape Implementation (`/src/shapes/Rectangle.ts`)
- [ ] Implement render handler
- [ ] Implement hitTest handler (point in rotated rect)
- [ ] Implement getBounds handler
- [ ] Implement getHandles handler (8 resize handles)
- [ ] Implement create factory function
- [ ] Register rectangle handler with ShapeRegistry
- [ ] Unit tests for rectangle operations

### Shape Utilities (`/src/shapes/utils`)
- [ ] Implement bounds.ts
  - [ ] calculateBounds for different shape types
  - [ ] transformBounds for rotated shapes
- [ ] Implement transforms.ts
  - [ ] translateShape function
  - [ ] rotateShape function
  - [ ] resizeShape function
  - [ ] Unit tests for transformations

### Document Store (`/src/store/documentStore.ts`)
- [ ] Define DocumentState interface
- [ ] Define DocumentActions interface
- [ ] Create Zustand store with Immer middleware
- [ ] Implement addShape action
- [ ] Implement updateShape action
- [ ] Implement deleteShape action
- [ ] Implement deleteShapes batch action
- [ ] Implement updateShapes batch action
- [ ] Implement bringToFront z-order action
- [ ] Implement sendToBack z-order action
- [ ] Implement bringForward z-order action
- [ ] Implement sendBackward z-order action
- [ ] Implement getSnapshot for serialization
- [ ] Implement loadSnapshot for deserialization

### Session Store (`/src/store/sessionStore.ts`)
- [ ] Define SessionState interface
- [ ] Define SessionActions interface
- [ ] Create Zustand store
- [ ] Implement select action
- [ ] Implement addToSelection action
- [ ] Implement removeFromSelection action
- [ ] Implement clearSelection action
- [ ] Implement selectAll action
- [ ] Implement setCamera action
- [ ] Implement setActiveTool action
- [ ] Implement setCursor action

### Spatial Index (`/src/engine/SpatialIndex.ts`)
- [ ] Install and configure RBush
- [ ] Implement SpatialIndex class wrapper
- [ ] Implement rebuild method
- [ ] Implement update method
- [ ] Implement remove method
- [ ] Implement queryPoint method
- [ ] Implement queryRect method
- [ ] Integrate with DocumentStore changes

### Hit Tester (`/src/engine/HitTester.ts`)
- [ ] Implement HitTester class
- [ ] Implement hitTestPoint (respects z-order)
- [ ] Implement hitTestRect for marquee selection
- [ ] Implement hitTestHandles for resize handles
- [ ] Use SpatialIndex for candidate filtering
- [ ] Use ShapeRegistry for precise hit tests

### Renderer Integration
- [ ] Update Renderer to render shapes from DocumentStore
- [ ] Implement renderShape method using ShapeRegistry
- [ ] Add viewport culling (skip off-screen shapes)
- [ ] Subscribe to DocumentStore changes
- [ ] Subscribe to SessionStore changes
- [ ] Implement selection overlay rendering

## Phase 3: Tools

### Tool Architecture (`/src/engine/tools`)
- [ ] Define Tool interface in Tool.ts
- [ ] Define ToolContext interface
- [ ] Define tool lifecycle methods (onActivate, onDeactivate)
- [ ] Define input handler methods for tools

### Tool Manager (`/src/engine/ToolManager.ts`)
- [ ] Implement ToolManager class
- [ ] Implement tool registration
- [ ] Implement setActiveTool with activation/deactivation
- [ ] Forward pointer events to active tool
- [ ] Forward keyboard events to active tool
- [ ] Forward wheel events to active tool
- [ ] Call tool renderOverlay method

### Pan Tool (`/src/engine/tools/PanTool.ts`)
- [ ] Implement PanTool class
- [ ] Handle middle-click drag
- [ ] Handle spacebar + drag
- [ ] Update camera position on drag
- [ ] Set appropriate cursor
- [ ] Request render on pan

### Select Tool (`/src/engine/tools/SelectTool.ts`)
- [ ] Implement SelectTool state machine
- [ ] Implement Idle state
- [ ] Implement click selection (single shape)
- [ ] Implement shift-click (add to selection)
- [ ] Implement click on empty (clear selection)
- [ ] Implement marquee selection (drag on empty)
- [ ] Implement translate shapes (drag selected)
- [ ] Track drag start positions for translation
- [ ] Update shapes during drag
- [ ] Commit changes on pointer up
- [ ] Render selection overlay (bounding boxes)
- [ ] Render marquee rectangle during selection

### Rectangle Tool (`/src/engine/tools/RectangleTool.ts`)
- [ ] Implement RectangleTool class
- [ ] Handle pointer down (start position)
- [ ] Handle pointer move (update size preview)
- [ ] Render preview during creation
- [ ] Create shape on pointer up
- [ ] Add shape to DocumentStore
- [ ] Switch to SelectTool after creation
- [ ] Handle Escape key to cancel

### Engine Integration (`/src/engine/Engine.ts`)
- [ ] Create main Engine class
- [ ] Initialize Camera
- [ ] Initialize Renderer
- [ ] Initialize InputHandler
- [ ] Initialize SpatialIndex
- [ ] Initialize HitTester
- [ ] Initialize ToolManager
- [ ] Register default tools
- [ ] Wire up event handlers
- [ ] Implement onDocumentChange callback
- [ ] Implement onSessionChange callback
- [ ] Implement onResize callback
- [ ] Implement destroy method

## Phase 4: Basic UI

### Toolbar (`/src/ui/Toolbar.tsx`)
- [ ] Create Toolbar component
- [ ] Add tool buttons (Select, Pan, Rectangle)
- [ ] Connect to sessionStore.setActiveTool
- [ ] Show active tool state
- [ ] Add keyboard shortcuts display

### Utilities (`/src/utils`)
- [ ] Implement id.ts with nanoid
- [ ] Implement color.ts (color parsing/conversion)
- [ ] Implement debounce.ts

### Store Types (`/src/store/types.ts`)
- [ ] Define common store types
- [ ] Define ToolType enum
- [ ] Define CameraState type
- [ ] Export shared types

## Minimal Functional Prototype Checklist

A working prototype requires completion of:
- ✅ All Phase 1 tasks (Core Foundation)
- ✅ All Phase 2 tasks (Shape System)
- ✅ All Phase 3 tasks (Tools)
- ✅ Basic Toolbar from Phase 4

This will provide:
- Canvas with pan/zoom
- Rectangle creation tool
- Select tool with single selection and movement
- Visual feedback (selection boxes, grid)

## Phase 5: Extended Features (Post-Prototype)

### Additional Shape Types
- [ ] Implement Ellipse shape (render, hitTest, bounds, handles)
- [ ] Implement Line/Arrow shape
- [ ] Implement basic Text shape (no inline editing)
- [ ] Register all shape types

### Selection Enhancements
- [ ] Implement multi-selection
- [ ] Implement resize handles in SelectTool
- [ ] Implement rotation handles
- [ ] Implement handle dragging state
- [ ] Update shapes during resize
- [ ] Maintain aspect ratio with Shift key

### History System (`/src/store/historyStore.ts`)
- [ ] Define HistoryEntry interface
- [ ] Define HistoryState interface
- [ ] Create HistoryStore
- [ ] Implement push action
- [ ] Implement undo action
- [ ] Implement redo action
- [ ] Implement clear action
- [ ] Integrate with DocumentStore mutations
- [ ] Add debouncing for rapid changes

### Keyboard Shortcuts
- [ ] Implement Ctrl+Z for undo
- [ ] Implement Ctrl+Shift+Z for redo
- [ ] Implement Delete for deleting selected shapes
- [ ] Implement Ctrl+A for select all
- [ ] Implement Escape for deselect
- [ ] Implement Ctrl+C for copy
- [ ] Implement Ctrl+V for paste
- [ ] Tool shortcuts (V=select, H=pan, R=rectangle, etc.)

### Property Panel (`/src/ui/PropertyPanel.tsx`)
- [ ] Create PropertyPanel component
- [ ] Show properties for selected shapes
- [ ] Add fill color picker
- [ ] Add stroke color picker
- [ ] Add stroke width slider
- [ ] Connect to documentStore.updateShape
- [ ] Handle multi-selection (show common properties)

### Additional Tools
- [ ] Implement EllipseTool
- [ ] Implement LineTool
- [ ] Implement TextTool (basic)

## Phase 6: Polish & Advanced (Future)

- [ ] Copy/paste implementation
- [ ] Layer panel with z-order management
- [ ] Text inline editing
- [ ] Connectors (shapes that attach to other shapes)
- [ ] Grouping/ungrouping
- [ ] Alignment tools
- [ ] Distribution tools
- [ ] Export to PNG
- [ ] Export to SVG
- [ ] Multi-page documents
- [ ] Real-time collaboration (CRDT integration)
- [ ] Offline-first with persistence
- [ ] Playwright e2e tests

## Notes

- Mark tasks with [x] when completed
- Update this file as new tasks are discovered
- Each task should be small enough to complete in one session
- Test each component before moving to the next phase
- Performance testing should begin after Phase 3 completion
