import { describe, it, expect } from 'vitest';
import { Vec2 } from './Vec2';
import { Box } from './Box';
import {
  pointInRect,
  pointInRotatedRect,
  pointInCircle,
  pointInEllipse,
  pointInRotatedEllipse,
  lineIntersection,
  segmentIntersection,
  distanceToLine,
  distanceToSegment,
  closestPointOnSegment,
  pointOnSegment,
  angleBetween,
  signedAngleBetween,
  boxIntersectsSegment,
  rotatedRectBounds,
  normalizeAngle,
  degToRad,
  radToDeg,
  lerp,
  clamp,
  approxEqual,
} from './geometry';

describe('pointInRect', () => {
  it('returns true for point inside', () => {
    expect(pointInRect(new Vec2(5, 5), 5, 5, 10, 10)).toBe(true);
    expect(pointInRect(new Vec2(3, 3), 5, 5, 10, 10)).toBe(true);
  });

  it('returns true for point on boundary', () => {
    expect(pointInRect(new Vec2(0, 0), 5, 5, 10, 10)).toBe(true);
    expect(pointInRect(new Vec2(10, 10), 5, 5, 10, 10)).toBe(true);
  });

  it('returns false for point outside', () => {
    expect(pointInRect(new Vec2(-1, 5), 5, 5, 10, 10)).toBe(false);
    expect(pointInRect(new Vec2(11, 5), 5, 5, 10, 10)).toBe(false);
  });
});

describe('pointInRotatedRect', () => {
  it('returns true for point inside non-rotated rect', () => {
    expect(pointInRotatedRect(new Vec2(5, 5), 5, 5, 10, 10, 0)).toBe(true);
  });

  it('returns true for point inside rotated rect', () => {
    // 45 degree rotated rect at origin with width/height 10
    // Point (5, 0) should be inside
    expect(pointInRotatedRect(new Vec2(3, 0), 0, 0, 10, 10, Math.PI / 4)).toBe(true);
  });

  it('returns false for point outside rotated rect', () => {
    // Point that would be inside axis-aligned rect but outside rotated rect
    expect(pointInRotatedRect(new Vec2(4.9, 4.9), 0, 0, 10, 10, Math.PI / 4)).toBe(false);
  });
});

describe('pointInCircle', () => {
  it('returns true for point inside', () => {
    expect(pointInCircle(new Vec2(5, 5), 5, 5, 10)).toBe(true);
    expect(pointInCircle(new Vec2(0, 0), 5, 5, 10)).toBe(true);
  });

  it('returns true for point on boundary', () => {
    expect(pointInCircle(new Vec2(15, 5), 5, 5, 10)).toBe(true);
  });

  it('returns false for point outside', () => {
    expect(pointInCircle(new Vec2(20, 5), 5, 5, 10)).toBe(false);
  });
});

describe('pointInEllipse', () => {
  it('returns true for point inside', () => {
    expect(pointInEllipse(new Vec2(5, 5), 5, 5, 10, 5)).toBe(true);
  });

  it('returns true for point on boundary', () => {
    expect(pointInEllipse(new Vec2(15, 5), 5, 5, 10, 5)).toBe(true);
    expect(pointInEllipse(new Vec2(5, 10), 5, 5, 10, 5)).toBe(true);
  });

  it('returns false for point outside', () => {
    expect(pointInEllipse(new Vec2(16, 5), 5, 5, 10, 5)).toBe(false);
  });

  it('handles zero radius', () => {
    expect(pointInEllipse(new Vec2(5, 5), 5, 5, 0, 5)).toBe(false);
    expect(pointInEllipse(new Vec2(5, 5), 5, 5, 5, 0)).toBe(false);
  });
});

describe('pointInRotatedEllipse', () => {
  it('returns true for point inside non-rotated ellipse', () => {
    expect(pointInRotatedEllipse(new Vec2(5, 5), 5, 5, 10, 5, 0)).toBe(true);
  });

  it('handles rotated ellipse', () => {
    // Ellipse with radiusX=10, radiusY=5 rotated 90 degrees
    // Should now be wider vertically
    expect(pointInRotatedEllipse(new Vec2(0, 8), 0, 0, 10, 5, Math.PI / 2)).toBe(true);
    expect(pointInRotatedEllipse(new Vec2(8, 0), 0, 0, 10, 5, Math.PI / 2)).toBe(false);
  });
});

