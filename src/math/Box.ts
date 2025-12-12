import { Vec2 } from './Vec2';

/**
 * Axis-Aligned Bounding Box (AABB) for spatial queries and bounds calculations.
 * Immutable - all operations return new Box instances.
 */
export class Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;

  constructor(minX: number, minY: number, maxX: number, maxY: number) {
    // Ensure min <= max
    this.minX = Math.min(minX, maxX);
    this.minY = Math.min(minY, maxY);
    this.maxX = Math.max(minX, maxX);
    this.maxY = Math.max(minY, maxY);
  }

  // ============ Computed properties ============

  /** Width of the box */
  get width(): number {
    return this.maxX - this.minX;
  }

  /** Height of the box */
  get height(): number {
    return this.maxY - this.minY;
  }

  /** Center X coordinate */
  get centerX(): number {
    return (this.minX + this.maxX) / 2;
  }

  /** Center Y coordinate */
  get centerY(): number {
    return (this.minY + this.maxY) / 2;
  }

  /** Center point as a Vec2 */
  get center(): Vec2 {
    return new Vec2(this.centerX, this.centerY);
  }

  /** Top-left corner */
  get topLeft(): Vec2 {
    return new Vec2(this.minX, this.minY);
  }

  /** Top-right corner */
  get topRight(): Vec2 {
    return new Vec2(this.maxX, this.minY);
  }

  /** Bottom-left corner */
  get bottomLeft(): Vec2 {
    return new Vec2(this.minX, this.maxY);
  }

  /** Bottom-right corner */
  get bottomRight(): Vec2 {
    return new Vec2(this.maxX, this.maxY);
  }

  /** Area of the box */
  get area(): number {
    return this.width * this.height;
  }

  /** Perimeter of the box */
  get perimeter(): number {
    return 2 * (this.width + this.height);
  }

  /** Check if the box has zero area */
  get isEmpty(): boolean {
    return this.width === 0 || this.height === 0;
  }

  // ============ Static factory methods ============

  /** Create a box from two corner points */
  static fromPoints(p1: Vec2, p2: Vec2): Box {
    return new Box(p1.x, p1.y, p2.x, p2.y);
  }

  /** Create a box from an array of points (bounding box of all points) */
  static fromPointArray(points: Vec2[]): Box {
    const first = points[0];
    if (first === undefined) {
      return Box.empty();
    }

    let minX = first.x;
    let minY = first.y;
    let maxX = first.x;
    let maxY = first.y;

    for (let i = 1; i < points.length; i++) {
      const p = points[i]!;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    return new Box(minX, minY, maxX, maxY);
  }

  /** Create a box from center point and dimensions */
  static fromCenter(center: Vec2, width: number, height: number): Box {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    return new Box(
      center.x - halfWidth,
      center.y - halfHeight,
      center.x + halfWidth,
      center.y + halfHeight
    );
  }

  /** Create a box from center point and half-extents */
  static fromCenterExtents(center: Vec2, halfWidth: number, halfHeight: number): Box {
    return new Box(
      center.x - halfWidth,
      center.y - halfHeight,
      center.x + halfWidth,
      center.y + halfHeight
    );
  }

  /** Create a box from position (top-left) and size */
  static fromPositionSize(position: Vec2, width: number, height: number): Box {
    return new Box(position.x, position.y, position.x + width, position.y + height);
  }

  /** Create an empty box at origin */
  static empty(): Box {
    return new Box(0, 0, 0, 0);
  }

  /** Create an infinite box */
  static infinite(): Box {
    return new Box(-Infinity, -Infinity, Infinity, Infinity);
  }

  // ============ Instance methods ============

  /**
   * Check if a point is inside or on the boundary of this box.
   */
  containsPoint(point: Vec2): boolean {
    return (
      point.x >= this.minX &&
      point.x <= this.maxX &&
      point.y >= this.minY &&
      point.y <= this.maxY
    );
  }

  /**
   * Check if a point is strictly inside this box (not on boundary).
   */
  containsPointStrict(point: Vec2): boolean {
    return (
      point.x > this.minX &&
      point.x < this.maxX &&
      point.y > this.minY &&
      point.y < this.maxY
    );
  }

  /**
   * Check if this box fully contains another box.
   */
  containsBox(other: Box): boolean {
    return (
      this.minX <= other.minX &&
      this.maxX >= other.maxX &&
      this.minY <= other.minY &&
      this.maxY >= other.maxY
    );
  }

  /**
   * Check if this box intersects (overlaps) with another box.
   */
  intersects(other: Box): boolean {
    return !(
      other.minX > this.maxX ||
      other.maxX < this.minX ||
      other.minY > this.maxY ||
      other.maxY < this.minY
    );
  }

  /**
   * Check if this box intersects with another box, excluding touching edges.
   */
  intersectsStrict(other: Box): boolean {
    return !(
      other.minX >= this.maxX ||
      other.maxX <= this.minX ||
      other.minY >= this.maxY ||
      other.maxY <= this.minY
    );
  }

  /**
   * Return the union of this box and another (smallest box containing both).
   */
  union(other: Box): Box {
    return new Box(
      Math.min(this.minX, other.minX),
      Math.min(this.minY, other.minY),
      Math.max(this.maxX, other.maxX),
      Math.max(this.maxY, other.maxY)
    );
  }

  /**
   * Return the intersection of this box and another.
   * Returns an empty box if they don't intersect.
   */
  intersection(other: Box): Box {
    const minX = Math.max(this.minX, other.minX);
    const minY = Math.max(this.minY, other.minY);
    const maxX = Math.min(this.maxX, other.maxX);
    const maxY = Math.min(this.maxY, other.maxY);

    if (minX > maxX || minY > maxY) {
      return Box.empty();
    }

    return new Box(minX, minY, maxX, maxY);
  }

  /**
   * Expand this box to include a point.
   */
  expandToInclude(point: Vec2): Box {
    return new Box(
      Math.min(this.minX, point.x),
      Math.min(this.minY, point.y),
      Math.max(this.maxX, point.x),
      Math.max(this.maxY, point.y)
    );
  }

  /**
   * Expand this box by a uniform amount in all directions.
   */
  expand(amount: number): Box {
    return new Box(
      this.minX - amount,
      this.minY - amount,
      this.maxX + amount,
      this.maxY + amount
    );
  }

  /**
   * Expand this box by different amounts on each side.
   */
  expandXY(amountX: number, amountY: number): Box {
    return new Box(
      this.minX - amountX,
      this.minY - amountY,
      this.maxX + amountX,
      this.maxY + amountY
    );
  }

  /**
   * Shrink (contract) this box by a uniform amount.
   */
  shrink(amount: number): Box {
    return this.expand(-amount);
  }

  /**
   * Translate (move) this box by a vector.
   */
  translate(offset: Vec2): Box {
    return new Box(
      this.minX + offset.x,
      this.minY + offset.y,
      this.maxX + offset.x,
      this.maxY + offset.y
    );
  }

  /**
   * Scale this box from its center.
   */
  scaleFromCenter(scale: number): Box {
    const center = this.center;
    const halfWidth = (this.width * scale) / 2;
    const halfHeight = (this.height * scale) / 2;
    return new Box(
      center.x - halfWidth,
      center.y - halfHeight,
      center.x + halfWidth,
      center.y + halfHeight
    );
  }

  /**
   * Clamp a point to be within this box.
   */
  clampPoint(point: Vec2): Vec2 {
    return new Vec2(
      Math.max(this.minX, Math.min(this.maxX, point.x)),
      Math.max(this.minY, Math.min(this.maxY, point.y))
    );
  }

  /**
   * Get the closest point on this box to a given point.
   */
  closestPoint(point: Vec2): Vec2 {
    return this.clampPoint(point);
  }

  /**
   * Calculate the distance from a point to this box.
   * Returns 0 if the point is inside the box.
   */
  distanceToPoint(point: Vec2): number {
    const closest = this.closestPoint(point);
    return point.distanceTo(closest);
  }

  /**
   * Get all four corners of the box.
   */
  getCorners(): [Vec2, Vec2, Vec2, Vec2] {
    return [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft];
  }

  /**
   * Check if this box equals another within a tolerance.
   */
  equals(other: Box, epsilon: number = 1e-10): boolean {
    return (
      Math.abs(this.minX - other.minX) < epsilon &&
      Math.abs(this.minY - other.minY) < epsilon &&
      Math.abs(this.maxX - other.maxX) < epsilon &&
      Math.abs(this.maxY - other.maxY) < epsilon
    );
  }

  /** Clone this box */
  clone(): Box {
    return new Box(this.minX, this.minY, this.maxX, this.maxY);
  }

  /** Convert to array [minX, minY, maxX, maxY] */
  toArray(): [number, number, number, number] {
    return [this.minX, this.minY, this.maxX, this.maxY];
  }

  /** Convert to object compatible with RBush */
  toRBush(): { minX: number; minY: number; maxX: number; maxY: number } {
    return {
      minX: this.minX,
      minY: this.minY,
      maxX: this.maxX,
      maxY: this.maxY,
    };
  }

  /** String representation for debugging */
  toString(): string {
    return `Box(${this.minX}, ${this.minY}, ${this.maxX}, ${this.maxY})`;
  }
}
