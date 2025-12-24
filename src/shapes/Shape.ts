/**
 * Shape types and interfaces for the diagramming application.
 *
 * Shapes are plain data objects with no methods. All behavior is implemented
 * externally via the ShapeRegistry pattern, which provides handlers for
 * rendering, hit testing, bounds calculation, and handle positions.
 */

/**
 * Handle types for resize/rotate operations.
 */
export type HandleType =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'rotation';

/**
 * A handle represents a control point for resizing or rotating shapes.
 */
export interface Handle {
  /** Handle identifier */
  type: HandleType;
  /** Position in world coordinates */
  x: number;
  y: number;
  /** Cursor to show when hovering */
  cursor: string;
}

/**
 * Shape type discriminator.
 */
export type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'text' | 'connector' | 'group';

/**
 * Anchor position on a shape for connectors.
 */
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left' | 'center';

/**
 * Anchor point on a shape.
 */
export interface Anchor {
  /** Position identifier */
  position: AnchorPosition;
  /** World X coordinate */
  x: number;
  /** World Y coordinate */
  y: number;
}

/**
 * Base interface for all shapes.
 * All shape types extend this with their specific properties.
 */
export interface BaseShape {
  /** Unique identifier */
  id: string;
  /** Shape type discriminator */
  type: ShapeType;
  /** World X position (center for rect/ellipse, start for line) */
  x: number;
  /** World Y position */
  y: number;
  /** Rotation in radians */
  rotation: number;
  /** Opacity from 0 (transparent) to 1 (opaque) */
  opacity: number;
  /** Whether the shape is locked from editing */
  locked: boolean;
  /** Whether the shape is visible (hidden shapes are not rendered) */
  visible: boolean;

  // Style properties
  /** Fill color (CSS color string) or null for no fill */
  fill: string | null;
  /** Stroke color (CSS color string) or null for no stroke */
  stroke: string | null;
  /** Stroke width in world units */
  strokeWidth: number;
}

/**
 * Rectangle shape with optional rounded corners.
 */
export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  /** Width in world units */
  width: number;
  /** Height in world units */
  height: number;
  /** Corner radius for rounded rectangles (0 for sharp corners) */
  cornerRadius: number;
  /** Optional inline text label */
  label?: string;
  /** Label font size in world units (default: 14) */
  labelFontSize?: number;
  /** Label text color (default: inherits from stroke or '#000000') */
  labelColor?: string;
}

/**
 * Ellipse shape (circle when radiusX === radiusY).
 */
export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  /** Horizontal radius in world units */
  radiusX: number;
  /** Vertical radius in world units */
  radiusY: number;
  /** Optional inline text label */
  label?: string;
  /** Label font size in world units (default: 14) */
  labelFontSize?: number;
  /** Label text color (default: inherits from stroke or '#000000') */
  labelColor?: string;
}

/**
 * Line shape with optional arrows.
 */
export interface LineShape extends BaseShape {
  type: 'line';
  /** End point X coordinate in world units */
  x2: number;
  /** End point Y coordinate in world units */
  y2: number;
  /** Whether to draw an arrow at the start point */
  startArrow: boolean;
  /** Whether to draw an arrow at the end point */
  endArrow: boolean;
}

/**
 * Connector shape that connects two shapes.
 */
export interface ConnectorShape extends BaseShape {
  type: 'connector';
  /** ID of the shape at the start, or null for floating endpoint */
  startShapeId: string | null;
  /** Anchor position on the start shape */
  startAnchor: AnchorPosition;
  /** ID of the shape at the end, or null for floating endpoint */
  endShapeId: string | null;
  /** Anchor position on the end shape */
  endAnchor: AnchorPosition;
  /** End point X coordinate (used when endShapeId is null, or cached position) */
  x2: number;
  /** End point Y coordinate (used when endShapeId is null, or cached position) */
  y2: number;
  /** Whether to draw an arrow at the start point */
  startArrow: boolean;
  /** Whether to draw an arrow at the end point */
  endArrow: boolean;
}

/**
 * Horizontal text alignment options.
 */
export type TextAlign = 'left' | 'center' | 'right';

/**
 * Vertical text alignment options.
 */
export type VerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * Text shape for displaying text blocks.
 */
