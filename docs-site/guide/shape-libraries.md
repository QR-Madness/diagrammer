# Shape Libraries

Diagrammer includes extensive shape libraries for common diagram types, plus the ability to create your own.

## Accessing Shape Libraries

Open the **Shape Picker** from the toolbar to browse available libraries:

1. Click the **Shapes** button in the toolbar (or press `S`)
2. Browse libraries in the sidebar
3. Click a shape to select it as your current tool
4. Click on the canvas to place the shape

## Built-in Libraries

### Basic Shapes

The foundation shapes available in every document:

| Shape | Description |
|-------|-------------|
| **Rectangle** | Standard rectangular shape with optional rounded corners |
| **Ellipse** | Circles and ellipses |
| **Line** | Straight lines with optional arrowheads |
| **Text** | Text labels with full formatting |
| **Connector** | Smart auto-routing connectors |
| **Group** | Container for organizing shapes |

### Flowchart

Standard flowchart symbols for process diagrams:

| Shape | Usage |
|-------|-------|
| **Decision** | Yes/No branch point (diamond) |
| **Terminator** | Start/End points (rounded rectangle) |
| **Data** | Input/Output (parallelogram) |
| **Document** | Document reference (wavy bottom) |
| **Predefined Process** | Subroutine call (double-sided) |
| **Manual Input** | User input step (trapezoid) |
| **Preparation** | Initialization step (hexagon) |
| **Connector** | On-page connector (circle) |
| **Off-Page Connector** | Off-page reference (pentagon arrow) |

Use a standard **Rectangle** shape for generic process steps.

### UML

Unified Modeling Language shapes for software design:

**Class Diagrams:**
- **Class** — Three-compartment box with attributes and methods
- **Interface** — Interface definition with stereotype
- **Abstract Class** — Abstract class (italicized name)
- **Enumeration** — Enum type
- **Package** — Package container
- **Note** — Dog-eared annotation note

**Use Case Diagrams:**
- **Actor** — Stick figure for users/systems
- **Use Case** — Ellipse for functionality
- **System Boundary** — Rectangle container with title
- **Include Relation** — Include relationship indicator
- **Extend Relation** — Extend relationship indicator

### ERD (Entity-Relationship)

Database modeling shapes (Crow's Foot notation):

| Shape | Description |
|-------|-------------|
| **Entity** | Database table (rectangle) |
| **Weak Entity** | Dependent entity (double border) |
| **Attribute** | Column/field (ellipse) |
| **Key Attribute** | Primary key (underlined ellipse) |
| **Relationship** | Association (diamond) |

## Shape Properties

Every shape has configurable properties in the Property Panel:

### Common Properties

| Property | Description |
|----------|-------------|
| **Position** | X, Y coordinates |
| **Size** | Width, Height |
| **Rotation** | Angle in degrees |
| **Fill** | Background color/gradient |
| **Stroke** | Border color, width, style |
| **Opacity** | Transparency (0-100%) |
| **Lock** | Prevent editing |

### Text Properties

| Property | Description |
|----------|-------------|
| **Font** | Font family |
| **Size** | Font size in points |
| **Color** | Text color |
| **Alignment** | Left, center, right |
| **Vertical Align** | Top, middle, bottom |
| **Bold/Italic** | Text style |

### Shape-Specific Properties

Some shapes have unique properties:

- **Rectangle**: Corner radius
- **Line**: Start/end arrowheads
- **Connector**: Routing style (orthogonal or straight)

## Custom Shape Libraries

Create your own reusable shape collections.

### Creating a Library

1. Select shapes you want to include
2. Right-click → **Add to Library**
3. Choose an existing library or create a new one
4. Name your shape

### Managing Libraries

Access library management from **Settings → Shape Libraries**:

- **Create** new libraries
- **Rename** existing libraries
- **Delete** libraries (built-in libraries cannot be deleted)
- **Export** libraries as JSON files
- **Import** libraries from JSON files

### Sharing Libraries

Export your custom library:

1. Go to **Settings → Shape Libraries**
2. Select your library
3. Click **Export**
4. Share the `.json` file

Import a shared library:

1. Go to **Settings → Shape Libraries**
2. Click **Import**
3. Select the `.json` file

## Style Profiles

Save and reuse shape styles across documents.

### Creating a Style Profile

1. Style a shape with your desired fill, stroke, font, etc.
2. Right-click → **Save Style**
3. Name your style profile

### Applying Styles

1. Select one or more shapes
2. Open the Style dropdown in Property Panel
3. Select a saved style

### Default Styles

Set default styles for new shapes:

1. Go to **Settings → Default Styles**
2. Configure defaults for each shape type
3. New shapes will use these settings

## Tips

- **Right-click** a shape on canvas → **Save to Library** to add it to a custom library
- After selecting a shape tool from the picker, click on the canvas to place it
