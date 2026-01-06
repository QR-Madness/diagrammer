/**
 * UML Class Diagram shape definitions.
 *
 * This module defines shapes for creating UML class diagrams:
 * - Class (3-compartment box: name/attributes/methods)
 * - Interface, Abstract Class, Enum (class variants with stereotypes)
 * - Package (folder-like container)
 * - Note (dog-eared rectangle)
 * - Relationship indicators (association, aggregation, composition, inheritance, etc.)
 */

import type { LibraryShapeDefinition } from './ShapeLibraryTypes';
import { createStandardAnchors } from './ShapeLibraryTypes';
import { createStandardProperties } from '../ShapeMetadata';

/**
 * Class shape - 3-compartment box.
 * Top: class name, Middle: attributes, Bottom: methods.
 */
export const umlClassShape: LibraryShapeDefinition = {
  type: 'uml-class',
  metadata: {
    type: 'uml-class',
    name: 'Class',
    category: 'uml-class',
    icon: '▤',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 160,
    defaultHeight: 120,
    description: 'UML class with name, attributes, and methods compartments',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const compartmentHeight = height / 3;

    // Main rectangle
    path.rect(-hw, -hh, width, height);

    // First divider (name/attributes)
    path.moveTo(-hw, -hh + compartmentHeight);
    path.lineTo(hw, -hh + compartmentHeight);

    // Second divider (attributes/methods)
    path.moveTo(-hw, -hh + compartmentHeight * 2);
    path.lineTo(hw, -hh + compartmentHeight * 2);

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Interface shape - class with stereotype indicator.
 * Represents an interface contract.
 */
export const umlInterfaceShape: LibraryShapeDefinition = {
  type: 'uml-interface',
  metadata: {
    type: 'uml-interface',
    name: 'Interface',
    category: 'uml-class',
    icon: '⟨I⟩',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 160,
    defaultHeight: 120,
    description: 'UML interface with <<interface>> stereotype',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const stereotypeHeight = 20;
    const compartmentHeight = (height - stereotypeHeight) / 2;

    // Main rectangle
    path.rect(-hw, -hh, width, height);

    // Stereotype divider
    path.moveTo(-hw, -hh + stereotypeHeight);
    path.lineTo(hw, -hh + stereotypeHeight);

    // Second divider (name/methods)
    path.moveTo(-hw, -hh + stereotypeHeight + compartmentHeight);
    path.lineTo(hw, -hh + stereotypeHeight + compartmentHeight);

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Abstract Class shape - class with abstract indicator.
 * Represents an abstract class that cannot be instantiated.
 */
export const umlAbstractClassShape: LibraryShapeDefinition = {
  type: 'uml-abstract-class',
  metadata: {
    type: 'uml-abstract-class',
    name: 'Abstract Class',
    category: 'uml-class',
    icon: '⟨A⟩',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 160,
    defaultHeight: 120,
    description: 'UML abstract class with <<abstract>> stereotype',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const stereotypeHeight = 20;
    const compartmentHeight = (height - stereotypeHeight) / 2;

    // Main rectangle
    path.rect(-hw, -hh, width, height);

    // Stereotype divider
    path.moveTo(-hw, -hh + stereotypeHeight);
    path.lineTo(hw, -hh + stereotypeHeight);

    // Second divider (name/methods)
    path.moveTo(-hw, -hh + stereotypeHeight + compartmentHeight);
    path.lineTo(hw, -hh + stereotypeHeight + compartmentHeight);

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Enum shape - class with enumeration stereotype.
 * Represents an enumeration type.
 */
export const umlEnumShape: LibraryShapeDefinition = {
  type: 'uml-enum',
  metadata: {
    type: 'uml-enum',
    name: 'Enumeration',
    category: 'uml-class',
    icon: '⟨E⟩',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 140,
    defaultHeight: 100,
    description: 'UML enumeration with <<enumeration>> stereotype',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const stereotypeHeight = 20;
    const nameHeight = 25;

    // Main rectangle
    path.rect(-hw, -hh, width, height);

    // Stereotype divider
    path.moveTo(-hw, -hh + stereotypeHeight);
    path.lineTo(hw, -hh + stereotypeHeight);

    // Name divider (stereotype/name | values)
    path.moveTo(-hw, -hh + stereotypeHeight + nameHeight);
    path.lineTo(hw, -hh + stereotypeHeight + nameHeight);

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Package shape - folder-like container.
 * Represents a namespace or module grouping.
 */
export const umlPackageShape: LibraryShapeDefinition = {
  type: 'uml-package',
  metadata: {
    type: 'uml-package',
    name: 'Package',
    category: 'uml-class',
    icon: '📁',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 200,
    defaultHeight: 150,
    description: 'UML package for grouping related classes',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const tabWidth = width * 0.35;
    const tabHeight = 20;

    // Tab (top-left)
    path.moveTo(-hw, -hh);
    path.lineTo(-hw, -hh - tabHeight);
    path.lineTo(-hw + tabWidth, -hh - tabHeight);
    path.lineTo(-hw + tabWidth + 10, -hh);

    // Main body
    path.moveTo(-hw, -hh);
    path.lineTo(hw, -hh);
    path.lineTo(hw, hh);
    path.lineTo(-hw, hh);
    path.closePath();

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'top', x: () => 0, y: (_, h) => -h / 2 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
    { position: 'bottom', x: () => 0, y: (_, h) => h / 2 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
  ],
  hitTestMode: 'bounds',
};

/**
 * Note shape - dog-eared rectangle.
 * For adding comments and annotations to diagrams.
 */
export const umlNoteShape: LibraryShapeDefinition = {
  type: 'uml-note',
  metadata: {
    type: 'uml-note',
    name: 'Note',
    category: 'uml-class',
    icon: '📝',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 120,
    defaultHeight: 80,
    description: 'Annotation or comment note',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const foldSize = 15;

    // Main shape with folded corner (top-right)
    path.moveTo(-hw, -hh);
    path.lineTo(hw - foldSize, -hh);
    path.lineTo(hw, -hh + foldSize);
    path.lineTo(hw, hh);
    path.lineTo(-hw, hh);
    path.closePath();

    // Fold line
    path.moveTo(hw - foldSize, -hh);
    path.lineTo(hw - foldSize, -hh + foldSize);
    path.lineTo(hw, -hh + foldSize);

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Association - solid line.
 * Represents a general relationship between classes.
 */
export const umlAssociationShape: LibraryShapeDefinition = {
  type: 'uml-association',
  metadata: {
    type: 'uml-association',
    name: 'Association',
    category: 'uml-class',
    icon: '—',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 80,
    defaultHeight: 20,
    description: 'Association relationship (solid line)',
  },
  pathBuilder: (width, _height) => {
    const path = new Path2D();
    const hw = width / 2;

    // Simple horizontal line
    path.moveTo(-hw, 0);
    path.lineTo(hw, 0);

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
  ],
  hitTestMode: 'bounds',
};

/**
 * Aggregation - hollow diamond + line.
 * Represents a "has-a" relationship (weak ownership).
 */
export const umlAggregationShape: LibraryShapeDefinition = {
  type: 'uml-aggregation',
  metadata: {
    type: 'uml-aggregation',
    name: 'Aggregation',
    category: 'uml-class',
    icon: '◇—',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 80,
    defaultHeight: 20,
    description: 'Aggregation relationship (hollow diamond)',
  },
  pathBuilder: (width, _height) => {
    const path = new Path2D();
    const hw = width / 2;
    const diamondWidth = 16;
    const diamondHeight = 10;

    // Diamond (hollow) on left
    path.moveTo(-hw, 0);
    path.lineTo(-hw + diamondWidth / 2, -diamondHeight / 2);
    path.lineTo(-hw + diamondWidth, 0);
    path.lineTo(-hw + diamondWidth / 2, diamondHeight / 2);
    path.closePath();

    // Line from diamond to right
    path.moveTo(-hw + diamondWidth, 0);
    path.lineTo(hw, 0);

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
  ],
  hitTestMode: 'bounds',
};

/**
 * Composition - filled diamond + line.
 * Represents a "part-of" relationship (strong ownership).
 */
export const umlCompositionShape: LibraryShapeDefinition = {
  type: 'uml-composition',
  metadata: {
    type: 'uml-composition',
    name: 'Composition',
    category: 'uml-class',
    icon: '◆—',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 80,
    defaultHeight: 20,
    description: 'Composition relationship (filled diamond)',
  },
  pathBuilder: (width, _height) => {
    const path = new Path2D();
    const hw = width / 2;
    const diamondWidth = 16;
    const diamondHeight = 10;

    // Diamond (will be filled) on left
    path.moveTo(-hw, 0);
    path.lineTo(-hw + diamondWidth / 2, -diamondHeight / 2);
    path.lineTo(-hw + diamondWidth, 0);
    path.lineTo(-hw + diamondWidth / 2, diamondHeight / 2);
    path.closePath();

    // Line from diamond to right
    path.moveTo(-hw + diamondWidth, 0);
    path.lineTo(hw, 0);

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
  ],
  hitTestMode: 'bounds',
};

/**
 * Inheritance/Generalization - hollow triangle arrow.
 * Represents "is-a" relationship (extends).
 */
export const umlInheritanceShape: LibraryShapeDefinition = {
  type: 'uml-inheritance',
  metadata: {
    type: 'uml-inheritance',
    name: 'Inheritance',
    category: 'uml-class',
    icon: '—▷',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 80,
    defaultHeight: 20,
    description: 'Inheritance/generalization (hollow triangle)',
  },
  pathBuilder: (width, _height) => {
    const path = new Path2D();
    const hw = width / 2;
    const arrowSize = 12;

    // Line
    path.moveTo(-hw, 0);
    path.lineTo(hw - arrowSize, 0);

    // Hollow triangle arrow on right
    path.moveTo(hw - arrowSize, -arrowSize / 2);
    path.lineTo(hw, 0);
    path.lineTo(hw - arrowSize, arrowSize / 2);
    path.closePath();

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
  ],
  hitTestMode: 'bounds',
};

/**
 * Realization/Implementation - dashed line + hollow triangle.
 * Represents interface implementation.
 */
export const umlRealizationShape: LibraryShapeDefinition = {
  type: 'uml-realization',
  metadata: {
    type: 'uml-realization',
    name: 'Realization',
    category: 'uml-class',
    icon: '- -▷',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 80,
    defaultHeight: 20,
    description: 'Realization/implementation (dashed + triangle)',
  },
  pathBuilder: (width, _height) => {
    const path = new Path2D();
    const hw = width / 2;
    const arrowSize = 12;

    // Dashed line segments
    const dashLength = 8;
    const gapLength = 4;
    let x = -hw;
    const endX = hw - arrowSize;

    while (x < endX) {
      const nextX = Math.min(x + dashLength, endX);
      path.moveTo(x, 0);
      path.lineTo(nextX, 0);
      x = nextX + gapLength;
    }

    // Hollow triangle arrow on right
    path.moveTo(hw - arrowSize, -arrowSize / 2);
    path.lineTo(hw, 0);
    path.lineTo(hw - arrowSize, arrowSize / 2);
    path.closePath();

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
  ],
  hitTestMode: 'bounds',
};

/**
 * Dependency - dashed line + open arrow.
 * Represents a dependency relationship.
 */
export const umlDependencyShape: LibraryShapeDefinition = {
  type: 'uml-dependency',
  metadata: {
    type: 'uml-dependency',
    name: 'Dependency',
    category: 'uml-class',
    icon: '- ->',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 80,
    defaultHeight: 20,
    description: 'Dependency relationship (dashed + arrow)',
  },
  pathBuilder: (width, _height) => {
    const path = new Path2D();
    const hw = width / 2;
    const arrowSize = 10;

    // Dashed line segments
    const dashLength = 8;
    const gapLength = 4;
    let x = -hw;
    const endX = hw - arrowSize;

    while (x < endX) {
      const nextX = Math.min(x + dashLength, endX);
      path.moveTo(x, 0);
      path.lineTo(nextX, 0);
      x = nextX + gapLength;
    }

    // Open arrow on right
    path.moveTo(hw - arrowSize, -arrowSize / 2);
    path.lineTo(hw, 0);
    path.lineTo(hw - arrowSize, arrowSize / 2);

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
  ],
  hitTestMode: 'bounds',
};

/**
 * All UML Class Diagram shape definitions.
 */
export const umlClassShapes: LibraryShapeDefinition[] = [
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
];