describe('lineIntersection', () => {
  it('finds intersection of crossing lines', () => {
    const result = lineIntersection(
      new Vec2(0, 0),
      new Vec2(10, 10),
      new Vec2(0, 10),
      new Vec2(10, 0)
    );
    expect(result.intersects).toBe(true);
    expect(result.point!.x).toBeCloseTo(5);
    expect(result.point!.y).toBeCloseTo(5);
  });

  it('returns no intersection for parallel lines', () => {
    const result = lineIntersection(
      new Vec2(0, 0),
      new Vec2(10, 0),
      new Vec2(0, 5),
      new Vec2(10, 5)
    );
    expect(result.intersects).toBe(false);
    expect(result.point).toBeNull();
  });

  it('provides t and u parameters', () => {
    const result = lineIntersection(
      new Vec2(0, 0),
      new Vec2(10, 0),
      new Vec2(5, -5),
      new Vec2(5, 5)
    );
    expect(result.intersects).toBe(true);
    expect(result.t).toBeCloseTo(0.5); // Midpoint of first line
    expect(result.u).toBeCloseTo(0.5); // Midpoint of second line
  });
});

describe('segmentIntersection', () => {
  it('finds intersection within segments', () => {
    const result = segmentIntersection(
      new Vec2(0, 0),
      new Vec2(10, 10),
      new Vec2(0, 10),
      new Vec2(10, 0)
    );
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(5);
    expect(result!.y).toBeCloseTo(5);
  });

  it('returns null when lines intersect outside segments', () => {
    const result = segmentIntersection(
      new Vec2(0, 0),
      new Vec2(2, 2),
      new Vec2(0, 10),
      new Vec2(2, 8)
    );
    expect(result).toBeNull();
  });

  it('returns null for parallel segments', () => {
    const result = segmentIntersection(
      new Vec2(0, 0),
      new Vec2(10, 0),
      new Vec2(0, 5),
      new Vec2(10, 5)
    );
    expect(result).toBeNull();
  });
});

describe('distanceToLine', () => {
  it('calculates perpendicular distance', () => {
    // Distance from (5, 5) to line from (0, 0) to (10, 0)
    expect(distanceToLine(new Vec2(5, 5), new Vec2(0, 0), new Vec2(10, 0))).toBe(5);
  });

  it('handles point on line', () => {
    expect(distanceToLine(new Vec2(5, 0), new Vec2(0, 0), new Vec2(10, 0))).toBe(0);
  });

  it('handles diagonal line', () => {
    // Distance from origin to line y=x+5 (from (-5,0) to (0,5))
    const d = distanceToLine(new Vec2(0, 0), new Vec2(-5, 0), new Vec2(0, 5));
    expect(d).toBeCloseTo(5 / Math.sqrt(2));
  });

  it('handles line as a point', () => {
    const d = distanceToLine(new Vec2(3, 4), new Vec2(0, 0), new Vec2(0, 0));
    expect(d).toBe(5);
  });
});

describe('distanceToSegment', () => {
  it('calculates perpendicular distance when projection is on segment', () => {
    expect(distanceToSegment(new Vec2(5, 5), new Vec2(0, 0), new Vec2(10, 0))).toBe(5);
  });

  it('calculates distance to endpoint when projection is outside', () => {
    // Point is beyond the end of segment
    expect(distanceToSegment(new Vec2(15, 0), new Vec2(0, 0), new Vec2(10, 0))).toBe(5);
    expect(distanceToSegment(new Vec2(-5, 0), new Vec2(0, 0), new Vec2(10, 0))).toBe(5);
  });

  it('handles segment as a point', () => {
    expect(distanceToSegment(new Vec2(3, 4), new Vec2(0, 0), new Vec2(0, 0))).toBe(5);
  });
});

describe('closestPointOnSegment', () => {
  it('returns projection when on segment', () => {
    const closest = closestPointOnSegment(new Vec2(5, 5), new Vec2(0, 0), new Vec2(10, 0));
    expect(closest.x).toBe(5);
    expect(closest.y).toBe(0);
  });

  it('returns endpoint when projection is outside', () => {
    const closest1 = closestPointOnSegment(new Vec2(15, 5), new Vec2(0, 0), new Vec2(10, 0));
    expect(closest1.x).toBe(10);
    expect(closest1.y).toBe(0);

    const closest2 = closestPointOnSegment(new Vec2(-5, 5), new Vec2(0, 0), new Vec2(10, 0));
    expect(closest2.x).toBe(0);
    expect(closest2.y).toBe(0);
  });
});

describe('pointOnSegment', () => {
  it('returns true for point on segment', () => {
    expect(pointOnSegment(new Vec2(5, 0), new Vec2(0, 0), new Vec2(10, 0))).toBe(true);
    expect(pointOnSegment(new Vec2(0, 0), new Vec2(0, 0), new Vec2(10, 0))).toBe(true);
  });

  it('returns false for point off segment', () => {
    expect(pointOnSegment(new Vec2(5, 1), new Vec2(0, 0), new Vec2(10, 0))).toBe(false);
  });

  it('respects tolerance', () => {
    expect(pointOnSegment(new Vec2(5, 0.5), new Vec2(0, 0), new Vec2(10, 0), 1)).toBe(true);
  });
});

