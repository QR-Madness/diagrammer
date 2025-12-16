import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialIndex, createSpatialIndex } from './SpatialIndex';
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
    visible: true,
    fill: '#4a90d9',
    stroke: '#2c5282',
    strokeWidth: 2,
    cornerRadius: 0,
    ...overrides,
  };
}

describe('SpatialIndex', () => {
  let index: SpatialIndex;

  beforeEach(() => {
    index = new SpatialIndex();
  });

  describe('rebuild', () => {
    it('indexes all shapes', () => {
      const shapes = [
        createTestRect({ id: 'rect1', x: 0, y: 0 }),
        createTestRect({ id: 'rect2', x: 200, y: 0 }),
        createTestRect({ id: 'rect3', x: 0, y: 200 }),
      ];

      index.rebuild(shapes);

      expect(index.size).toBe(3);
      expect(index.has('rect1')).toBe(true);
      expect(index.has('rect2')).toBe(true);
      expect(index.has('rect3')).toBe(true);
    });

    it('clears previous index on rebuild', () => {
      index.rebuild([createTestRect({ id: 'rect1' })]);
      index.rebuild([createTestRect({ id: 'rect2' })]);

      expect(index.size).toBe(1);
      expect(index.has('rect1')).toBe(false);
      expect(index.has('rect2')).toBe(true);
    });

    it('handles empty array', () => {
      index.rebuild([]);
      expect(index.size).toBe(0);
    });
  });

  describe('insert', () => {
    it('adds shape to index', () => {
      const rect = createTestRect({ id: 'rect1' });
      index.insert(rect);

      expect(index.size).toBe(1);
      expect(index.has('rect1')).toBe(true);
    });

    it('replaces existing shape with same ID', () => {
      const rect1 = createTestRect({ id: 'rect1', x: 0 });
      const rect1Updated = createTestRect({ id: 'rect1', x: 500 });

      index.insert(rect1);
      index.insert(rect1Updated);

      expect(index.size).toBe(1);
      // Query should find at new position
      const results = index.queryPoint(new Vec2(500, 0));
      expect(results).toContain('rect1');
    });
  });

  describe('update', () => {
    it('updates shape bounds in index', () => {
      const rect = createTestRect({ id: 'rect1', x: 0, y: 0 });
      index.insert(rect);

      // Move shape
      const moved = { ...rect, x: 500, y: 500 };
      index.update(moved);

      // Should not be found at old position
      const oldResults = index.queryPoint(new Vec2(0, 0));
      expect(oldResults).not.toContain('rect1');

      // Should be found at new position
      const newResults = index.queryPoint(new Vec2(500, 500));
      expect(newResults).toContain('rect1');
    });

    it('handles shape not in index', () => {
      const rect = createTestRect({ id: 'rect1' });
      // Update without prior insert - should insert
      index.update(rect);

      expect(index.has('rect1')).toBe(true);
    });
  });

  describe('updateMany', () => {
    it('updates multiple shapes', () => {
      const shapes = [
        createTestRect({ id: 'rect1', x: 0, y: 0 }),
        createTestRect({ id: 'rect2', x: 0, y: 0 }),
      ];
      index.rebuild(shapes);

      const movedShapes = [
        { ...shapes[0]!, x: 300, y: 300 },
        { ...shapes[1]!, x: 600, y: 600 },
      ];
      index.updateMany(movedShapes);

      expect(index.queryPoint(new Vec2(300, 300))).toContain('rect1');
      expect(index.queryPoint(new Vec2(600, 600))).toContain('rect2');
    });
  });

  describe('remove', () => {
    it('removes shape from index', () => {
      const rect = createTestRect({ id: 'rect1' });
      index.insert(rect);
      index.remove('rect1');

      expect(index.size).toBe(0);
      expect(index.has('rect1')).toBe(false);
    });

    it('handles removing non-existent shape', () => {
      index.remove('nonexistent');
      expect(index.size).toBe(0);
    });
  });

  describe('removeMany', () => {
    it('removes multiple shapes', () => {
      const shapes = [
        createTestRect({ id: 'rect1' }),
        createTestRect({ id: 'rect2' }),
        createTestRect({ id: 'rect3' }),
      ];
      index.rebuild(shapes);

      index.removeMany(['rect1', 'rect3']);

      expect(index.size).toBe(1);
      expect(index.has('rect1')).toBe(false);
      expect(index.has('rect2')).toBe(true);
      expect(index.has('rect3')).toBe(false);
    });
  });

  describe('queryPoint', () => {
    beforeEach(() => {
      // Set up shapes at different positions
      // rect1: centered at (0, 0), bounds roughly -51 to 51 on x, -41 to 41 on y
      // rect2: centered at (200, 0), bounds roughly 149 to 251 on x
      // rect3: centered at (0, 200), bounds roughly -41 to 41 on y at 159 to 241
      index.rebuild([
        createTestRect({ id: 'rect1', x: 0, y: 0 }),
        createTestRect({ id: 'rect2', x: 200, y: 0 }),
        createTestRect({ id: 'rect3', x: 0, y: 200 }),
      ]);
    });

    it('finds shapes containing point', () => {
      const results = index.queryPoint(new Vec2(0, 0));
      expect(results).toContain('rect1');
      expect(results).not.toContain('rect2');
      expect(results).not.toContain('rect3');
    });

    it('finds shape at offset position', () => {
      const results = index.queryPoint(new Vec2(200, 0));
      expect(results).toContain('rect2');
      expect(results).not.toContain('rect1');
    });

    it('returns empty array for point outside all shapes', () => {
      const results = index.queryPoint(new Vec2(1000, 1000));
      expect(results).toEqual([]);
    });

    it('finds overlapping shapes', () => {
      // Add overlapping shape
      index.insert(createTestRect({ id: 'rect4', x: 0, y: 0 }));

      const results = index.queryPoint(new Vec2(0, 0));
      expect(results).toContain('rect1');
      expect(results).toContain('rect4');
    });
  });

  describe('queryRect', () => {
    beforeEach(() => {
      index.rebuild([
        createTestRect({ id: 'rect1', x: 0, y: 0 }),
        createTestRect({ id: 'rect2', x: 200, y: 0 }),
        createTestRect({ id: 'rect3', x: 0, y: 200 }),
        createTestRect({ id: 'rect4', x: 200, y: 200 }),
      ]);
    });

    it('finds shapes intersecting rectangle', () => {
      // Query top-left quadrant
      const results = index.queryRect(new Box(-100, -100, 100, 100));

      expect(results).toContain('rect1');
      expect(results).not.toContain('rect2');
      expect(results).not.toContain('rect3');
      expect(results).not.toContain('rect4');
    });

    it('finds multiple intersecting shapes', () => {
      // Query entire area
      const results = index.queryRect(new Box(-100, -100, 300, 300));

      expect(results).toContain('rect1');
      expect(results).toContain('rect2');
      expect(results).toContain('rect3');
      expect(results).toContain('rect4');
    });

    it('finds shapes partially intersecting', () => {
      // Query that partially overlaps rect1
      const results = index.queryRect(new Box(40, -100, 300, 100));

      expect(results).toContain('rect1'); // Partial overlap
      expect(results).toContain('rect2');
    });

    it('returns empty for non-intersecting rectangle', () => {
      const results = index.queryRect(new Box(1000, 1000, 2000, 2000));
      expect(results).toEqual([]);
    });
  });

  describe('getAllIds', () => {
    it('returns all indexed shape IDs', () => {
      index.rebuild([
        createTestRect({ id: 'rect1' }),
        createTestRect({ id: 'rect2' }),
      ]);

      const ids = index.getAllIds();
      expect(ids).toContain('rect1');
      expect(ids).toContain('rect2');
      expect(ids.length).toBe(2);
    });

    it('returns empty array for empty index', () => {
      expect(index.getAllIds()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('removes all shapes from index', () => {
      index.rebuild([
        createTestRect({ id: 'rect1' }),
        createTestRect({ id: 'rect2' }),
      ]);

      index.clear();

      expect(index.size).toBe(0);
      expect(index.getAllIds()).toEqual([]);
    });
  });

  describe('createSpatialIndex factory', () => {
    it('creates and populates index', () => {
      const shapes = [
        createTestRect({ id: 'rect1' }),
        createTestRect({ id: 'rect2' }),
      ];

      const newIndex = createSpatialIndex(shapes);

      expect(newIndex.size).toBe(2);
      expect(newIndex.has('rect1')).toBe(true);
      expect(newIndex.has('rect2')).toBe(true);
    });
  });

  describe('performance characteristics', () => {
    it('handles large number of shapes', () => {
      // Create 1000 shapes in a grid
      const shapes: RectangleShape[] = [];
      for (let i = 0; i < 1000; i++) {
        shapes.push(
          createTestRect({
            id: `rect${i}`,
            x: (i % 32) * 150,
            y: Math.floor(i / 32) * 150,
          })
        );
      }

      const start = performance.now();
      index.rebuild(shapes);
      const rebuildTime = performance.now() - start;

      expect(index.size).toBe(1000);
      expect(rebuildTime).toBeLessThan(100); // Should be fast

      // Query should be fast
      const queryStart = performance.now();
      const results = index.queryPoint(new Vec2(0, 0));
      const queryTime = performance.now() - queryStart;

      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(10); // Sub-millisecond
    });
  });
});
