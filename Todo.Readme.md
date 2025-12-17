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

- [x] Layer panel with z-order management
    - Visual list of all shapes in z-order
    - Drag to reorder
    - Lock/unlock individual shapes
    - Show/hide individual shapes
    - Bring to front / Send to back buttons

#### Style Profiles

- [x] Style profiles for reusable shape styles
    - Save current shape's style as a named profile
    - Profile stores: fill, stroke, strokeWidth, opacity, cornerRadius (if applicable)
    - Profile also stores: labelFontSize, labelColor for shapes with labels
    - Five built-in default profiles (Default Blue, Fresh Green, Warm Orange, Outline Only, Subtle Gray)
    - List saved profiles in PropertyPanel with color preview swatches
    - Apply profile to selected shape(s) with checkmark button
    - Delete custom profiles (defaults are protected)
    - Rename custom profiles via double-click
    - Persist custom profiles in localStorage
    - Ready for group application (future group feature)

#### Grouping

- [X] Group/ungroup shapes
    - Ctrl+G to group selected shapes
    - Ctrl+Shift+G to ungroup
    - Transform group as single unit
    - Select individual shapes within group

### Lower Priority - Export & Polish

#### Export Features

- [x] Export to PNG
    - Export visible canvas area or selected shapes
    - High-DPI export option (1x, 2x, 3x scale)
    - Configurable background (color or transparent)
    - Configurable padding
- [x] Export to SVG
    - Convert shapes to SVG elements
    - Preserve colors, strokes, opacity
    - Support for all shape types including groups
- [x] Export UI
    - File menu in header with export options
    - Context menu "Export Selection..." option
    - Export dialog with format, scale, background, padding, filename options

#### UI Polish

- [X] Context menu (right-click)
    - Show relevant actions based on selection (cut, copy, paste, delete)
    - Display keyboard shortcuts next to each action (e.g., "Delete Del")
    - Shape-specific actions (bring to front, send to back, group, ungroup)
    - Tool-specific options when no selection
    - Styled to match dark/light theme

### Phase 7: Multi-Page & Persistence

- [ ] Multi-page documents
- [ ] Offline-first with localStorage persistence
- [ ] Auto-save functionality
- [ ] Export/import document JSON
- [ ] Local path for saving documents (optional)

### Phase 8: Collaboration & UI Improvements

- [ ] Real-time collaboration (CRDT integration)
- [ ] Presence indicators (who's viewing where)
- [ ] Collaborative cursors

#### UI Improvements

- [ ] Minimap for large canvases (place the toggle in the topbar next to the theme toggle)
- [ ] Status bar with cursor position and zoom level
- [ ] Zoom controls in the toolbar (zoom in, out, fit, 100%)

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
- [ ] Shape icons (similar to Eraser.io) + customizable icon library
- [ ] Connector labels
- [ ] Shape libraries (presets, templates)
- [ ] Custom shape definitions

### Phase 11: Enhanced Persistence

- [ ] Git integration for version control

### Phase 12: Advanced Export

- [ ] Customizable PDF document export (feats: DPI, include software version, custom logo, standard cover pages, etc.)

### Phase 13: Diagram Patterns

- [ ] Basic flowchart patterns
- [ ] Basic UML class diagram patterns
- [ ] Basic ERD diagram patterns

### Phase 14: UI Improvements

- [ ] 

### Phase 15: Version 1.0

- [ ] Workflow for GitHub releases (CI/CD pipeline)
- [ ] Finalize UI polish and documentation (create release notes, update changelog, ensure all features are documented
  in README)

### Phase 16: Advanced Diagram Patterns – Version 1.1

- [ ] Sequence diagram patterns
- [ ] Activity diagram patterns
- [ ] Swimlane customization

### Phase ??: Comprehensive Local Help System - Version ?.?

- [ ] Implement a local help documentation system with integrated search and navigation
- [ ] Create a comprehensive help guide for the application

### Phase ??: Canvas Code Integration with Git – Version ?.?

- [ ] Implement a composable VCS pattern which allows interfacing with Git for version control, and others in the future
- [ ] Implement Git file viewing and linking to shapes by adding a 'view code' button to a shape which opens a new tab with the relevant file
- [ ] Integrate with existing Git integration for version control (save changes to Git repo; default directory is /diagrammer/*.json)
- [ ] Feat: Spawn a VS Code instance with access to Git repo

### Phase ??: FUTURE: AI Model Integration (Epic - Large Task with Multiple Components) – Version ?.?

- [ ] Implement a pipeline for model usage and integration with the application
- [ ] Implement AI-powered diagram analysis
- [ ] Generate insights and suggested edits

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
