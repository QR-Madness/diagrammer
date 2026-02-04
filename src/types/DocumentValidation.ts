/**
 * Document Validation Utilities
 *
 * Validates document structure before import to prevent crashes
 * from malformed or incompatible document files.
 *
 * Phase 14.9.2 - Document import validation
 */

import type { DiagramDocument, Page } from './Document';
import type { Shape } from '../shapes/Shape';

// ============ Types ============

/** Validation result */
export interface ValidationResult {
  /** Whether the document is valid */
  valid: boolean;
  /** Error messages if invalid */
  errors: string[];
  /** Warning messages (valid but potentially problematic) */
  warnings: string[];
  /** Normalized document (with defaults applied) if valid */
  document?: DiagramDocument;
}

// ============ Validation Functions ============

/**
 * Validate a parsed document object.
 * Returns validation result with errors and warnings.
 */
export function validateDocument(doc: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if it's an object
  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['Document must be an object'], warnings: [] };
  }

  const d = doc as Record<string, unknown>;

  // Required fields
  if (typeof d['id'] !== 'string' || d['id'].length === 0) {
    errors.push('Missing or invalid document ID');
  }

  if (typeof d['name'] !== 'string') {
    errors.push('Missing or invalid document name');
  }

  if (!d['pages'] || typeof d['pages'] !== 'object') {
    errors.push('Missing or invalid pages object');
  }

  if (!Array.isArray(d['pageOrder'])) {
    errors.push('Missing or invalid pageOrder array');
  }

  if (typeof d['activePageId'] !== 'string') {
    errors.push('Missing or invalid activePageId');
  }

  // If basic structure is invalid, return early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const pages = d['pages'] as Record<string, unknown>;
  const pageOrder = d['pageOrder'] as string[];

  // Validate page references
  for (const pageId of pageOrder) {
    if (!pages[pageId]) {
      errors.push(`Page referenced in order but missing: ${pageId}`);
    }
  }

  // Validate each page
  for (const [pageId, page] of Object.entries(pages)) {
    const pageResult = validatePage(page, pageId);
    if (!pageResult.valid) {
      errors.push(...pageResult.errors.map((e) => `Page "${pageId}": ${e}`));
    }
    warnings.push(...pageResult.warnings.map((w) => `Page "${pageId}": ${w}`));
  }

  // Validate activePageId references valid page
  if (!pages[d['activePageId'] as string]) {
    errors.push(`Active page ID "${d['activePageId']}" does not exist`);
  }

  // Version check
  if (typeof d['version'] !== 'number') {
    warnings.push('Missing document version, will use default');
  }

  // Blob references validation
  if (d['blobReferences'] !== undefined && !Array.isArray(d['blobReferences'])) {
    warnings.push('Invalid blobReferences format, will be ignored');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Create normalized document with defaults
  const normalizedDoc = normalizeDocument(d as unknown as DiagramDocument);

  return { valid: true, errors: [], warnings, document: normalizedDoc };
}

/**
 * Validate a page object.
 */
