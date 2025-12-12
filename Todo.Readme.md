# Development Todo List

This document tracks the implementation tasks for building the Whiteboard Foundation prototype. Tasks are organized by implementation phase as defined in Specification.Readme.md.

## Notes

- **TODO**: Create a "stock-diagram" test scene with various shapes for visual inspection of new features. This should be loadable on startup for development/testing purposes.

## Phase 1: Core Foundation

### Project Setup
- [x] Initial project structure created
- [x] Initialize npm project with package.json
- [x] Install dependencies (React, Zustand, Immer, RBush, nanoid)
- [x] Install dev dependencies (TypeScript, Vite, Vitest, @vitejs/plugin-react)
- [x] Configure TypeScript with strict mode enabled
- [x] Configure Vite build tool
- [x] Set up Vitest test configuration
- [x] Create basic HTML template with canvas container
- [x] Set up project directory structure (/src with subdirectories)

### Math Utilities (`/src/math`)
- [x] Implement Vec2.ts
  - [x] Constructor and basic properties (x, y)
  - [x] Static methods: add, subtract, multiply, divide, dot, cross
  - [x] Instance methods: length, normalize, rotate, lerp
  - [x] Unit tests for all vector operations (43 tests)
- [x] Implement Mat3.ts
  - [x] Constructor for 3x3 matrix (2D affine transforms)
  - [x] Static methods: identity, translation, rotation, scale
  - [x] Matrix multiplication
  - [x] transformPoint method for applying to Vec2
  - [x] Unit tests for matrix operations (44 tests)
- [x] Implement Box.ts
  - [x] Constructor (minX, minY, maxX, maxY)
  - [x] Static methods: fromPoints, fromCenter
  - [x] containsPoint, intersects, union, intersection methods
  - [x] Unit tests for AABB operations (57 tests)
- [x] Implement geometry.ts
  - [x] pointInRect function
  - [x] pointInCircle function
  - [x] lineIntersection function
  - [x] distanceToLine function
  - [x] Unit tests for geometry functions (60 tests)

### Camera System (`/src/engine/Camera.ts`)
- [x] Define CameraState interface (x, y, zoom)
- [x] Implement Camera class constructor
- [x] Implement screenToWorld transform
- [x] Implement worldToScreen transform
- [x] Implement getVisibleBounds method
- [x] Implement pan method
- [x] Implement zoomAt method (zoom centered on point)
- [x] Implement setViewport method
- [x] Implement getTransformMatrix for renderer
- [x] Add zoom constraints (clamp to [0.1, 10])
- [x] Add smooth zoom interpolation
- [x] Unit tests for coordinate transforms (58 tests)

### Input Handler (`/src/engine/InputHandler.ts`)
- [x] Define NormalizedPointerEvent interface
- [x] Implement InputHandler class constructor
- [x] Normalize pointer down events (mouse, touch, pen)
- [x] Normalize pointer move events
- [x] Normalize pointer up events
- [x] Implement pointer capture on down
- [x] Implement pointer release on up
- [x] Normalize wheel events (handle Firefox delta units)
- [x] Add keyboard event handling
- [x] Prevent default on wheel to stop page scroll
- [x] Handle right-click context menu
- [x] Implement destroy method for cleanup
- [x] Convert screen coordinates to world coordinates
- [x] Unit tests for InputHandler (41 tests)

### Basic Renderer (`/src/engine/Renderer.ts`)
- [x] Implement Renderer class constructor
- [x] Implement requestRender method with requestAnimationFrame
- [x] Implement basic render loop
- [x] Clear canvas each frame
- [x] Apply camera transform to canvas context
- [x] Implement drawGrid method (optional background grid)
- [x] Handle canvas restoration after transforms
- [x] Add basic performance monitoring (FPS counter)
- [x] Unit tests for Renderer (33 tests)

### React Integration (`/src/ui/CanvasContainer.tsx`)
- [x] Create CanvasContainer component
- [x] Set up canvas ref
- [x] Implement resize observer for canvas
- [x] Handle DPI scaling (devicePixelRatio)
- [x] Initialize engine on mount
- [x] Clean up engine on unmount
- [x] Handle canvas focus for keyboard events
- [x] Forward resize events to engine

### App Structure (`/src/ui/App.tsx`)
- [x] Create basic App component
- [x] Set up layout structure (toolbar, canvas, panels)
- [x] Add CanvasContainer to layout
- [x] Set up basic CSS/styling
- [x] Create main.tsx entry point

## Phase 2: Shape System

### Base Shape Types (`/src/shapes`)
- [x] Define BaseShape interface in Shape.ts
- [x] Define RectangleShape interface
- [x] Define EllipseShape interface
- [x] Define LineShape interface
- [x] Define TextShape interface
- [x] Create Shape union type
- [x] Define Handle interface for resize handles
- [x] Create shape type utilities (type guards)
- [x] Add default shape style constants

### Shape Registry (`/src/shapes/ShapeRegistry.ts`)
- [x] Define ShapeHandler interface
- [x] Implement ShapeRegistry class
- [x] Implement register method
- [x] Implement getHandler method
- [x] Add error handling for unknown shape types

### Rectangle Shape Implementation (`/src/shapes/Rectangle.ts`)
- [x] Implement render handler
- [x] Implement hitTest handler (point in rotated rect)
- [x] Implement getBounds handler
- [x] Implement getHandles handler (8 resize handles)
- [x] Implement create factory function
- [x] Register rectangle handler with ShapeRegistry
- [x] Unit tests for rectangle operations (21 tests)

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
