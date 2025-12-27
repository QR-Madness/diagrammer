/**
 * Flowchart shape definitions.
 *
 * This module defines all standard flowchart shapes using the LibraryShapeDefinition pattern.
 * Each shape includes its geometry (path builder), metadata (for UI), and anchor points.
 */

import type { LibraryShapeDefinition } from './ShapeLibraryTypes';
import { createStandardAnchors, createDiamondAnchors } from './ShapeLibraryTypes';
import { createStandardProperties } from '../ShapeMetadata';

/**
 * Diamond (Decision) shape.
 * Used for conditional/decision points in flowcharts.
 */
export const diamondShape: LibraryShapeDefinition = {
  type: 'diamond',
  metadata: {
    type: 'diamond',
    name: 'Decision',
    category: 'flowchart',
    icon: '◇',
    properties: createStandardProperties({ includeLabel: true, includeIcon: true }),
    supportsLabel: true,
    supportsIcon: true,
    defaultWidth: 100,
    defaultHeight: 80,
    description: 'Decision or conditional branch point',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    path.moveTo(0, -halfHeight);      // Top
    path.lineTo(halfWidth, 0);        // Right
    path.lineTo(0, halfHeight);       // Bottom
    path.lineTo(-halfWidth, 0);       // Left
    path.closePath();

    return path;
  },
  anchors: createDiamondAnchors(),
};

/**
 * Terminator (Stadium/Pill) shape.
 * Used for start/end points in flowcharts.
 */
