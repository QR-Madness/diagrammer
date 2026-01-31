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

### Phase 6: Core Improvements - COMPLETE

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

- [x] Group/ungroup shapes
  - Ctrl+G to group selected shapes
  - Ctrl+Shift+G to ungroup
  - Transform group as single unit
  - Select individual shapes within group

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

- [x] Context menu (right-click)
  - Show relevant actions based on selection (cut, copy, paste, delete)
  - Display keyboard shortcuts next to each action (e.g., "Delete Del")
  - Shape-specific actions (bring to front, send to back, group, ungroup)
  - Tool-specific options when no selection
  - Styled to match dark/light theme

### Phase 7: Multi-Page & Persistence - COMPLETE

- [x] Multi-page documents
- [x] Offline-first with localStorage persistence
- [x] Auto-save functionality
- [x] Export/import document JSON
- [x] Local path for saving documents (optional)

### Phase 8: Rich Documentation - COMPLETE

- [x] RTF document editor (similar to Eraser.io)
  - Headings, paragraphs, bold, italic
  - Bullet lists and numbered lists
  - Code blocks with syntax highlighting
  - Tables
  - Embedded images
  - Embedded diagrams (link canvas content into documents)
  - Markdown import/export
  - Document outline/table of contents

### Phase 9: UI Improvements - COMPLETE

#### Enhanced Color Palette

- [x] Recent colors tracking (last 8 used, persisted to localStorage)
- [x] Custom color input with hex support
- [x] Color palette organized by color family (grayscale, warm, cool, accent)
- [x] Native color picker integration

#### Property Panel Redesign

- [x] Collapsible property sections with chevron headers
- [x] Section state persistence (remember expanded/collapsed)
- [x] Compact color input (inline picker + hex)
- [x] Default collapse Position/Size sections (less commonly edited)
- [x] More compact, vibrant styling

#### Unified Toolbar (Notion/Linear Style)

- [x] Single consolidated toolbar (~44px) replacing header + toolbar + page tabs
- [x] Compact tool buttons (32px) with hover tooltips showing shortcuts
- [x] Inline page tabs with horizontal scroll
- [x] Minimal, keyboard-first aesthetic

#### Status Bar

- [x] Camera position display (X, Y coordinates)
- [x] Zoom level with quick controls (-, +, Fit, 100%)
- [x] Shape count indicator
- [x] Current tool display

### Phase 9.5: IndexedDb Storage - COMPLETE

- [x] Implement an IndexedDb storage pattern for images and blobs
  - Content-addressed storage using SHA-256 hashing for automatic deduplication
  - Reference counting for safe garbage collection
  - BlobStorage class for IndexedDB CRUD operations
  - BlobGarbageCollector for cleaning up orphaned blobs
  - Tiptap image extension integration with blob:// URLs
  - ImageUploadButton component with automatic image validation and resizing
  - Storage Manager UI for viewing blobs and running garbage collection
  - Hybrid storage: localStorage for documents, IndexedDB for binary blobs
- [x] Plan for a local directory storage which allows documents to reside within their own directory
  - Architecture designed with pluggable BlobStorageBackend interface
  - Future support for File System Access API planned

### Phase 10: Advanced Diagramming - COMPLETE

- [x] Connector labels
  - Label text, font size, color, position along path
  - Background for readability
  - PropertyPanel section for connector label editing
- [x] Smart connectors with orthogonal routing
  - OrthogonalRouter for L-shaped and Z-shaped Manhattan paths
  - Waypoints for multi-segment polylines
  - Automatic path recalculation when shapes move
  - Routing mode selector in PropertyPanel (straight/orthogonal)
- [x] Custom icon library with IndexedDB storage
  - 30+ built-in SVG icons (arrows, shapes, symbols, tech, general)
  - SVG sanitization and validation
  - Content-addressed blob storage for custom icons
  - IconPicker component with category filtering and search
  - Upload custom SVG icons
- [x] Shape icons for Rectangle and Ellipse
  - Icon badge in top-left corner
  - Configurable size and padding
  - Icons rendered using cached HTMLImageElement for performance
  - StorageManager updated with Icons tab for management

### Phase 10.5: Shape Libraries - COMPLETE

