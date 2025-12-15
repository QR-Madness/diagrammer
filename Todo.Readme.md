# Development Todo List

This document tracks the implementation tasks for building the Whiteboard Foundation prototype. Tasks are organized by
implementation phase as defined in Specification.Readme.md.

## Notes

- **TODO**: Create a "stock-diagram" test scene with various shapes for visual inspection of new features. This should
  be loadable on startup for development/testing purposes.

---

## Completed Phases

### Phase 1: Core Foundation - COMPLETE

- [x] Project setup with Bun, TypeScript, React, Zustand
- [x] Math utilities (Vec2, Mat3, Box, geometry) - 204 tests
- [x] Camera system with coordinate transforms - 58 tests
- [x] Input handler with normalized events - 41 tests
- [x] Renderer with DPI scaling and grid - 33 tests
- [x] React integration (CanvasContainer, App)

### Phase 2: Shape System - COMPLETE

- [x] Shape types and ShapeRegistry pattern
- [x] Rectangle, Ellipse, Line, Text shape handlers
- [x] Shape utilities (bounds, transforms) - 55 tests
- [x] DocumentStore with Immer - 37 tests
- [x] SessionStore for UI state - 37 tests
- [x] SpatialIndex (RBush) and HitTester - 48 tests

### Phase 3: Tools - COMPLETE

- [x] Tool architecture with BaseTool and ToolContext
- [x] ToolManager for tool registration and switching
- [x] PanTool, SelectTool, RectangleTool, EllipseTool, LineTool, TextTool
- [x] Selection with resize/rotation handles
- [x] Marquee selection

### Phase 4: Basic UI - COMPLETE

- [x] Toolbar with tool buttons and shortcuts
- [x] PropertyPanel for shape properties
- [x] Color palette for quick color selection
- [x] Resizable PropertyPanel

### Phase 5: Extended Features - COMPLETE

- [x] History system (undo/redo) - 14 tests
- [x] Keyboard shortcuts (Ctrl+Z, Ctrl+C/V, Delete, etc.)
- [x] Copy/paste with cascading offset
- [x] Connectors (shapes that attach to other shapes)
- [x] Inline text labels for Rectangle and Ellipse
- [x] Text wrapping in shape labels
- [x] Dark mode with system detection
- [x] Immersive controls (WASD/Arrow pan, Q/E zoom)

---

## Current Work: Phase 6 - Polish & Advanced

### High Priority - Core Improvements

#### Text Editing

- [x] Fix text inline editing (double-click to edit)
    - Improved double-click detection thresholds
    - Fixed TextEditor focus timing with requestAnimationFrame
    - Added dark mode support for text editing overlay

#### Alignment & Guides

- [x] Smart snapping to grid
    - Snap shapes to grid points during drag
    - Visual guides showing snap targets (pink dashed lines)
- [x] Smart alignment guides
    - Show guides when shapes align with others (center, edges)
    - Snap to nearby shape edges/centers
- [x] Alignment tools
    - Align selected shapes (left, center, right, top, middle, bottom)
    - Distribute selected shapes (horizontal, vertical)
    - AlignmentPanel component with visual icon buttons

### Medium Priority - Extended Features

#### Layer Management

- [ ] Layer panel with z-order management
    - Visual list of all shapes in z-order
    - Drag to reorder
    - Lock/unlock individual shapes
    - Show/hide individual shapes

#### Grouping

- [ ] Group/ungroup shapes
    - Ctrl+G to group selected shapes
    - Ctrl+Shift+G to ungroup
    - Transform group as single unit
    - Select individual shapes within group

### Lower Priority - Export & Polish

#### Export Features

- [ ] Export to PNG
    - Export visible canvas area
    - Export selected shapes only option
    - High-DPI export option
- [ ] Export to SVG
    - Convert shapes to SVG elements
    - Preserve colors and styles

#### UI Polish

- [ ] Zoom controls in toolbar (zoom in, out, fit, 100%)
- [ ] Minimap for large canvases
- [ ] Status bar with cursor position and zoom level
- [ ] Context menu (right-click)
    - Show relevant actions based on selection (cut, copy, paste, delete)
    - Display keyboard shortcuts next to each action (e.g., "Delete  Del")
    - Shape-specific actions (bring to front, send to back, group, ungroup)
    - Tool-specific options when no selection
    - Styled to match dark/light theme

---

## Future Phases

### Phase 7: Multi-Page & Persistence

- [ ] Multi-page documents
- [ ] Offline-first with localStorage persistence
- [ ] Auto-save functionality
- [ ] Export/import document JSON

### Phase 8: Collaboration

- [ ] Real-time collaboration (CRDT integration)
- [ ] Presence indicators (who's viewing where)
- [ ] Collaborative cursors

### Phase 9: Rich Documentation

- [ ] RTF document editor (similar to Eraser.io)
    - Headings, paragraphs, bold, italic
    - Bullet lists and numbered lists
    - Code blocks with syntax highlighting
    - Tables
    - Embedded images
    - Embedded diagrams (link canvas content into documents)
    - Markdown import/export
    - Document outline/table of contents

### Phase 10: Advanced Diagramming

- [ ] Smart connectors with routing (avoid shapes)
- [ ] Connector labels
- [ ] Shape libraries (presets, templates)
- [ ] Custom shape definitions
- [ ] Customizable PDF document export

---

## Testing Notes

- Mark tasks with [x] when completed
- Update this file as new tasks are discovered
- Each task should be small enough to complete in one session
- Test each component before moving to the next phase
- Total tests: 596 passing

## Test Coverage by Module

| Module                           | Tests   |
|----------------------------------|---------|
| Math (Vec2, Mat3, Box, geometry) | 204     |
| Camera                           | 58      |
| InputHandler                     | 41      |
| Renderer                         | 33      |
| SpatialIndex                     | 24      |
| HitTester                        | 24      |
| DocumentStore                    | 37      |
| SessionStore                     | 37      |
| HistoryStore                     | 14      |
| Rectangle                        | 21      |
| Ellipse                          | 25      |
| Line                             | 23      |
| Shape transforms                 | 31      |
| Shape bounds                     | 24      |
|                                  |         |
| **Total**                        | **596** |
