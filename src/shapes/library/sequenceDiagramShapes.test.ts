import { describe, it, expect, beforeAll } from 'vitest';
import { shapeRegistry } from '../ShapeRegistry';
import { createLibraryShapeHandler } from './LibraryShapeHandler';
import {
  seqLifelineShape,
  seqActivationShape,
  seqFragmentShape,
  seqActorShape,
  seqDestructionShape,
  seqStateInvariantShape,
  seqTimeConstraintShape,
  seqCoregionShape,
  seqContinuationShape,
  sequenceDiagramShapes,
} from './sequenceDiagramShapes';
import { Vec2 } from '../../math/Vec2';
import type { LibraryShape } from '../Shape';

/**
 * Create a test library shape with default properties.
 */
function createTestLibraryShape(
  type: string,
  overrides: Partial<LibraryShape> = {}
): LibraryShape {
  return {
    id: `test-${type}`,
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 1,
    ...overrides,
  };
}

describe('Sequence Diagram Shapes', () => {
  // Register all shapes before tests
  beforeAll(() => {
    for (const definition of sequenceDiagramShapes) {
      if (!shapeRegistry.hasHandler(definition.type)) {
        const handler = createLibraryShapeHandler(definition);
        shapeRegistry.register(definition.type, handler, definition.metadata);
      }
    }
  });

  describe('Shape Definitions', () => {
    it('exports all required shapes', () => {
      expect(sequenceDiagramShapes).toHaveLength(9);
      expect(sequenceDiagramShapes.map((s) => s.type)).toEqual([
        'seq-lifeline',
        'seq-activation',
        'seq-fragment',
        'seq-actor',
        'seq-destruction',
        'seq-state-invariant',
        'seq-time-constraint',
        'seq-coregion',
        'seq-continuation',
      ]);
    });

    it('all shapes have required metadata', () => {
      for (const shape of sequenceDiagramShapes) {
        expect(shape.metadata.type).toBe(shape.type);
        expect(shape.metadata.name).toBeTruthy();
        expect(shape.metadata.category).toBe('uml-sequence');
        expect(shape.metadata.icon).toBeTruthy();
        expect(shape.metadata.defaultWidth).toBeGreaterThan(0);
        expect(shape.metadata.defaultHeight).toBeGreaterThan(0);
      }
    });
  });

  describe('Lifeline Shape', () => {
    it('has correct metadata', () => {
      expect(seqLifelineShape.type).toBe('seq-lifeline');
      expect(seqLifelineShape.metadata.name).toBe('Lifeline');
      expect(seqLifelineShape.metadata.supportsLabel).toBe(true);
      expect(seqLifelineShape.metadata.defaultWidth).toBe(100);
      expect(seqLifelineShape.metadata.defaultHeight).toBe(50);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-lifeline')).toBe(true);
    });

    it('getBounds returns valid bounds', () => {
      const handler = shapeRegistry.getHandler('seq-lifeline');
      const shape = createTestLibraryShape('seq-lifeline');
      const bounds = handler.getBounds(shape);

      expect(bounds.minX).toBeLessThan(bounds.maxX);
      expect(bounds.minY).toBeLessThan(bounds.maxY);
    });

    it('hitTest works for points inside', () => {
      const handler = shapeRegistry.getHandler('seq-lifeline');
      const shape = createTestLibraryShape('seq-lifeline');

      expect(handler.hitTest(shape, new Vec2(0, -30))).toBe(true);
    });

    it('hitTest returns false for points outside', () => {
      const handler = shapeRegistry.getHandler('seq-lifeline');
      const shape = createTestLibraryShape('seq-lifeline');

      expect(handler.hitTest(shape, new Vec2(500, 500))).toBe(false);
    });

    it('has dynamic anchors function', () => {
      expect(seqLifelineShape.dynamicAnchors).toBeDefined();
    });

    it('dynamic anchors include lifeline positions', () => {
      const shape = createTestLibraryShape('seq-lifeline', {
        width: 100,
        height: 50,
        customProperties: { lifelineLength: 200 },
      });
      const anchors = seqLifelineShape.dynamicAnchors!(shape, 100, 50);

      // Should have standard anchors plus lifeline anchors
      expect(anchors.length).toBeGreaterThan(4);

      // Check for lifeline anchors
      const lifelineAnchors = anchors.filter((a) => a.position.startsWith('lifeline-'));
      expect(lifelineAnchors.length).toBeGreaterThan(0);
    });
  });

  describe('Activation Shape', () => {
    it('has correct metadata', () => {
      expect(seqActivationShape.type).toBe('seq-activation');
      expect(seqActivationShape.metadata.name).toBe('Activation');
      expect(seqActivationShape.metadata.supportsLabel).toBe(false);
      expect(seqActivationShape.metadata.defaultWidth).toBe(16);
      expect(seqActivationShape.metadata.defaultHeight).toBe(60);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-activation')).toBe(true);
    });

    it('getBounds returns valid bounds', () => {
      const handler = shapeRegistry.getHandler('seq-activation');
      const shape = createTestLibraryShape('seq-activation', {
        width: 16,
        height: 60,
      });
      const bounds = handler.getBounds(shape);

      // Bounds include stroke width padding
      expect(bounds.minX).toBeLessThan(0);
      expect(bounds.maxX).toBeGreaterThan(0);
      expect(bounds.minY).toBeLessThan(0);
      expect(bounds.maxY).toBeGreaterThan(0);
      expect(bounds.width).toBeGreaterThanOrEqual(16);
      expect(bounds.height).toBeGreaterThanOrEqual(60);
    });

    it('uses path hit test mode', () => {
      expect(seqActivationShape.hitTestMode).toBe('path');
    });
  });

  describe('Fragment Shape', () => {
    it('has correct metadata', () => {
      expect(seqFragmentShape.type).toBe('seq-fragment');
      expect(seqFragmentShape.metadata.name).toBe('Fragment');
      expect(seqFragmentShape.metadata.defaultWidth).toBe(200);
      expect(seqFragmentShape.metadata.defaultHeight).toBe(150);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-fragment')).toBe(true);
    });

    it('getBounds returns valid bounds', () => {
      const handler = shapeRegistry.getHandler('seq-fragment');
      const shape = createTestLibraryShape('seq-fragment', {
        width: 200,
        height: 150,
      });
      const bounds = handler.getBounds(shape);

      expect(bounds.width).toBeGreaterThanOrEqual(200);
      expect(bounds.height).toBeGreaterThanOrEqual(150);
    });

    it('has custom render function', () => {
      expect(seqFragmentShape.customRender).toBeDefined();
      expect(seqFragmentShape.customLabelRendering).toBe(true);
    });
  });

  describe('Actor Shape', () => {
    it('has correct metadata', () => {
      expect(seqActorShape.type).toBe('seq-actor');
      expect(seqActorShape.metadata.name).toBe('Actor');
      expect(seqActorShape.metadata.supportsLabel).toBe(true);
      expect(seqActorShape.metadata.defaultWidth).toBe(50);
      expect(seqActorShape.metadata.defaultHeight).toBe(80);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-actor')).toBe(true);
    });

    it('hitTest uses bounds mode', () => {
      expect(seqActorShape.hitTestMode).toBe('bounds');
    });

    it('has custom render for stick figure', () => {
      expect(seqActorShape.customRender).toBeDefined();
      expect(seqActorShape.customLabelRendering).toBe(true);
    });
  });

  describe('Destruction Shape', () => {
    it('has correct metadata', () => {
      expect(seqDestructionShape.type).toBe('seq-destruction');
      expect(seqDestructionShape.metadata.name).toBe('Destruction');
      expect(seqDestructionShape.metadata.supportsLabel).toBe(false);
      expect(seqDestructionShape.metadata.defaultWidth).toBe(20);
      expect(seqDestructionShape.metadata.defaultHeight).toBe(20);
      expect(seqDestructionShape.metadata.aspectRatioLocked).toBe(true);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-destruction')).toBe(true);
    });

    it('has limited anchors (top, center, bottom)', () => {
      expect(seqDestructionShape.anchors).toHaveLength(3);
      const positions = seqDestructionShape.anchors.map((a) => a.position);
      expect(positions).toContain('center');
      expect(positions).toContain('top');
      expect(positions).toContain('bottom');
    });
  });

  describe('State Invariant Shape', () => {
    it('has correct metadata', () => {
      expect(seqStateInvariantShape.type).toBe('seq-state-invariant');
      expect(seqStateInvariantShape.metadata.name).toBe('State Invariant');
      expect(seqStateInvariantShape.metadata.supportsLabel).toBe(true);
      expect(seqStateInvariantShape.metadata.defaultWidth).toBe(80);
      expect(seqStateInvariantShape.metadata.defaultHeight).toBe(24);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-state-invariant')).toBe(true);
    });

    it('has custom render and label rendering', () => {
      expect(seqStateInvariantShape.customRender).toBeDefined();
      expect(seqStateInvariantShape.customLabelRendering).toBe(true);
    });

    it('uses path hit test mode', () => {
      expect(seqStateInvariantShape.hitTestMode).toBe('path');
    });

    it('has constraint property in metadata', () => {
      const constraintProp = seqStateInvariantShape.metadata.properties.find(
        (p) => p.key === 'customProperties.constraint'
      );
      expect(constraintProp).toBeDefined();
      expect(constraintProp?.type).toBe('string');
    });
  });

  describe('Time Constraint Shape', () => {
    it('has correct metadata', () => {
      expect(seqTimeConstraintShape.type).toBe('seq-time-constraint');
      expect(seqTimeConstraintShape.metadata.name).toBe('Time Constraint');
      expect(seqTimeConstraintShape.metadata.supportsLabel).toBe(true);
      expect(seqTimeConstraintShape.metadata.defaultWidth).toBe(60);
      expect(seqTimeConstraintShape.metadata.defaultHeight).toBe(20);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-time-constraint')).toBe(true);
    });

    it('has custom render and label rendering', () => {
      expect(seqTimeConstraintShape.customRender).toBeDefined();
      expect(seqTimeConstraintShape.customLabelRendering).toBe(true);
    });

    it('uses path hit test mode', () => {
      expect(seqTimeConstraintShape.hitTestMode).toBe('path');
    });

    it('has time-related properties', () => {
      const properties = seqTimeConstraintShape.metadata.properties;
      const durationProp = properties.find((p) => p.key === 'customProperties.duration');
      const minTimeProp = properties.find((p) => p.key === 'customProperties.minTime');
      const maxTimeProp = properties.find((p) => p.key === 'customProperties.maxTime');
      const unitProp = properties.find((p) => p.key === 'customProperties.unit');

      expect(durationProp).toBeDefined();
      expect(minTimeProp).toBeDefined();
      expect(maxTimeProp).toBeDefined();
      expect(unitProp).toBeDefined();
      expect(unitProp?.type).toBe('select');
    });
  });

  describe('Coregion Shape', () => {
    it('has correct metadata', () => {
      expect(seqCoregionShape.type).toBe('seq-coregion');
      expect(seqCoregionShape.metadata.name).toBe('Coregion');
      expect(seqCoregionShape.metadata.supportsLabel).toBe(false);
      expect(seqCoregionShape.metadata.defaultWidth).toBe(30);
      expect(seqCoregionShape.metadata.defaultHeight).toBe(80);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-coregion')).toBe(true);
    });

    it('has custom render function', () => {
      expect(seqCoregionShape.customRender).toBeDefined();
    });

    it('uses bounds hit test mode', () => {
      expect(seqCoregionShape.hitTestMode).toBe('bounds');
    });

    it('has pattern type property', () => {
      const patternProp = seqCoregionShape.metadata.properties.find(
        (p) => p.key === 'customProperties.patternType'
      );
      expect(patternProp).toBeDefined();
      expect(patternProp?.type).toBe('select');
      expect(patternProp?.options).toHaveLength(3); // bracket, stripes, dots
    });
  });

  describe('Continuation Shape', () => {
    it('has correct metadata', () => {
      expect(seqContinuationShape.type).toBe('seq-continuation');
      expect(seqContinuationShape.metadata.name).toBe('Continuation');
      expect(seqContinuationShape.metadata.supportsLabel).toBe(true);
      expect(seqContinuationShape.metadata.defaultWidth).toBe(100);
      expect(seqContinuationShape.metadata.defaultHeight).toBe(30);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('seq-continuation')).toBe(true);
    });

    it('has custom render and label rendering', () => {
      expect(seqContinuationShape.customRender).toBeDefined();
      expect(seqContinuationShape.customLabelRendering).toBe(true);
    });

    it('uses path hit test mode', () => {
      expect(seqContinuationShape.hitTestMode).toBe('path');
    });

    it('has continuation label property', () => {
      const labelProp = seqContinuationShape.metadata.properties.find(
        (p) => p.key === 'customProperties.continuationLabel'
      );
      expect(labelProp).toBeDefined();
      expect(labelProp?.type).toBe('string');
    });
  });

  describe('Shape Handler Integration', () => {
    it('all handlers can create shapes', () => {
      for (const definition of sequenceDiagramShapes) {
        const handler = shapeRegistry.getHandler(definition.type);
        const shape = handler.create(new Vec2(100, 50), `test-${definition.type}`);

        expect(shape.id).toBe(`test-${definition.type}`);
        expect(shape.type).toBe(definition.type);
        expect(shape.x).toBe(100);
        expect(shape.y).toBe(50);
      }
    });

    it('all handlers return valid bounds', () => {
      for (const definition of sequenceDiagramShapes) {
        const handler = shapeRegistry.getHandler(definition.type);
        const shape = createTestLibraryShape(definition.type, {
          width: definition.metadata.defaultWidth,
          height: definition.metadata.defaultHeight,
        });
        const bounds = handler.getBounds(shape);

        expect(bounds.width).toBeGreaterThan(0);
        expect(bounds.height).toBeGreaterThan(0);
      }
    });

    it('all handlers have getHandles', () => {
      for (const definition of sequenceDiagramShapes) {
        const handler = shapeRegistry.getHandler(definition.type);
        const shape = createTestLibraryShape(definition.type, {
          width: definition.metadata.defaultWidth,
          height: definition.metadata.defaultHeight,
        });
        const handles = handler.getHandles(shape);

        expect(Array.isArray(handles)).toBe(true);
        expect(handles.length).toBeGreaterThan(0);
      }
    });

    it('all handlers have render function', () => {
      for (const definition of sequenceDiagramShapes) {
        const handler = shapeRegistry.getHandler(definition.type);
        expect(typeof handler.render).toBe('function');
      }
    });
  });

  describe('Custom Render Functions', () => {
    it('lifeline custom render is defined', () => {
      expect(seqLifelineShape.customRender).toBeDefined();
    });

    it('activation custom render is defined', () => {
      expect(seqActivationShape.customRender).toBeDefined();
    });

    it('fragment custom render is defined', () => {
      expect(seqFragmentShape.customRender).toBeDefined();
    });

    it('actor custom render is defined', () => {
      expect(seqActorShape.customRender).toBeDefined();
    });

    it('destruction custom render is defined', () => {
      expect(seqDestructionShape.customRender).toBeDefined();
    });

    it('state invariant custom render is defined', () => {
      expect(seqStateInvariantShape.customRender).toBeDefined();
    });

    it('time constraint custom render is defined', () => {
      expect(seqTimeConstraintShape.customRender).toBeDefined();
    });

    it('coregion custom render is defined', () => {
      expect(seqCoregionShape.customRender).toBeDefined();
    });

    it('continuation custom render is defined', () => {
      expect(seqContinuationShape.customRender).toBeDefined();
    });
  });
});