- [x] Shape libraries (basics, flowcharts, UML barebones, and **eventually** stuff like BPMN, swimlanes, etc.)
  - _Concepts to keep in mind:_
    - Eventually in the far future, we will be linking shapes to code and using REAL UML classes that link to real classes
    - Layers will eventually be renamable (GroupShape.name already exists)
  - _Initial scope:_
    - Metadata-driven shape system for PropertyPanel extensibility
    - Flowchart shapes: Diamond, Terminator, Data, Document, Predefined Process, Manual Input, Preparation, Connector, Off-Page Connector
    - ShapePicker UI component for shape library selection

### Phase 10.6: UML Use-Case Diagrams - COMPLETE

- [x] UML use-case diagram shapes
  - Actor (stick figure with circle head and limbs)
  - Use Case (ellipse with label)
  - System Boundary (labeled rectangle container with title bar)
  - Include/Extend relationship indicators (arrow shapes for visual reference)
- [x] Fixed dark mode rendering for ShapePicker canvas previews

### Phase 10.7 User Expandable Shape Libraries - COMPLETE

- [x] Create a settings modal (feel free to add anything that belongs) that we will use in the future for various features
  - Tab-based settings modal infrastructure (SettingsModal.tsx)
  - Shape Libraries tab as initial implementation
- [x] Implement the ability to save and re-use shapes into a runtime shape library
  - ShapeLibraryManager UI for creating/renaming/deleting libraries
  - Users can create named libraries
  - Users can rename custom libraries
  - Users can export/import libraries as JSON
  - SaveToLibraryDialog accessible via context menu "Save to Library..."
  - CustomShapeTool for click-to-place behavior
  - Two-tier storage: Zustand (localStorage) for metadata, IndexedDB for shape data
  - Extensible store architecture for future usage

#### UI Fixes & Improvements

- [x] Implement draggable layer reordering throughout groups and nested groups
- [x] Fix group layer-order visibility issues; when I grouped a text and shape together with my text on top, the grouping moved my text to the bottom and went invisible even though it was above the shape within the layer-order
- [x] Shapes have no available icons in the property panel

### Phase 11: Advanced Shape Toolsets - COMPLETE

#### Phase 11.1: Property Panel Overhaul - COMPLETE

- [x] Icon picker dropdown is buried underneath property panel elements (messed-up-z-order)
  - Fixed using React Portal to render dropdown at document body level
  - Added position tracking and scroll/resize handling
- [x] Improve the property panel UX where possible including aesthetics
  - Updated PropertyPanel.css with modern styling (rounded borders, better spacing)
  - Improved PropertySection.css with card-like appearance
  - Added hover states, smooth transitions, and better scrollbar styling
  - Updated type badge with accent color
- [x] Plugin extensibility for panels
  - Created PanelExtensions.ts with registry pattern
  - PropertySectionExtension for custom panel sections
  - PropertyRendererExtension for custom property types
  - PanelActionExtension for header action buttons
  - Extensible architecture ready for future plugins
- [x] AMENDMENT: Shape label customizations: custom BG, ~~and draggable~~ offset labels from the default position on a shape.
  - Label background color property for Rectangle, Ellipse, LibraryShape, and Connector
  - Label offset X/Y properties for positioning labels away from center
  - PropertyPanel controls for all label styling options

#### Phase 11.2: Context Menu Upgrades - COMPLETE

- [x] Implement multi-option entries support (submenu on hover)
  - Created reusable Submenu component with hover delay
- [x] Add context menu entry: Change connector routing
- [x] Add context menu entry: Lock submenu
  - Lock Position, Lock Size, Lock All options
  - SelectTool respects lock properties

#### Phase 11.3: Layer Panel Upgrades - COMPLETE

