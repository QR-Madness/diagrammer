import { Vec2 } from './Vec2';

/**
 * 3x3 Matrix for 2D affine transformations.
 * Stored in column-major order to match Canvas2D and WebGL conventions.
 *
 * Matrix layout:
 * | a  c  e |   | m[0]  m[2]  m[4] |
 * | b  d  f | = | m[1]  m[3]  m[5] |
 * | 0  0  1 |   | 0     0     1    |
 *
 * Where:
 * - a (m[0]), d (m[3]): scale
 * - b (m[1]), c (m[2]): skew/rotation
 * - e (m[4]), f (m[5]): translation
 */
export class Mat3 {
  /** The 6 values of the matrix (excluding the constant bottom row) */
  readonly values: readonly [number, number, number, number, number, number];

  constructor(
    a: number = 1,
    b: number = 0,
    c: number = 0,
    d: number = 1,
    e: number = 0,
    f: number = 0
  ) {
    this.values = [a, b, c, d, e, f];
  }

  // Accessors for individual components
  get a(): number {
    return this.values[0];
  }
  get b(): number {
    return this.values[1];
  }
  get c(): number {
    return this.values[2];
  }
  get d(): number {
    return this.values[3];
  }
  get e(): number {
    return this.values[4];
  }
  get f(): number {
    return this.values[5];
  }

  // ============ Static factory methods ============

  /** Create an identity matrix */
  static identity(): Mat3 {
    return new Mat3(1, 0, 0, 1, 0, 0);
  }

  /** Create a translation matrix */
  static translation(tx: number, ty: number): Mat3 {
    return new Mat3(1, 0, 0, 1, tx, ty);
  }

  /** Create a translation matrix from a Vec2 */
  static translationVec(v: Vec2): Mat3 {
    return new Mat3(1, 0, 0, 1, v.x, v.y);
  }

