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

// UML Use-Case shapes
export {
  actorShape,
  useCaseShape,
  systemBoundaryShape,
  includeRelationShape,
  extendRelationShape,
  umlUseCaseShapes,
} from './umlUseCaseShapes';

// ERD shapes (Crow's Foot notation)
export {
  erdEntityShape,
  erdWeakEntityShape,
  erdRelationshipShape,
  erdAttributeShape,
  erdKeyAttributeShape,
  erdOneShape,
  erdManyShape,
  erdZeroOneShape,
  erdZeroManyShape,
  erdOneManyShape,
  erdShapes,
} from './erdShapes';

// UML Class Diagram shapes
export {
  umlClassShape,
  umlInterfaceShape,
  umlAbstractClassShape,
  umlEnumShape,
  umlPackageShape,
  umlNoteShape,
  umlAssociationShape,
  umlAggregationShape,
  umlCompositionShape,
  umlInheritanceShape,
  umlRealizationShape,
  umlDependencyShape,
  umlClassShapes,
} from './umlClassShapes';
