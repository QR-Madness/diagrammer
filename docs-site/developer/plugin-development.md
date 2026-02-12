# Plugin Development Guide

Diagrammer provides a plugin system through the **PanelExtensions** registry, allowing developers to extend the UI without modifying core components.

## Extension Points

| Extension | Description | Registration Method |
|-----------|-------------|-------------------|
| Property Sections | Add custom sections to PropertyPanel | `registerPropertySection()` |
| Property Renderers | Custom renderers for new property types | `registerPropertyRenderer()` |
| Panel Actions | Action buttons in panel headers | `registerPanelAction()` |
| Context Menu Items | Items in shape context menus | `registerContextMenuItem()` |

## Quick Start

```typescript
import { panelExtensions } from './plugins/PanelExtensions';

// Register a custom property section
panelExtensions.registerPropertySection({
  id: 'my-plugin-settings',
  title: 'Plugin Settings',
  priority: 100,
  shouldShow: (shape) => shape.type === 'my-custom-shape',
  render: (shape, updateShape) => (
    <MyPluginSettings shape={shape} onChange={updateShape} />
  ),
});
```

## Creating a Custom Shape Library

1. Define shape definitions implementing `LibraryShapeDefinition`:

```typescript
import type { LibraryShapeDefinition } from '../shapes/library/ShapeLibraryTypes';

export const myShapes: LibraryShapeDefinition[] = [
  {
    type: 'my-shape',
    metadata: {
      name: 'My Shape',
      description: 'A custom shape',
      category: 'custom',
      icon: '⬡',
    },
    defaultProps: {
      width: 100,
      height: 60,
      fill: '#4a90d9',
      stroke: '#2c5f9e',
      strokeWidth: 2,
    },
    // PathBuilder-based rendering
    path: (w, h) => `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`,
  },
];
```

2. Register with the shape library store:

```typescript
import { useShapeLibraryStore } from '../store/shapeLibraryStore';

useShapeLibraryStore.getState().registerShapes(myShapes);
```

## Adding a Property Renderer

Custom property renderers handle specialized property types in the PropertyPanel:

```typescript
import { panelExtensions } from './plugins/PanelExtensions';

// Register a gradient picker for 'gradient' type properties
panelExtensions.registerPropertyRenderer('gradient', ({ value, onChange }) => (
  <GradientPicker value={value} onChange={onChange} />
));
```

## State Management Guidelines

- **Read-only access**: Plugins should use `useDocumentStore`, `useSessionStore` for reading state
- **Mutations**: Use `updateShape()` from `useDocumentStore` for shape modifications
- **Persistence**: Plugin settings can use `localStorage` directly or create a Zustand store with `persist` middleware
- **Lifecycle**: Register extensions during module initialization (top-level calls)

## API Reference

See `src/plugins/PanelExtensions.ts` for the full TypeScript interface definitions including:

- `PropertySectionExtension` — Custom PropertyPanel sections
- `PropertyRendererExtension` — Custom property type renderers
- `PanelActionExtension` — Panel header action buttons
- `ContextMenuExtension` — Context menu items
