---
title: Canvas & Tools
description: Master the infinite canvas and drawing tools
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

The canvas is your infinite drawing surface. This guide covers navigation, tools, and advanced features.

## Canvas Navigation

### Panning

Move around the canvas using any of these methods:

- **Middle-click + drag** - Click and hold the mouse wheel
- **Space + drag** - Hold spacebar and drag with left mouse
- **Two-finger drag** - On trackpad or touch devices

### Zooming

Control the zoom level:

| Action | Method |
|--------|--------|
| Zoom in | Scroll wheel up, `Ctrl++`, or pinch out |
| Zoom out | Scroll wheel down, `Ctrl+-`, or pinch in |
| Reset to 100% | Press `0` |
| Fit all shapes | Press `1` |
| Fit selection | Press `2` |

The zoom range is **10% to 1000%**, displayed in the status bar.

### Minimap

The minimap in the corner shows an overview of your entire document. Click anywhere on the minimap to navigate directly to that area.

## Drawing Tools

### Select Tool (`V`)

The default tool for selecting and manipulating shapes.

- **Click** - Select a single shape
- **Shift+Click** - Add/remove from selection
- **Drag on canvas** - Marquee selection
- **Drag shape** - Move selected shapes
- **Drag handle** - Resize shape

### Rectangle (`R`)

Draw rectangular shapes.

- Click and drag to create
- Hold **Shift** for perfect squares
- Hold **Alt** to draw from center

### Ellipse (`E`)

Draw ellipses and circles.

- Click and drag to create
- Hold **Shift** for perfect circles
- Hold **Alt** to draw from center

### Line (`L`)

Draw straight lines.

- Click start point, click end point
- Hold **Shift** for 45° angle snapping

### Connector (`C`)

Create smart connectors between shapes.

Connectors automatically:
- Snap to shape connection points
- Route around obstacles
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

- **Corner handles** - Resize proportionally (hold Shift to unlock)
- **Edge handles** - Resize in one direction only

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

Align selected shapes using the toolbar buttons or keyboard shortcuts:

| Alignment | Shortcut |
|-----------|----------|
| Align left | `Alt+L` |
| Align center | `Alt+C` |
| Align right | `Alt+R` |
| Align top | `Alt+T` |
| Align middle | `Alt+M` |
| Align bottom | `Alt+B` |
| Distribute horizontally | `Alt+H` |
| Distribute vertically | `Alt+V` |

### Z-Order

Control shape stacking order:

- **Bring to front** - `Ctrl+Shift+]`
- **Send to back** - `Ctrl+Shift+[`
- **Bring forward** - `Ctrl+]`
- **Send backward** - `Ctrl+[`

Or drag shapes in the Layer Panel to reorder.

## Clipboard Operations

| Action | Shortcut |
|--------|----------|
| Cut | `Ctrl+X` |
| Copy | `Ctrl+C` |
| Paste | `Ctrl+V` |
| Duplicate | `Ctrl+D` |

**Paste in place**: Hold `Shift` while pasting to paste at the original position instead of offset.

## Grid & Snapping

### Grid Display

Toggle the grid with `Ctrl+'` or **View → Show Grid**.

Grid options in settings:
- Grid size (default: 20px)
- Grid color and opacity
- Major grid lines interval

### Snap to Grid

Enable snap-to-grid with `Ctrl+Shift+'` or **View → Snap to Grid**.

When enabled, shapes align to grid intersections while moving or resizing.

### Smart Guides

Smart guides appear automatically when moving shapes, showing alignment with other shapes:

- Red lines indicate center alignment
- Blue lines indicate edge alignment
- Distance indicators show spacing

## Performance Tips

For optimal performance with large diagrams:

1. **Use viewport culling** - Shapes outside the visible area aren't rendered
2. **Group related shapes** - Reduces hit-testing overhead
3. **Limit shadows/patterns** - These are more expensive to render
4. **Use the Layer Panel** - Hide layers you're not actively editing
