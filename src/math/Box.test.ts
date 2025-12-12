import { describe, it, expect } from 'vitest';
import { Box } from './Box';
import { Vec2 } from './Vec2';

describe('Box', () => {
  describe('constructor', () => {
    it('creates box with given bounds', () => {
      const box = new Box(1, 2, 3, 4);
      expect(box.minX).toBe(1);
      expect(box.minY).toBe(2);
      expect(box.maxX).toBe(3);
      expect(box.maxY).toBe(4);
    });

    it('normalizes inverted bounds', () => {
      const box = new Box(3, 4, 1, 2);
      expect(box.minX).toBe(1);
      expect(box.minY).toBe(2);
      expect(box.maxX).toBe(3);
      expect(box.maxY).toBe(4);
    });
  });

  describe('computed properties', () => {
    it('width returns correct value', () => {
      const box = new Box(0, 0, 10, 5);
      expect(box.width).toBe(10);
    });

    it('height returns correct value', () => {
      const box = new Box(0, 0, 10, 5);
      expect(box.height).toBe(5);
    });

    it('center returns correct values', () => {
      const box = new Box(0, 0, 10, 20);
      expect(box.centerX).toBe(5);
      expect(box.centerY).toBe(10);
      expect(box.center.x).toBe(5);
      expect(box.center.y).toBe(10);
    });

    it('corner accessors return correct points', () => {
      const box = new Box(0, 0, 10, 20);
      expect(box.topLeft.toObject()).toEqual({ x: 0, y: 0 });
      expect(box.topRight.toObject()).toEqual({ x: 10, y: 0 });
      expect(box.bottomLeft.toObject()).toEqual({ x: 0, y: 20 });
      expect(box.bottomRight.toObject()).toEqual({ x: 10, y: 20 });
    });

    it('area returns correct value', () => {
      const box = new Box(0, 0, 10, 5);
      expect(box.area).toBe(50);
    });

    it('perimeter returns correct value', () => {
      const box = new Box(0, 0, 10, 5);
      expect(box.perimeter).toBe(30);
    });

    it('isEmpty detects zero-area boxes', () => {
      expect(new Box(0, 0, 10, 0).isEmpty).toBe(true);
      expect(new Box(0, 0, 0, 10).isEmpty).toBe(true);
      expect(new Box(5, 5, 5, 5).isEmpty).toBe(true);
      expect(new Box(0, 0, 10, 10).isEmpty).toBe(false);
    });
  });

  describe('static factory methods', () => {
    it('fromPoints creates box from two corners', () => {
      const box = Box.fromPoints(new Vec2(1, 2), new Vec2(3, 4));
      expect(box.minX).toBe(1);
      expect(box.minY).toBe(2);
      expect(box.maxX).toBe(3);
      expect(box.maxY).toBe(4);
    });

    it('fromPoints handles reversed points', () => {
      const box = Box.fromPoints(new Vec2(3, 4), new Vec2(1, 2));
      expect(box.minX).toBe(1);
      expect(box.minY).toBe(2);
      expect(box.maxX).toBe(3);
      expect(box.maxY).toBe(4);
    });

    it('fromPointArray creates bounding box of all points', () => {
      const points = [
        new Vec2(5, 10),
        new Vec2(1, 2),
        new Vec2(8, 3),
        new Vec2(4, 15),
      ];
      const box = Box.fromPointArray(points);
      expect(box.minX).toBe(1);
      expect(box.minY).toBe(2);
      expect(box.maxX).toBe(8);
      expect(box.maxY).toBe(15);
    });

    it('fromPointArray handles empty array', () => {
      const box = Box.fromPointArray([]);
      expect(box.isEmpty).toBe(true);
    });

    it('fromCenter creates box centered on point', () => {
      const box = Box.fromCenter(new Vec2(10, 10), 20, 10);
      expect(box.minX).toBe(0);
      expect(box.minY).toBe(5);
      expect(box.maxX).toBe(20);
      expect(box.maxY).toBe(15);
    });

    it('fromCenterExtents creates box from half-dimensions', () => {
      const box = Box.fromCenterExtents(new Vec2(10, 10), 5, 3);
      expect(box.minX).toBe(5);
      expect(box.minY).toBe(7);
      expect(box.maxX).toBe(15);
      expect(box.maxY).toBe(13);
    });

    it('fromPositionSize creates box from top-left and size', () => {
      const box = Box.fromPositionSize(new Vec2(5, 10), 20, 15);
      expect(box.minX).toBe(5);
      expect(box.minY).toBe(10);
      expect(box.maxX).toBe(25);
      expect(box.maxY).toBe(25);
    });

    it('empty creates zero-area box at origin', () => {
      const box = Box.empty();
      expect(box.minX).toBe(0);
      expect(box.minY).toBe(0);
      expect(box.maxX).toBe(0);
      expect(box.maxY).toBe(0);
    });

    it('infinite creates infinitely large box', () => {
      const box = Box.infinite();
      expect(box.minX).toBe(-Infinity);
      expect(box.minY).toBe(-Infinity);
      expect(box.maxX).toBe(Infinity);
      expect(box.maxY).toBe(Infinity);
    });
  });

  describe('containsPoint', () => {
    const box = new Box(0, 0, 10, 10);

    it('returns true for point inside', () => {
      expect(box.containsPoint(new Vec2(5, 5))).toBe(true);
    });

    it('returns true for point on boundary', () => {
      expect(box.containsPoint(new Vec2(0, 0))).toBe(true);
      expect(box.containsPoint(new Vec2(10, 10))).toBe(true);
      expect(box.containsPoint(new Vec2(5, 0))).toBe(true);
    });

    it('returns false for point outside', () => {
      expect(box.containsPoint(new Vec2(-1, 5))).toBe(false);
      expect(box.containsPoint(new Vec2(11, 5))).toBe(false);
      expect(box.containsPoint(new Vec2(5, -1))).toBe(false);
      expect(box.containsPoint(new Vec2(5, 11))).toBe(false);
    });
  });

  describe('containsPointStrict', () => {
    const box = new Box(0, 0, 10, 10);

    it('returns true for point strictly inside', () => {
      expect(box.containsPointStrict(new Vec2(5, 5))).toBe(true);
    });

    it('returns false for point on boundary', () => {
      expect(box.containsPointStrict(new Vec2(0, 0))).toBe(false);
      expect(box.containsPointStrict(new Vec2(10, 5))).toBe(false);
    });
  });

  describe('containsBox', () => {
    const outer = new Box(0, 0, 20, 20);

    it('returns true when fully contains', () => {
      expect(outer.containsBox(new Box(5, 5, 15, 15))).toBe(true);
    });

    it('returns true for same box', () => {
      expect(outer.containsBox(outer)).toBe(true);
    });

    it('returns false when partially overlapping', () => {
      expect(outer.containsBox(new Box(15, 15, 25, 25))).toBe(false);
    });

    it('returns false when not overlapping', () => {
      expect(outer.containsBox(new Box(30, 30, 40, 40))).toBe(false);
    });
  });

  describe('intersects', () => {
    const box = new Box(0, 0, 10, 10);

    it('returns true for overlapping boxes', () => {
      expect(box.intersects(new Box(5, 5, 15, 15))).toBe(true);
    });

    it('returns true for touching edges', () => {
      expect(box.intersects(new Box(10, 0, 20, 10))).toBe(true);
    });

    it('returns true for same box', () => {
      expect(box.intersects(box)).toBe(true);
    });

    it('returns true for contained box', () => {
      expect(box.intersects(new Box(2, 2, 8, 8))).toBe(true);
    });

    it('returns false for non-overlapping boxes', () => {
      expect(box.intersects(new Box(20, 20, 30, 30))).toBe(false);
    });
  });

  describe('intersectsStrict', () => {
    const box = new Box(0, 0, 10, 10);

    it('returns true for overlapping boxes', () => {
      expect(box.intersectsStrict(new Box(5, 5, 15, 15))).toBe(true);
    });

    it('returns false for touching edges', () => {
      expect(box.intersectsStrict(new Box(10, 0, 20, 10))).toBe(false);
    });
  });

  describe('union', () => {
    it('returns box containing both boxes', () => {
      const a = new Box(0, 0, 10, 10);
      const b = new Box(5, 5, 20, 20);
      const result = a.union(b);
      expect(result.minX).toBe(0);
      expect(result.minY).toBe(0);
      expect(result.maxX).toBe(20);
      expect(result.maxY).toBe(20);
    });

    it('union with self returns same box', () => {
      const box = new Box(0, 0, 10, 10);
      const result = box.union(box);
      expect(result.equals(box)).toBe(true);
    });
  });

  describe('intersection', () => {
    it('returns overlapping region', () => {
      const a = new Box(0, 0, 10, 10);
      const b = new Box(5, 5, 15, 15);
      const result = a.intersection(b);
      expect(result.minX).toBe(5);
      expect(result.minY).toBe(5);
      expect(result.maxX).toBe(10);
      expect(result.maxY).toBe(10);
    });

    it('returns empty box when no overlap', () => {
      const a = new Box(0, 0, 10, 10);
      const b = new Box(20, 20, 30, 30);
      const result = a.intersection(b);
      expect(result.isEmpty).toBe(true);
    });

    it('intersection with self returns same box', () => {
      const box = new Box(0, 0, 10, 10);
      const result = box.intersection(box);
      expect(result.equals(box)).toBe(true);
    });
  });

  describe('expandToInclude', () => {
    it('expands to include point outside', () => {
      const box = new Box(0, 0, 10, 10);
      const result = box.expandToInclude(new Vec2(15, 20));
      expect(result.maxX).toBe(15);
      expect(result.maxY).toBe(20);
    });

    it('remains unchanged for point inside', () => {
      const box = new Box(0, 0, 10, 10);
      const result = box.expandToInclude(new Vec2(5, 5));
      expect(result.equals(box)).toBe(true);
    });
  });

  describe('expand and shrink', () => {
    it('expand adds margin', () => {
      const box = new Box(10, 10, 20, 20);
      const result = box.expand(5);
      expect(result.minX).toBe(5);
      expect(result.minY).toBe(5);
      expect(result.maxX).toBe(25);
      expect(result.maxY).toBe(25);
    });

    it('expandXY adds different margins', () => {
      const box = new Box(10, 10, 20, 20);
      const result = box.expandXY(2, 3);
      expect(result.minX).toBe(8);
      expect(result.minY).toBe(7);
      expect(result.maxX).toBe(22);
      expect(result.maxY).toBe(23);
    });

    it('shrink reduces margin', () => {
      const box = new Box(0, 0, 20, 20);
      const result = box.shrink(5);
      expect(result.minX).toBe(5);
      expect(result.minY).toBe(5);
      expect(result.maxX).toBe(15);
      expect(result.maxY).toBe(15);
    });
  });

  describe('translate', () => {
    it('moves box by offset', () => {
      const box = new Box(0, 0, 10, 10);
      const result = box.translate(new Vec2(5, 10));
      expect(result.minX).toBe(5);
      expect(result.minY).toBe(10);
      expect(result.maxX).toBe(15);
      expect(result.maxY).toBe(20);
    });
  });

  describe('scaleFromCenter', () => {
    it('scales box maintaining center', () => {
      const box = new Box(0, 0, 10, 10);
      const result = box.scaleFromCenter(2);
      expect(result.centerX).toBe(5);
      expect(result.centerY).toBe(5);
      expect(result.width).toBe(20);
      expect(result.height).toBe(20);
    });
  });

  describe('clampPoint', () => {
    const box = new Box(0, 0, 10, 10);

    it('returns same point if inside', () => {
      const p = new Vec2(5, 5);
      const result = box.clampPoint(p);
      expect(result.equals(p)).toBe(true);
    });

    it('clamps point outside to boundary', () => {
      expect(box.clampPoint(new Vec2(-5, 5)).toObject()).toEqual({ x: 0, y: 5 });
      expect(box.clampPoint(new Vec2(15, 5)).toObject()).toEqual({ x: 10, y: 5 });
      expect(box.clampPoint(new Vec2(5, -5)).toObject()).toEqual({ x: 5, y: 0 });
      expect(box.clampPoint(new Vec2(5, 15)).toObject()).toEqual({ x: 5, y: 10 });
    });
  });

  describe('distanceToPoint', () => {
    const box = new Box(0, 0, 10, 10);

    it('returns 0 for point inside', () => {
      expect(box.distanceToPoint(new Vec2(5, 5))).toBe(0);
    });

    it('returns distance to nearest edge for point outside', () => {
      expect(box.distanceToPoint(new Vec2(15, 5))).toBe(5);
      expect(box.distanceToPoint(new Vec2(-3, 5))).toBe(3);
    });

    it('returns diagonal distance for corner point', () => {
      const distance = box.distanceToPoint(new Vec2(13, 14));
      expect(distance).toBeCloseTo(5); // sqrt(3^2 + 4^2) = 5
    });
  });

  describe('getCorners', () => {
    it('returns all four corners', () => {
      const box = new Box(0, 0, 10, 20);
      const corners = box.getCorners();
      expect(corners).toHaveLength(4);
      expect(corners[0].toObject()).toEqual({ x: 0, y: 0 }); // topLeft
      expect(corners[1].toObject()).toEqual({ x: 10, y: 0 }); // topRight
      expect(corners[2].toObject()).toEqual({ x: 10, y: 20 }); // bottomRight
      expect(corners[3].toObject()).toEqual({ x: 0, y: 20 }); // bottomLeft
    });
  });

  describe('utility methods', () => {
    it('equals compares boxes within tolerance', () => {
      const a = new Box(0, 0, 10, 10);
      const b = new Box(0, 0, 10, 10);
      const c = new Box(0, 0, 10.00000000001, 10); // Within 1e-10 tolerance
      const d = new Box(0, 0, 10.1, 10);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(true);
      expect(a.equals(d)).toBe(false);
    });

    it('clone creates copy', () => {
      const box = new Box(1, 2, 3, 4);
      const clone = box.clone();
      expect(clone.equals(box)).toBe(true);
      expect(clone).not.toBe(box);
    });

    it('toArray returns bounds as array', () => {
      const box = new Box(1, 2, 3, 4);
      expect(box.toArray()).toEqual([1, 2, 3, 4]);
    });

    it('toRBush returns object compatible with RBush', () => {
      const box = new Box(1, 2, 3, 4);
      expect(box.toRBush()).toEqual({
        minX: 1,
        minY: 2,
        maxX: 3,
        maxY: 4,
      });
    });

    it('toString returns readable string', () => {
      const box = new Box(1, 2, 3, 4);
      expect(box.toString()).toBe('Box(1, 2, 3, 4)');
    });
  });
});