export const terminatorShape: LibraryShapeDefinition = {
  type: 'terminator',
  metadata: {
    type: 'terminator',
    name: 'Terminator',
    category: 'flowchart',
    icon: '⬭',
    properties: createStandardProperties({ includeLabel: true, includeIcon: true }),
    supportsLabel: true,
    supportsIcon: true,
    defaultWidth: 120,
    defaultHeight: 50,
    description: 'Start or end point of a process',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const radius = Math.min(halfHeight, halfWidth);

    // Stadium shape (fully rounded ends)
    path.moveTo(-halfWidth + radius, -halfHeight);
    path.lineTo(halfWidth - radius, -halfHeight);
    path.arc(halfWidth - radius, 0, halfHeight, -Math.PI / 2, Math.PI / 2);
    path.lineTo(-halfWidth + radius, halfHeight);
    path.arc(-halfWidth + radius, 0, halfHeight, Math.PI / 2, -Math.PI / 2);
    path.closePath();

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Data (Parallelogram) shape.
 * Used for input/output operations.
 */
export const dataShape: LibraryShapeDefinition = {
  type: 'data',
  metadata: {
    type: 'data',
    name: 'Data',
    category: 'flowchart',
    icon: '▱',
    properties: createStandardProperties({ includeLabel: true, includeIcon: true }),
    supportsLabel: true,
    supportsIcon: true,
    defaultWidth: 120,
    defaultHeight: 70,
    description: 'Input/output data operation',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const skew = width * 0.15; // 15% skew

    path.moveTo(-halfWidth + skew, -halfHeight);
    path.lineTo(halfWidth + skew, -halfHeight);
    path.lineTo(halfWidth - skew, halfHeight);
    path.lineTo(-halfWidth - skew, halfHeight);
    path.closePath();

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Document shape.
 * Used for document or report output.
 */
export const documentShape: LibraryShapeDefinition = {
  type: 'document',
  metadata: {
    type: 'document',
    name: 'Document',
    category: 'flowchart',
    icon: '📄',
    properties: createStandardProperties({ includeLabel: true, includeIcon: true }),
    supportsLabel: true,
    supportsIcon: true,
    defaultWidth: 100,
    defaultHeight: 80,
    description: 'Document or report',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const waveHeight = height * 0.12;

    // Rectangle with wavy bottom
    path.moveTo(-halfWidth, -halfHeight);
    path.lineTo(halfWidth, -halfHeight);
    path.lineTo(halfWidth, halfHeight - waveHeight);

    // Wavy bottom using bezier curve
    path.bezierCurveTo(
      halfWidth * 0.5, halfHeight + waveHeight,
      -halfWidth * 0.5, halfHeight - waveHeight * 2,
      -halfWidth, halfHeight - waveHeight
    );

    path.closePath();

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Predefined Process shape.
 * Used for subroutines or predefined processes.
 */
export const predefinedProcessShape: LibraryShapeDefinition = {
  type: 'predefined-process',
  metadata: {
    type: 'predefined-process',
    name: 'Predefined Process',
    category: 'flowchart',
    icon: '⊞',
    properties: createStandardProperties({ includeLabel: true, includeIcon: true }),
    supportsLabel: true,
    supportsIcon: true,
    defaultWidth: 120,
    defaultHeight: 70,
    description: 'Subroutine or predefined process',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const inset = width * 0.1; // 10% inset for side bars

    // Outer rectangle
    path.rect(-halfWidth, -halfHeight, width, height);

    // Left vertical line
    path.moveTo(-halfWidth + inset, -halfHeight);
    path.lineTo(-halfWidth + inset, halfHeight);

    // Right vertical line
    path.moveTo(halfWidth - inset, -halfHeight);
    path.lineTo(halfWidth - inset, halfHeight);

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Manual Input (Trapezoid) shape.
 * Used for manual data entry.
 */
export const manualInputShape: LibraryShapeDefinition = {
  type: 'manual-input',
  metadata: {
    type: 'manual-input',
    name: 'Manual Input',
    category: 'flowchart',
    icon: '⏢',
    properties: createStandardProperties({ includeLabel: true, includeIcon: true }),
    supportsLabel: true,
    supportsIcon: true,
    defaultWidth: 120,
    defaultHeight: 70,
    description: 'Manual data input operation',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const topOffset = height * 0.2; // Slanted top

    path.moveTo(-halfWidth, -halfHeight + topOffset);
    path.lineTo(halfWidth, -halfHeight);
    path.lineTo(halfWidth, halfHeight);
    path.lineTo(-halfWidth, halfHeight);
    path.closePath();

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Preparation (Hexagon) shape.
 * Used for initialization or preparation steps.
 */
export const preparationShape: LibraryShapeDefinition = {
  type: 'preparation',
  metadata: {
    type: 'preparation',
    name: 'Preparation',
    category: 'flowchart',
    icon: '⬡',
    properties: createStandardProperties({ includeLabel: true, includeIcon: true }),
    supportsLabel: true,
    supportsIcon: true,
    defaultWidth: 120,
    defaultHeight: 70,
    description: 'Initialization or preparation step',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const inset = width * 0.15; // 15% inset for hexagon points

    path.moveTo(-halfWidth + inset, -halfHeight);
    path.lineTo(halfWidth - inset, -halfHeight);
    path.lineTo(halfWidth, 0);
    path.lineTo(halfWidth - inset, halfHeight);
    path.lineTo(-halfWidth + inset, halfHeight);
    path.lineTo(-halfWidth, 0);
    path.closePath();

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Connector (Circle) shape.
 * Used for on-page connection points.
 */
export const connectorCircleShape: LibraryShapeDefinition = {
  type: 'connector-circle',
  metadata: {
    type: 'connector-circle',
    name: 'Connector',
    category: 'flowchart',
    icon: '○',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 40,
    defaultHeight: 40,
    aspectRatioLocked: true,
    description: 'On-page connection reference',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const radius = Math.min(width, height) / 2;
    path.arc(0, 0, radius, 0, Math.PI * 2);
    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Off-Page Connector (Pentagon arrow) shape.
 * Used for connections to other pages.
 */
export const offPageConnectorShape: LibraryShapeDefinition = {
  type: 'off-page-connector',
  metadata: {
    type: 'off-page-connector',
    name: 'Off-Page Connector',
    category: 'flowchart',
    icon: '⬠',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 50,
    defaultHeight: 60,
    description: 'Off-page connection reference',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const arrowHeight = height * 0.3; // Bottom arrow point

    path.moveTo(-halfWidth, -halfHeight);
    path.lineTo(halfWidth, -halfHeight);
    path.lineTo(halfWidth, halfHeight - arrowHeight);
    path.lineTo(0, halfHeight);
    path.lineTo(-halfWidth, halfHeight - arrowHeight);
    path.closePath();

    return path;
  },
  anchors: [
    { position: 'center', x: () => 0, y: () => 0 },
    { position: 'top', x: () => 0, y: (_, h) => -h / 2 },
    { position: 'right', x: (w) => w / 2, y: (_, h) => -h * 0.1 },
    { position: 'bottom', x: () => 0, y: (_, h) => h / 2 },
    { position: 'left', x: (w) => -w / 2, y: (_, h) => -h * 0.1 },
  ],
};

/**
 * All flowchart shape definitions.
 */
export const flowchartShapes: LibraryShapeDefinition[] = [
  diamondShape,
  terminatorShape,
  dataShape,
  documentShape,
  predefinedProcessShape,
  manualInputShape,
  preparationShape,
  connectorCircleShape,
  offPageConnectorShape,
];
