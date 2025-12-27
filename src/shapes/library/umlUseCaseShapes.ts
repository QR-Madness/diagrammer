/**
 * UML Use-Case diagram shape definitions.
 *
 * This module defines shapes for UML use-case diagrams:
 * - Actor (stick figure)
 * - Use Case (ellipse with label)
 * - System Boundary (labeled rectangle container)
 */

import type { LibraryShapeDefinition } from './ShapeLibraryTypes';
import { createStandardAnchors } from './ShapeLibraryTypes';
import { createStandardProperties } from '../ShapeMetadata';

/**
 * Actor (stick figure) shape.
 * Represents a user or external system interacting with the system.
 */
export const actorShape: LibraryShapeDefinition = {
  type: 'actor',
  metadata: {
    type: 'actor',
    name: 'Actor',
    category: 'uml-usecase',
    icon: '🧍',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 40,
    defaultHeight: 80,
    aspectRatioLocked: true,
    description: 'A user or external system that interacts with the system',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();

    // Proportions based on classic stick figure
    const headRadius = width * 0.35;
    const headCenterY = -height / 2 + headRadius + 2;
    const neckY = headCenterY + headRadius;
    const shoulderY = neckY + height * 0.05;
    const torsoBottomY = shoulderY + height * 0.25;
    const legSpread = width * 0.4;
    const armSpread = width * 0.5;
    const footY = height / 2;

    // Head (circle)
    path.arc(0, headCenterY, headRadius, 0, Math.PI * 2);

    // Neck to torso (vertical line)
    path.moveTo(0, neckY);
    path.lineTo(0, torsoBottomY);

    // Arms (horizontal line through shoulders)
    path.moveTo(-armSpread, shoulderY);
    path.lineTo(armSpread, shoulderY);

    // Left leg
    path.moveTo(0, torsoBottomY);
    path.lineTo(-legSpread, footY);

    // Right leg
    path.moveTo(0, torsoBottomY);
    path.lineTo(legSpread, footY);

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'top', x: () => 0, y: (_, h) => -h / 2 },
    { position: 'bottom', x: () => 0, y: (_, h) => h / 2 },
    { position: 'left', x: (w) => -w / 2, y: (_, h) => -h * 0.15 },
    { position: 'right', x: (w) => w / 2, y: (_, h) => -h * 0.15 },
  ],
  hitTestMode: 'bounds', // Stick figure is easier to select with bounds
};

/**
 * Use Case (ellipse) shape.
 * Represents a specific functionality or goal of the system.
 */
export const useCaseShape: LibraryShapeDefinition = {
  type: 'use-case',
  metadata: {
    type: 'use-case',
    name: 'Use Case',
    category: 'uml-usecase',
    icon: '⬭',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 140,
    defaultHeight: 70,
    description: 'A specific functionality or goal of the system',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Ellipse using bezier curves
    const kappa = 0.5522848; // Control point factor for bezier ellipse
    const ox = halfWidth * kappa;
    const oy = halfHeight * kappa;

    path.moveTo(0, -halfHeight);
    path.bezierCurveTo(ox, -halfHeight, halfWidth, -oy, halfWidth, 0);
    path.bezierCurveTo(halfWidth, oy, ox, halfHeight, 0, halfHeight);
    path.bezierCurveTo(-ox, halfHeight, -halfWidth, oy, -halfWidth, 0);
    path.bezierCurveTo(-halfWidth, -oy, -ox, -halfHeight, 0, -halfHeight);
    path.closePath();

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * System Boundary (container rectangle) shape.
 * Represents the boundary of the system being modeled.
 * Has a title bar at the top for the system name.
 */
export const systemBoundaryShape: LibraryShapeDefinition = {
  type: 'system-boundary',
  metadata: {
    type: 'system-boundary',
    name: 'System Boundary',
    category: 'uml-usecase',
    icon: '▭',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 300,
    defaultHeight: 400,
    description: 'The boundary of the system being modeled',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const titleBarHeight = 30;

    // Main rectangle
    path.rect(-halfWidth, -halfHeight, width, height);

    // Title bar separator line
    path.moveTo(-halfWidth, -halfHeight + titleBarHeight);
    path.lineTo(halfWidth, -halfHeight + titleBarHeight);

    return path;
  },
  anchors: createStandardAnchors(),
  hitTestMode: 'bounds',
};

/**
 * Include relationship connector hint shape.
 * A small indicator for <<include>> relationships.
 * Note: This is primarily a visual reference - actual relationships
 * use the standard connector with a dashed line and "<<include>>" label.
 */
export const includeRelationShape: LibraryShapeDefinition = {
  type: 'include-relation',
  metadata: {
    type: 'include-relation',
    name: 'Include',
    category: 'uml-usecase',
    icon: '⇢',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 100,
    defaultHeight: 24,
    description: '<<include>> relationship indicator',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const arrowSize = height * 0.4;

    // Dashed line (rendered as solid since we use dash in stroke style)
    path.moveTo(-halfWidth, 0);
    path.lineTo(halfWidth - arrowSize, 0);

    // Arrow head (open)
    path.moveTo(halfWidth - arrowSize, -arrowSize);
    path.lineTo(halfWidth, 0);
    path.lineTo(halfWidth - arrowSize, arrowSize);

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
  ],
};

/**
 * Extend relationship connector hint shape.
 * A small indicator for <<extend>> relationships.
 */
export const extendRelationShape: LibraryShapeDefinition = {
  type: 'extend-relation',
  metadata: {
    type: 'extend-relation',
    name: 'Extend',
    category: 'uml-usecase',
    icon: '⇠',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 100,
    defaultHeight: 24,
    description: '<<extend>> relationship indicator',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const arrowSize = height * 0.4;

    // Dashed line (rendered as solid since we use dash in stroke style)
    path.moveTo(-halfWidth + arrowSize, 0);
    path.lineTo(halfWidth, 0);

    // Arrow head (open) pointing left
    path.moveTo(-halfWidth + arrowSize, -arrowSize);
    path.lineTo(-halfWidth, 0);
    path.lineTo(-halfWidth + arrowSize, arrowSize);

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'left', x: (w) => -w / 2, y: () => 0 },
    { position: 'right', x: (w) => w / 2, y: () => 0 },
  ],
};

/**
 * All UML use-case shape definitions.
 */
export const umlUseCaseShapes: LibraryShapeDefinition[] = [
  actorShape,
  useCaseShape,
  systemBoundaryShape,
  includeRelationShape,
  extendRelationShape,
];
