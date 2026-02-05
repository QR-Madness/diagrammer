---
title: Rich Text Editor
description: Add formatted text and notes to your diagrams
---

import { Aside } from '@astrojs/starlight/components';

Diagrammer includes a powerful rich text editor for adding documentation alongside your diagrams.

## Document Editor Panel

The Document Editor appears on the left side of the canvas and provides a full-featured writing environment.

### Opening the Editor

- Click the **Document** tab in the left panel
- Or press `Ctrl+Shift+D` to toggle

### Editor Features

The editor is built on [Tiptap](https://tiptap.dev/) (ProseMirror) and supports:

## Text Formatting

### Basic Formatting

| Format | Shortcut | Toolbar |
|--------|----------|---------|
| **Bold** | `Ctrl+B` | B button |
| *Italic* | `Ctrl+I` | I button |
| ~~Strikethrough~~ | `Ctrl+Shift+S` | S̶ button |
| `Code` | `Ctrl+E` | `</>` button |
| Underline | `Ctrl+U` | U button |

### Headings

Create headings with keyboard shortcuts or the dropdown:

| Level | Shortcut |
|-------|----------|
| Heading 1 | `Ctrl+Alt+1` |
| Heading 2 | `Ctrl+Alt+2` |
| Heading 3 | `Ctrl+Alt+3` |
| Paragraph | `Ctrl+Alt+0` |

### Lists

- **Bullet list**: `Ctrl+Shift+8` or type `- ` at line start
- **Numbered list**: `Ctrl+Shift+7` or type `1. ` at line start
- **Task list**: Type `[ ] ` at line start

Indent/outdent with `Tab` and `Shift+Tab`.

### Blockquotes

Create quotes with `Ctrl+Shift+B` or type `> ` at line start.

> This is a blockquote.
> It can span multiple lines.

## Code Blocks

### Inline Code

Wrap text with backticks or press `Ctrl+E`:

```
`inline code`
```

### Fenced Code Blocks

Create code blocks with triple backticks:

~~~
```javascript
function hello() {
  console.log("Hello, World!");
}
```
~~~

The editor supports syntax highlighting for common languages.

## Links

### Creating Links

1. Select text
2. Press `Ctrl+K` or click the link button
3. Enter URL
4. Press Enter

### Link Shortcuts

- Type/paste a URL - auto-converts to link
- `Ctrl+K` with selection - opens link dialog
- `Ctrl+K` on existing link - edit link

## Images

Embed images in your documentation:

1. Click the image button in toolbar
2. Enter image URL or upload a file
3. Image is embedded in the document

<Aside type="note">
  Images are stored as blob references in the document. They're included when exporting or sharing.
</Aside>

## Tables

Create tables for structured data:

### Insert Table

1. Click **Table** in toolbar
2. Select grid size (rows × columns)
3. Table is inserted at cursor

### Table Editing

- **Add row**: Right-click → Insert row above/below
- **Add column**: Right-click → Insert column left/right
- **Delete row/column**: Right-click → Delete
- **Merge cells**: Select cells → Right-click → Merge

### Table Navigation

- `Tab` - Next cell
- `Shift+Tab` - Previous cell
- Arrow keys - Navigate cells

## Markdown Support

The editor supports Markdown shortcuts for quick formatting:

| Markdown | Result |
|----------|--------|
| `# Heading` | Heading 1 |
| `## Heading` | Heading 2 |
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `- item` | Bullet list |
| `1. item` | Numbered list |
| `> quote` | Blockquote |
| `` `code` `` | Inline code |
| `---` | Horizontal rule |

## Shape References

Link to shapes in your diagram:

1. Select a shape on the canvas
2. In the editor, click **Insert Shape Reference**
3. A clickable reference is inserted

Clicking the reference:
- Selects the shape
- Pans the canvas to show it
- Highlights the shape briefly

## Document Structure

### Multiple Sections

Organize long documents with headings. The outline appears in the minimap.

### Page-Specific Notes

Each page can have its own document content. Switch pages to see page-specific notes.

### Document vs Shape Text

| Feature | Document Editor | Shape Text |
|---------|-----------------|------------|
| Purpose | Documentation, notes | Labels, titles |
| Formatting | Full rich text | Basic formatting |
| Location | Side panel | On canvas |
| Export | Included in JSON | Part of shape |

## Export Options

Document content is included in exports:

- **JSON**: Full document content preserved
- **PNG/SVG**: Document not included (canvas only)
- **Print**: Option to include document as separate page

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Bold | `Ctrl+B` |
| Italic | `Ctrl+I` |
| Underline | `Ctrl+U` |
| Strikethrough | `Ctrl+Shift+S` |
| Code | `Ctrl+E` |
| Link | `Ctrl+K` |
| Heading 1 | `Ctrl+Alt+1` |
| Heading 2 | `Ctrl+Alt+2` |
| Heading 3 | `Ctrl+Alt+3` |
| Bullet list | `Ctrl+Shift+8` |
| Numbered list | `Ctrl+Shift+7` |
| Blockquote | `Ctrl+Shift+B` |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Shift+Z` |
