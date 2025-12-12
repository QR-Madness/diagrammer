/**
 * 2D Vector class for mathematical operations.
 * Immutable - all operations return new Vec2 instances.
 */
export class Vec2 {
  readonly x: number;
  readonly y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  // ============ Static factory methods ============

  /** Create a Vec2 from an array [x, y] */
  static fromArray(arr: [number, number]): Vec2 {
    return new Vec2(arr[0], arr[1]);
  }

  /** Create a Vec2 from an object with x and y properties */
  static fromObject(obj: { x: number; y: number }): Vec2 {
    return new Vec2(obj.x, obj.y);
  }

  /** Create a zero vector (0, 0) */
  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  /** Create a unit vector pointing right (1, 0) */
  static unitX(): Vec2 {
    return new Vec2(1, 0);
  }

  /** Create a unit vector pointing down (0, 1) */
  static unitY(): Vec2 {
    return new Vec2(0, 1);
  }

  // ============ Static arithmetic operations ============

  /** Add two vectors */
  static add(a: Vec2, b: Vec2): Vec2 {
    return new Vec2(a.x + b.x, a.y + b.y);
  }

  /** Subtract vector b from vector a */
  static subtract(a: Vec2, b: Vec2): Vec2 {
    return new Vec2(a.x - b.x, a.y - b.y);
  }

  /** Multiply a vector by a scalar */
  static multiply(v: Vec2, scalar: number): Vec2 {
    return new Vec2(v.x * scalar, v.y * scalar);
  }

  /** Divide a vector by a scalar */
  static divide(v: Vec2, scalar: number): Vec2 {
    if (scalar === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new Vec2(v.x / scalar, v.y / scalar);
  }

  /** Calculate the dot product of two vectors */
  static dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  }

  /**
   * Calculate the cross product (z-component) of two 2D vectors.
   * Returns a scalar representing the z-component if these were 3D vectors.
   * Useful for determining clockwise/counter-clockwise orientation.
   */
  static cross(a: Vec2, b: Vec2): number {
    return a.x * b.y - a.y * b.x;
  }

  /** Negate a vector */
  static negate(v: Vec2): Vec2 {
    return new Vec2(-v.x, -v.y);
  }

  /** Calculate the distance between two points */
  static distance(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Calculate the squared distance between two points (faster, no sqrt) */
  static distanceSquared(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  }

  /** Linear interpolation between two vectors */
  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  /** Get the minimum components of two vectors */
  static min(a: Vec2, b: Vec2): Vec2 {
    return new Vec2(Math.min(a.x, b.x), Math.min(a.y, b.y));
  }

  /** Get the maximum components of two vectors */
  static max(a: Vec2, b: Vec2): Vec2 {
    return new Vec2(Math.max(a.x, b.x), Math.max(a.y, b.y));
  }

  // ============ Instance methods ============

  /** Add another vector to this one */
  add(other: Vec2): Vec2 {
    return Vec2.add(this, other);
  }

  /** Subtract another vector from this one */
  subtract(other: Vec2): Vec2 {
    return Vec2.subtract(this, other);
  }

  /** Multiply this vector by a scalar */
  multiply(scalar: number): Vec2 {
    return Vec2.multiply(this, scalar);
  }

  /** Divide this vector by a scalar */
  divide(scalar: number): Vec2 {
    return Vec2.divide(this, scalar);
  }

  /** Calculate the dot product with another vector */
  dot(other: Vec2): number {
    return Vec2.dot(this, other);
  }

  /** Calculate the cross product with another vector */
  cross(other: Vec2): number {
    return Vec2.cross(this, other);
  }

  /** Negate this vector */
  negate(): Vec2 {
    return Vec2.negate(this);
  }

  /** Calculate the length (magnitude) of this vector */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Calculate the squared length of this vector (faster, no sqrt) */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Return a normalized (unit length) version of this vector */
  normalize(): Vec2 {
    const len = this.length();
    if (len === 0) {
      return new Vec2(0, 0);
    }
    return new Vec2(this.x / len, this.y / len);
  }

  /**
   * Rotate this vector by an angle (in radians) around the origin.
   * Positive angles rotate counter-clockwise.
   */
  rotate(angle: number): Vec2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  /**
   * Rotate this vector by an angle (in radians) around a given center point.
   */
  rotateAround(center: Vec2, angle: number): Vec2 {
    const translated = this.subtract(center);
    const rotated = translated.rotate(angle);
    return rotated.add(center);
  }

  /** Linear interpolation toward another vector */
  lerp(other: Vec2, t: number): Vec2 {
    return Vec2.lerp(this, other, t);
  }

  /** Calculate the distance to another point */
  distanceTo(other: Vec2): number {
    return Vec2.distance(this, other);
  }

  /** Calculate the angle of this vector from the positive x-axis (in radians) */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Calculate the angle to another vector (in radians) */
  angleTo(other: Vec2): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  /** Return a perpendicular vector (rotated 90 degrees counter-clockwise) */
  perpendicular(): Vec2 {
    return new Vec2(-this.y, this.x);
  }

  /** Check if this vector equals another within a tolerance */
  equals(other: Vec2, epsilon: number = 1e-10): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon
    );
  }

  /** Clone this vector */
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  /** Convert to array [x, y] */
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  /** Convert to plain object { x, y } */
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** String representation for debugging */
  toString(): string {
    return `Vec2(${this.x}, ${this.y})`;
  }
}
