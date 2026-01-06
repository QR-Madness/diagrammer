/**
 * ERD (Entity-Relationship Diagram) shape definitions using Crow's Foot notation.
 *
 * This module defines shapes for creating ER diagrams:
 * - Entity (rectangle with header for name)
 * - Weak Entity (double-bordered rectangle)
 * - Relationship (diamond)
 * - Attribute (ellipse)
 * - Key Attribute (ellipse with underline indicator)
 * - Cardinality indicators (One, Many, Zero-One, Zero-Many, One-Many)
 */

import type { LibraryShapeDefinition, CustomRenderFunction } from './ShapeLibraryTypes';
import { createStandardAnchors, createDiamondAnchors } from './ShapeLibraryTypes';
import { createStandardProperties } from '../ShapeMetadata';
import type { PropertyDefinition } from '../ShapeMetadata';

/**
 * ERD entity member (attribute).
 */
export interface ERDEntityMember {
  name: string;
  type: string;
  isPrimaryKey: boolean;
}

/**
 * Custom render function for ERD entities.
 * Renders title in header and members in body.
 */
const renderERDEntity: CustomRenderFunction = (ctx, shape) => {
  const { width, height, stroke } = shape;
  const hw = width / 2;
  const hh = height / 2;
  const headerHeight = Math.min(30, height * 0.35);

  // Get custom properties
  const customProps = shape.customProperties as {
    entityTitle?: string;
    members?: ERDEntityMember[];
  } | undefined;

  const title = customProps?.entityTitle || shape.label || 'Entity';
  const members = customProps?.members || [];

  // Draw title in header
  const titleFontSize = Math.min(14, headerHeight * 0.6);
  ctx.font = `bold ${titleFontSize}px sans-serif`;
  ctx.fillStyle = shape.labelColor || stroke || '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 0, -hh + headerHeight / 2, width - 10);

  // Draw members in body
  if (members.length > 0) {
    const bodyTop = -hh + headerHeight + 5;
    const bodyHeight = height - headerHeight - 10;
    const memberFontSize = Math.min(12, bodyHeight / members.length * 0.8);
    const lineHeight = memberFontSize * 1.4;

    ctx.font = `${memberFontSize}px sans-serif`;
    ctx.textAlign = 'left';

    members.forEach((member, index) => {
      const y = bodyTop + (index + 0.5) * lineHeight;
      if (y > hh - 5) return; // Don't overflow

      const text = member.type ? `${member.name}: ${member.type}` : member.name;
      const x = -hw + 8;

      // Underline for primary key
      if (member.isPrimaryKey) {
        ctx.fillText(text, x, y);
        const metrics = ctx.measureText(text);
        ctx.beginPath();
        ctx.moveTo(x, y + memberFontSize * 0.3);
        ctx.lineTo(x + metrics.width, y + memberFontSize * 0.3);
        ctx.strokeStyle = shape.labelColor || stroke || '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillText(text, x, y);
      }
    });
  }
};

/**
 * Custom render function for ERD weak entities.
 * Similar to entity but with double border consideration.
 */
const renderERDWeakEntity: CustomRenderFunction = (ctx, shape) => {
  const { width, height, stroke } = shape;
  const hw = width / 2;
  const hh = height / 2;
  const gap = 4;
  const headerHeight = Math.min(30, height * 0.35);

  // Get custom properties
  const customProps = shape.customProperties as {
    entityTitle?: string;
    members?: ERDEntityMember[];
  } | undefined;

  const title = customProps?.entityTitle || shape.label || 'Weak Entity';
  const members = customProps?.members || [];

  // Draw title in header (inside inner rectangle)
  const titleFontSize = Math.min(14, (headerHeight - gap) * 0.6);
  ctx.font = `bold ${titleFontSize}px sans-serif`;
  ctx.fillStyle = shape.labelColor || stroke || '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 0, -hh + headerHeight / 2, width - gap * 2 - 10);

  // Draw members in body
  if (members.length > 0) {
    const bodyTop = -hh + headerHeight + 5;
    const bodyHeight = height - headerHeight - 10;
    const memberFontSize = Math.min(12, bodyHeight / members.length * 0.8);
    const lineHeight = memberFontSize * 1.4;

    ctx.font = `${memberFontSize}px sans-serif`;
    ctx.textAlign = 'left';

    members.forEach((member, index) => {
      const y = bodyTop + (index + 0.5) * lineHeight;
      if (y > hh - gap - 5) return; // Don't overflow

      const text = member.type ? `${member.name}: ${member.type}` : member.name;
      const x = -hw + gap + 8;

      // Underline for primary key
      if (member.isPrimaryKey) {
        ctx.fillText(text, x, y);
        const metrics = ctx.measureText(text);
        ctx.beginPath();
        ctx.moveTo(x, y + memberFontSize * 0.3);
        ctx.lineTo(x + metrics.width, y + memberFontSize * 0.3);
        ctx.strokeStyle = shape.labelColor || stroke || '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillText(text, x, y);
      }
    });
  }
};

