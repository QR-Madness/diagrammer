/**
 * Document Validation Tests
 *
 * Phase 14.9.2 - Document import validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateDocument,
  validateDocumentJSON,
} from './DocumentValidation';

describe('DocumentValidation', () => {
  describe('validateDocumentJSON', () => {
    it('rejects invalid JSON', () => {
      const result = validateDocumentJSON('not valid json');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid JSON');
    });

    it('rejects empty string', () => {
      const result = validateDocumentJSON('');
      expect(result.valid).toBe(false);
    });

    it('accepts valid minimal document', () => {
      const doc = {
        id: 'doc-1',
        name: 'Test Doc',
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapes: {},
            shapeOrder: [],
          },
        },
        pageOrder: ['page-1'],
        activePageId: 'page-1',
      };
      const result = validateDocumentJSON(JSON.stringify(doc));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateDocument', () => {
    it('rejects null', () => {
      const result = validateDocument(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be an object');
    });

    it('rejects primitives', () => {
      expect(validateDocument('string').valid).toBe(false);
      expect(validateDocument(123).valid).toBe(false);
      expect(validateDocument(true).valid).toBe(false);
    });

    it('requires id field', () => {
      const result = validateDocument({
        name: 'Test',
        pages: {},
        pageOrder: [],
        activePageId: 'p1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid document ID');
    });

    it('requires name field', () => {
      const result = validateDocument({
        id: 'doc-1',
        pages: {},
        pageOrder: [],
        activePageId: 'p1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid document name');
    });

    it('requires pages object', () => {
      const result = validateDocument({
        id: 'doc-1',
        name: 'Test',
        pageOrder: [],
        activePageId: 'p1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid pages object');
    });

    it('requires pageOrder array', () => {
      const result = validateDocument({
        id: 'doc-1',
        name: 'Test',
        pages: {},
        activePageId: 'p1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid pageOrder array');
    });

    it('requires activePageId', () => {
      const result = validateDocument({
        id: 'doc-1',
        name: 'Test',
        pages: {},
        pageOrder: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid activePageId');
    });

    it('validates page references in pageOrder', () => {
      const result = validateDocument({
        id: 'doc-1',
        name: 'Test',
        pages: {},
        pageOrder: ['missing-page'],
        activePageId: 'missing-page',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Page referenced in order but missing'))).toBe(true);
    });

    it('validates activePageId exists', () => {
      const result = validateDocument({
        id: 'doc-1',
        name: 'Test',
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapes: {},
            shapeOrder: [],
          },
        },
        pageOrder: ['page-1'],
        activePageId: 'nonexistent',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('does not exist'))).toBe(true);
    });

    it('warns about missing version', () => {
      const doc = {
        id: 'doc-1',
        name: 'Test',
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapes: {},
            shapeOrder: [],
          },
        },
        pageOrder: ['page-1'],
        activePageId: 'page-1',
      };
      const result = validateDocument(doc);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Missing document version'))).toBe(true);
    });

    it('normalizes document with defaults', () => {
      const doc = {
        id: 'doc-1',
        name: 'Test',
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapes: {},
            shapeOrder: [],
          },
        },
        pageOrder: ['page-1'],
        activePageId: 'page-1',
      };
      const result = validateDocument(doc);
      expect(result.valid).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.version).toBe(1);
      expect(result.document!.blobReferences).toEqual([]);
      expect(typeof result.document!.createdAt).toBe('number');
      expect(typeof result.document!.modifiedAt).toBe('number');
    });
  });

  describe('page validation', () => {
    const validDocBase = {
      id: 'doc-1',
      name: 'Test',
      pageOrder: ['page-1'],
      activePageId: 'page-1',
    };

    it('requires page id', () => {
      const result = validateDocument({
        ...validDocBase,
        pages: {
          'page-1': {
            name: 'Page 1',
            shapes: {},
            shapeOrder: [],
          },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid page ID'))).toBe(true);
    });

    it('requires page name', () => {
      const result = validateDocument({
        ...validDocBase,
        pages: {
          'page-1': {
            id: 'page-1',
            shapes: {},
            shapeOrder: [],
          },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid page name'))).toBe(true);
    });

    it('requires shapes object', () => {
      const result = validateDocument({
        ...validDocBase,
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapeOrder: [],
          },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid shapes object'))).toBe(true);
    });

    it('requires shapeOrder array', () => {
      const result = validateDocument({
        ...validDocBase,
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapes: {},
          },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid shapeOrder array'))).toBe(true);
    });

    it('warns about missing shapes in shapeOrder', () => {
      const result = validateDocument({
        ...validDocBase,
        pages: {
          'page-1': {
            id: 'page-1',
            name: 'Page 1',
            shapes: {},
            shapeOrder: ['missing-shape'],
          },
        },
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Shape in order but missing'))).toBe(true);
    });
  });

  describe('shape validation', () => {
    const createDocWithShape = (shape: unknown) => ({
      id: 'doc-1',
      name: 'Test',
      pages: {
        'page-1': {
          id: 'page-1',
          name: 'Page 1',
          shapes: { 'shape-1': shape },
          shapeOrder: ['shape-1'],
        },
      },
      pageOrder: ['page-1'],
      activePageId: 'page-1',
    });

    it('requires shape id', () => {
      const result = validateDocument(
        createDocWithShape({ type: 'rectangle', x: 0, y: 0 })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid shape ID'))).toBe(true);
    });

    it('requires shape type', () => {
      const result = validateDocument(
        createDocWithShape({ id: 'shape-1', x: 0, y: 0 })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid shape type'))).toBe(true);
    });

    it('requires x coordinate', () => {
      const result = validateDocument(
        createDocWithShape({ id: 'shape-1', type: 'rectangle', y: 0 })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid x coordinate'))).toBe(true);
    });

    it('requires y coordinate', () => {
      const result = validateDocument(
        createDocWithShape({ id: 'shape-1', type: 'rectangle', x: 0 })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid y coordinate'))).toBe(true);
    });

    it('rejects infinite coordinates', () => {
      const result = validateDocument(
        createDocWithShape({ id: 'shape-1', type: 'rectangle', x: Infinity, y: 0 })
      );
      expect(result.valid).toBe(false);
    });

    it('accepts valid shape', () => {
      const result = validateDocument(
        createDocWithShape({
          id: 'shape-1',
          type: 'rectangle',
          x: 100,
          y: 200,
          width: 50,
          height: 30,
        })
      );
      expect(result.valid).toBe(true);
    });

    it('normalizes shape with default opacity', () => {
      const result = validateDocument(
        createDocWithShape({
          id: 'shape-1',
          type: 'rectangle',
          x: 0,
          y: 0,
        })
      );
      expect(result.valid).toBe(true);
      const shape = result.document!.pages['page-1']!.shapes['shape-1']!;
      expect(shape.opacity).toBe(1);
      expect(shape.visible).toBe(true);
      expect(shape.locked).toBe(false);
      expect(shape.rotation).toBe(0);
    });

    it('warns about invalid opacity', () => {
      const result = validateDocument(
        createDocWithShape({
          id: 'shape-1',
          type: 'rectangle',
          x: 0,
          y: 0,
          opacity: 2, // Invalid: > 1
        })
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Invalid opacity'))).toBe(true);
      // Should be normalized to 1
      const shape = result.document!.pages['page-1']!.shapes['shape-1']!;
      expect(shape.opacity).toBe(1);
    });
  });
});
