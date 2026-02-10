# Canvas & Tools

The canvas is your infinite drawing surface. This guide covers navigation, tools, and advanced features.

## Canvas Navigation

### Keyboard Navigation (WASD)

Navigate the canvas like a game:

| Key | Action |
|-----|--------|
| `W` | Pan up |
| `A` | Pan left |
| `S` | Pan down |
| `D` | Pan right |
| `Q` | Zoom out |
| `E` | Zoom in |

These keys can be held simultaneously for diagonal movement. Arrow keys also pan the canvas when no shapes are selected.

### Mouse Navigation

| Action | Method |
|--------|--------|
| Pan | Middle-click + drag |
| Zoom | Scroll wheel (zooms toward cursor) |

### Minimap

Enable the minimap in **Settings** to see an overview of your entire document. Click anywhere on the minimap to navigate directly to that area.

## Drawing Tools

### Select Tool (`V`)

The default tool for selecting and manipulating shapes.

- **Click** — Select a single shape
- **Shift+Click** — Add/remove from selection
- **Drag on canvas** — Marquee selection
- **Drag shape** — Move selected shapes
- **Drag handle** — Resize shape

### Rectangle (`R`)

Draw rectangular shapes.

- Click and drag to create
- Hold **Shift** for perfect squares

### Ellipse (`O`)

Draw ellipses and circles.

- Click and drag to create
- Hold **Shift** for perfect circles

### Line (`L`)

Draw straight lines.

- Click start point, click end point

### Connector (`C`)

Create smart connectors between shapes.

Connectors automatically:
- Snap to shape connection points
- Route around obstacles (orthogonal mode)
- Update when shapes move

**Connection points** appear as small circles when you hover over a shape with the connector tool active.

### Text (`T`)

Add text labels anywhere on the canvas.

- Click to place a text box
- Type your text
- Click outside or press `Escape` to finish

Double-click any existing text to edit it.

### Hand Tool (`H`)

Pan the canvas without accidentally selecting shapes. Useful for navigation-only mode.

## Shape Manipulation

### Resizing

Select a shape to see its resize handles:

- **Corner handles** — Resize proportionally (hold Shift to unlock)
- **Edge handles** — Resize in one direction only

### Rotating

1. Select a shape
2. Hover near a corner handle until you see the rotation cursor
3. Drag to rotate

Hold **Shift** to snap to 15° increments.

### Grouping

Combine multiple shapes into a group:

1. Select multiple shapes
2. Press `Ctrl+G` or right-click → **Group**

To ungroup: `Ctrl+Shift+G` or right-click → **Ungroup**

Groups can be nested for complex hierarchies.

### Alignment

Align selected shapes using the alignment buttons in the toolbar:

- Align left, center, right
- Align top, middle, bottom
- Distribute horizontally, distribute vertically

### Z-Order

Control shape stacking order via right-click context menu:

- **Bring to front** / **Send to back**

Or drag shapes in the Layer Panel to reorder.

## Clipboard Operations

| Action | Shortcut |
|--------|----------|
| Copy | `Ctrl+C` |
| Paste | `Ctrl+V` |

Pasted shapes are offset by 20px from the original to avoid overlap.

## Grid & Snapping

### Grid Display

The grid can be toggled in settings.

Grid options:
- Grid size (default: 20px)
- Grid color and opacity

### Snap to Grid

When enabled, shapes align to grid intersections while moving or resizing.

### Smart Guides

Smart guides appear automatically when moving shapes, showing alignment with other shapes:

- Pink dashed lines indicate alignment (center or edges)
- Shapes snap to nearby shape edges and centers

## Performance Tips

For optimal performance with large diagrams:

1. **Viewport culling is automatic** — Shapes outside the visible area aren't rendered
2. **Group related shapes** — Reduces hit-testing overhead
3. **Limit shadows/patterns** — These are more expensive to render
4. **Use the Layer Panel** — Hide layers you're not actively editing
