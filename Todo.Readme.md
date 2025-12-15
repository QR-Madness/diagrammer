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
- [x] Implement bounds.ts
  - [x] calculateBounds for different shape types
  - [x] transformBounds for rotated shapes
  - [x] calculateCombinedBounds, expandBounds, findShapeAtPoint, findShapesInRect
- [x] Implement transforms.ts
  - [x] translateShape function
  - [x] rotateShape function
  - [x] resizeShape function
  - [x] setShapeSize, setShapePosition, cloneShape utilities
  - [x] Unit tests for transformations (55 tests)

### Document Store (`/src/store/documentStore.ts`)
- [x] Define DocumentState interface
- [x] Define DocumentActions interface
- [x] Create Zustand store with Immer middleware
- [x] Implement addShape action
- [x] Implement updateShape action
- [x] Implement deleteShape action
- [x] Implement deleteShapes batch action
- [x] Implement updateShapes batch action
- [x] Implement bringToFront z-order action
- [x] Implement sendToBack z-order action
- [x] Implement bringForward z-order action
- [x] Implement sendBackward z-order action
- [x] Implement getSnapshot for serialization
- [x] Implement loadSnapshot for deserialization
- [x] Unit tests (37 tests)

### Session Store (`/src/store/sessionStore.ts`)
- [x] Define SessionState interface
- [x] Define SessionActions interface
- [x] Create Zustand store
- [x] Implement select action
- [x] Implement addToSelection action
- [x] Implement removeFromSelection action
- [x] Implement clearSelection action
- [x] Implement selectAll action
- [x] Implement setCamera action
- [x] Implement setActiveTool action
- [x] Implement setCursor action
- [x] Unit tests (37 tests)

### Spatial Index (`/src/engine/SpatialIndex.ts`)
- [x] Install and configure RBush
- [x] Implement SpatialIndex class wrapper
- [x] Implement rebuild method
- [x] Implement update method
- [x] Implement remove method
- [x] Implement queryPoint method
- [x] Implement queryRect method
- [x] Unit tests (24 tests)

### Hit Tester (`/src/engine/HitTester.ts`)
- [x] Implement HitTester class
- [x] Implement hitTestPoint (respects z-order)
- [x] Implement hitTestRect for marquee selection
- [x] Implement hitTestHandles for resize handles
- [x] Use SpatialIndex for candidate filtering
- [x] Use ShapeRegistry for precise hit tests
- [x] Unit tests (24 tests)

### Renderer Integration
- [x] Update Renderer to render shapes from DocumentStore
- [x] Implement renderShape method using ShapeRegistry
- [x] Add viewport culling (skip off-screen shapes)
- [x] Subscribe to DocumentStore changes (via setShapes method)
- [x] Subscribe to SessionStore changes (via setSelection method)
- [x] Implement selection overlay rendering

## Phase 3: Tools

### Tool Architecture (`/src/engine/tools`)
- [x] Define Tool interface in Tool.ts
- [x] Define ToolContext interface
- [x] Define tool lifecycle methods (onActivate, onDeactivate)
- [x] Define input handler methods for tools
- [x] Define BaseTool abstract class

### Tool Manager (`/src/engine/ToolManager.ts`)
- [x] Implement ToolManager class
- [x] Implement tool registration
- [x] Implement setActiveTool with activation/deactivation
- [x] Forward pointer events to active tool
- [x] Forward keyboard events to active tool
- [x] Forward wheel events to active tool
- [x] Call tool renderOverlay method
- [x] Implement keyboard shortcut handling

### Pan Tool (`/src/engine/tools/PanTool.ts`)
- [x] Implement PanTool class
- [x] Handle middle-click drag (via MiddleClickPanHandler)
- [x] Update camera position on drag
- [x] Set appropriate cursor (grab/grabbing)
- [x] Request render on pan

### Select Tool (`/src/engine/tools/SelectTool.ts`)
- [x] Implement SelectTool state machine
- [x] Implement Idle state
- [x] Implement click selection (single shape)
- [x] Implement shift-click (add/remove from selection)
- [x] Implement click on empty (clear selection)
- [x] Implement marquee selection (drag on empty)
- [x] Implement translate shapes (drag selected)
- [x] Track drag start positions for translation
- [x] Update shapes during drag
- [x] Commit changes on pointer up
- [x] Render marquee rectangle during selection
- [x] Handle Delete key to delete shapes
- [x] Handle Escape key to cancel/clear

### Rectangle Tool (`/src/engine/tools/RectangleTool.ts`)
- [x] Implement RectangleTool class
- [x] Handle pointer down (start position)
- [x] Handle pointer move (update size preview)
- [x] Render preview during creation
- [x] Create shape on pointer up
- [x] Add shape to DocumentStore
- [x] Switch to SelectTool after creation
- [x] Handle Escape key to cancel
- [x] Handle Shift key for square constraint