function validatePage(page: unknown, pageId: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!page || typeof page !== 'object') {
    return { valid: false, errors: ['Page must be an object'], warnings: [] };
  }

  const p = page as Record<string, unknown>;

  // Required fields
  if (typeof p['id'] !== 'string') {
    errors.push('Missing or invalid page ID');
  } else if (p['id'] !== pageId) {
    warnings.push(`Page ID mismatch: key="${pageId}", id="${p['id']}"`);
  }

  if (typeof p['name'] !== 'string') {
    errors.push('Missing or invalid page name');
  }

  if (!p['shapes'] || typeof p['shapes'] !== 'object') {
    errors.push('Missing or invalid shapes object');
  }

  if (!Array.isArray(p['shapeOrder'])) {
    errors.push('Missing or invalid shapeOrder array');
  }

  // If basic structure is invalid, return early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const shapes = p['shapes'] as Record<string, unknown>;
  const shapeOrder = p['shapeOrder'] as string[];

  // Validate shape references
  for (const shapeId of shapeOrder) {
    if (!shapes[shapeId]) {
      warnings.push(`Shape in order but missing: ${shapeId}`);
    }
  }

  // Validate each shape
  for (const [shapeId, shape] of Object.entries(shapes)) {
    const shapeResult = validateShape(shape, shapeId);
    if (!shapeResult.valid) {
      errors.push(...shapeResult.errors.map((e) => `Shape "${shapeId}": ${e}`));
    }
    warnings.push(...shapeResult.warnings.map((w) => `Shape "${shapeId}": ${w}`));
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a shape object.
 */
function validateShape(shape: unknown, shapeId: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!shape || typeof shape !== 'object') {
    return { valid: false, errors: ['Shape must be an object'], warnings: [] };
  }

  const s = shape as Record<string, unknown>;

  // Required fields for all shapes
  if (typeof s['id'] !== 'string') {
    errors.push('Missing or invalid shape ID');
  } else if (s['id'] !== shapeId) {
    warnings.push(`Shape ID mismatch: key="${shapeId}", id="${s['id']}"`);
  }

  if (typeof s['type'] !== 'string' || s['type'].length === 0) {
    errors.push('Missing or invalid shape type');
  }

  if (typeof s['x'] !== 'number' || !isFinite(s['x'])) {
    errors.push('Missing or invalid x coordinate');
  }

  if (typeof s['y'] !== 'number' || !isFinite(s['y'])) {
    errors.push('Missing or invalid y coordinate');
  }

  // Validate optional common properties
  if (s['rotation'] !== undefined && (typeof s['rotation'] !== 'number' || !isFinite(s['rotation']))) {
    warnings.push('Invalid rotation value, will use default');
  }

  if (s['opacity'] !== undefined && (typeof s['opacity'] !== 'number' || s['opacity'] < 0 || s['opacity'] > 1)) {
    warnings.push('Invalid opacity value, will use default');
  }

  if (s['visible'] !== undefined && typeof s['visible'] !== 'boolean') {
    warnings.push('Invalid visible value, will use default');
  }

  if (s['locked'] !== undefined && typeof s['locked'] !== 'boolean') {
    warnings.push('Invalid locked value, will use default');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Normalize document by applying defaults for missing optional fields.
 */
function normalizeDocument(doc: DiagramDocument): DiagramDocument {
  const now = Date.now();

  return {
    ...doc,
    version: doc.version ?? 1,
    createdAt: doc.createdAt ?? now,
    modifiedAt: doc.modifiedAt ?? now,
    blobReferences: Array.isArray(doc.blobReferences) ? doc.blobReferences : [],
    pages: normalizePages(doc.pages),
  };
}

/**
 * Normalize pages by applying defaults.
 */
function normalizePages(pages: Record<string, Page>): Record<string, Page> {
  const normalized: Record<string, Page> = {};
  const now = Date.now();

  for (const [id, page] of Object.entries(pages)) {
    normalized[id] = {
      ...page,
      createdAt: page.createdAt ?? now,
      modifiedAt: page.modifiedAt ?? now,
      shapes: normalizeShapes(page.shapes),
    };
  }

  return normalized;
}

/**
 * Normalize shapes by applying defaults.
 */
function normalizeShapes(shapes: Record<string, Shape>): Record<string, Shape> {
  const normalized: Record<string, Shape> = {};

  for (const [id, shape] of Object.entries(shapes)) {
    normalized[id] = {
      ...shape,
      rotation: shape.rotation ?? 0,
      opacity: typeof shape.opacity === 'number' && shape.opacity >= 0 && shape.opacity <= 1
        ? shape.opacity
        : 1,
      visible: shape.visible ?? true,
      locked: shape.locked ?? false,
    };
  }

  return normalized;
}

/**
 * Validate JSON string as document.
 * Handles parse errors and validates structure.
 */
export function validateDocumentJSON(json: string): ValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown parse error';
    return { valid: false, errors: [`Invalid JSON: ${message}`], warnings: [] };
  }

  return validateDocument(parsed);
}
