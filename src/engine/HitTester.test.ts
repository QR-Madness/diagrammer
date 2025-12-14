import { describe, it, expect, beforeEach } from 'vitest';
import { HitTester, createHitTester } from './HitTester';
import { SpatialIndex } from './SpatialIndex';
import { Vec2 } from '../math/Vec2';
import { Box } from '../math/Box';
import { RectangleShape } from '../shapes/Shape';

// Import Rectangle handler to register it
import '../shapes/Rectangle';

/**
 * Create a test rectangle with default properties.
 */
function createTestRect(overrides: Partial<RectangleShape> = {}): RectangleShape {
  return {
    id: 'test-rect',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    rotation: 0,
    opacity: 1,
    locked: false,
    fill: '#4a90d9',
    stroke: '#2c5282',
    strokeWidth: 2,
    cornerRadius: 0,
    ...overrides,
  };
}

describe('HitTester', () => {
  let hitTester: HitTester;
  let spatialIndex: SpatialIndex;
  let shapes: { rect1: RectangleShape; rect2: RectangleShape; rect3: RectangleShape; [key: string]: RectangleShape };
  let shapeOrder: string[];

  beforeEach(() => {
    // Set up test shapes
    shapes = {
      rect1: createTestRect({ id: 'rect1', x: 0, y: 0 }),
      rect2: createTestRect({ id: 'rect2', x: 200, y: 0 }),
      rect3: createTestRect({ id: 'rect3', x: 0, y: 200 }),
    };
    shapeOrder = ['rect1', 'rect2', 'rect3'];

    // Set up spatial index
    spatialIndex = new SpatialIndex();
    spatialIndex.rebuild(Object.values(shapes));

    hitTester = new HitTester(spatialIndex);
  });

  describe('hitTestPoint', () => {
    it('returns shape at point', () => {
      const result = hitTester.hitTestPoint(new Vec2(0, 0), shapes, shapeOrder);

      expect(result.shape).toBe(shapes.rect1);
      expect(result.id).toBe('rect1');
    });

    it('returns null when no shape at point', () => {
      const result = hitTester.hitTestPoint(new Vec2(1000, 1000), shapes, shapeOrder);

      expect(result.shape).toBeNull();
      expect(result.id).toBeNull();
    });

    it('returns topmost shape when overlapping', () => {
      // Add overlapping shape on top
      const rect4 = createTestRect({ id: 'rect4', x: 0, y: 0 });
      shapes['rect4'] = rect4;
      shapeOrder.push('rect4');
      spatialIndex.insert(rect4);

      const result = hitTester.hitTestPoint(new Vec2(0, 0), shapes, shapeOrder);

      expect(result.id).toBe('rect4'); // Top shape
    });

    it('respects z-order (tests from top to bottom)', () => {
      // rect1 is at bottom, rect3 would be on top if overlapping
      // Move rect3 to overlap with rect1
      shapes.rect3 = createTestRect({ id: 'rect3', x: 0, y: 0 });
      spatialIndex.update(shapes.rect3);

      const result = hitTester.hitTestPoint(new Vec2(0, 0), shapes, shapeOrder);

      expect(result.id).toBe('rect3'); // rect3 is later in shapeOrder
    });

    it('finds shape at offset position', () => {
      const result = hitTester.hitTestPoint(new Vec2(200, 0), shapes, shapeOrder);

      expect(result.id).toBe('rect2');
    });
  });

  describe('hitTestPointDirect', () => {
    it('works without spatial index', () => {
      const result = hitTester.hitTestPointDirect(new Vec2(0, 0), shapes, shapeOrder);

      expect(result.id).toBe('rect1');
    });

    it('returns topmost shape', () => {
      shapes['rect4'] = createTestRect({ id: 'rect4', x: 0, y: 0 });
      shapeOrder.push('rect4');

      const result = hitTester.hitTestPointDirect(new Vec2(0, 0), shapes, shapeOrder);

      expect(result.id).toBe('rect4');
    });
  });

  describe('hitTestRect', () => {
    it('finds shapes in rectangle', () => {
      const rect = new Box(-100, -100, 100, 100);
      const results = hitTester.hitTestRect(rect, shapes, shapeOrder);

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe('rect1');
    });

    it('finds multiple shapes in large rectangle', () => {
      const rect = new Box(-100, -100, 300, 300);
      const results = hitTester.hitTestRect(rect, shapes, shapeOrder);

      expect(results.length).toBe(3);
    });

    it('returns shapes in z-order', () => {
      const rect = new Box(-100, -100, 300, 300);
      const results = hitTester.hitTestRect(rect, shapes, shapeOrder);

      expect(results.map((s) => s.id)).toEqual(['rect1', 'rect2', 'rect3']);
    });

    it('returns empty array when no shapes in rectangle', () => {
      const rect = new Box(1000, 1000, 2000, 2000);
      const results = hitTester.hitTestRect(rect, shapes, shapeOrder);

      expect(results).toEqual([]);
    });

    it('finds partially overlapping shapes', () => {
      // Query that partially overlaps rect1
      const rect = new Box(40, -100, 300, 100);
      const results = hitTester.hitTestRect(rect, shapes, shapeOrder);

      expect(results.map((s) => s.id)).toContain('rect1');
      expect(results.map((s) => s.id)).toContain('rect2');
    });
  });

  describe('hitTestRectIds', () => {
    it('returns IDs of shapes in rectangle', () => {
      const rect = new Box(-100, -100, 300, 300);
      const ids = hitTester.hitTestRectIds(rect, shapes, shapeOrder);

      expect(ids).toEqual(['rect1', 'rect2', 'rect3']);
    });
  });

  describe('hitTestHandles', () => {
    it('returns handle at point', () => {
      const shapesArray = [shapes.rect1!];
      // rect1 top-left handle is at (-50, -40)
      const result = hitTester.hitTestHandles(new Vec2(-50, -40), shapesArray, 10);

      expect(result.handle).not.toBeNull();
      expect(result.handle!.type).toBe('top-left');
      expect(result.shapeId).toBe('rect1');
    });

    it('returns null when no handle at point', () => {
      const shapesArray = [shapes.rect1!];
      const result = hitTester.hitTestHandles(new Vec2(1000, 1000), shapesArray, 10);

      expect(result.handle).toBeNull();
      expect(result.shape).toBeNull();
    });

    it('uses handle size for hit area', () => {
      const shapesArray = [shapes.rect1!];
      // Point slightly off from handle center (-50, -40)
      const result = hitTester.hitTestHandles(new Vec2(-48, -38), shapesArray, 10);

      expect(result.handle).not.toBeNull();
    });

    it('misses handle when outside hit area', () => {
      const shapesArray = [shapes.rect1!];
      // Point too far from handle center
      const result = hitTester.hitTestHandles(new Vec2(-40, -30), shapesArray, 10);

      expect(result.handle).toBeNull();
    });

    it('returns topmost shape handle when overlapping', () => {
      // Two shapes at same position
      const rect4 = createTestRect({ id: 'rect4', x: 0, y: 0 });
      const shapesArray = [shapes.rect1!, rect4];

      const result = hitTester.hitTestHandles(new Vec2(-50, -40), shapesArray, 10);

      expect(result.shapeId).toBe('rect4'); // Last in array = topmost
    });

    it('finds different handle types', () => {
      const shapesArray = [shapes.rect1!];

      // Top handle at (0, -40)
      const topResult = hitTester.hitTestHandles(new Vec2(0, -40), shapesArray, 10);
      expect(topResult.handle!.type).toBe('top');

      // Right handle at (50, 0)
      const rightResult = hitTester.hitTestHandles(new Vec2(50, 0), shapesArray, 10);
      expect(rightResult.handle!.type).toBe('right');

      // Bottom-right handle at (50, 40)
      const brResult = hitTester.hitTestHandles(new Vec2(50, 40), shapesArray, 10);
      expect(brResult.handle!.type).toBe('bottom-right');
    });
  });

  describe('getHandlesForShapes', () => {
    it('returns handles for all shapes', () => {
      const shapesArray = [shapes.rect1!, shapes.rect2!];
      const handles = hitTester.getHandlesForShapes(shapesArray);

      // Each rectangle has 9 handles (8 resize + 1 rotation)
      expect(handles.length).toBe(18);
    });

    it('includes shapeId with each handle', () => {
      const shapesArray = [shapes.rect1!];
      const handles = hitTester.getHandlesForShapes(shapesArray);

      for (const handle of handles) {
        expect(handle.shapeId).toBe('rect1');
      }
    });

    it('returns empty array for empty input', () => {
      const handles = hitTester.getHandlesForShapes([]);
      expect(handles).toEqual([]);
    });
  });

  describe('setSpatialIndex', () => {
    it('updates spatial index reference', () => {
      // Create new index with only rect2
      const newIndex = new SpatialIndex();
      newIndex.rebuild([shapes.rect2!]);

      hitTester.setSpatialIndex(newIndex);

      // rect1 should no longer be found (not in new index)
      const result = hitTester.hitTestPoint(new Vec2(0, 0), shapes, shapeOrder);
      expect(result.id).toBeNull();

      // rect2 should still be found
      const result2 = hitTester.hitTestPoint(new Vec2(200, 0), shapes, shapeOrder);
      expect(result2.id).toBe('rect2');
    });
  });

  describe('createHitTester factory', () => {
    it('creates hit tester with populated index', () => {
      const shapesArray = Object.values(shapes);
      const tester = createHitTester(shapesArray);

      const result = tester.hitTestPoint(new Vec2(0, 0), shapes, shapeOrder);
      expect(result.id).toBe('rect1');
    });
  });
});