  /**
   * Create a rotation matrix (counter-clockwise rotation).
   * @param angle Rotation angle in radians
   */
  static rotation(angle: number): Mat3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Mat3(cos, sin, -sin, cos, 0, 0);
  }

  /**
   * Create a rotation matrix around a specific point.
   * @param angle Rotation angle in radians
   * @param center Center point of rotation
   */
  static rotationAt(angle: number, center: Vec2): Mat3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const cx = center.x;
    const cy = center.y;

    // Translate to origin, rotate, translate back
    return new Mat3(
      cos,
      sin,
      -sin,
      cos,
      cx - cos * cx + sin * cy,
      cy - sin * cx - cos * cy
    );
  }

  /** Create a uniform scale matrix */
  static scale(s: number): Mat3 {
    return new Mat3(s, 0, 0, s, 0, 0);
  }

  /** Create a non-uniform scale matrix */
  static scaleXY(sx: number, sy: number): Mat3 {
    return new Mat3(sx, 0, 0, sy, 0, 0);
  }

  /**
   * Create a scale matrix centered on a specific point.
   * @param sx Scale factor in X
   * @param sy Scale factor in Y
   * @param center Center point of scaling
   */
  static scaleAt(sx: number, sy: number, center: Vec2): Mat3 {
    const cx = center.x;
    const cy = center.y;

    // Translate to origin, scale, translate back
    return new Mat3(sx, 0, 0, sy, cx - sx * cx, cy - sy * cy);
  }

  /** Create a matrix from an array of 6 values [a, b, c, d, e, f] */
  static fromArray(arr: [number, number, number, number, number, number]): Mat3 {
    return new Mat3(arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]);
  }

  // ============ Instance methods ============

  /**
   * Multiply this matrix by another matrix (this * other).
   * Applies 'other' transformation first, then 'this'.
   */
  multiply(other: Mat3): Mat3 {
    const [a1, b1, c1, d1, e1, f1] = this.values;
    const [a2, b2, c2, d2, e2, f2] = other.values;

    return new Mat3(
      a1 * a2 + c1 * b2,
      b1 * a2 + d1 * b2,
      a1 * c2 + c1 * d2,
      b1 * c2 + d1 * d2,
      a1 * e2 + c1 * f2 + e1,
      b1 * e2 + d1 * f2 + f1
    );
  }

  /**
   * Pre-multiply this matrix by another (other * this).
   * Applies 'this' transformation first, then 'other'.
   */
  preMultiply(other: Mat3): Mat3 {
    return other.multiply(this);
  }

  /**
   * Transform a point by this matrix.
   * @param point The point to transform
   * @returns The transformed point
   */
  transformPoint(point: Vec2): Vec2 {
    const [a, b, c, d, e, f] = this.values;
    return new Vec2(a * point.x + c * point.y + e, b * point.x + d * point.y + f);
  }

  /**
   * Transform a vector by this matrix (ignores translation).
   * Useful for transforming directions or deltas.
   * @param vector The vector to transform
   * @returns The transformed vector
   */
  transformVector(vector: Vec2): Vec2 {
    const [a, b, c, d] = this.values;
    return new Vec2(a * vector.x + c * vector.y, b * vector.x + d * vector.y);
  }

  /**
   * Calculate the inverse of this matrix.
   * @returns The inverse matrix, or null if the matrix is not invertible
   */
  inverse(): Mat3 | null {
    const [a, b, c, d, e, f] = this.values;

    // Calculate determinant
    const det = a * d - b * c;

    if (Math.abs(det) < 1e-10) {
      return null; // Matrix is not invertible
    }

    const invDet = 1 / det;

    return new Mat3(
      d * invDet,
      -b * invDet,
      -c * invDet,
      a * invDet,
      (c * f - d * e) * invDet,
      (b * e - a * f) * invDet
    );
  }

  /**
   * Calculate the determinant of this matrix.
   */
  determinant(): number {
    const [a, b, c, d] = this.values;
    return a * d - b * c;
  }

  /**
   * Check if this matrix is the identity matrix.
   */
  isIdentity(epsilon: number = 1e-10): boolean {
    const [a, b, c, d, e, f] = this.values;
    return (
      Math.abs(a - 1) < epsilon &&
      Math.abs(b) < epsilon &&
      Math.abs(c) < epsilon &&
      Math.abs(d - 1) < epsilon &&
      Math.abs(e) < epsilon &&
      Math.abs(f) < epsilon
    );
  }

  /**
   * Check if this matrix equals another within a tolerance.
   */
  equals(other: Mat3, epsilon: number = 1e-10): boolean {
    for (let i = 0; i < 6; i++) {
      if (Math.abs(this.values[i]! - other.values[i]!) >= epsilon) {
        return false;
      }
    }
    return true;
  }

  /**
   * Apply a translation to this matrix.
   * Equivalent to multiply(Mat3.translation(tx, ty))
   */
  translate(tx: number, ty: number): Mat3 {
    return this.multiply(Mat3.translation(tx, ty));
  }

  /**
   * Apply a rotation to this matrix.
   * Equivalent to multiply(Mat3.rotation(angle))
   */
  rotate(angle: number): Mat3 {
    return this.multiply(Mat3.rotation(angle));
  }

  /**
   * Apply a uniform scale to this matrix.
   * Equivalent to multiply(Mat3.scale(s))
   */
  scale(s: number): Mat3 {
    return this.multiply(Mat3.scale(s));
  }

  /**
   * Apply a non-uniform scale to this matrix.
   * Equivalent to multiply(Mat3.scaleXY(sx, sy))
   */
  scaleXY(sx: number, sy: number): Mat3 {
    return this.multiply(Mat3.scaleXY(sx, sy));
  }

  /** Clone this matrix */
  clone(): Mat3 {
    return new Mat3(...this.values);
  }

  /** Convert to array [a, b, c, d, e, f] */
  toArray(): [number, number, number, number, number, number] {
    return [...this.values] as [number, number, number, number, number, number];
  }

  /**
   * Apply this matrix to a Canvas2D context.
   * @param ctx The canvas rendering context
   */
  applyToContext(ctx: CanvasRenderingContext2D): void {
    const [a, b, c, d, e, f] = this.values;
    ctx.transform(a, b, c, d, e, f);
  }

  /**
   * Set this matrix as the current transform on a Canvas2D context.
   * @param ctx The canvas rendering context
   */
  setOnContext(ctx: CanvasRenderingContext2D): void {
    const [a, b, c, d, e, f] = this.values;
    ctx.setTransform(a, b, c, d, e, f);
  }

  /** String representation for debugging */
  toString(): string {
    const [a, b, c, d, e, f] = this.values;
    return `Mat3(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
  }
}
