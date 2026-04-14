import { describe, it, expect, beforeAll } from 'vitest';
import { shapeRegistry } from '../ShapeRegistry';
import { createLibraryShapeHandler } from './LibraryShapeHandler';
import {
  activityActionShape,
  activityInitialShape,
  activityFinalShape,
  activityFlowFinalShape,
  activityForkJoinShape,
  activitySendSignalShape,
  activityReceiveSignalShape,
  activitySwimlaneShape,
  activityDecisionShape,
  activityMergeShape,
  activityAcceptEventShape,
  activityTimeEventShape,
  activityObjectShape,
  activityDataStoreShape,
  activityCentralBufferShape,
  activityPinShape,
  activityExpansionRegionShape,
  activityInterruptibleRegionShape,
  activityParameterShape,
  activityDiagramShapes,
} from './activityDiagramShapes';
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

describe('Activity Diagram Shapes', () => {
  // Register all shapes before tests
  beforeAll(() => {
    for (const definition of activityDiagramShapes) {
      if (!shapeRegistry.hasHandler(definition.type)) {
        const handler = createLibraryShapeHandler(definition);
        shapeRegistry.register(definition.type, handler, definition.metadata);
      }
    }
  });

  describe('Shape Definitions', () => {
    it('exports all required shapes', () => {
      expect(activityDiagramShapes).toHaveLength(19);
      expect(activityDiagramShapes.map((s) => s.type)).toEqual([
        'activity-action',
        'activity-initial',
        'activity-final',
        'activity-flow-final',
        'activity-fork-join',
        'activity-send-signal',
        'activity-receive-signal',
        'activity-swimlane',
        'activity-decision',
        'activity-merge',
        'activity-accept-event',
        'activity-time-event',
        'activity-object',
        'activity-datastore',
        'activity-buffer',
        'activity-pin',
        'activity-expansion',
        'activity-interruptible',
        'activity-parameter',
      ]);
    });

    it('all shapes have required metadata', () => {
      for (const shape of activityDiagramShapes) {
        expect(shape.metadata.type).toBe(shape.type);
        expect(shape.metadata.name).toBeTruthy();
        expect(shape.metadata.category).toBe('uml-activity');
        expect(shape.metadata.icon).toBeTruthy();
        expect(shape.metadata.defaultWidth).toBeGreaterThan(0);
        expect(shape.metadata.defaultHeight).toBeGreaterThan(0);
      }
    });
  });

  describe('Action Shape', () => {
    it('has correct metadata', () => {
      expect(activityActionShape.type).toBe('activity-action');
      expect(activityActionShape.metadata.name).toBe('Action');
      expect(activityActionShape.metadata.supportsLabel).toBe(true);
      expect(activityActionShape.metadata.defaultWidth).toBe(120);
      expect(activityActionShape.metadata.defaultHeight).toBe(60);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('activity-action')).toBe(true);
    });

    it('getBounds returns valid bounds', () => {
      const handler = shapeRegistry.getHandler('activity-action');
      const shape = createTestLibraryShape('activity-action', {
        width: 120,
        height: 60,
      });
      const bounds = handler.getBounds(shape);

      expect(bounds.width).toBeGreaterThanOrEqual(120);
      expect(bounds.height).toBeGreaterThanOrEqual(60);
    });

    it('has custom render and label rendering', () => {
      expect(activityActionShape.customRender).toBeDefined();
      expect(activityActionShape.customLabelRendering).toBe(true);
    });

    it('uses path hit test mode', () => {
      expect(activityActionShape.hitTestMode).toBe('path');
    });
  });

  describe('Initial Node Shape', () => {
    it('has correct metadata', () => {
      expect(activityInitialShape.type).toBe('activity-initial');
      expect(activityInitialShape.metadata.name).toBe('Initial');
      expect(activityInitialShape.metadata.supportsLabel).toBe(false);
      expect(activityInitialShape.metadata.defaultWidth).toBe(20);
      expect(activityInitialShape.metadata.defaultHeight).toBe(20);
      expect(activityInitialShape.metadata.aspectRatioLocked).toBe(true);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('activity-initial')).toBe(true);
    });

    it('getBounds returns valid bounds', () => {
      const handler = shapeRegistry.getHandler('activity-initial');
      const shape = createTestLibraryShape('activity-initial', {
        width: 20,
        height: 20,
      });
      const bounds = handler.getBounds(shape);

      expect(bounds.width).toBeGreaterThanOrEqual(20);
      expect(bounds.height).toBeGreaterThanOrEqual(20);
    });

    it('uses path hit test mode', () => {
      expect(activityInitialShape.hitTestMode).toBe('path');
    });
  });

  describe('Final Node Shape', () => {
    it('has correct metadata', () => {
      expect(activityFinalShape.type).toBe('activity-final');
      expect(activityFinalShape.metadata.name).toBe('Final');
      expect(activityFinalShape.metadata.supportsLabel).toBe(false);
      expect(activityFinalShape.metadata.defaultWidth).toBe(24);
      expect(activityFinalShape.metadata.defaultHeight).toBe(24);
      expect(activityFinalShape.metadata.aspectRatioLocked).toBe(true);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('activity-final')).toBe(true);
    });

    it('has custom render for double circle', () => {
      expect(activityFinalShape.customRender).toBeDefined();
    });
  });

  describe('Flow Final Node Shape', () => {
    it('has correct metadata', () => {
      expect(activityFlowFinalShape.type).toBe('activity-flow-final');
      expect(activityFlowFinalShape.metadata.name).toBe('Flow Final');
      expect(activityFlowFinalShape.metadata.supportsLabel).toBe(false);
      expect(activityFlowFinalShape.metadata.defaultWidth).toBe(24);
      expect(activityFlowFinalShape.metadata.defaultHeight).toBe(24);
      expect(activityFlowFinalShape.metadata.aspectRatioLocked).toBe(true);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('activity-flow-final')).toBe(true);
    });

    it('has custom render for circle with X', () => {
      expect(activityFlowFinalShape.customRender).toBeDefined();
    });
  });

  describe('Fork/Join Bar Shape', () => {
    it('has correct metadata', () => {
      expect(activityForkJoinShape.type).toBe('activity-fork-join');
      expect(activityForkJoinShape.metadata.name).toBe('Fork/Join');
      expect(activityForkJoinShape.metadata.supportsLabel).toBe(false);
      expect(activityForkJoinShape.metadata.defaultWidth).toBe(100);
      expect(activityForkJoinShape.metadata.defaultHeight).toBe(8);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('activity-fork-join')).toBe(true);
    });

    it('uses bounds hit test mode', () => {
      expect(activityForkJoinShape.hitTestMode).toBe('bounds');
    });

    it('has dynamic anchors function', () => {
      expect(activityForkJoinShape.dynamicAnchors).toBeDefined();
    });

    it('dynamic anchors for horizontal bar include top/bottom anchors', () => {
      const shape = createTestLibraryShape('activity-fork-join', {
        width: 100,
        height: 8,
      });
      const anchors = activityForkJoinShape.dynamicAnchors!(shape, 100, 8);

      // Should have center + multiple top/bottom anchors
      expect(anchors.length).toBeGreaterThan(5);

      // Check for top/bottom anchors
      const topAnchors = anchors.filter((a) => a.position.startsWith('top-'));
      const bottomAnchors = anchors.filter((a) => a.position.startsWith('bottom-'));
      expect(topAnchors.length).toBeGreaterThan(0);
      expect(bottomAnchors.length).toBeGreaterThan(0);
    });

    it('dynamic anchors for vertical bar include left/right anchors', () => {
      const shape = createTestLibraryShape('activity-fork-join', {
        width: 8,
        height: 100,
      });
      const anchors = activityForkJoinShape.dynamicAnchors!(shape, 8, 100);

      // Check for left/right anchors
      const leftAnchors = anchors.filter((a) => a.position.startsWith('left-'));
      const rightAnchors = anchors.filter((a) => a.position.startsWith('right-'));
      expect(leftAnchors.length).toBeGreaterThan(0);
      expect(rightAnchors.length).toBeGreaterThan(0);
    });
  });

  describe('Send Signal Shape', () => {
    it('has correct metadata', () => {
      expect(activitySendSignalShape.type).toBe('activity-send-signal');
      expect(activitySendSignalShape.metadata.name).toBe('Send Signal');
      expect(activitySendSignalShape.metadata.supportsLabel).toBe(true);
      expect(activitySendSignalShape.metadata.defaultWidth).toBe(100);
      expect(activitySendSignalShape.metadata.defaultHeight).toBe(50);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('activity-send-signal')).toBe(true);
    });

    it('has custom render and label rendering', () => {
      expect(activitySendSignalShape.customRender).toBeDefined();
      expect(activitySendSignalShape.customLabelRendering).toBe(true);
    });

    it('uses path hit test mode', () => {
      expect(activitySendSignalShape.hitTestMode).toBe('path');
    });
  });

  describe('Receive Signal Shape', () => {
    it('has correct metadata', () => {
      expect(activityReceiveSignalShape.type).toBe('activity-receive-signal');
      expect(activityReceiveSignalShape.metadata.name).toBe('Receive Signal');
      expect(activityReceiveSignalShape.metadata.supportsLabel).toBe(true);
      expect(activityReceiveSignalShape.metadata.defaultWidth).toBe(100);
      expect(activityReceiveSignalShape.metadata.defaultHeight).toBe(50);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('activity-receive-signal')).toBe(true);
    });

    it('has custom render and label rendering', () => {
      expect(activityReceiveSignalShape.customRender).toBeDefined();
      expect(activityReceiveSignalShape.customLabelRendering).toBe(true);
    });

    it('uses path hit test mode', () => {
      expect(activityReceiveSignalShape.hitTestMode).toBe('path');
    });
  });

  describe('Swimlane Shape', () => {
    it('has correct metadata', () => {
      expect(activitySwimlaneShape.type).toBe('activity-swimlane');
      expect(activitySwimlaneShape.metadata.name).toBe('Swimlane');
      expect(activitySwimlaneShape.metadata.supportsLabel).toBe(false);
      expect(activitySwimlaneShape.metadata.defaultWidth).toBe(400);
      expect(activitySwimlaneShape.metadata.defaultHeight).toBe(300);
    });

    it('handler is registered', () => {
      expect(shapeRegistry.hasHandler('activity-swimlane')).toBe(true);
    });

    it('uses bounds hit test mode', () => {
      expect(activitySwimlaneShape.hitTestMode).toBe('bounds');
    });

    it('has dynamic anchors function', () => {
      expect(activitySwimlaneShape.dynamicAnchors).toBeDefined();
    });

    it('dynamic anchors for horizontal swimlane include lane anchors', () => {
      const shape = createTestLibraryShape('activity-swimlane', {
        width: 400,
        height: 300,
        customProperties: {
          orientation: 'horizontal',
          laneHeaders: ['Lane 1', 'Lane 2', 'Lane 3'],
        },
      });
      const anchors = activitySwimlaneShape.dynamicAnchors!(shape, 400, 300);

      // Should have corner anchors + center + lane anchors
      expect(anchors.length).toBeGreaterThan(5);

      // Check for lane anchors (top and bottom for each lane)
      const laneTopAnchors = anchors.filter((a) => a.position.startsWith('lane-') && a.position.endsWith('-top'));
      const laneBottomAnchors = anchors.filter((a) => a.position.startsWith('lane-') && a.position.endsWith('-bottom'));
      expect(laneTopAnchors.length).toBe(3);
      expect(laneBottomAnchors.length).toBe(3);
    });

    it('dynamic anchors for vertical swimlane include lane anchors', () => {
      const shape = createTestLibraryShape('activity-swimlane', {
        width: 300,
        height: 400,
        customProperties: {
          orientation: 'vertical',
          laneHeaders: ['Lane A', 'Lane B'],
        },
      });
      const anchors = activitySwimlaneShape.dynamicAnchors!(shape, 300, 400);

      // Check for lane anchors (left and right for each lane)
      const laneLeftAnchors = anchors.filter((a) => a.position.startsWith('lane-') && a.position.endsWith('-left'));
      const laneRightAnchors = anchors.filter((a) => a.position.startsWith('lane-') && a.position.endsWith('-right'));
      expect(laneLeftAnchors.length).toBe(2);
      expect(laneRightAnchors.length).toBe(2);
    });

    it('has custom properties for swimlane configuration', () => {
      const properties = activitySwimlaneShape.metadata.properties;
      const customProps = properties.filter((p) => p.key.startsWith('customProperties.'));
      expect(customProps.length).toBeGreaterThanOrEqual(3);

      const orientationProp = customProps.find((p) => p.key === 'customProperties.orientation');
      expect(orientationProp).toBeDefined();
      expect(orientationProp?.type).toBe('select');
    });
  });

  describe('Shape Handler Integration', () => {
    it('all handlers can create shapes', () => {
      for (const definition of activityDiagramShapes) {
        const handler = shapeRegistry.getHandler(definition.type);
        const shape = handler.create(new Vec2(100, 50), `test-${definition.type}`);

        expect(shape.id).toBe(`test-${definition.type}`);
        expect(shape.type).toBe(definition.type);
        expect(shape.x).toBe(100);
        expect(shape.y).toBe(50);
      }
    });

    it('all handlers return valid bounds', () => {
      for (const definition of activityDiagramShapes) {
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
      for (const definition of activityDiagramShapes) {
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
      for (const definition of activityDiagramShapes) {
        const handler = shapeRegistry.getHandler(definition.type);
        expect(typeof handler.render).toBe('function');
      }
    });
  });

  describe('Custom Render Functions', () => {
    it('action custom render is defined', () => {
      expect(activityActionShape.customRender).toBeDefined();
    });

    it('initial node custom render is defined', () => {
      expect(activityInitialShape.customRender).toBeDefined();
    });

    it('final node custom render is defined', () => {
      expect(activityFinalShape.customRender).toBeDefined();
    });

    it('flow final custom render is defined', () => {
      expect(activityFlowFinalShape.customRender).toBeDefined();
    });

    it('fork/join custom render is defined', () => {
      expect(activityForkJoinShape.customRender).toBeDefined();
    });

    it('send signal custom render is defined', () => {
      expect(activitySendSignalShape.customRender).toBeDefined();
    });

    it('receive signal custom render is defined', () => {
      expect(activityReceiveSignalShape.customRender).toBeDefined();
    });

    it('swimlane custom render is defined', () => {
      expect(activitySwimlaneShape.customRender).toBeDefined();
    });

    it('decision custom render is defined', () => {
      expect(activityDecisionShape.customRender).toBeDefined();
    });

    it('merge custom render is defined', () => {
      expect(activityMergeShape.customRender).toBeDefined();
    });

    it('accept event custom render is defined', () => {
      expect(activityAcceptEventShape.customRender).toBeDefined();
    });

    it('time event custom render is defined', () => {
      expect(activityTimeEventShape.customRender).toBeDefined();
    });

    it('object node custom render is defined', () => {
      expect(activityObjectShape.customRender).toBeDefined();
    });

    it('data store custom render is defined', () => {
      expect(activityDataStoreShape.customRender).toBeDefined();
    });

    it('central buffer custom render is defined', () => {
      expect(activityCentralBufferShape.customRender).toBeDefined();
    });

    it('pin custom render is defined', () => {
      expect(activityPinShape.customRender).toBeDefined();
    });

    it('expansion region custom render is defined', () => {
      expect(activityExpansionRegionShape.customRender).toBeDefined();
    });

    it('interruptible region custom render is defined', () => {
      expect(activityInterruptibleRegionShape.customRender).toBeDefined();
    });

    it('activity parameter custom render is defined', () => {
      expect(activityParameterShape.customRender).toBeDefined();
    });
  });

  describe('New Shape Metadata', () => {
    it('decision node has correct metadata', () => {
      expect(activityDecisionShape.type).toBe('activity-decision');
      expect(activityDecisionShape.metadata.name).toBe('Decision');
      expect(activityDecisionShape.metadata.defaultWidth).toBe(40);
      expect(activityDecisionShape.metadata.defaultHeight).toBe(40);
      expect(activityDecisionShape.metadata.aspectRatioLocked).toBe(true);
    });

    it('merge node has correct metadata', () => {
      expect(activityMergeShape.type).toBe('activity-merge');
      expect(activityMergeShape.metadata.name).toBe('Merge');
      expect(activityMergeShape.metadata.aspectRatioLocked).toBe(true);
    });

    it('time event has correct metadata', () => {
      expect(activityTimeEventShape.type).toBe('activity-time-event');
      expect(activityTimeEventShape.metadata.name).toBe('Time Event');
    });

    it('object node has correct metadata', () => {
      expect(activityObjectShape.type).toBe('activity-object');
      expect(activityObjectShape.metadata.name).toBe('Object Node');
      expect(activityObjectShape.metadata.supportsLabel).toBe(true);
    });

    it('data store has correct metadata', () => {
      expect(activityDataStoreShape.type).toBe('activity-datastore');
      expect(activityDataStoreShape.metadata.name).toBe('Data Store');
    });

    it('central buffer has correct metadata', () => {
      expect(activityCentralBufferShape.type).toBe('activity-buffer');
      expect(activityCentralBufferShape.metadata.name).toBe('Central Buffer');
    });

    it('pin has correct metadata', () => {
      expect(activityPinShape.type).toBe('activity-pin');
      expect(activityPinShape.metadata.name).toBe('Pin');
      expect(activityPinShape.metadata.defaultWidth).toBe(16);
      expect(activityPinShape.metadata.defaultHeight).toBe(16);
      expect(activityPinShape.metadata.aspectRatioLocked).toBe(true);
    });

    it('expansion region has correct metadata', () => {
      expect(activityExpansionRegionShape.type).toBe('activity-expansion');
      expect(activityExpansionRegionShape.metadata.name).toBe('Expansion Region');
      expect(activityExpansionRegionShape.metadata.defaultWidth).toBe(200);
      expect(activityExpansionRegionShape.metadata.defaultHeight).toBe(150);
    });

    it('interruptible region has correct metadata', () => {
      expect(activityInterruptibleRegionShape.type).toBe('activity-interruptible');
      expect(activityInterruptibleRegionShape.metadata.name).toBe('Interruptible Region');
    });

    it('activity parameter has correct metadata', () => {
      expect(activityParameterShape.type).toBe('activity-parameter');
      expect(activityParameterShape.metadata.name).toBe('Activity Parameter');
      expect(activityParameterShape.metadata.supportsLabel).toBe(true);
    });
  });
});
