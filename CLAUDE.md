# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A high-performance diagramming and whiteboard application built with TypeScript, React, and Canvas API. The project prioritizes correctness, extensibility, and performance over rapid feature accumulation, targeting 10,000+ shapes at 60fps.

## Technology Stack

- **Language**: TypeScript (strict mode)
- **UI Framework**: React 18+ (for UI chrome only, not canvas rendering)
- **State Management**: Zustand with Immer middleware
- **Rendering**: Canvas 2D API (no abstraction libraries)
- **Spatial Indexing**: RBush (R-tree implementation)
- **Build Tool**: Vite
- **Testing**: Vitest + Playwright for e2e

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

## Architecture Layers

The application follows a strict layered architecture:

```
React UI Layer (Toolbar, PropertyPanel, LayerPanel)
    ↓
Bridge Layer (CanvasContainer.tsx - mounts canvas, forwards events)
    ↓
Engine Core (Camera, Renderer, InputHandler, ToolManager, SpatialIndex, ShapeRegistry, HitTester)
    ↓
Store Layer (DocumentStore, SessionStore, HistoryStore)
```

### Store Separation

Three independent Zustand stores with distinct responsibilities:

1. **DocumentStore** (`/store/documentStore.ts`): Shape data, connections, groups. All persistent document state.
2. **SessionStore** (`/store/sessionStore.ts`): Selection, camera state, active tool, interaction state, cursor. Ephemeral UI state.
3. **HistoryStore** (`/store/historyStore.ts`): Undo/redo stack with complete document snapshots.

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

Phase 1 (Core Foundation) is in progress:
- Project setup complete
- Remaining: Math utilities, Camera, Renderer, InputHandler, CanvasContainer

See Specification.Readme.md for detailed implementation phases and complete API specifications.

## Key Architectural Decisions

### Why Canvas API directly?
Performance and control. Abstraction libraries add overhead for 10K+ shapes.

### Why three separate stores?
Clear separation of concerns. DocumentStore can be serialized/synced. SessionStore is ephemeral. HistoryStore manages time-travel.

### Why ShapeRegistry pattern?
Extensibility. Adding new shape types requires zero changes to core engine code.

### Why normalized input events?
Uniform handling of mouse, touch, and pen. Simplifies tool implementation.

## Performance Targets

- 10,000+ shapes at 60fps
- Smooth pan/zoom
- Responsive input handling
- Fast hit testing via spatial indexing
- Viewport culling for off-screen shapes
