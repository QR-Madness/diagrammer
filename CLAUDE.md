# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A high-performance diagramming and whiteboard application built with TypeScript, React, and Canvas API. The project prioritizes correctness, extensibility, and performance over rapid feature accumulation, targeting 10,000+ shapes at 60fps.

## Technology Stack

- **Runtime**: Bun (fast JavaScript runtime and package manager)
- **Language**: TypeScript (strict mode)
- **UI Framework**: React 18+ (for UI chrome only, not canvas rendering)
- **State Management**: Zustand with Immer middleware
- **Rendering**: Canvas 2D API (no abstraction libraries)
- **Rich Text Editor**: Tiptap (ProseMirror wrapper)
- **Spatial Indexing**: RBush (R-tree implementation)
- **Build Tool**: Vite
- **Testing**: Vitest + Playwright for e2e

## Development Commands

**Note**: This project uses Bun as the runtime and package manager for faster installs and builds.

```bash
# Install dependencies
bun install

# Development server
bun run dev

# Type checking
bun run typecheck

# Run all tests (watch mode)
bun run test

# Run all tests once
bun run test --run

# Run a single test file
bun run test src/engine/Camera.test.ts

# Run tests with UI
bun run test:ui

# Build for production
bun run build
```

## Architecture Layers

The application follows a strict layered architecture:

```
React UI Layer (Toolbar, PropertyPanel, LayerPanel, SettingsModal)
    ↓
Bridge Layer (CanvasContainer.tsx - mounts canvas, forwards events)
    ↓
Engine Core (Camera, Renderer, InputHandler, ToolManager, SpatialIndex, ShapeRegistry, HitTester)
    ↓
Store Layer (DocumentStore, SessionStore, HistoryStore, PageStore, PersistenceStore, + feature stores)
    ↓
Storage Layer (localStorage for state, IndexedDB for blobs)
```

### Store Separation

Core Zustand stores with distinct responsibilities:

**Document & Session (Core)**
1. **DocumentStore** (`/store/documentStore.ts`): Shape data, connections, groups. All persistent document state.
2. **SessionStore** (`/store/sessionStore.ts`): Selection, camera state, active tool, interaction state, cursor. Ephemeral UI state.
3. **HistoryStore** (`/store/historyStore.ts`): Undo/redo stack with complete document snapshots.
4. **PageStore** (`/store/pageStore.ts`): Multi-page document structure, page ordering, active page.
5. **PersistenceStore** (`/store/persistenceStore.ts`): Document save/load, auto-save, localStorage management.
6. **RichTextStore** (`/store/richTextStore.ts`): Tiptap editor content for the document editor panel.

**Feature Stores (UI & Libraries)**
7. **ThemeStore**: Dark/light mode with system detection.
8. **StyleProfileStore**: Reusable shape style profiles.
9. **ColorPaletteStore**: Recent colors and custom color tracking.
10. **IconLibraryStore**: Built-in and custom SVG icons for shapes.
11. **ShapeLibraryStore**: Built-in shape library definitions (flowcharts, UML).
12. **CustomShapeLibraryStore**: User-created shape libraries with IndexedDB storage.
13. **UIPreferencesStore**: Collapsible section states and UI preferences.

### Storage Layer

The project uses a hybrid storage architecture:
- **localStorage**: Document metadata, store state, preferences
- **IndexedDB**: Binary blobs (images, custom icons, custom shape library data)

Key storage components in `/src/storage/`:
- **BlobStorage** (`BlobStorage.ts`): Content-addressed storage using SHA-256 hashing for automatic deduplication. Supports multiple blob types (images, icons, shape libraries) with reference counting.
- **BlobGarbageCollector** (`BlobGarbageCollector.ts`): Cleans up orphaned blobs by scanning document references and removing unreferenced entries.
- **BlobTypes** (`BlobTypes.ts`): Type definitions for blob metadata and storage interfaces.
- **builtinIcons** (`builtinIcons.ts`): 30+ built-in SVG icons organized by category (arrows, shapes, symbols, tech, general).
- **IconTypes** / **ShapeLibraryTypes**: Type definitions for icon and shape library storage.

### Coordinate System Flow

All coordinate transforms flow through the Camera class. Never manually apply pan/zoom transformations elsewhere.

```
Screen Space (canvas pixels)
  → camera.screenToWorld(point)
  → World Space (infinite 2D plane)
  → shape.worldToLocal(point) [for rotated shapes]
  → Local Space
```

### Shape System

Shapes are plain data objects. Behavior is implemented via the **ShapeRegistry pattern**:
- Each shape type registers handlers for: `render`, `hitTest`, `getBounds`, `getHandles`, `create`
- Shape data extends `BaseShape` interface with type-specific properties
- No methods on shape objects - all behavior is external
- Shape metadata (`/shapes/ShapeMetadata.ts`) provides property definitions for dynamic PropertyPanel rendering

### Shape Libraries

