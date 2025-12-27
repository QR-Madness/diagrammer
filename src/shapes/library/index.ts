/**
 * Shape library module.
 *
 * Exports types, utilities, and shape definitions for the shape library system.
 */

// Types
export type {
  PathBuilder,
  AnchorDefinition,
  LibraryShapeDefinition,
} from './ShapeLibraryTypes';

// Utilities
export {
  createStandardAnchors,
  createDiamondAnchors,
  createHexagonAnchors,
} from './ShapeLibraryTypes';

// Handler factory
export { createLibraryShapeHandler } from './LibraryShapeHandler';

// Flowchart shapes
export {
  diamondShape,
  terminatorShape,
  dataShape,
  documentShape,
  predefinedProcessShape,
  manualInputShape,
  preparationShape,
  connectorCircleShape,
  offPageConnectorShape,
  flowchartShapes,
} from './flowchartShapes';