- [x] Color layers/groups (layers inherit colors of a group if they don't have a color, ensure inherited colors lose their inheritance when moved out of a group, and remember group->group inheritance)
  - Added `layerColor` property to GroupShape
  - Color badge displayed in LayerPanel with inheritance from parent groups
  - "Set Color" submenu in context menu with preset colors
  - Inherited colors shown with reduced opacity
- [x] Rename layers/groups
  - Polished existing rename UX: auto-select text on focus
  - Validates non-empty names before saving
- [x] Creating layer views (dropdown selector for filtered subsets of layers)
  - LayerViewStore for persistent view storage
  - LayerViewManager modal for creating/editing/deleting views
  - Regex pattern matching against shape types, group names, and labels
  - Manual additions via "Add to View" context menu submenu
  - View selector dropdown in LayerPanel header
- [x] Show a compact line with a preview of a shape's label-text
  - Displays truncated label/text content below shape type
  - Works for Rectangle, Ellipse, Text, Connector, and LibraryShape

#### Phase 11.4: Common Settings - COMPLETE

- Implemented 'Common Settings' area in the settings modal which contains the following:
  - [x] Default connector type (default orthogonal) - ConnectorTool reads from settingsStore
  - [x] Default shape style profile - Dropdown in GeneralSettings
  - [x] Show static properties in the property panel (default enabled) - Setting stored in settingsStore
  - [x] Hide default style profiles - StyleProfilePanel and GeneralSettings dropdown respect this setting
  - [x] Theme preference (System/Light/Dark) moved to General Settings
- [x] Move the storage manager into a settings section and delete the tools toolbar entry
  - Storage Manager embedded as StorageSettings tab in SettingsModal
  - Removed Tools menu from UnifiedToolbar
- [x] Move File menu into Settings modal as Documents tab
  - DocumentsSettings component with New, Save, Import/Export, document list
  - Removed File dropdown from UnifiedToolbar
- [x] Full-size "Settings" button in toolbar (replaces icon-only buttons)
  - Consolidated Settings button with icon + text
  - Removed separate theme toggle (now in Settings > General)
- [x] Add a small 'Rebuild' button which recalculates all connector routes
  - documentStore.rebuildAllConnectorRoutes() function added
  - Rebuild button in UnifiedToolbar
- [x] Garbage collection protects icons by default
  - BlobGarbageCollector skips SVG files unless `includeIcons: true` option
  - Storage Manager shows "Icon" tag and "Protected" badge for SVG blobs
- Added 'Style Profile' settings area in SettingsModal with:
  - [x] Save Icon Style to Style Profile (on by default)
  - [x] Save Label Style to Style Profile (on by default)

#### Phase 11.5: Advanced Group Style Properties - COMPLETE

- Implemented the following properties for groups:
  - [x] Background Color, and Background-Pattern Support (solid, stripes, hazard stripes, linear/radial gradients)
    - PatternPicker component with visual previews
    - Configurable pattern colors, angle, and spacing
    - Background padding and corner radius options
  - [x] Labels (with manual offset translation capability)
    - 9-grid label position picker (center, top, top-left, etc.)
    - Label font size, color, and background
    - Offset X/Y fine-tuning with reset button
  - [x] Border styling properties
    - Border color, width, and corner radius
    - BorderStylePicker with solid, dashed, dotted, dash-dot patterns
  - [x] BONUS FEATURE: Shadows and glow effects
    - ShadowEditor with offset, blur, and color controls
    - Preset options: Drop Shadow, Soft Shadow, Glow, Subtle Glow
- Two-pass group rendering (background/border before children, label on top)
- Hit testing updated to include background area for styled groups

### Phase 12: Advanced Export - COMPLETE

- [x] Customizable PDF document export
  - Export rich text document content to PDF
  - DPI/Quality settings (Standard 72dpi, High 150dpi, Print 300dpi)
  - Page size options (A4, Letter, A3, Tabloid) with portrait/landscape orientation
  - Configurable margins and page numbers
  - Cover page with custom logo from blob storage, title, version/revision, author, date, and description
  - LogoPicker component for selecting logos from IndexedDB storage
  - PDFExportStore for persisting export preferences
  - Tiptap JSON content parsing with support for headings, paragraphs, lists, code blocks, blockquotes, images, and horizontal rules

### Phase 12.2: Embeddable Diagram Groups - COMPLETE

- [x] Implement an embeddable diagram system into the tiptap editor that allows users to:
  - Open the context menu and add a group to the rich text document at the cursor
  - Custom Tiptap node extension for embedded groups (EmbeddedGroupExtension.ts)
  - React component for rendering group previews (EmbeddedGroupComponent.tsx)
  - Context menu in document editor to select from available groups
  - PDF export support for embedded group nodes
  - Maximum width/height constraints with aspect ratio preservation
  - Refresh button to re-render group after canvas changes

### Phase 13: Diagram Patterns - COMPLETE

- [x] ERD Shape Library (Crow's Foot)
  - Entity, Weak Entity, Relationship, Attribute, Key Attribute shapes
  - Cardinality indicators: One, Many, Zero-One, Zero-Many, One-Many
  - 10 shapes total with proper anchors and hit testing
- [x] UML Class Diagram Shape Library
  - Class (3-compartment), Interface, Abstract Class, Enum, Package, Note shapes
  - Relationship indicators: Association, Aggregation, Composition, Inheritance, Realization, Dependency
  - 12 shapes total with proper anchors and hit testing
- [x] Misc. Feature: Add/Remove shapes from groups via context menu
  - "Add to Group" submenu lists available groups (with cycle detection)
  - "Remove from Group" option for shapes inside groups
  - Uses existing moveShapeInHierarchy() store method

### Phase 14: Collaboration, Simple Auth, and UI Improvements

#### Architecture Overview

The Diagrammer desktop app (packaged via **Tauri**) operates in two modes:

- **Offline (Default)**: Personal documents stored locally, no network features
- **Protected Local**: Host exposes Team Documents storage; clients connect over network (LAN, VPN, or tunneled via Cloudflare/similar)

**Host-Client Model:**

- Host runs Diagrammer in Protected Local mode, acts as single source of truth for Team Documents
- Clients authenticate via host's login page and receive **JWT session tokens**
- CRDT (Yjs/yrs recommended due to existing Tiptap integration) negotiates real-time changes
- Team Documents are decoupled from Personal Documents; any document can be moved to Team Documents
- Future: targeted plugins may only work on Team Documents or Personal Documents

**Ownership & Permissions Model:**

- **Roles**: Admin and User (future: extensible role system as permission interfaces)
- **Documents**: Owned by SYSTEM, controlled by ADMINS
  - Admins can restrict: document creation, modifications, deletions
- **Groups**: Can have ownership; owner MAY add restrictions:
  - Ownership editing locks (prevent others from changing ownership)
  - User-selective editing (restrict which users can edit)
  - Default: allow-all (no restrictions unless owner adds them)
- **Style Profiles**: Can have ownership; owner can lock profiles to prevent modification
- **Admins**: Can supersede any owner by unlocking objects; control who can save default export settings
- **Session Validation**: JWT tokens validated server-side; reject mutations from invalid/expired tokens

**Technical Decisions:**

- **Desktop Runtime**: Tauri (Rust backend, React frontend)
- **Auth Tokens**: JWT (HS256 initially, extensible to RS256/OAuth later)
- **Credential Storage**: bcrypt-hashed passwords (decoupled for future identity provider integration)
- **Real-time Sync**: WebSocket transport, CRDT for conflict resolution
- **CRDT Library**: Yjs (client) / yrs (Rust server) - leverages existing Tiptap Y.js ecosystem

#### Phase 14.Pre: Tauri Migration - COMPLETE

##### Project Setup - COMPLETE

- [x] Initialize Tauri alongside existing Vite configuration
  - `src-tauri/` directory with Cargo.toml and tauri.conf.json
  - Preserve existing `bun run dev` workflow during migration
  - Configure Tauri to use Vite dev server in development mode
- [x] Configure build pipeline
  - Development: Tauri wraps Vite dev server
  - Production: Tauri bundles Vite build output
  - Cross-platform builds (Windows, macOS, Linux)

##### Rust Backend Scaffolding - COMPLETE

- [x] Core Tauri application structure
  - Main entry point with window configuration
  - App state management for server mode toggle
- [x] IPC bridge between React frontend and Rust backend
  - Tauri command definitions for frontend→backend calls
  - TypeScript bindings in src/tauri/commands.ts
- [x] WebSocket server foundation (for Protected Local mode)
  - Tokio async runtime with Axum for HTTP/WebSocket handling
  - Server lifecycle management (start/stop/status)
  - Broadcast channel for real-time message distribution
  - Server starts only when Protected Local mode enabled
- [x] File system access layer
  - Tauri fs plugin configured with capabilities
  - Read/write operations via Tauri fs API

##### Storage Backend Abstraction - COMPLETE

- [x] Create pluggable storage interface
  - `StorageBackend` TypeScript interface for document persistence
  - `LocalStorageBackend`: localStorage for Personal Documents
  - `FileSystemBackend`: Tauri fs API for Team Documents
  - `StorageFactory`: Backend selection based on mode
- [x] Storage module exports via src/storage/index.ts

##### Development Workflow - COMPLETE

- [x] Update package.json scripts
  - `bun run dev` - Vite only (web development, no Tauri)
  - `bun run tauri:dev` - Full Tauri development mode
  - `bun run tauri:build` - Production build
- [x] Documentation for Tauri development setup
  - Rust toolchain requirements documented in CLAUDE.md
  - Taskfile.yml added for task automation

#### Phase 14.0: Collaboration Infrastructure - COMPLETE

- [x] CRDT integration for real-time collaboration on Team Documents
  - YjsDocument wrapper for Y.Map-based shape sync
  - SyncProvider for WebSocket transport with auto-reconnect
  - collaborationStore for managing sync state and sessions
  - useCollaborationSync hook for bidirectional sync with documentStore
  - Conflict resolution via Yjs CRDT protocol
- [x] Presence indicators (who's viewing which page)
  - PresenceIndicators component showing active collaborators
  - User avatars with color coding and initials
- [x] Collaborative cursors (show other users' cursor positions)
  - CollaborativeCursors overlay component
  - Real-time cursor rendering with user labels
- [x] Network transport layer (WebSocket via Tauri backend)
  - Yjs sync protocol implementation
  - Awareness protocol for presence

#### Phase 14.1 Collaboration Overhaul

**Design Decisions (User-Approved):**

- Offline editing: Editable - queue changes locally, sync/merge when reconnected
- Conflict resolution: Auto-merge via CRDT for shapes, last-write-wins for metadata
- Permissions: Owner/Editor/Viewer (3-tier model)
- Migration: Not needed (no end users, can break existing data structures)

##### Phase 14.1.1: Unified Connection Layer - COMPLETE

- [x] Create document type definitions (`src/types/DocumentRegistry.ts`)
  - Discriminated unions for local/remote/cached documents
  - Permission types (owner/editor/viewer)
  - Sync state types (synced/syncing/pending/error)
  - Type guards and conversion helpers
- [x] Create connectionStore (`src/store/connectionStore.ts`)
  - Centralized WebSocket connection state
  - Connection status, auth state, reconnection tracking
  - Selector hooks for UI components
- [x] Create UnifiedSyncProvider (`src/collaboration/UnifiedSyncProvider.ts`)
  - Single WebSocket replacing separate SyncProvider + DocumentSyncProvider
  - CRDT sync via Yjs (MESSAGE_SYNC, MESSAGE_AWARENESS)
  - Document operations (list, get, save, delete)
  - Authentication (token or credentials)
  - Auto-reconnection with exponential backoff
- [x] Add protocol message routing helpers (`src/collaboration/protocol.ts`)
  - `getMessageChannel()`, `isCRDTMessage()`, `isAuthMessage()`
  - `getMessageTypeName()` for debugging
- [x] Update collaborationStore to use UnifiedSyncProvider
- [x] Update teamDocumentStore with `setProviderFromUnified()` method
  - DocumentProvider interface for compatibility with both provider types
- [x] Update collaboration/index.ts exports

##### Phase 14.1.2: Document Registry Pattern - COMPLETE

- [x] Create documentRegistry store (`src/store/documentRegistry.ts`)
  - Unified document state for local/remote/cached using discriminated union types
  - Entries indexed by ID with record metadata and optional document content
  - Filter capabilities for document list (by type, host, search query)
  - Sync state management for remote documents
  - Local/Remote/Cached document type tracking
  - Persistence with Zustand persist middleware
- [x] Update persistenceStore to delegate to registry
  - Registers local documents on save/load/import
  - Sets active document and caches content
  - Removes documents from registry on delete
  - Migration of existing documents on initialization
- [x] Update teamDocumentStore to integrate with registry
  - Registers remote documents when fetched from host
  - Updates sync state on save operations
  - Handles document events (created/updated/deleted)
  - Caches document content in registry

##### Phase 14.1.3: Offline-First with Sync Queue - COMPLETE

- [x] Create OfflineQueue (`src/collaboration/OfflineQueue.ts`)
  - Queue save/delete operations when offline
  - Last-write-wins deduplication per document
  - Sorted processing by timestamp (oldest first)
  - Retry logic with configurable max retries
  - Change notification system for UI updates
  - Serialization/deserialization for persistence
- [x] Create SyncQueueStorage (`src/storage/SyncQueueStorage.ts`)
  - IndexedDB persistence for durability across sessions
  - Indexes for efficient queries by document/host
  - Batch operations for performance
  - Clear by host functionality
- [x] Create SyncStateManager (`src/collaboration/SyncStateManager.ts`)
  - Coordinates OfflineQueue, storage, and connection state
  - Auto-loads persisted queue on initialization
  - Auto-processes queue on reconnection
  - Updates documentRegistry sync states
  - Handles disconnection (converts remote docs to cached)
  - Persists queue changes automatically

##### Phase 14.1.4: Presence System Overhaul - COMPLETE

- [x] Create presenceStore (`src/store/presenceStore.ts`)
  - Dedicated store for real-time presence management
  - Stores remote users with cursor/selection state
  - Stale cursor detection and cleanup
  - Optimized selectors for rendering
- [x] Create CollaborativeCursor component
  - Updated existing component to use presenceStore
  - Improved stale cursor filtering
  - Better bounds checking for off-screen cursors
- [x] Create SelectionHighlight component (`src/ui/SelectionHighlight.tsx`)
  - Renders colored borders around shapes selected by other users
  - Shows user name labels on selections
  - Uses shapeRegistry for accurate bounds calculation
- [x] Update Renderer for presence overlays
  - Added SelectionHighlight to CanvasContainer
  - Pass container dimensions to presence components
  - Integrated presenceStore with collaborationStore

##### Phase 14.1.5: Access Control Implementation - COMPLETE

- [x] Create permissions.rs (`src-tauri/src/server/permissions.rs`)
- [x] Add permission middleware to server handlers
- [x] Add permission error codes to protocol

##### Phase 14.1.6: UI Consolidation - COMPLETE

- [x] Create DocumentBrowser component (replaces DocumentsSettings + TeamDocumentsManager)
- [x] Create DocumentCard component
- [x] Create SyncStatusBadge component

#### Phase 14.2: UX Improvements

##### Phase 14.2.1: UX Improvements - Chunk 1 (Large)

- [x] Make the canvas not-focused effect more friendly; the red border is annoying; consider a light blue top-border or similar
- [x] Minimap for large canvases; add a toggle for this in the settings
- [x] Context menu for style profiles clips overflows outside of window viewport
- [x] Add border radius for group-labels
- [x] Select dropdown is pure white and gray (tested in dark mode)
- [x] Checkboxes have weird pallettes; especially in dark mode

##### Phase 14.2.1: UX Improvements - Chunk 1.5 (Large)

- [x] Settings overhaul; do a complete settings modal overhaul, re-organizing areas, and creating a more intuitive, vibrant, and fluid menu.
- [x] Documents area doesn't update with UI (won't register a document name-change until a few component renders)
- [x] Add document management settings & info for cached/disconnected team documents ()
- [x] Move all document lists to a Documents area in the settings (remove any document management from the collaboration area); showing a section for remote documents, and a section for local documents and adding every-form of management into the dedicated documents area
- [x] Add a cool animation for authenticating clients

##### Known Issues

- **Minimap**: Experimental feature with known bugs (navigation, rendering). Marked as experimental in settings.

##### Phase 14.2.2: UX Improvements - Chunk 2 (Medium)

- [x] Smart-alignment for shape resize
- [x] Return focus to canvas when the layer panel is collapsed
- [x] Remove focus from the canvas when working in the rich text editor
- [x] Ensure FPS counter is disabled in release builds
- [ ] Allow LaTeX equations for shape text by prepending `=` (moved to Phase 14.3)

##### Phase 14.2.3: UX Improvements - Chunk 3 (Medium)

- [x] Implement a button to snap to a layer item instead of doing it on-layer-click (but add this option in the settings to enable the auto-snap again)
- [x] Cool Saving/Saved icon & animation
- [x] Add a small-search button on the style profiles action bar (with the view mode) which opens a search bar to filter style profiles, also add a clear filter button when the style profile filter is active

##### Phase 14.2.4: UX Improvements - Chunk 4 (Small)

- [ ] Translate selected items using arrow keys
- [ ] Add a test regex button to layer view creator to get a results-preview
- [ ] First-time setup authentication page has misleading placeholder text (reduce contrast for placeholders), and make this page more vibrant like an onboarding page.

##### Phase 14.2.5: Protocol & Backend Testing

- [ ] TypeScript protocol unit tests (mock WebSocket, test UnifiedSyncProvider message encoding/decoding)

#### Phase 14.3: Rich Document Editor Upgrades (Large)

- [ ] Tiptap Tables
- [ ] LaTeX Equation Support (both rich text and shape text with `=` prefix)
- [ ] Image resizing handles
- [ ] Deeper headings (preferred up to 7 levels)
- [ ] Additional tweaks at your discretion
- [ ] OPTIONAL: Interactive Tasks Lists

### Phase 14.9: AI Insights Improvements Checklist

Replace this list with your own checklists of areas needed for improvement before we get-ready for release of v.1.0

- [ ] TBD

### Phase 15: Version 1.0

#### Phase 15.1: Local Help System with GitHub Docs Capability

- [ ] Implement a local help system (consider a markdown server of some sort)
- [ ] Migrate Completed Todo.md tasks into Roadmap.md, leave future phases for the architect to author.
- [ ] Transform Readme.md into a professional GitHub repo homepage with build status, link to the roadmap

#### Phase 15.2: Release Build

- [ ] Create a rollup utility (consider future auto-update feature) and GitHub action to generate a GitHub release with the application.

#### Phase 15.3: Release Pipeline

- [ ] Workflow for GitHub releases (CI/CD pipeline)
- [ ] Finalize UI polish and documentation (create release notes, update changelog, ensure all features are documented
      in README)
- [ ] Commit, and await pre-release manual testing (human testing) before creating a release.

### Phase 16: Advanced Diagram Patterns (Version 1.1)

- [ ] Sequence diagram patterns
- [ ] Activity diagram patterns
- [ ] Swimlane customization

### Future: Auto-Update

- [ ] Implement a feature which can scan the GitHub repo for updates and check if a new version exists
- [ ] Implement a feature to update the application **without** user commands or manual download+installation

### Future: Publisher Module

- [ ] Implement a 'Publisher' module to implement the following requirements:
  - [ ] Create publish configurations to manage the publisher's export locations
  - [ ] Run a publish configuration to export various types of media (e.g. PDF, SVG, JSON) to a single, or multiple configured paths on the computer.
  - Keep it extensible to support exporting to cloud locations in the future.

### Future: Document Cloud Providers

- [ ] Implement support

### Future: Comprehensive Local Help System

- [ ] Implement a local help documentation system with integrated search and navigation
- [ ] Create a comprehensive help guide for the application

### Future: Advanced Themes

- [ ] Implement Advanced Themes

### Future: Canvas Code Integration with Git

- [ ] Implement a composable VCS pattern which allows interfacing with Git for version control and file usage, and
      others in the future
- [ ] Implement file(s) linking to a shape which can be viewed in the property panel
- [ ] Integrate with existing Git integration for version control (save changes to Git repo; default directory is
      /docs/diagrammer.json)
- [ ] Feat: Spawn a VS Code instance with access to Git repo

### Future: AI Model Integration

- [ ] Implement a pipeline for model usage and integration with the application
- [ ] Implement AI-powered diagram analysis
- [ ] Generate insights and suggested edits

---

## Testing Notes

- Mark tasks with [x] when completed
- Update this file as new tasks are discovered
- Each task should be small enough to complete in one session
- Test each component before moving to the next phase
- Total tests: 633 passing (18 test files)

## Test Coverage by Module

| Module                           | Tests   |
| -------------------------------- | ------- |
| Math (Vec2, Mat3, Box, geometry) | 204     |
| Camera                           | 58      |
| InputHandler                     | 41      |
| Renderer                         | 33      |
| SpatialIndex                     | 24      |
| HitTester                        | 24      |
| DocumentStore                    | 37      |
| SessionStore                     | 37      |
| PageStore                        | 32      |
| HistoryStore                     | 19      |
| Rectangle                        | 21      |
| Ellipse                          | 25      |
| Line                             | 23      |
| Shape transforms                 | 31      |
| Shape bounds                     | 24      |
|                                  |         |
| **Total**                        | **633** |