The project supports multiple shape library tiers:
- **Basic shapes**: Rectangle, Ellipse, Line, Text, Connector, Group
- **Flowchart shapes** (`/shapes/library/`): Diamond, Terminator, Data, Document, Process variants
- **UML shapes**: Actor, Use Case, System Boundary
- **User libraries**: Custom shapes saved via context menu "Save to Library...", stored in IndexedDB

## Critical Implementation Rules

### Coordinate Transforms
- All viewport transforms go through Camera class
- Never manually apply pan/zoom in render or hit test code
- Always use `camera.screenToWorld()` and `camera.worldToScreen()`

### State Management
- DocumentStore is the single source of truth for shape data
- All document mutations must be immutable (use Immer)
- History stores complete snapshots - implement structural sharing later if needed
- Never mutate state directly

### Canvas Rendering
- React handles UI chrome only, never touches canvas rendering
- Canvas rendering happens in Engine core using requestAnimationFrame
- Implement viewport culling - don't render shapes outside visible bounds
- Apply camera transform once per frame, render all shapes in world coordinates

### Tool Architecture
- Tools are state machines responding to normalized input events
- One tool active at a time via ToolManager
- Tools receive ToolContext with camera, stores, hitTester, requestRender
- Tools can render overlays (selection boxes, guides) in screen space

### Input Handling
- InputHandler normalizes mouse, touch, and pen to `NormalizedPointerEvent`
- Always includes both screenPoint and worldPoint
- Handle pointer capture on down, release on up
- Prevent default on wheel events to stop page scroll

### Hit Testing
- Use SpatialIndex (RBush) to get candidate shapes, then precise hit test
- Hit testing respects z-order (shapeOrder array)
- Rebuild spatial index when shapes change significantly

## Code Style

1. **No `any` types** - Use `unknown` and type guards
2. **Immutable updates** - Never mutate state directly (enforced by Immer)
3. **Pure functions** - Shape handlers should be pure where possible
4. **Small, focused files** - Each file has one clear responsibility
5. **Explicit over implicit** - Prefer verbose, clear code over clever shortcuts
6. **Test the math** - Vec2, Mat3, Box, geometry functions require unit tests

## Implementation Status

Completed phases:
- **Phase 1-6**: Core foundation, shape system, tools, UI, extended features, export
- **Phase 7**: Multi-page documents, offline persistence, auto-save
- **Phase 8**: Rich text document editor (Tiptap-based split-screen editor)
- **Phase 9**: UI improvements (enhanced color palette, property panel redesign, unified toolbar, status bar)
- **Phase 9.5**: IndexedDB storage for images and blobs with content-addressed deduplication
- **Phase 10**: Advanced diagramming (connector labels, orthogonal routing, icon library, shape icons)
- **Phase 10.5-10.7**: Shape libraries (flowcharts, UML use-case, user-expandable libraries, settings modal)
- **Phase 11.1-11.2**: Property panel overhaul, label customization, context menu upgrades with submenus
- **Phase 11.3**: Layer panel upgrades (group colors with inheritance, layer views with regex/manual filtering, shape label preview)

Current: Phase 11.5 (Common Settings) and beyond.

See Todo.Readme.md for detailed task tracking.

## Key Architectural Decisions

### Why Bun instead of Node.js?
Bun provides significantly faster package installs, faster TypeScript execution, and better developer experience while maintaining full compatibility with npm packages and Node.js tooling.

### Why Canvas API directly?
Performance and control. Abstraction libraries add overhead for 10K+ shapes.

### Why separated stores?
Clear separation of concerns. DocumentStore can be serialized/synced. SessionStore is ephemeral. HistoryStore manages time-travel. Feature stores (theme, styles, libraries) handle specific UI concerns independently without bloating core stores.

### Why ShapeRegistry pattern?
Extensibility. Adding new shape types requires zero changes to core engine code.

### Why normalized input events?
Uniform handling of mouse, touch, and pen. Simplifies tool implementation.

### Why plugin extensibility?
The `/src/plugins/PanelExtensions.ts` registry pattern allows extending UI panels without modifying core components. Supports custom property sections, property renderers, and panel actions.

## Performance Targets

- 10,000+ shapes at 60fps
- Smooth pan/zoom
- Responsive input handling
- Fast hit testing via spatial indexing
- Viewport culling for off-screen shapes

## UI Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Unified Toolbar (~44px)                            │
│  [File][Tools][PageTabs...][Theme][Settings]        │
├──────────────────┬──────────────────────────────────┤
│  Document Editor │  Canvas Area                     │
│  (resizable)     │                      PropertyPanel│
│  ┌──────────────┐│                       (collapsible)
│  │Toolbar       ││                                  │
│  │Tiptap Editor ││                      LayerPanel  │
│  └──────────────┘│                       (collapsible)
├──────────────────┴──────────────────────────────────┤
│  Status Bar (coords, zoom, shape count, tool)       │
└─────────────────────────────────────────────────────┘
```

- **Unified Toolbar**: Consolidated header replacing separate header, toolbar, and page tabs
- **SplitPane**: Resizable left/right panels (document editor / canvas area)
- **PropertyPanel & LayerPanel**: Collapsible right-side panels with persistent state
- **SettingsModal**: Tab-based modal for shape libraries and future settings