/**
 * ERD entity properties with custom fields.
 */
const erdEntityProperties: PropertyDefinition[] = [
  ...createStandardProperties({ includeLabel: false }),
  {
    key: 'customProperties.entityTitle',
    label: 'Entity Name',
    type: 'string',
    section: 'custom',
    placeholder: 'Enter entity name...',
  },
];

/**
 * Entity shape - rectangle with header divider.
 * Used to represent database tables or domain entities.
 */
export const erdEntityShape: LibraryShapeDefinition = {
  type: 'erd-entity',
  metadata: {
    type: 'erd-entity',
    name: 'Entity',
    category: 'erd',
    icon: '▭',
    properties: erdEntityProperties,
    supportsLabel: false, // Custom rendering handles text
    supportsIcon: false,
    defaultWidth: 140,
    defaultHeight: 100,
    description: 'Database table or domain entity',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const headerHeight = Math.min(30, height * 0.35);

    // Main rectangle
    path.rect(-hw, -hh, width, height);

    // Header divider line
    path.moveTo(-hw, -hh + headerHeight);
    path.lineTo(hw, -hh + headerHeight);

    return path;
  },
  anchors: createStandardAnchors(),
  customRender: renderERDEntity,
  customLabelRendering: true,
};

/**
 * Weak Entity shape - double-bordered rectangle.
 * Represents an entity that depends on another entity for identification.
 */
export const erdWeakEntityShape: LibraryShapeDefinition = {
  type: 'erd-weak-entity',
  metadata: {
    type: 'erd-weak-entity',
    name: 'Weak Entity',
    category: 'erd',
    icon: '▣',
    properties: erdEntityProperties,
    supportsLabel: false, // Custom rendering handles text
    supportsIcon: false,
    defaultWidth: 140,
    defaultHeight: 100,
    description: 'Entity dependent on another for identification',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const gap = 4; // Gap between inner and outer rectangles
    const headerHeight = Math.min(30, height * 0.35);

    // Outer rectangle
    path.rect(-hw, -hh, width, height);

    // Inner rectangle
    path.rect(-hw + gap, -hh + gap, width - gap * 2, height - gap * 2);

    // Header divider line (on inner rectangle)
    path.moveTo(-hw + gap, -hh + headerHeight);
    path.lineTo(hw - gap, -hh + headerHeight);

    return path;
  },
  anchors: createStandardAnchors(),
  customRender: renderERDWeakEntity,
  customLabelRendering: true,
};

/**
 * Relationship shape - diamond.
 * Represents relationships between entities.
 */
export const erdRelationshipShape: LibraryShapeDefinition = {
  type: 'erd-relationship',
  metadata: {
    type: 'erd-relationship',
    name: 'Relationship',
    category: 'erd',
    icon: '◇',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 100,
    defaultHeight: 60,
    description: 'Relationship between entities',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;

    path.moveTo(0, -hh);      // Top
    path.lineTo(hw, 0);       // Right
    path.lineTo(0, hh);       // Bottom
    path.lineTo(-hw, 0);      // Left
    path.closePath();

    return path;
  },
  anchors: createDiamondAnchors(),
};

/**
 * Attribute shape - ellipse.
 * Represents entity attributes/fields.
 */
