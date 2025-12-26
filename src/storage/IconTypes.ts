/**
 * IconTypes - Type definitions for the icon library system.
 *
 * Supports both built-in SVG icons and custom user-uploaded icons
 * stored in IndexedDB via the blob storage system.
 */

/**
 * Icon type classification.
 */
export type IconType = 'builtin' | 'custom';

/**
 * Categories for organizing icons.
 */
export type IconCategory =
  | 'arrows'
  | 'shapes'
  | 'symbols'
  | 'tech'
  | 'general'
  | 'custom';

/**
 * Metadata for an icon in the library.
 */
export interface IconMetadata {
  /** Unique identifier: 'builtin:name' or SHA-256 hash for custom */
  id: string;

  /** Display name for the icon */
  name: string;

  /** Whether this is a built-in or custom icon */
  type: IconType;

  /** Category for organization */
  category: IconCategory;

  /** SVG content for built-in icons (inline) */
  svgContent?: string;

  /** Blob ID for custom icons (reference to IndexedDB) */
  blobId?: string;

  /** Original filename for custom icons */
  originalFilename?: string;

  /** When the icon was added (custom icons only) */
  createdAt?: number;

  /** Usage count in documents (for reference tracking) */
  usageCount?: number;
}

/**
 * Icon data including the actual content.
 */
export interface IconData extends IconMetadata {
  /** The SVG content as a string */
  content: string;

  /** Data URL for rendering (svg+xml base64) */
  dataUrl: string;

  /** Viewbox dimensions if extracted */
  viewBox?: {
    width: number;
    height: number;
  };
}

/**
 * Options for rendering an icon.
 */
export interface IconRenderOptions {
  /** Size in pixels (width = height) */
  size: number;

  /** Fill color (replaces currentColor in SVG) */
  color?: string;

  /** Padding from container edge */
  padding?: number;

  /** Opacity (0-1) */
  opacity?: number;
}

/**
 * Result of uploading a custom icon.
 */
export interface IconUploadResult {
  success: boolean;
  icon?: IconMetadata;
  error?: string;
}

/**
 * Statistics for the icon library.
 */
export interface IconLibraryStats {
  builtinCount: number;
  customCount: number;
  totalCount: number;
  customStorageBytes: number;
}
