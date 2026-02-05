---
title: Roadmap
description: Development roadmap and version history
---

import { Aside, Badge } from '@astrojs/starlight/components';

This document tracks Diagrammer's development progress and planned features.

## Current Status

<Badge text="Version 1.0" variant="success" size="large" />

Diagrammer is feature-complete for v1.0 release with:
- ✅ High-performance canvas rendering (10k+ shapes @ 60fps)
- ✅ Real-time collaboration via Protected Local mode
- ✅ Rich shape libraries (Basic, Flowchart, UML, ERD)
- ✅ Multi-page documents with rich text editor
- ✅ Desktop app (Tauri) and web version
- ✅ Export to PNG, SVG, JSON

## Version History

### Phase 1-3: Foundation
*Core architecture and basic functionality*

- Canvas rendering engine with Camera class
- Basic shapes: Rectangle, Ellipse, Line, Text
- Selection and manipulation tools
- Zustand store architecture
- Undo/redo history

### Phase 4-6: Shape System
*Shape libraries and connectors*

- ShapeRegistry pattern for extensible shapes
- Smart connectors with auto-routing
- Flowchart shape library
- Connection points and ports
- Shape grouping

### Phase 7-9: User Experience
*UI polish and workflows*

- Property Panel with dynamic rendering
- Layer Panel with drag reordering
- Keyboard shortcuts system
- Grid and snapping
- Alignment tools

### Phase 10-12: Persistence & Multi-Page
*Document management*

- Document persistence (localStorage)
- BlobStorage for images (IndexedDB)
- Multi-page documents
- Page tabs and navigation
- Auto-save

### Phase 13: Rich Text Editor
*Documentation alongside diagrams*

- Tiptap integration
- Markdown shortcuts
- Tables and code blocks
- Document Editor panel

### Phase 14: Collaboration
*Real-time multi-user editing*

- Tauri v2 migration
- WebSocket server (Rust)
- Yjs CRDT sync
- JWT authentication
- Offline queue with auto-sync
- Presence (cursors, selections)
- Error notification system
- Document validation

### Phase 15: Release Preparation
*Documentation and deployment*

- Starlight documentation site
- GitHub Pages deployment
- Release builds
- CI/CD pipeline

## Planned Features

### Phase 16: Engine Improvements
*Post-release optimizations*

- [ ] Blob garbage collector optimization
- [ ] Document version conflict UI
- [ ] Lazy connector route rebuilding
- [ ] Group-aware selection export
- [ ] Tool state machine tests
- [ ] Integration test harness
- [ ] Export functionality tests

### Phase 16.5: Performance & UX
*Recommendations for future improvement*

#### Performance
- [ ] Dirty region tracking for canvas rendering
- [ ] Shape render caching with OffscreenCanvas
- [ ] Virtual scrolling for LayerPanel
- [ ] Lazy loading for shape libraries
- [ ] Spatial index incremental updates

#### User Experience
- [ ] Quick action palette (Cmd/Ctrl+K)
- [ ] Keyboard shortcut reference panel
- [ ] Shape search in canvas
- [ ] Zoom to fit selection
- [ ] Smooth pan/zoom animations
- [ ] Multi-select property editing
- [ ] Drag-and-drop shape creation
- [ ] Touch/tablet gesture refinements

#### Stability
- [ ] React error boundaries
- [ ] Performance regression benchmarks
- [ ] Accessibility improvements
- [ ] WebSocket reconnection feedback

### Phase 17: Advanced Diagrams
*Version 1.1*

- [ ] Sequence diagram patterns
- [ ] Activity diagram patterns
- [ ] Swimlane customization

## Future Considerations

These features are under consideration for future versions:

### Auto-Update
- Scan GitHub for new versions
- Automatic updates without manual download

### Publisher Module
- Publish configurations for export presets
- Batch export to multiple formats/locations
- Cloud export support

### Cloud Providers
- Integration with cloud storage services
- Sync documents across devices

### Local Help System
- Integrated help with search
- Context-sensitive help

### Advanced Themes
- Custom theme creation
- Theme marketplace

### Git Integration
- Version control for diagrams
- Link shapes to code files
- VS Code integration

### AI Features
- AI-powered diagram analysis
- Suggested edits and layouts
- Diagram generation from text

## Contributing

We welcome contributions! See the [GitHub repository](https://github.com/your-username/diagrammer) for:

- Issue tracker
- Contributing guidelines
- Development setup

<Aside type="tip">
  Found a bug or have a feature request? Open an issue on GitHub!
</Aside>
