/**
 * PDF export store for persisting export preferences.
 *
 * Stores user preferences for PDF export settings.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PDFPageSize,
  PDFOrientation,
  PDFQuality,
  PDFPageNumberFormat,
  PDFMargins,
  PDFCoverPage,
  PDFDiagramEmbed,
  PDFDiagramPosition,
  DEFAULT_MARGINS,
  DEFAULT_COVER_PAGE,
  DEFAULT_DIAGRAM_EMBED,
} from '../types/PDFExport';

/**
 * PDF export preferences state.
 */
export interface PDFExportState {
  /** Preferred page size */
  pageSize: PDFPageSize;
  /** Preferred orientation */
  orientation: PDFOrientation;
  /** Preferred quality setting */
  quality: PDFQuality;
  /** Preferred margins */
  margins: PDFMargins;
  /** Show page numbers */
  showPageNumbers: boolean;
  /** Page number format */
  pageNumberFormat: PDFPageNumberFormat;
  /** Cover page preferences (persisted separately from per-export options) */
  coverPageDefaults: {
    enabled: boolean;
    logoMaxWidth: number;
    logoBlobId: string | null;
    author: string;
    version: string;
    description: string;
  };
  /** Diagram embed preferences */
  diagramEmbedDefaults: {
    enabled: boolean;
    position: PDFDiagramPosition;
    scale: 1 | 2 | 3;
    useThemeBackground: boolean;
  };
}

/**
 * PDF export actions.
 */
export interface PDFExportActions {
  /** Set page size preference */
  setPageSize: (size: PDFPageSize) => void;
  /** Set orientation preference */
  setOrientation: (orientation: PDFOrientation) => void;
  /** Set quality preference */
  setQuality: (quality: PDFQuality) => void;
  /** Set margins preference */
  setMargins: (margins: PDFMargins) => void;
  /** Set show page numbers preference */
  setShowPageNumbers: (show: boolean) => void;
  /** Set page number format preference */
  setPageNumberFormat: (format: PDFPageNumberFormat) => void;
  /** Set cover page defaults */
  setCoverPageDefaults: (defaults: Partial<PDFExportState['coverPageDefaults']>) => void;
  /** Set diagram embed defaults */
  setDiagramEmbedDefaults: (defaults: Partial<PDFExportState['diagramEmbedDefaults']>) => void;
  /** Reset all preferences to defaults */
  resetPreferences: () => void;
}

/**
 * Initial state with default values.
 */
const initialState: PDFExportState = {
  pageSize: 'a4',
  orientation: 'portrait',
  quality: 'high',
  margins: { ...DEFAULT_MARGINS },
  showPageNumbers: true,
  pageNumberFormat: 'x-of-y',
  coverPageDefaults: {
    enabled: false,
    logoMaxWidth: 60,
    logoBlobId: null,
    author: '',
    version: '',
    description: '',
  },
  diagramEmbedDefaults: {
    ...DEFAULT_DIAGRAM_EMBED,
  },
};

/**
 * PDF export preferences store.
 *
 * Persists user preferences for PDF export to localStorage.
 *
 * Usage:
 * ```typescript
 * const { pageSize, setPageSize } = usePDFExportStore();
 *
 * // Get current preference
 * console.log(pageSize); // 'a4'
 *
 * // Update preference
 * setPageSize('letter');
 * ```
 */
export const usePDFExportStore = create<PDFExportState & PDFExportActions>()(
  persist(
    (set, get) => ({
      // State
      ...initialState,

      // Actions
      setPageSize: (size: PDFPageSize) => {
        set({ pageSize: size });
      },

      setOrientation: (orientation: PDFOrientation) => {
        set({ orientation: orientation });
      },

      setQuality: (quality: PDFQuality) => {
        set({ quality: quality });
      },

      setMargins: (margins: PDFMargins) => {
        set({ margins: { ...margins } });
      },

      setShowPageNumbers: (show: boolean) => {
        set({ showPageNumbers: show });
      },

      setPageNumberFormat: (format: PDFPageNumberFormat) => {
        set({ pageNumberFormat: format });
      },

      setCoverPageDefaults: (defaults: Partial<PDFExportState['coverPageDefaults']>) => {
        set({
          coverPageDefaults: {
            ...get().coverPageDefaults,
            ...defaults,
          },
        });
      },

      setDiagramEmbedDefaults: (defaults: Partial<PDFExportState['diagramEmbedDefaults']>) => {
        set({
          diagramEmbedDefaults: {
            ...get().diagramEmbedDefaults,
            ...defaults,
          },
        });
      },

      resetPreferences: () => {
        set(initialState);
      },
    }),
    {
      name: 'diagrammer-pdf-export',
      partialize: (state) => ({
        pageSize: state.pageSize,
        orientation: state.orientation,
        quality: state.quality,
        margins: state.margins,
        showPageNumbers: state.showPageNumbers,
        pageNumberFormat: state.pageNumberFormat,
        coverPageDefaults: state.coverPageDefaults,
        diagramEmbedDefaults: state.diagramEmbedDefaults,
      }),
    }
  )
);

/**
 * Create initial PDF export options from stored preferences and document name.
 */
export function createInitialPDFOptions(
  documentName: string
): {
  filename: string;
  pageSize: PDFPageSize;
  orientation: PDFOrientation;
  quality: PDFQuality;
  margins: PDFMargins;
  showPageNumbers: boolean;
  pageNumberFormat: PDFPageNumberFormat;
  coverPage: PDFCoverPage;
  diagramEmbed: PDFDiagramEmbed;
} {
  const state = usePDFExportStore.getState();
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    filename: documentName || 'document',
    pageSize: state.pageSize,
    orientation: state.orientation,
    quality: state.quality,
    margins: { ...state.margins },
    showPageNumbers: state.showPageNumbers,
    pageNumberFormat: state.pageNumberFormat,
    coverPage: {
      ...DEFAULT_COVER_PAGE,
      enabled: state.coverPageDefaults.enabled,
      logoMaxWidth: state.coverPageDefaults.logoMaxWidth,
      logoBlobId: state.coverPageDefaults.logoBlobId,
      author: state.coverPageDefaults.author,
      version: state.coverPageDefaults.version,
      description: state.coverPageDefaults.description,
      title: documentName || 'Untitled Document',
      date: today,
    },
    diagramEmbed: {
      ...state.diagramEmbedDefaults,
    },
  };
}