### Engine Integration (`/src/engine/Engine.ts`)
- [x] Create main Engine class
- [x] Initialize Camera
- [x] Initialize Renderer
- [x] Initialize InputHandler
- [x] Initialize SpatialIndex
- [x] Initialize HitTester
- [x] Initialize ToolManager
- [x] Register default tools
- [x] Wire up event handlers
- [x] Subscribe to DocumentStore changes
- [x] Subscribe to SessionStore changes
- [x] Implement resize method
- [x] Implement destroy method
- [x] Default wheel zoom behavior

## Phase 4: Basic UI

### Toolbar (`/src/ui/Toolbar.tsx`)
- [x] Create Toolbar component
- [x] Add tool buttons (Select, Pan, Rectangle)
- [x] Connect to sessionStore.setActiveTool
- [x] Show active tool state
- [x] Add keyboard shortcuts display

### CanvasContainer Updates
- [x] Update CanvasContainer to use Engine class
- [x] Simplify component to delegate to Engine

### Example Content
- [x] Add example shapes on startup for demonstration
- [x] Include variety of colors and rotations

### Utilities (`/src/utils`)
- [x] Implement id.ts with nanoid wrapper
- [x] Implement color.ts (hex/rgb/hsl parsing and conversion)
- [x] Implement debounce.ts (debounce, throttle utilities)

### Store Types (`/src/store/types.ts`)
- [x] Define common store types (in sessionStore.ts)
- [x] Define ToolType enum (in sessionStore.ts)
- [x] Define CameraState type (in sessionStore.ts)

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
- [x] Implement Ellipse shape (render, hitTest, bounds, handles) - 25 tests
- [x] Implement Line/Arrow shape - 23 tests
- [x] Implement basic Text shape (no inline editing)
- [x] Register all shape types (Rectangle, Ellipse, Line, Text registered)

### Selection Enhancements
- [x] Implement multi-selection (marquee selection works)
- [x] Implement resize handles in SelectTool
- [x] Implement rotation handles (with Shift for 15-degree snap)
- [x] Implement handle dragging state
- [x] Update shapes during resize
- [x] Maintain aspect ratio with Shift key

### History System (`/src/store/historyStore.ts`)
- [x] Define HistoryEntry interface
- [x] Define HistoryState interface
- [x] Create HistoryStore - 14 tests
- [x] Implement push action
- [x] Implement undo action
- [x] Implement redo action
- [x] Implement clear action
- [x] Integrate with DocumentStore mutations
- [x] Add debouncing for rapid changes

### Keyboard Shortcuts
- [x] Implement Ctrl+Z for undo
- [x] Implement Ctrl+Shift+Z / Ctrl+Y for redo
- [x] Implement Delete for deleting selected shapes
- [x] Implement Ctrl+A for select all
- [x] Implement Escape for deselect/cancel
- [x] Implement Ctrl+C for copy
- [x] Implement Ctrl+V for paste
- [x] Tool shortcuts (V=select, H=pan, R=rectangle, O=ellipse, L=line, T=text)

### Property Panel (`/src/ui/PropertyPanel.tsx`)
- [x] Create PropertyPanel component
- [x] Show properties for selected shapes
- [x] Add fill color picker
- [x] Add stroke color picker
- [x] Add stroke width slider
- [x] Connect to documentStore.updateShape
- [x] Handle multi-selection (show common properties)

### Additional Tools
- [x] Implement EllipseTool (with shift for circle constraint)
- [x] Implement LineTool (with shift for 45-degree angle constraint)
- [x] Implement TextTool (basic click-to-create)

## Phase 6: Polish & Advanced (Future)

- [x] Copy/paste implementation (Ctrl+C/V with offset for cascading pastes)
- [ ] Layer panel with z-order management
- [X] Dark mode
- [ ] [STILL-BROKEN] Text inline editing (double-click to edit)
- [ ] Immersive controls (WASD/arrow keys for pan, Q/E for zoom)
- [X] Connectors (shapes that attach to other shapes)
- [ ] Colour palette for fast colour selection
- [ ] Smart alignment and snapping (align to grid or other shapes)
- [ ] Grouping/ungrouping
- [ ] Alignment tools
- [ ] Distribution tools
- [ ] Export to PNG
- [ ] Export to SVG
- [ ] Multi-page documents
- [ ] Real-time collaboration (CRDT integration)
- [ ] Offline-first with persistence
- [ ] Playwright e2e tests (FUTURE)

## Phase 7: Documentation Features (Future)

### RTF Document Editor (similar to Eraser.io)
- [ ] Implement rich text document editor alongside diagrams
- [ ] Support for headings (H1-H6)
- [ ] Support for paragraphs, bold, italic, underline, strikethrough
- [ ] Support for bullet lists and numbered lists
- [ ] Support for code blocks with syntax highlighting
- [ ] Support for tables
- [ ] Support for embedded images
- [ ] Support for embedded diagrams (link canvas content into documents)
- [ ] Support for markdown import/export
- [ ] Document outline/table of contents generation
- [ ] Document versioning and history
- [ ] Multi-document workspace

## Notes

- Mark tasks with [x] when completed
- Update this file as new tasks are discovered
- Each task should be small enough to complete in one session
- Test each component before moving to the next phase
- Performance testing should begin after Phase 3 completion