export const erdAttributeShape: LibraryShapeDefinition = {
  type: 'erd-attribute',
  metadata: {
    type: 'erd-attribute',
    name: 'Attribute',
    category: 'erd',
    icon: '⬭',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 100,
    defaultHeight: 50,
    description: 'Entity attribute or field',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;

    // Ellipse using bezier curves
    const kappa = 0.5522848;
    const ox = hw * kappa;
    const oy = hh * kappa;

    path.moveTo(0, -hh);
    path.bezierCurveTo(ox, -hh, hw, -oy, hw, 0);
    path.bezierCurveTo(hw, oy, ox, hh, 0, hh);
    path.bezierCurveTo(-ox, hh, -hw, oy, -hw, 0);
    path.bezierCurveTo(-hw, -oy, -ox, -hh, 0, -hh);
    path.closePath();

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Key Attribute shape - ellipse with underline indicator.
 * Represents primary key attributes.
 */
export const erdKeyAttributeShape: LibraryShapeDefinition = {
  type: 'erd-key-attribute',
  metadata: {
    type: 'erd-key-attribute',
    name: 'Key Attribute',
    category: 'erd',
    icon: '🔑',
    properties: createStandardProperties({ includeLabel: true }),
    supportsLabel: true,
    supportsIcon: false,
    defaultWidth: 100,
    defaultHeight: 50,
    description: 'Primary key attribute (underlined)',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;

    // Ellipse using bezier curves
    const kappa = 0.5522848;
    const ox = hw * kappa;
    const oy = hh * kappa;

    path.moveTo(0, -hh);
    path.bezierCurveTo(ox, -hh, hw, -oy, hw, 0);
    path.bezierCurveTo(hw, oy, ox, hh, 0, hh);
    path.bezierCurveTo(-ox, hh, -hw, oy, -hw, 0);
    path.bezierCurveTo(-hw, -oy, -ox, -hh, 0, -hh);
    path.closePath();

    // Underline indicator in center
    const underlineWidth = width * 0.5;
    path.moveTo(-underlineWidth / 2, hh * 0.3);
    path.lineTo(underlineWidth / 2, hh * 0.3);

    return path;
  },
  anchors: createStandardAnchors(),
};

/**
 * Cardinality: One (single vertical line).
 * Indicates exactly one in a relationship.
 */
export const erdOneShape: LibraryShapeDefinition = {
  type: 'erd-one',
  metadata: {
    type: 'erd-one',
    name: 'One',
    category: 'erd',
    icon: '│',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 40,
    defaultHeight: 24,
    description: 'Cardinality: exactly one',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;

    // Horizontal line
    path.moveTo(-hw, 0);
    path.lineTo(hw, 0);

    // Vertical line at right end
    path.moveTo(hw - 4, -hh);
    path.lineTo(hw - 4, hh);

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
 * Cardinality: Many (crow's foot).
 * Indicates many/multiple in a relationship.
 */
export const erdManyShape: LibraryShapeDefinition = {
  type: 'erd-many',
  metadata: {
    type: 'erd-many',
    name: 'Many',
    category: 'erd',
    icon: '⋔',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 40,
    defaultHeight: 24,
    description: 'Cardinality: many (crow\'s foot)',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const forkX = hw - 8;

    // Main horizontal line
    path.moveTo(-hw, 0);
    path.lineTo(forkX, 0);

    // Crow's foot (three lines to right edge)
    path.moveTo(forkX, 0);
    path.lineTo(hw, -hh);

    path.moveTo(forkX, 0);
    path.lineTo(hw, 0);

    path.moveTo(forkX, 0);
    path.lineTo(hw, hh);

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
 * Cardinality: Zero or One (circle + line).
 * Indicates optional single relationship.
 */
export const erdZeroOneShape: LibraryShapeDefinition = {
  type: 'erd-zero-one',
  metadata: {
    type: 'erd-zero-one',
    name: 'Zero or One',
    category: 'erd',
    icon: '○│',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 50,
    defaultHeight: 24,
    description: 'Cardinality: zero or one (optional)',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const circleRadius = 5;
    const lineX = hw - 4;

    // Horizontal line
    path.moveTo(-hw, 0);
    path.lineTo(hw, 0);

    // Circle (zero indicator)
    path.arc(-hw + circleRadius + 4, 0, circleRadius, 0, Math.PI * 2);

    // Vertical line at right (one indicator)
    path.moveTo(lineX, -hh);
    path.lineTo(lineX, hh);

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
 * Cardinality: Zero or Many (circle + crow's foot).
 * Indicates optional multiple relationship.
 */
export const erdZeroManyShape: LibraryShapeDefinition = {
  type: 'erd-zero-many',
  metadata: {
    type: 'erd-zero-many',
    name: 'Zero or Many',
    category: 'erd',
    icon: '○⋔',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 50,
    defaultHeight: 24,
    description: 'Cardinality: zero or many',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const circleRadius = 5;
    const forkX = hw - 8;

    // Main horizontal line
    path.moveTo(-hw, 0);
    path.lineTo(forkX, 0);

    // Circle (zero indicator) on left
    path.arc(-hw + circleRadius + 4, 0, circleRadius, 0, Math.PI * 2);

    // Crow's foot on right
    path.moveTo(forkX, 0);
    path.lineTo(hw, -hh);

    path.moveTo(forkX, 0);
    path.lineTo(hw, 0);

    path.moveTo(forkX, 0);
    path.lineTo(hw, hh);

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
 * Cardinality: One or Many (line + crow's foot).
 * Indicates required multiple relationship (at least one).
 */
export const erdOneManyShape: LibraryShapeDefinition = {
  type: 'erd-one-many',
  metadata: {
    type: 'erd-one-many',
    name: 'One or Many',
    category: 'erd',
    icon: '│⋔',
    properties: createStandardProperties({ includeLabel: false }),
    supportsLabel: false,
    supportsIcon: false,
    defaultWidth: 50,
    defaultHeight: 24,
    description: 'Cardinality: one or many (at least one)',
  },
  pathBuilder: (width, height) => {
    const path = new Path2D();
    const hw = width / 2;
    const hh = height / 2;
    const lineX = -hw + 8;
    const forkX = hw - 8;

    // Main horizontal line
    path.moveTo(-hw, 0);
    path.lineTo(forkX, 0);

    // Vertical line on left (one indicator)
    path.moveTo(lineX, -hh);
    path.lineTo(lineX, hh);

    // Crow's foot on right
    path.moveTo(forkX, 0);
    path.lineTo(hw, -hh);

    path.moveTo(forkX, 0);
    path.lineTo(hw, 0);

    path.moveTo(forkX, 0);
    path.lineTo(hw, hh);

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
 * All ERD shape definitions.
 */
export const erdShapes: LibraryShapeDefinition[] = [
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
];
