import { describe, it, expect } from 'vitest';
import { Vec2 } from '../../math/Vec2';
import { Box } from '../../math/Box';
import { RectangleShape } from '../Shape';
import {
  calculateBounds,
  calculateCombinedBounds,
  transformBounds,
  expandBounds,
  findShapeAtPoint,
  findShapesInRect,
} from './bounds';

// Import Rectangle handler to register it
import '../Rectangle';

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

describe('Bounds Utilities', () => {
  describe('calculateBounds', () => {
    it('calculates bounds for unrotated rectangle', () => {
      const rect = createTestRect();
      const bounds = calculateBounds(rect);

      // Rectangle centered at origin, 100x80, with stroke width 2
      expect(bounds.minX).toBeCloseTo(-51);
      expect(bounds.minY).toBeCloseTo(-41);
      expect(bounds.maxX).toBeCloseTo(51);
      expect(bounds.maxY).toBeCloseTo(41);
    });

    it('calculates bounds for offset rectangle', () => {
      const rect = createTestRect({ x: 100, y: 50 });
      const bounds = calculateBounds(rect);

      expect(bounds.minX).toBeCloseTo(49);
      expect(bounds.minY).toBeCloseTo(9);
      expect(bounds.maxX).toBeCloseTo(151);
      expect(bounds.maxY).toBeCloseTo(91);
    });

    it('calculates bounds for rotated rectangle', () => {
      const rect = createTestRect({ width: 100, height: 100, rotation: Math.PI / 4 });
      const bounds = calculateBounds(rect);

      // 45-degree rotation of 100x100 square expands to ~141.4
      const expected = 70.71 + 1; // half diagonal + half stroke
      expect(bounds.minX).toBeCloseTo(-expected, 0);
      expect(bounds.maxX).toBeCloseTo(expected, 0);
    });
  });

  describe('calculateCombinedBounds', () => {
    it('returns null for empty array', () => {
      const bounds = calculateCombinedBounds([]);
      expect(bounds).toBeNull();
    });

    it('returns bounds of single shape', () => {
      const rect = createTestRect();
      const bounds = calculateCombinedBounds([rect]);

      expect(bounds).not.toBeNull();
      expect(bounds!.minX).toBeCloseTo(-51);
      expect(bounds!.maxX).toBeCloseTo(51);
    });

    it('combines bounds of multiple shapes', () => {
      const rect1 = createTestRect({ id: 'rect1', x: -100, y: 0 });
      const rect2 = createTestRect({ id: 'rect2', x: 100, y: 0 });
      const bounds = calculateCombinedBounds([rect1, rect2]);

      expect(bounds).not.toBeNull();
      // rect1: -100 center, width 100, so -151 to -49
      // rect2: 100 center, width 100, so 49 to 151
      expect(bounds!.minX).toBeCloseTo(-151);
      expect(bounds!.maxX).toBeCloseTo(151);
    });

    it('combines vertical spread', () => {
      const rect1 = createTestRect({ id: 'rect1', y: -100 });
      const rect2 = createTestRect({ id: 'rect2', y: 100 });
      const bounds = calculateCombinedBounds([rect1, rect2]);

      expect(bounds).not.toBeNull();
      // Each rect is 80 tall, so extends 40 from center + 1 for stroke
      expect(bounds!.minY).toBeCloseTo(-141);
      expect(bounds!.maxY).toBeCloseTo(141);
    });
  });

  describe('transformBounds', () => {
    it('returns same bounds for zero rotation', () => {
      const bounds = new Box(-50, -40, 50, 40);
      const transformed = transformBounds(bounds, 0);

      expect(transformed.minX).toBe(-50);
      expect(transformed.minY).toBe(-40);
      expect(transformed.maxX).toBe(50);
      expect(transformed.maxY).toBe(40);
    });

    it('expands bounds for 45-degree rotation', () => {
      const bounds = new Box(-50, -50, 50, 50);
      const transformed = transformBounds(bounds, Math.PI / 4);

      // 100x100 square rotated 45 degrees has diagonal ~141.4
      const expected = 70.71;
      expect(transformed.minX).toBeCloseTo(-expected, 0);
      expect(transformed.maxX).toBeCloseTo(expected, 0);
    });

    it('rotates around custom center', () => {
      const bounds = new Box(0, 0, 100, 100);
      const center = new Vec2(50, 50);
      const transformed = transformBounds(bounds, Math.PI / 2, center);

      // 90-degree rotation around center should give same AABB
      expect(transformed.minX).toBeCloseTo(0);
      expect(transformed.minY).toBeCloseTo(0);
      expect(transformed.maxX).toBeCloseTo(100);
      expect(transformed.maxY).toBeCloseTo(100);
    });

    it('rotates around origin', () => {
      const bounds = new Box(100, 0, 200, 50);
      const center = new Vec2(0, 0);
      const transformed = transformBounds(bounds, Math.PI / 2, center);

      // Rotate 90 degrees CCW around origin
      // (100, 0) -> (0, 100), (200, 50) -> (-50, 200)
      expect(transformed.minX).toBeCloseTo(-50, 0);
      expect(transformed.minY).toBeCloseTo(100, 0);
      expect(transformed.maxX).toBeCloseTo(0, 0);
      expect(transformed.maxY).toBeCloseTo(200, 0);
    });
  });

  describe('expandBounds', () => {
    it('expands bounds by padding', () => {
      const bounds = new Box(-50, -40, 50, 40);
      const expanded = expandBounds(bounds, 10);

      expect(expanded.minX).toBe(-60);
      expect(expanded.minY).toBe(-50);
      expect(expanded.maxX).toBe(60);
      expect(expanded.maxY).toBe(50);
    });

    it('handles zero padding', () => {
      const bounds = new Box(-50, -40, 50, 40);
      const expanded = expandBounds(bounds, 0);

      expect(expanded.minX).toBe(-50);
      expect(expanded.maxX).toBe(50);
    });

    it('handles negative padding (shrink)', () => {
      const bounds = new Box(-50, -40, 50, 40);
      const shrunk = expandBounds(bounds, -10);

      expect(shrunk.minX).toBe(-40);
      expect(shrunk.minY).toBe(-30);
      expect(shrunk.maxX).toBe(40);
      expect(shrunk.maxY).toBe(30);
    });
  });

  describe('findShapeAtPoint', () => {
    it('returns null for empty array', () => {
      const result = findShapeAtPoint([], new Vec2(0, 0));
      expect(result).toBeNull();
    });

    it('finds shape at point', () => {
      const rect = createTestRect();
      const result = findShapeAtPoint([rect], new Vec2(0, 0));
      expect(result).toBe(rect);
    });

    it('returns null if point is outside shapes', () => {
      const rect = createTestRect();
      const result = findShapeAtPoint([rect], new Vec2(200, 200));
      expect(result).toBeNull();
    });

    it('returns topmost (last) shape when overlapping', () => {
      const rect1 = createTestRect({ id: 'rect1' });
      const rect2 = createTestRect({ id: 'rect2' });
      const result = findShapeAtPoint([rect1, rect2], new Vec2(0, 0));
      expect(result).toBe(rect2);
    });

    it('finds correct shape in non-overlapping set', () => {
      const rect1 = createTestRect({ id: 'rect1', x: -200 });
      const rect2 = createTestRect({ id: 'rect2', x: 200 });

      expect(findShapeAtPoint([rect1, rect2], new Vec2(-200, 0))).toBe(rect1);
      expect(findShapeAtPoint([rect1, rect2], new Vec2(200, 0))).toBe(rect2);
      expect(findShapeAtPoint([rect1, rect2], new Vec2(0, 0))).toBeNull();
    });
  });

  describe('findShapesInRect', () => {
    it('returns empty array for empty shapes', () => {
      const result = findShapesInRect([], new Box(-100, -100, 100, 100));
      expect(result).toEqual([]);
    });

    it('finds shapes intersecting selection', () => {
      const rect = createTestRect();
      const selection = new Box(-100, -100, 100, 100);
      const result = findShapesInRect([rect], selection);
      expect(result).toContain(rect);
    });

    it('excludes shapes outside selection', () => {
      const rect = createTestRect({ x: 500, y: 500 });
      const selection = new Box(-100, -100, 100, 100);
      const result = findShapesInRect([rect], selection);
      expect(result).toEqual([]);
    });

    it('includes partially overlapping shapes', () => {
      const rect = createTestRect({ x: 80 }); // Edge overlaps
      const selection = new Box(-100, -100, 50, 100);
      const result = findShapesInRect([rect], selection);
      expect(result).toContain(rect);
    });

    it('finds multiple shapes', () => {
      const rect1 = createTestRect({ id: 'rect1', x: -50 });
      const rect2 = createTestRect({ id: 'rect2', x: 50 });
      const rect3 = createTestRect({ id: 'rect3', x: 500 });
      const selection = new Box(-200, -200, 200, 200);
      const result = findShapesInRect([rect1, rect2, rect3], selection);

      expect(result).toContain(rect1);
      expect(result).toContain(rect2);
      expect(result).not.toContain(rect3);
    });
  });
});
