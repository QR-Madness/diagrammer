import { describe, it, expect } from 'vitest';
import { Vec2 } from './Vec2';

describe('Vec2', () => {
  describe('constructor and properties', () => {
    it('creates a vector with given x and y', () => {
      const v = new Vec2(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it('defaults to (0, 0)', () => {
      const v = new Vec2();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('static factory methods', () => {
    it('fromArray creates vector from array', () => {
      const v = Vec2.fromArray([5, 6]);
      expect(v.x).toBe(5);
      expect(v.y).toBe(6);
    });

    it('fromObject creates vector from object', () => {
      const v = Vec2.fromObject({ x: 7, y: 8 });
      expect(v.x).toBe(7);
      expect(v.y).toBe(8);
    });

    it('zero creates (0, 0)', () => {
      const v = Vec2.zero();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('unitX creates (1, 0)', () => {
      const v = Vec2.unitX();
      expect(v.x).toBe(1);
      expect(v.y).toBe(0);
    });

    it('unitY creates (0, 1)', () => {
      const v = Vec2.unitY();
      expect(v.x).toBe(0);
      expect(v.y).toBe(1);
    });
  });

  describe('static arithmetic operations', () => {
    it('add combines two vectors', () => {
      const result = Vec2.add(new Vec2(1, 2), new Vec2(3, 4));
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('subtract removes second from first', () => {
      const result = Vec2.subtract(new Vec2(5, 7), new Vec2(2, 3));
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('multiply scales vector by scalar', () => {
      const result = Vec2.multiply(new Vec2(3, 4), 2);
      expect(result.x).toBe(6);
      expect(result.y).toBe(8);
    });

    it('divide divides vector by scalar', () => {
      const result = Vec2.divide(new Vec2(6, 8), 2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('divide throws on zero', () => {
      expect(() => Vec2.divide(new Vec2(1, 1), 0)).toThrow('Cannot divide by zero');
    });

    it('dot calculates dot product', () => {
      const result = Vec2.dot(new Vec2(1, 2), new Vec2(3, 4));
      expect(result).toBe(11); // 1*3 + 2*4 = 11
    });

    it('cross calculates 2D cross product', () => {
      const result = Vec2.cross(new Vec2(1, 0), new Vec2(0, 1));
      expect(result).toBe(1); // counter-clockwise
    });

    it('cross returns negative for clockwise', () => {
      const result = Vec2.cross(new Vec2(0, 1), new Vec2(1, 0));
      expect(result).toBe(-1);
    });

    it('negate inverts vector', () => {
      const result = Vec2.negate(new Vec2(3, -4));
      expect(result.x).toBe(-3);
      expect(result.y).toBe(4);
    });

    it('distance calculates euclidean distance', () => {
      const result = Vec2.distance(new Vec2(0, 0), new Vec2(3, 4));
      expect(result).toBe(5);
    });

    it('distanceSquared calculates squared distance', () => {
      const result = Vec2.distanceSquared(new Vec2(0, 0), new Vec2(3, 4));
      expect(result).toBe(25);
    });

    it('lerp interpolates between vectors', () => {
      const result = Vec2.lerp(new Vec2(0, 0), new Vec2(10, 20), 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it('lerp at t=0 returns first vector', () => {
      const result = Vec2.lerp(new Vec2(1, 2), new Vec2(10, 20), 0);
      expect(result.x).toBe(1);
      expect(result.y).toBe(2);
    });

    it('lerp at t=1 returns second vector', () => {
      const result = Vec2.lerp(new Vec2(1, 2), new Vec2(10, 20), 1);
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });

    it('min returns component-wise minimum', () => {
      const result = Vec2.min(new Vec2(1, 5), new Vec2(3, 2));
      expect(result.x).toBe(1);
      expect(result.y).toBe(2);
    });

    it('max returns component-wise maximum', () => {
      const result = Vec2.max(new Vec2(1, 5), new Vec2(3, 2));
      expect(result.x).toBe(3);
      expect(result.y).toBe(5);
    });
  });

  describe('instance methods', () => {
    it('add instance method', () => {
      const v = new Vec2(1, 2);
      const result = v.add(new Vec2(3, 4));
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
      // Original unchanged (immutable)
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
    });

    it('subtract instance method', () => {
      const result = new Vec2(5, 7).subtract(new Vec2(2, 3));
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('multiply instance method', () => {
      const result = new Vec2(3, 4).multiply(2);
      expect(result.x).toBe(6);
      expect(result.y).toBe(8);
    });

    it('divide instance method', () => {
      const result = new Vec2(6, 8).divide(2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('length calculates magnitude', () => {
      const v = new Vec2(3, 4);
      expect(v.length()).toBe(5);
    });

    it('lengthSquared calculates squared magnitude', () => {
      const v = new Vec2(3, 4);
      expect(v.lengthSquared()).toBe(25);
    });

    it('normalize returns unit vector', () => {
      const v = new Vec2(3, 4);
      const n = v.normalize();
      expect(n.x).toBeCloseTo(0.6);
      expect(n.y).toBeCloseTo(0.8);
      expect(n.length()).toBeCloseTo(1);
    });

    it('normalize handles zero vector', () => {
      const v = new Vec2(0, 0);
      const n = v.normalize();
      expect(n.x).toBe(0);
      expect(n.y).toBe(0);
    });

    it('rotate rotates counter-clockwise', () => {
      const v = new Vec2(1, 0);
      const rotated = v.rotate(Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });

    it('rotate by 180 degrees flips vector', () => {
      const v = new Vec2(1, 0);
      const rotated = v.rotate(Math.PI);
      expect(rotated.x).toBeCloseTo(-1);
      expect(rotated.y).toBeCloseTo(0);
    });

    it('rotateAround rotates around center point', () => {
      const v = new Vec2(2, 0);
      const center = new Vec2(1, 0);
      const rotated = v.rotateAround(center, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(1);
      expect(rotated.y).toBeCloseTo(1);
    });

    it('distanceTo calculates distance', () => {
      const v = new Vec2(0, 0);
      expect(v.distanceTo(new Vec2(3, 4))).toBe(5);
    });

    it('angle returns angle from x-axis', () => {
      expect(new Vec2(1, 0).angle()).toBe(0);
      expect(new Vec2(0, 1).angle()).toBeCloseTo(Math.PI / 2);
      expect(new Vec2(-1, 0).angle()).toBeCloseTo(Math.PI);
      expect(new Vec2(0, -1).angle()).toBeCloseTo(-Math.PI / 2);
    });

    it('angleTo returns angle to another point', () => {
      const v = new Vec2(0, 0);
      expect(v.angleTo(new Vec2(1, 0))).toBe(0);
      expect(v.angleTo(new Vec2(0, 1))).toBeCloseTo(Math.PI / 2);
    });

    it('perpendicular returns 90 degree rotated vector', () => {
      const v = new Vec2(1, 0);
      const perp = v.perpendicular();
      expect(perp.x).toBeCloseTo(0);
      expect(perp.y).toBe(1);
    });

    it('equals compares vectors within tolerance', () => {
      const v1 = new Vec2(1, 2);
      const v2 = new Vec2(1, 2);
      const v3 = new Vec2(1.00000000001, 2); // Within 1e-10 tolerance
      const v4 = new Vec2(1.1, 2);

      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(true);
      expect(v1.equals(v4)).toBe(false);
    });

    it('clone creates copy', () => {
      const v = new Vec2(1, 2);
      const c = v.clone();
      expect(c.x).toBe(1);
      expect(c.y).toBe(2);
      expect(c).not.toBe(v);
    });

    it('toArray converts to tuple', () => {
      const v = new Vec2(1, 2);
      expect(v.toArray()).toEqual([1, 2]);
    });

    it('toObject converts to plain object', () => {
      const v = new Vec2(1, 2);
      expect(v.toObject()).toEqual({ x: 1, y: 2 });
    });

    it('toString returns readable string', () => {
      const v = new Vec2(1, 2);
      expect(v.toString()).toBe('Vec2(1, 2)');
    });
  });
});
