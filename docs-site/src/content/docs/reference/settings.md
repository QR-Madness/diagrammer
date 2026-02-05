---
title: Settings
description: Configure Diagrammer to match your workflow
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

Access settings via **File → Settings** or press `Ctrl+,` (`Cmd+,` on macOS).

## General

### Appearance

| Setting | Options | Description |
|---------|---------|-------------|
| Theme | Dark, Light, System | Color theme for the application |
| Accent Color | Color picker | Highlight color for selection, buttons |
| Font Size | 12-18px | UI font size |
| Compact Mode | On/Off | Reduce padding in panels |

### Language

| Setting | Options | Description |
|---------|---------|-------------|
| Language | English, etc. | Interface language |
| Date Format | Various | How dates are displayed |

### Startup

| Setting | Options | Description |
|---------|---------|-------------|
| Start Page | Document Browser, Last Document, New Document | What to show on launch |
| Restore Windows | On/Off | Remember window positions |
| Check for Updates | On/Off | Automatic update checking |

## Canvas

### Grid

| Setting | Options | Description |
|---------|---------|-------------|
| Show Grid | On/Off | Display grid on canvas |
| Grid Size | 5-100px | Spacing between grid lines |
| Grid Color | Color picker | Grid line color |
| Major Grid Lines | Number | Interval for thicker lines |

### Snapping

| Setting | Options | Description |
|---------|---------|-------------|
| Snap to Grid | On/Off | Align shapes to grid |
| Snap to Shapes | On/Off | Align to other shapes |
| Snap Distance | 5-20px | How close before snapping |
| Smart Guides | On/Off | Show alignment guides |

### Zoom

| Setting | Options | Description |
|---------|---------|-------------|
| Zoom Speed | Slow, Normal, Fast | Scroll wheel zoom sensitivity |
| Min Zoom | 10-50% | Minimum zoom level |
| Max Zoom | 400-1000% | Maximum zoom level |
| Zoom to Cursor | On/Off | Zoom centered on mouse position |

### Performance

| Setting | Options | Description |
|---------|---------|-------------|
| Viewport Culling | On/Off | Only render visible shapes |
| Render Quality | Low, Medium, High | Anti-aliasing quality |
| Max FPS | 30, 60, Unlimited | Frame rate limit |

## Shapes

### Default Styles

Configure default appearance for new shapes:

<Tabs>
  <TabItem label="Fill">
    - Fill color
    - Fill opacity
    - Gradient settings
  </TabItem>
  <TabItem label="Stroke">
    - Stroke color
    - Stroke width
    - Stroke style (solid, dashed, dotted)
    - Line cap and join
  </TabItem>
  <TabItem label="Text">
    - Font family
    - Font size
    - Text color
    - Text alignment
  </TabItem>
</Tabs>

### Connectors

| Setting | Options | Description |
|---------|---------|-------------|
| Default Routing | Orthogonal, Curved, Straight | How connectors route |
| Corner Radius | 0-20px | Rounded corners for orthogonal |
| Arrow Style | Various | Default arrowhead style |
| Line Style | Solid, Dashed, Dotted | Default line style |

### Handles

| Setting | Options | Description |
|---------|---------|-------------|
| Handle Size | Small, Medium, Large | Resize handle size |
| Handle Color | Color picker | Handle fill color |
| Rotation Handle | On/Off | Show rotation handle |

## Editor

### Document Editor

| Setting | Options | Description |
|---------|---------|-------------|
| Font Family | System fonts | Editor text font |
| Font Size | 12-18px | Editor text size |
| Line Height | 1.0-2.0 | Spacing between lines |
| Spell Check | On/Off | Browser spell checking |

### Auto-Save

| Setting | Options | Description |
|---------|---------|-------------|
| Auto-Save | On/Off | Automatically save changes |
| Interval | 30s-5min | How often to auto-save |
| Save on Blur | On/Off | Save when window loses focus |

### History

| Setting | Options | Description |
|---------|---------|-------------|
| Max Undo Steps | 50-500 | Number of undo levels |
| Compress History | On/Off | Reduce memory usage |

## Export

### PNG Export

| Setting | Options | Description |
|---------|---------|-------------|
| Default Scale | 1x-4x | Resolution multiplier |
| Default Background | Transparent, White, Canvas | Background color |
| Compression | 0-9 | PNG compression level |

### SVG Export

| Setting | Options | Description |
|---------|---------|-------------|
| Embed Fonts | On/Off | Include fonts in SVG |
| Minify | On/Off | Reduce file size |
| Precision | 0-6 | Decimal places for coordinates |

### General

| Setting | Options | Description |
|---------|---------|-------------|
| Default Format | PNG, SVG, JSON | Export format |
| Default Location | Path | Where to save exports |
| Auto-Open | On/Off | Open file after export |

## Collaboration

### Server

| Setting | Options | Description |
|---------|---------|-------------|
| Port | Number | WebSocket server port |
| Interface | IP/All | Network interface to bind |
| Max Connections | Number | Maximum clients |

### Authentication

| Setting | Options | Description |
|---------|---------|-------------|
| Require Auth | On/Off | Require login to connect |
| Users | List | Configured user accounts |
| Session Timeout | Duration | Auto-disconnect idle users |

### Sync

| Setting | Options | Description |
|---------|---------|-------------|
| Sync Interval | 100-1000ms | How often to sync changes |
| Reconnect Attempts | Number | Max reconnection tries |
| Offline Queue Size | Number | Max queued operations |

## Keyboard Shortcuts

Customize any keyboard shortcut:

1. Find the action in the list
2. Click the current shortcut
3. Press the new key combination
4. Click **Save**

### Shortcut Categories

- **Tools**: Shape tools, selection
- **Edit**: Cut, copy, paste, undo
- **View**: Zoom, pan, panels
- **Align**: Alignment operations
- **File**: Open, save, export
- **Collaboration**: Sharing, sync

## Storage

### Local Storage

| Setting | Options | Description |
|---------|---------|-------------|
| Storage Location | Path | Where documents are stored |
| Cache Size | MB | Maximum cache size |
| Clear Cache | Button | Remove cached data |

### Backup

| Setting | Options | Description |
|---------|---------|-------------|
| Auto-Backup | On/Off | Create periodic backups |
| Backup Interval | Duration | How often to backup |
| Backup Location | Path | Where backups are stored |
| Max Backups | Number | Backups to keep |

## Advanced

### Debug

| Setting | Options | Description |
|---------|---------|-------------|
| Debug Overlay | On/Off | Show performance stats |
| Log Level | Error, Warn, Info, Debug | Console logging verbosity |
| Show Shape IDs | On/Off | Display shape identifiers |

### Experimental

| Setting | Options | Description |
|---------|---------|-------------|
| Enable Experiments | On/Off | Access experimental features |

:::caution
Experimental features may be unstable. Use at your own risk.
:::

## Importing/Exporting Settings

### Export Settings

1. Go to **Settings → Advanced → Export Settings**
2. Choose what to include
3. Click **Export**
4. Save the `.json` file

### Import Settings

1. Go to **Settings → Advanced → Import Settings**
2. Select the `.json` file
3. Choose what to import
4. Click **Import**

### Reset All Settings

1. Go to **Settings → Advanced**
2. Click **Reset to Defaults**
3. Confirm the reset

:::caution
This removes all customizations and cannot be undone.
:::