export interface TextShape extends BaseShape {
  type: 'text';
  /** Text content */
  text: string;
  /** Font size in world units */
  fontSize: number;
  /** Font family (CSS font-family) */
  fontFamily: string;
  /** Horizontal text alignment within the text box */
  textAlign: TextAlign;
  /** Vertical text alignment within the text box */
  verticalAlign: VerticalAlign;
  /** Text box width for text wrapping */
  width: number;
  /** Text box height for vertical alignment */
  height: number;
}

/**
 * Group shape that contains other shapes.
 * Groups allow multiple shapes to be selected, moved, and transformed as a unit.
 */
export interface GroupShape extends BaseShape {
  type: 'group';
  /** IDs of child shapes (can include other groups for nesting) */
  childIds: string[];
  /** Optional name for the group (displayed in layer panel) */
  name?: string;
}

/**
 * Union type of all shape types.
 */
export type Shape = RectangleShape | EllipseShape | LineShape | TextShape | ConnectorShape | GroupShape;

// ============ Type Guards ============

/**
 * Check if a shape is a rectangle.
 */
export function isRectangle(shape: Shape): shape is RectangleShape {
  return shape.type === 'rectangle';
}

/**
 * Check if a shape is an ellipse.
 */
export function isEllipse(shape: Shape): shape is EllipseShape {
  return shape.type === 'ellipse';
}

/**
 * Check if a shape is a line.
 */
export function isLine(shape: Shape): shape is LineShape {
  return shape.type === 'line';
}

/**
 * Check if a shape is a text block.
 */
export function isText(shape: Shape): shape is TextShape {
  return shape.type === 'text';
}

/**
 * Check if a shape is a connector.
 */
export function isConnector(shape: Shape): shape is ConnectorShape {
  return shape.type === 'connector';
}

/**
 * Check if a shape is a group.
 */
export function isGroup(shape: Shape): shape is GroupShape {
  return shape.type === 'group';
}

// ============ Factory Defaults ============

/**
 * Default style values for new shapes.
 */
export const DEFAULT_SHAPE_STYLE = {
  fill: '#4a90d9',
  stroke: '#2c5282',
  strokeWidth: 2,
  opacity: 1,
  rotation: 0,
  locked: false,
  visible: true,
} as const;

/**
 * Default values for rectangle shapes.
 */
export const DEFAULT_RECTANGLE = {
  ...DEFAULT_SHAPE_STYLE,
  width: 100,
  height: 80,
  cornerRadius: 0,
} as const;

/**
 * Default values for ellipse shapes.
 */
export const DEFAULT_ELLIPSE = {
  ...DEFAULT_SHAPE_STYLE,
  radiusX: 50,
  radiusY: 40,
} as const;

/**
 * Default values for line shapes.
 */
export const DEFAULT_LINE = {
  ...DEFAULT_SHAPE_STYLE,
  fill: null,
  stroke: '#2c5282',
  strokeWidth: 2,
  startArrow: false,
  endArrow: true,
} as const;

/**
 * Default values for text shapes.
 */
export const DEFAULT_TEXT = {
  ...DEFAULT_SHAPE_STYLE,
  fill: null,
  stroke: null,
  strokeWidth: 0,
  fontSize: 16,
  fontFamily: 'sans-serif',
  textAlign: 'left' as TextAlign,
  verticalAlign: 'top' as VerticalAlign,
  width: 200,
  height: 50,
} as const;

/**
 * Default values for connector shapes.
 */
export const DEFAULT_CONNECTOR = {
  ...DEFAULT_SHAPE_STYLE,
  fill: null,
  stroke: '#2c5282',
  strokeWidth: 2,
  startShapeId: null,
  startAnchor: 'center' as AnchorPosition,
  endShapeId: null,
  endAnchor: 'center' as AnchorPosition,
  startArrow: false,
  endArrow: true,
} as const;

/**
 * Default values for group shapes.
 * Groups have no visual appearance - they only contain other shapes.
 */
export const DEFAULT_GROUP = {
  ...DEFAULT_SHAPE_STYLE,
  fill: null,
  stroke: null,
  strokeWidth: 0,
  childIds: [] as string[],
} as const;
