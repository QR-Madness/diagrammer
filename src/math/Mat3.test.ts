import { describe, it, expect } from 'vitest';
import { Mat3 } from './Mat3';
import { Vec2 } from './Vec2';

describe('Mat3', () => {
  describe('constructor and accessors', () => {
    it('creates identity matrix by default', () => {
      const m = new Mat3();
      expect(m.a).toBe(1);
      expect(m.b).toBe(0);
      expect(m.c).toBe(0);
      expect(m.d).toBe(1);
      expect(m.e).toBe(0);
      expect(m.f).toBe(0);
    });

    it('creates matrix with given values', () => {
      const m = new Mat3(2, 3, 4, 5, 6, 7);
      expect(m.a).toBe(2);
      expect(m.b).toBe(3);
      expect(m.c).toBe(4);
      expect(m.d).toBe(5);
      expect(m.e).toBe(6);
      expect(m.f).toBe(7);
    });

    it('values array contains all components', () => {
      const m = new Mat3(1, 2, 3, 4, 5, 6);
      expect(m.values).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('static factory methods', () => {
    it('identity creates identity matrix', () => {
      const m = Mat3.identity();
      expect(m.isIdentity()).toBe(true);
    });

    it('translation creates translation matrix', () => {
      const m = Mat3.translation(10, 20);
      const p = m.transformPoint(new Vec2(0, 0));
      expect(p.x).toBe(10);
      expect(p.y).toBe(20);
    });

    it('translationVec creates translation from Vec2', () => {
      const m = Mat3.translationVec(new Vec2(10, 20));
      const p = m.transformPoint(new Vec2(5, 5));
      expect(p.x).toBe(15);
      expect(p.y).toBe(25);
    });

    it('rotation creates rotation matrix', () => {
      const m = Mat3.rotation(Math.PI / 2);
      const p = m.transformPoint(new Vec2(1, 0));
      expect(p.x).toBeCloseTo(0);
      expect(p.y).toBeCloseTo(1);
    });

    it('rotation by 180 degrees', () => {
      const m = Mat3.rotation(Math.PI);
      const p = m.transformPoint(new Vec2(1, 0));
      expect(p.x).toBeCloseTo(-1);
      expect(p.y).toBeCloseTo(0);
    });

    it('rotationAt rotates around center point', () => {
      const m = Mat3.rotationAt(Math.PI / 2, new Vec2(1, 1));
      const p = m.transformPoint(new Vec2(2, 1));
      expect(p.x).toBeCloseTo(1);
      expect(p.y).toBeCloseTo(2);
    });

    it('scale creates uniform scale matrix', () => {
      const m = Mat3.scale(2);
      const p = m.transformPoint(new Vec2(3, 4));
      expect(p.x).toBe(6);
      expect(p.y).toBe(8);
    });

    it('scaleXY creates non-uniform scale matrix', () => {
      const m = Mat3.scaleXY(2, 3);
      const p = m.transformPoint(new Vec2(3, 4));
      expect(p.x).toBe(6);
      expect(p.y).toBe(12);
    });

    it('scaleAt scales around center point', () => {
      const m = Mat3.scaleAt(2, 2, new Vec2(1, 1));
      // Point at origin scaled 2x around (1,1)
      const p = m.transformPoint(new Vec2(0, 0));
      expect(p.x).toBe(-1); // (0-1)*2 + 1 = -1
      expect(p.y).toBe(-1);
    });

    it('fromArray creates matrix from array', () => {
      const m = Mat3.fromArray([1, 2, 3, 4, 5, 6]);
      expect(m.values).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('matrix operations', () => {
    it('multiply combines transformations', () => {
      const t = Mat3.translation(10, 0);
      const r = Mat3.rotation(Math.PI / 2);

      // t * r: first rotate, then translate
      const combined = t.multiply(r);
      const p = combined.transformPoint(new Vec2(1, 0));
      expect(p.x).toBeCloseTo(10); // rotated to (0,1), then translated to (10,1)
      expect(p.y).toBeCloseTo(1);
    });

    it('preMultiply applies in reverse order', () => {
      const t = Mat3.translation(10, 0);
      const r = Mat3.rotation(Math.PI / 2);

      // r.preMultiply(t) = t * r: first rotate, then translate
      const combined = r.preMultiply(t);
      const p = combined.transformPoint(new Vec2(1, 0));
      expect(p.x).toBeCloseTo(10);
      expect(p.y).toBeCloseTo(1);
    });

    it('multiply is associative', () => {
      const a = Mat3.translation(1, 2);
      const b = Mat3.rotation(0.5);
      const c = Mat3.scale(2);

      const ab_c = a.multiply(b).multiply(c);
      const a_bc = a.multiply(b.multiply(c));

      expect(ab_c.equals(a_bc)).toBe(true);
    });

    it('identity multiply has no effect', () => {
      const m = new Mat3(2, 3, 4, 5, 6, 7);
      const result = m.multiply(Mat3.identity());
      expect(result.equals(m)).toBe(true);
    });
  });

  describe('transformPoint', () => {
    it('transforms point by identity returns same point', () => {
      const m = Mat3.identity();
      const p = new Vec2(5, 10);
      const result = m.transformPoint(p);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it('transforms point by translation', () => {
      const m = Mat3.translation(3, 4);
      const p = new Vec2(1, 2);
      const result = m.transformPoint(p);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('transforms point by scale', () => {
      const m = Mat3.scale(2);
      const p = new Vec2(3, 4);
      const result = m.transformPoint(p);
      expect(result.x).toBe(6);
      expect(result.y).toBe(8);
    });
  });

  describe('transformVector', () => {
    it('transforms vector ignoring translation', () => {
      const m = Mat3.translation(100, 100);
      const v = new Vec2(1, 0);
      const result = m.transformVector(v);
      expect(result.x).toBe(1); // Translation ignored
      expect(result.y).toBe(0);
    });

    it('transforms vector by rotation', () => {
      const m = Mat3.rotation(Math.PI / 2);
      const v = new Vec2(1, 0);
      const result = m.transformVector(v);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(1);
    });

    it('transforms vector by scale', () => {
      const m = Mat3.scale(3);
      const v = new Vec2(2, 1);
      const result = m.transformVector(v);
      expect(result.x).toBe(6);
      expect(result.y).toBe(3);
    });
  });

  describe('inverse', () => {
    it('inverse of identity is identity', () => {
      const m = Mat3.identity();
      const inv = m.inverse();
      expect(inv).not.toBeNull();
      expect(inv!.isIdentity()).toBe(true);
    });

    it('inverse of translation', () => {
      const m = Mat3.translation(10, 20);
      const inv = m.inverse();
      expect(inv).not.toBeNull();

      const p = new Vec2(10, 20);
      const result = inv!.transformPoint(p);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
    });

    it('inverse of rotation', () => {
      const m = Mat3.rotation(Math.PI / 4);
      const inv = m.inverse();
      expect(inv).not.toBeNull();

      const p = new Vec2(1, 0);
      const rotated = m.transformPoint(p);
      const back = inv!.transformPoint(rotated);
      expect(back.x).toBeCloseTo(1);
      expect(back.y).toBeCloseTo(0);
    });

    it('inverse of scale', () => {
      const m = Mat3.scale(2);
      const inv = m.inverse();
      expect(inv).not.toBeNull();

      const p = new Vec2(10, 10);
      const result = inv!.transformPoint(p);
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
    });

    it('m * m.inverse = identity', () => {
      const m = Mat3.translation(5, 10).multiply(Mat3.rotation(0.5)).multiply(Mat3.scale(2));
      const inv = m.inverse();
      expect(inv).not.toBeNull();

      const result = m.multiply(inv!);
      expect(result.isIdentity()).toBe(true);
    });

    it('returns null for non-invertible matrix', () => {
      // Matrix with zero determinant (all zeros except translation)
      const m = new Mat3(0, 0, 0, 0, 1, 1);
      expect(m.inverse()).toBeNull();
    });
  });

  describe('determinant', () => {
    it('identity has determinant 1', () => {
      expect(Mat3.identity().determinant()).toBe(1);
    });

    it('scale has determinant equal to product of scales', () => {
      const m = Mat3.scaleXY(2, 3);
      expect(m.determinant()).toBe(6);
    });

    it('rotation has determinant 1', () => {
      const m = Mat3.rotation(Math.PI / 3);
      expect(m.determinant()).toBeCloseTo(1);
    });
  });

  describe('utility methods', () => {
    it('isIdentity returns true for identity matrix', () => {
      expect(Mat3.identity().isIdentity()).toBe(true);
      expect(new Mat3(1, 0, 0, 1, 0.00000000001, 0).isIdentity()).toBe(true); // Within 1e-10 tolerance
    });

    it('isIdentity returns false for non-identity', () => {
      expect(Mat3.translation(1, 0).isIdentity()).toBe(false);
      expect(Mat3.scale(2).isIdentity()).toBe(false);
    });

    it('equals compares matrices within tolerance', () => {
      const m1 = Mat3.translation(1, 2);
      const m2 = Mat3.translation(1, 2);
      const m3 = Mat3.translation(1.00000000001, 2); // Within 1e-10 tolerance
      const m4 = Mat3.translation(1.1, 2);

      expect(m1.equals(m2)).toBe(true);
      expect(m1.equals(m3)).toBe(true);
      expect(m1.equals(m4)).toBe(false);
    });

    it('translate chains translation', () => {
      const m = Mat3.identity().translate(5, 10);
      const p = m.transformPoint(new Vec2(0, 0));
      expect(p.x).toBe(5);
      expect(p.y).toBe(10);
    });

    it('rotate chains rotation', () => {
      const m = Mat3.identity().rotate(Math.PI / 2);
      const p = m.transformPoint(new Vec2(1, 0));
      expect(p.x).toBeCloseTo(0);
      expect(p.y).toBeCloseTo(1);
    });

    it('scale chains scale', () => {
      const m = Mat3.identity().scale(2);
      const p = m.transformPoint(new Vec2(3, 4));
      expect(p.x).toBe(6);
      expect(p.y).toBe(8);
    });

    it('scaleXY chains non-uniform scale', () => {
      const m = Mat3.identity().scaleXY(2, 3);
      const p = m.transformPoint(new Vec2(3, 4));
      expect(p.x).toBe(6);
      expect(p.y).toBe(12);
    });

    it('clone creates copy', () => {
      const m = new Mat3(1, 2, 3, 4, 5, 6);
      const c = m.clone();
      expect(c.values).toEqual(m.values);
      expect(c).not.toBe(m);
    });

    it('toArray returns values as array', () => {
      const m = new Mat3(1, 2, 3, 4, 5, 6);
      expect(m.toArray()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('toString returns readable string', () => {
      const m = new Mat3(1, 2, 3, 4, 5, 6);
      expect(m.toString()).toBe('Mat3(1, 2, 3, 4, 5, 6)');
    });
  });

  describe('combined transformations', () => {
    it('translate then rotate', () => {
      // Translate first, then rotate around origin
      const t = Mat3.translation(1, 0);
      const r = Mat3.rotation(Math.PI / 2);
      const combined = r.multiply(t); // r * t: first t, then r

      const p = new Vec2(0, 0);
      const result = combined.transformPoint(p);
      // (0,0) translated to (1,0) then rotated 90 degrees to (0,1)
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(1);
    });

    it('scale then translate', () => {
      const s = Mat3.scale(2);
      const t = Mat3.translation(10, 10);
      const combined = t.multiply(s); // t * s: first scale, then translate

      const p = new Vec2(5, 5);
      const result = combined.transformPoint(p);
      // (5,5) scaled to (10,10) then translated to (20,20)
      expect(result.x).toBe(20);
      expect(result.y).toBe(20);
    });
  });
});
