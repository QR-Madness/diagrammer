/**
 * Document and Page type definitions for multi-page document support.
 */

import { Shape } from '../shapes/Shape';
import { RichTextContent } from './RichText';

/**
 * A single page within a document.
 * Each page has its own shapes and z-order.
 */
export interface Page {
  /** Unique page identifier */
  id: string;
  /** Display name of the page */
  name: string;
  /** Shapes on this page, keyed by ID */
  shapes: Record<string, Shape>;
  /** Z-order of shapes (first = bottom, last = top) */
  shapeOrder: string[];
  /** Timestamp when page was created */
  createdAt: number;
  /** Timestamp when page was last modified */
  modifiedAt: number;
}

/**
 * A complete diagram document containing multiple pages.
 */
export interface DiagramDocument {
  /** Unique document identifier */
  id: string;
  /** Display name of the document */
  name: string;
  /** All pages in the document, keyed by ID */
  pages: Record<string, Page>;
  /** Order of pages (for tab display) */
  pageOrder: string[];
  /** Currently active page ID */
  activePageId: string;
  /** Timestamp when document was created */
  createdAt: number;
  /** Timestamp when document was last modified */
  modifiedAt: number;
  /** Schema version for migration support */
  version: number;
  /** Rich text document content (optional for backwards compatibility) */
  richTextContent?: RichTextContent;
  /** Blob IDs referenced by this document (for garbage collection) */
  blobReferences?: string[];
}

/**
 * Lightweight metadata for document listing.
 * Used in the document index to avoid loading full documents.
 */
export interface DocumentMetadata {
  /** Unique document identifier */
  id: string;
  /** Display name of the document */
  name: string;
  /** Number of pages in the document */
  pageCount: number;
  /** Timestamp when document was last modified */
  modifiedAt: number;
  /** Timestamp when document was created */
  createdAt: number;
}

/**
 * Snapshot of page content for serialization.
 */
export interface PageSnapshot {
  shapes: Record<string, Shape>;
  shapeOrder: string[];
}

/**
 * Current document schema version.
 * Increment when making breaking changes to the document structure.
 */
export const DOCUMENT_VERSION = 1;

/**
 * localStorage keys for document persistence.
 */
export const STORAGE_KEYS = {
  /** Index of all saved documents (DocumentMetadata[]) */
  DOCUMENT_INDEX: 'diagrammer-documents',
  /** Prefix for individual document storage */
  DOCUMENT_PREFIX: 'diagrammer-doc-',
  /** ID of the last opened document */
  CURRENT_DOCUMENT: 'diagrammer-current-doc',
} as const;

/**
 * Create a new empty page with default values.
 */
export function createPage(name: string, id: string): Page {
  const now = Date.now();
  return {
    id,
    name,
    shapes: {},
    shapeOrder: [],
    createdAt: now,
    modifiedAt: now,
  };
}

/**
 * Create a new empty document with a single page.
 */
export function createDocument(name: string, docId: string, pageId: string): DiagramDocument {
  const now = Date.now();
  const firstPage = createPage('Page 1', pageId);

  return {
    id: docId,
    name,
    pages: { [pageId]: firstPage },
    pageOrder: [pageId],
    activePageId: pageId,
    createdAt: now,
    modifiedAt: now,
    version: DOCUMENT_VERSION,
  };
}

/**
 * Extract metadata from a full document.
 */
export function getDocumentMetadata(doc: DiagramDocument): DocumentMetadata {
  return {
    id: doc.id,
    name: doc.name,
    pageCount: doc.pageOrder.length,
    modifiedAt: doc.modifiedAt,
    createdAt: doc.createdAt,
  };
}