describe('angleBetween', () => {
  it('returns 0 for same direction', () => {
    expect(angleBetween(new Vec2(1, 0), new Vec2(2, 0))).toBe(0);
  });

  it('returns PI/2 for perpendicular vectors', () => {
    expect(angleBetween(new Vec2(1, 0), new Vec2(0, 1))).toBeCloseTo(Math.PI / 2);
  });

  it('returns PI for opposite directions', () => {
    expect(angleBetween(new Vec2(1, 0), new Vec2(-1, 0))).toBeCloseTo(Math.PI);
  });

  it('handles zero vectors', () => {
    expect(angleBetween(new Vec2(0, 0), new Vec2(1, 0))).toBe(0);
  });
});

describe('signedAngleBetween', () => {
  it('returns positive for counter-clockwise', () => {
    const angle = signedAngleBetween(new Vec2(1, 0), new Vec2(0, 1));
    expect(angle).toBeCloseTo(Math.PI / 2);
  });

  it('returns negative for clockwise', () => {
    const angle = signedAngleBetween(new Vec2(1, 0), new Vec2(0, -1));
    expect(angle).toBeCloseTo(-Math.PI / 2);
  });
});

describe('boxIntersectsSegment', () => {
  const box = new Box(0, 0, 10, 10);

  it('returns true for segment crossing box', () => {
    expect(boxIntersectsSegment(box, new Vec2(-5, 5), new Vec2(15, 5))).toBe(true);
  });

  it('returns true for segment starting inside', () => {
    expect(boxIntersectsSegment(box, new Vec2(5, 5), new Vec2(15, 5))).toBe(true);
  });

  it('returns true for segment fully inside', () => {
    expect(boxIntersectsSegment(box, new Vec2(2, 2), new Vec2(8, 8))).toBe(true);
  });

  it('returns false for segment outside', () => {
    expect(boxIntersectsSegment(box, new Vec2(20, 0), new Vec2(20, 10))).toBe(false);
  });

  it('returns false for segment on same side of box', () => {
    expect(boxIntersectsSegment(box, new Vec2(-5, -5), new Vec2(-2, -2))).toBe(false);
  });
});

describe('rotatedRectBounds', () => {
  it('returns same bounds for 0 rotation', () => {
    const bounds = rotatedRectBounds(5, 5, 10, 10, 0);
    expect(bounds.width).toBeCloseTo(10);
    expect(bounds.height).toBeCloseTo(10);
    expect(bounds.centerX).toBe(5);
    expect(bounds.centerY).toBe(5);
  });

  it('returns larger bounds for 45 degree rotation', () => {
    const bounds = rotatedRectBounds(0, 0, 10, 10, Math.PI / 4);
    const diag = 10 * Math.sqrt(2);
    expect(bounds.width).toBeCloseTo(diag);
    expect(bounds.height).toBeCloseTo(diag);
  });

  it('handles non-square rectangles', () => {
    const bounds = rotatedRectBounds(0, 0, 20, 10, Math.PI / 2);
    // 90 degree rotation swaps width and height
    expect(bounds.width).toBeCloseTo(10);
    expect(bounds.height).toBeCloseTo(20);
  });
});

describe('normalizeAngle', () => {
  it('keeps angles in [-PI, PI] unchanged', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it('normalizes angles > PI', () => {
    expect(normalizeAngle(Math.PI * 2)).toBeCloseTo(0);
    expect(normalizeAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
  });

  it('normalizes angles < -PI', () => {
    expect(normalizeAngle(-Math.PI * 2)).toBeCloseTo(0);
    expect(normalizeAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });
});

describe('degToRad', () => {
  it('converts degrees to radians', () => {
    expect(degToRad(0)).toBe(0);
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(degToRad(360)).toBeCloseTo(Math.PI * 2);
  });
});

describe('radToDeg', () => {
  it('converts radians to degrees', () => {
    expect(radToDeg(0)).toBe(0);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
    expect(radToDeg(Math.PI * 2)).toBeCloseTo(360);
  });
});

describe('lerp', () => {
  it('interpolates between values', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('extrapolates beyond [0, 1]', () => {
    expect(lerp(0, 10, -0.5)).toBe(-5);
    expect(lerp(0, 10, 1.5)).toBe(15);
  });
});

describe('clamp', () => {
  it('clamps values to range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles edge cases', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('approxEqual', () => {
  it('returns true for equal values', () => {
    expect(approxEqual(5, 5)).toBe(true);
  });

  it('returns true for values within epsilon', () => {
    expect(approxEqual(5, 5.00000000001)).toBe(true); // Within 1e-10 tolerance
  });

  it('returns false for values outside epsilon', () => {
    expect(approxEqual(5, 5.1)).toBe(false);
  });

  it('respects custom epsilon', () => {
    expect(approxEqual(5, 5.05, 0.1)).toBe(true);
    expect(approxEqual(5, 5.15, 0.1)).toBe(false);
  });
});
