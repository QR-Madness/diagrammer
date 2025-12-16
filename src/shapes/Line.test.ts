import { describe, it, expect, vi } from 'vitest';
import { lineHandler } from './Line';
import { LineShape } from './Shape';
import { Vec2 } from '../math/Vec2';

/**
 * Create a test line with default properties.
 */
function createTestLine(overrides: Partial<LineShape> = {}): LineShape {
  return {
    id: 'test-line',
    type: 'line',
    x: 0,
    y: 0,
    x2: 100,
    y2: 0,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: null,
    stroke: '#2c5282',
    strokeWidth: 2,
    startArrow: false,
    endArrow: true,
    ...overrides,
  };
}

describe('Line Handler', () => {
  describe('hitTest', () => {
    it('returns true for point on horizontal line', () => {
      const line = createTestLine();

      expect(lineHandler.hitTest(line, new Vec2(50, 0))).toBe(true);
      expect(lineHandler.hitTest(line, new Vec2(0, 0))).toBe(true);
      expect(lineHandler.hitTest(line, new Vec2(100, 0))).toBe(true);
    });

    it('returns true for point near line within tolerance', () => {
      const line = createTestLine({ strokeWidth: 4 });

      // Points within stroke width should hit
      expect(lineHandler.hitTest(line, new Vec2(50, 2))).toBe(true);
      expect(lineHandler.hitTest(line, new Vec2(50, -2))).toBe(true);
    });

    it('returns false for point far from line', () => {
      const line = createTestLine();

      expect(lineHandler.hitTest(line, new Vec2(50, 20))).toBe(false);
      expect(lineHandler.hitTest(line, new Vec2(-50, 0))).toBe(false);
      expect(lineHandler.hitTest(line, new Vec2(150, 0))).toBe(false);
    });

    it('handles diagonal line', () => {
      const line = createTestLine({ x: 0, y: 0, x2: 100, y2: 100 });

      // Point on diagonal
      expect(lineHandler.hitTest(line, new Vec2(50, 50))).toBe(true);
      // Point off diagonal
      expect(lineHandler.hitTest(line, new Vec2(0, 100))).toBe(false);
    });

    it('handles vertical line', () => {
      const line = createTestLine({ x: 50, y: 0, x2: 50, y2: 100 });

      expect(lineHandler.hitTest(line, new Vec2(50, 50))).toBe(true);
      expect(lineHandler.hitTest(line, new Vec2(0, 50))).toBe(false);
    });

    it('handles offset line', () => {
      const line = createTestLine({ x: 100, y: 100, x2: 200, y2: 100 });

      expect(lineHandler.hitTest(line, new Vec2(150, 100))).toBe(true);
      expect(lineHandler.hitTest(line, new Vec2(0, 0))).toBe(false);
    });

    it('handles rotated line', () => {
      // Horizontal line rotated 90 degrees becomes vertical
      const line = createTestLine({ x: 0, y: -50, x2: 0, y2: 50, rotation: Math.PI / 2 });

      // Center point should still be on line
      expect(lineHandler.hitTest(line, new Vec2(0, 0))).toBe(true);
    });
  });

  describe('getBounds', () => {
    it('returns correct bounds for horizontal line', () => {
      const line = createTestLine();
      const bounds = lineHandler.getBounds(line);

      expect(bounds.minX).toBeCloseTo(-1); // stroke padding
      expect(bounds.minY).toBeCloseTo(-1);
      // Arrow extends past line end by ARROW_SIZE_MULTIPLIER * strokeWidth = 4 * 2 = 8
      expect(bounds.maxX).toBeCloseTo(109); // 100 + 8 + 1 (stroke padding)
      expect(bounds.maxY).toBeCloseTo(1);
    });

    it('returns correct bounds for vertical line', () => {
      const line = createTestLine({ x: 0, y: 0, x2: 0, y2: 100 });
      const bounds = lineHandler.getBounds(line);

      expect(bounds.minX).toBeCloseTo(-1);
      expect(bounds.maxX).toBeCloseTo(1);
      expect(bounds.minY).toBeCloseTo(-1);
      expect(bounds.maxY).toBeCloseTo(109);
    });

    it('returns correct bounds for diagonal line', () => {
      const line = createTestLine({ x: 0, y: 0, x2: 100, y2: 100 });
      const bounds = lineHandler.getBounds(line);

      expect(bounds.minX).toBeCloseTo(-1, 0);
      expect(bounds.minY).toBeCloseTo(-1, 0);
      expect(bounds.maxX).toBeGreaterThan(100); // includes arrow
      expect(bounds.maxY).toBeGreaterThan(100);
    });

    it('includes stroke width in bounds', () => {
      const line = createTestLine({ strokeWidth: 10 });
      const bounds = lineHandler.getBounds(line);

      expect(bounds.minY).toBeCloseTo(-5); // half stroke
      expect(bounds.maxY).toBeCloseTo(5);
    });

    it('expands for arrows', () => {
      const lineNoArrows = createTestLine({ startArrow: false, endArrow: false });
      const lineWithArrows = createTestLine({ startArrow: true, endArrow: true });

      const boundsNoArrows = lineHandler.getBounds(lineNoArrows);
      const boundsWithArrows = lineHandler.getBounds(lineWithArrows);

      // Bounds with arrows should be larger
      expect(boundsWithArrows.minX).toBeLessThan(boundsNoArrows.minX);
      expect(boundsWithArrows.maxX).toBeGreaterThan(boundsNoArrows.maxX);
    });
  });

  describe('getHandles', () => {
    it('returns 2 handles for line', () => {
      const line = createTestLine();
      const handles = lineHandler.getHandles(line);

      expect(handles).toHaveLength(2);
    });

    it('returns handles at start and end points', () => {
      const line = createTestLine();
      const handles = lineHandler.getHandles(line);

      const start = handles.find((h) => h.type === 'top-left')!;
      const end = handles.find((h) => h.type === 'bottom-right')!;

      expect(start.x).toBeCloseTo(0);
      expect(start.y).toBeCloseTo(0);
      expect(end.x).toBeCloseTo(100);
      expect(end.y).toBeCloseTo(0);
    });

    it('transforms handles for offset line', () => {
      const line = createTestLine({ x: 50, y: 50, x2: 150, y2: 50 });
      const handles = lineHandler.getHandles(line);

      const start = handles.find((h) => h.type === 'top-left')!;
      expect(start.x).toBeCloseTo(50);
      expect(start.y).toBeCloseTo(50);
    });

    it('transforms handles for rotated line', () => {
      const line = createTestLine({ x: 0, y: -50, x2: 0, y2: 50, rotation: Math.PI / 2 }); // 90 degrees
      const handles = lineHandler.getHandles(line);

      // After rotation, handles should be transformed
      expect(handles).toHaveLength(2);
    });

    it('includes cursor styles', () => {
      const line = createTestLine();
      const handles = lineHandler.getHandles(line);

      expect(handles[0]?.cursor).toBe('crosshair');
      expect(handles[1]?.cursor).toBe('crosshair');
    });
  });

  describe('create', () => {
    it('creates line at given position', () => {
      const line = lineHandler.create(new Vec2(100, 50), 'new-line');

      expect(line.id).toBe('new-line');
      expect(line.type).toBe('line');
      expect(line.x).toBe(100);
      expect(line.y).toBe(50);
      expect(line.x2).toBe(200); // Default 100 units long
      expect(line.y2).toBe(50);
    });

    it('uses default values', () => {
      const line = lineHandler.create(new Vec2(0, 0), 'test');

      expect(line.rotation).toBe(0);
      expect(line.opacity).toBe(1);
      expect(line.locked).toBe(false);
      expect(line.fill).toBe(null);
      expect(line.stroke).toBe('#2c5282');
      expect(line.strokeWidth).toBe(2);
      expect(line.startArrow).toBe(false);
      expect(line.endArrow).toBe(true);
    });
  });

  describe('render', () => {
    it('calls context methods for basic line', () => {
      const line = createTestLine();
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
      } as unknown as CanvasRenderingContext2D;

      lineHandler.render(ctx, line);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('does not stroke when stroke is null', () => {
      const line = createTestLine({ stroke: null });
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
      } as unknown as CanvasRenderingContext2D;

      lineHandler.render(ctx, line);

      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('draws arrow at end by default', () => {
      const line = createTestLine();
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
      } as unknown as CanvasRenderingContext2D;

      lineHandler.render(ctx, line);

      // fill is called for arrow head
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('applies opacity', () => {
      const line = createTestLine({ opacity: 0.5 });
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
      } as unknown as CanvasRenderingContext2D;

      lineHandler.render(ctx, line);

      expect(ctx.globalAlpha).toBe(0.5);
    });
  });
});
