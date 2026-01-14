# Diagrammer – Whiteboard Foundation

A high-performance diagramming and whiteboard application built with TypeScript, React, and Canvas API.

> **Note:** This project is currently in development.
> See the complete roadmap [here](Todo.md).

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Type checking
bun run typecheck

# Run tests
bun run test

# Build for production
bun run build
```

## Project Structure

```
/src
├── /engine          # Core canvas engine (Camera, Renderer, InputHandler, Tools)
├── /shapes          # Shape types and registry
├── /store           # Zustand stores (Document, Session, History)
├── /ui              # React components
├── /math            # Vector and matrix math utilities
└── /utils           # General utilities
```

## Development

See `Todo.md` for the implementation roadmap.

See `Specification.Readme.md` for detailed architecture and specifications.

See `CLAUDE.md` for Claude Code guidance.

## Tech Stack

- **Desktop Application Packaging**: Tauri + bundled Vite
- **Runtime**: Bun (fast JavaScript runtime)
- **Language**: TypeScript (strict mode)
- **UI Framework**: React 18
- **State Management**: Zustand + Immer
- **Rendering**: Canvas 2D API
- **Spatial Indexing**: RBush
- **Build Tool**: Vite
- **Testing**: Vitest
