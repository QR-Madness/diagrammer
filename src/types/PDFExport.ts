/**
 * PDF export types and options.
 *
 * Defines the configuration interface for exporting rich text documents to PDF.
 */

/**
 * Page size options for PDF export.
 */
export type PDFPageSize = 'a4' | 'letter' | 'a3' | 'tabloid';

/**
 * Page orientation options.
 */
export type PDFOrientation = 'portrait' | 'landscape';

/**
 * DPI/quality settings for PDF export.
 * Affects rendering quality of embedded images.
 */
export type PDFQuality = 'standard' | 'high' | 'print';

/**
 * DPI values for each quality level.
 */
export const PDF_QUALITY_DPI: Record<PDFQuality, number> = {
  standard: 72,
  high: 150,
  print: 300,
};

/**
 * Page number format options.
 */
export type PDFPageNumberFormat = 'numeric' | 'x-of-y';

/**
 * Cover page configuration.
 */
export interface PDFCoverPage {
  /** Enable cover page */
  enabled: boolean;
  /** Document title (defaults to document name) */
  title: string;
  /** Version/revision string */
  version: string;
  /** Author name */
  author: string;
  /** Date string (defaults to current date) */
  date: string;
  /** Logo blob ID from storage (null = no logo) */
  logoBlobId: string | null;
  /** Logo max width in mm */
  logoMaxWidth: number;
  /** Additional description/notes */
  description: string;
}

/**
 * Page margin settings in mm.
 */
export interface PDFMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Position options for embedding diagram in PDF.
 */
export type PDFDiagramPosition = 'before-content' | 'after-content' | 'after-cover';

/**
 * Diagram embedding configuration.
 */
export interface PDFDiagramEmbed {
  /** Enable diagram embedding */
  enabled: boolean;
  /** Position of diagram in document */
  position: PDFDiagramPosition;
  /** Export scale (1 = standard, 2 = high, 3 = print quality) */
  scale: 1 | 2 | 3;
  /** Use current theme background (dark bg in dark mode) */
  useThemeBackground: boolean;
}

/**
 * Complete PDF export options.
 */
export interface PDFExportOptions {
  /** Output filename (without .pdf extension) */
  filename: string;
  /** Page size */
  pageSize: PDFPageSize;
  /** Page orientation */
  orientation: PDFOrientation;
  /** DPI/quality setting */
  quality: PDFQuality;
  /** Page margins in mm */
  margins: PDFMargins;
  /** Cover page options */
  coverPage: PDFCoverPage;
  /** Show page numbers */
  showPageNumbers: boolean;
  /** Page number format */
  pageNumberFormat: PDFPageNumberFormat;
  /** Diagram embedding options */
  diagramEmbed?: PDFDiagramEmbed;
}

/**
 * Default cover page settings.
 */
export const DEFAULT_COVER_PAGE: PDFCoverPage = {
  enabled: false,
  title: '',
  version: '',
  author: '',
  date: '',
  logoBlobId: null,
  logoMaxWidth: 60,
  description: '',
};

/**
 * Default diagram embed settings.
 */
export const DEFAULT_DIAGRAM_EMBED: PDFDiagramEmbed = {
  enabled: false,
  position: 'after-cover',
  scale: 2,
  useThemeBackground: true,
};

/**
 * Default margins in mm.
 */
export const DEFAULT_MARGINS: PDFMargins = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
};

/**
 * Default PDF export options.
 */
export const DEFAULT_PDF_OPTIONS: PDFExportOptions = {
  filename: 'document',
  pageSize: 'a4',
  orientation: 'portrait',
  quality: 'high',
  margins: { ...DEFAULT_MARGINS },
  coverPage: { ...DEFAULT_COVER_PAGE },
  showPageNumbers: true,
  pageNumberFormat: 'x-of-y',
};

/**
 * Page size dimensions in mm.
 */
export const PAGE_SIZE_DIMENSIONS: Record<PDFPageSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  a3: { width: 297, height: 420 },
  tabloid: { width: 279.4, height: 431.8 },
};

/**
 * Get the page dimensions based on size and orientation.
 */
export function getPageDimensions(
  pageSize: PDFPageSize,
  orientation: PDFOrientation
): { width: number; height: number } {
  const { width, height } = PAGE_SIZE_DIMENSIONS[pageSize];
  if (orientation === 'landscape') {
    return { width: height, height: width };
  }
  return { width, height };
}
