/**
 * PDF Export Dialog for configuring and exporting rich text documents to PDF.
 */

import { useState, useCallback, useEffect } from 'react';
import { exportToPdf } from '../utils/pdfExportUtils';
import { downloadBlob } from '../utils/downloadUtils';
import { usePersistenceStore } from '../store/persistenceStore';
import { useRichTextStore } from '../store/richTextStore';
import { usePDFExportStore, createInitialPDFOptions } from '../store/pdfExportStore';
import { isRichTextEmpty } from '../types/RichText';
import { LogoPicker } from './LogoPicker';
import type {
  PDFPageSize,
  PDFOrientation,
  PDFQuality,
  PDFPageNumberFormat,
  PDFExportOptions,
  PDFMargins,
} from '../types/PDFExport';
import './PDFExportDialog.css';

export interface PDFExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PDFExportDialog({ isOpen, onClose }: PDFExportDialogProps) {
  // Get document and content
  const currentDocumentName = usePersistenceStore((s) => s.currentDocumentName);
  const richTextContent = useRichTextStore((s) => s.content);

  // Get stored preferences
  const storePrefs = usePDFExportStore();

  // Local state for form
  const [filename, setFilename] = useState('');
  const [pageSize, setPageSize] = useState<PDFPageSize>('a4');
  const [orientation, setOrientation] = useState<PDFOrientation>('portrait');
  const [quality, setQuality] = useState<PDFQuality>('high');
  const [margins, setMargins] = useState<PDFMargins>({ top: 20, right: 20, bottom: 20, left: 20 });
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [pageNumberFormat, setPageNumberFormat] = useState<PDFPageNumberFormat>('x-of-y');

  // Cover page state
  const [coverPageEnabled, setCoverPageEnabled] = useState(false);
  const [coverPageExpanded, setCoverPageExpanded] = useState(false);
  const [coverTitle, setCoverTitle] = useState('');
  const [coverVersion, setCoverVersion] = useState('');
  const [coverAuthor, setCoverAuthor] = useState('');
  const [coverDate, setCoverDate] = useState('');
  const [coverLogoBlobId, setCoverLogoBlobId] = useState<string | null>(null);
  const [coverLogoMaxWidth, setCoverLogoMaxWidth] = useState(60);
  const [coverDescription, setCoverDescription] = useState('');

  // UI state
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (isOpen) {
      const initialOptions = createInitialPDFOptions(currentDocumentName || 'document');
      setFilename(initialOptions.filename);
      setPageSize(initialOptions.pageSize);
      setOrientation(initialOptions.orientation);
      setQuality(initialOptions.quality);
      setMargins(initialOptions.margins);
      setShowPageNumbers(initialOptions.showPageNumbers);
      setPageNumberFormat(initialOptions.pageNumberFormat);
      setCoverPageEnabled(initialOptions.coverPage.enabled);
      setCoverTitle(initialOptions.coverPage.title);
      setCoverVersion(initialOptions.coverPage.version);
      setCoverAuthor(initialOptions.coverPage.author);
      setCoverDate(initialOptions.coverPage.date);
      setCoverLogoBlobId(initialOptions.coverPage.logoBlobId);
      setCoverLogoMaxWidth(initialOptions.coverPage.logoMaxWidth);
      setCoverDescription(initialOptions.coverPage.description);
      setError(null);
    }
  }, [isOpen, currentDocumentName]);

  const handleExport = useCallback(async () => {
    // Check if document has content
    if (isRichTextEmpty(richTextContent)) {
      setError('Document is empty. Add some content before exporting.');
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      const options: PDFExportOptions = {
        filename,
        pageSize,
        orientation,
        quality,
        margins,
        showPageNumbers,
        pageNumberFormat,
        coverPage: {
          enabled: coverPageEnabled,
          title: coverTitle,
          version: coverVersion,
          author: coverAuthor,
          date: coverDate,
          logoBlobId: coverLogoBlobId,
          logoMaxWidth: coverLogoMaxWidth,
          description: coverDescription,
        },
      };

      // Save preferences
      storePrefs.setPageSize(pageSize);
      storePrefs.setOrientation(orientation);
      storePrefs.setQuality(quality);
      storePrefs.setMargins(margins);
      storePrefs.setShowPageNumbers(showPageNumbers);
      storePrefs.setPageNumberFormat(pageNumberFormat);
      storePrefs.setCoverPageDefaults({
        enabled: coverPageEnabled,
        logoMaxWidth: coverLogoMaxWidth,
      });

      const pdfBlob = await exportToPdf(options, richTextContent);
      downloadBlob(pdfBlob, `${filename}.pdf`);

      onClose();
    } catch (err) {
      console.error('PDF export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [
    filename,
    pageSize,
    orientation,
    quality,
    margins,
    showPageNumbers,
    pageNumberFormat,
    coverPageEnabled,
    coverTitle,
    coverVersion,
    coverAuthor,
    coverDate,
    coverLogoBlobId,
    coverLogoMaxWidth,
    coverDescription,
    richTextContent,
    storePrefs,
    onClose,
  ]);

  const handleMarginChange = useCallback((key: keyof PDFMargins, value: string) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    setMargins((prev) => ({ ...prev, [key]: numValue }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="pdf-export-overlay" onClick={onClose}>
      <div className="pdf-export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-export-header">
          <h2>Export to PDF</h2>
          <button className="pdf-export-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="pdf-export-content">
          {/* Basic Settings */}
          <div className="pdf-export-section">
            <h3 className="pdf-export-section-title">Basic Settings</h3>

            {/* Filename */}
            <div className="pdf-export-field">
              <label>Filename</label>
              <div className="pdf-export-filename-group">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="document"
                />
                <span className="pdf-export-extension">.pdf</span>
              </div>
            </div>

            {/* Page Size */}
            <div className="pdf-export-field">
              <label>Page Size</label>
              <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PDFPageSize)}>
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="a3">A3 (297 × 420 mm)</option>
                <option value="tabloid">Tabloid (11 × 17 in)</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="pdf-export-field">
              <label>Orientation</label>
              <div className="pdf-export-toggle">
                <button
                  className={orientation === 'portrait' ? 'active' : ''}
                  onClick={() => setOrientation('portrait')}
                >
                  Portrait
                </button>
                <button
                  className={orientation === 'landscape' ? 'active' : ''}
                  onClick={() => setOrientation('landscape')}
                >
                  Landscape
                </button>
              </div>
            </div>

            {/* Quality */}
            <div className="pdf-export-field">
              <label>Image Quality</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value as PDFQuality)}>
                <option value="standard">Standard (72 DPI)</option>
                <option value="high">High (150 DPI)</option>
                <option value="print">Print (300 DPI)</option>
              </select>
            </div>
          </div>

          {/* Layout Settings */}
          <div className="pdf-export-section">
            <h3 className="pdf-export-section-title">Layout</h3>

            {/* Margins */}
            <div className="pdf-export-field">
              <label>Margins (mm)</label>
              <div className="pdf-export-margins">
                <div className="pdf-export-margin-input">
                  <span>Top</span>
                  <input
                    type="number"
                    value={margins.top}
                    onChange={(e) => handleMarginChange('top', e.target.value)}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="pdf-export-margin-input">
                  <span>Right</span>
                  <input
                    type="number"
                    value={margins.right}
                    onChange={(e) => handleMarginChange('right', e.target.value)}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="pdf-export-margin-input">
                  <span>Bottom</span>
                  <input
                    type="number"
                    value={margins.bottom}
                    onChange={(e) => handleMarginChange('bottom', e.target.value)}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="pdf-export-margin-input">
                  <span>Left</span>
                  <input
                    type="number"
                    value={margins.left}
                    onChange={(e) => handleMarginChange('left', e.target.value)}
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>

            {/* Page Numbers */}
            <div className="pdf-export-field pdf-export-field-inline">
              <label className="pdf-export-checkbox">
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                />
                Show Page Numbers
              </label>
              {showPageNumbers && (
                <select
                  value={pageNumberFormat}
                  onChange={(e) => setPageNumberFormat(e.target.value as PDFPageNumberFormat)}
                  className="pdf-export-inline-select"
                >
                  <option value="x-of-y">Page X of Y</option>
                  <option value="numeric">X</option>
                </select>
              )}
            </div>
          </div>

          {/* Cover Page Section */}
          <div className="pdf-export-section pdf-export-section-collapsible">
            <button
              className="pdf-export-section-header"
              onClick={() => setCoverPageExpanded(!coverPageExpanded)}
            >
              <span className={`pdf-export-chevron ${coverPageExpanded ? 'expanded' : ''}`}>▶</span>
              <h3 className="pdf-export-section-title">Cover Page</h3>
              <label
                className="pdf-export-checkbox pdf-export-section-toggle"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={coverPageEnabled}
                  onChange={(e) => setCoverPageEnabled(e.target.checked)}
                />
                Enable
              </label>
            </button>

            {coverPageExpanded && (
              <div className="pdf-export-section-content">
                {/* Title */}
                <div className="pdf-export-field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={coverTitle}
                    onChange={(e) => setCoverTitle(e.target.value)}
                    placeholder="Document Title"
                    disabled={!coverPageEnabled}
                  />
                </div>

                {/* Version */}
                <div className="pdf-export-field">
                  <label>Version / Revision</label>
                  <input
                    type="text"
                    value={coverVersion}
                    onChange={(e) => setCoverVersion(e.target.value)}
                    placeholder="e.g., 1.0.0"
                    disabled={!coverPageEnabled}
                  />
                </div>

                {/* Author */}
                <div className="pdf-export-field">
                  <label>Author</label>
                  <input
                    type="text"
                    value={coverAuthor}
                    onChange={(e) => setCoverAuthor(e.target.value)}
                    placeholder="Author Name"
                    disabled={!coverPageEnabled}
                  />
                </div>

                {/* Date */}
                <div className="pdf-export-field">
                  <label>Date</label>
                  <input
                    type="text"
                    value={coverDate}
                    onChange={(e) => setCoverDate(e.target.value)}
                    placeholder="e.g., January 3, 2026"
                    disabled={!coverPageEnabled}
                  />
                </div>

                {/* Logo */}
                <div className="pdf-export-field">
                  <label>Logo</label>
                  <div className="pdf-export-logo-field">
                    <button
                      className="pdf-export-logo-btn"
                      onClick={() => setLogoPickerOpen(true)}
                      disabled={!coverPageEnabled}
                    >
                      {coverLogoBlobId ? 'Change Logo' : 'Select Logo'}
                    </button>
                    {coverLogoBlobId && (
                      <button
                        className="pdf-export-logo-clear"
                        onClick={() => setCoverLogoBlobId(null)}
                        disabled={!coverPageEnabled}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Logo Max Width */}
                {coverLogoBlobId && (
                  <div className="pdf-export-field">
                    <label>Logo Max Width (mm)</label>
                    <input
                      type="number"
                      value={coverLogoMaxWidth}
                      onChange={(e) => setCoverLogoMaxWidth(Math.max(10, Math.min(200, parseInt(e.target.value) || 60)))}
                      min={10}
                      max={200}
                      disabled={!coverPageEnabled}
                    />
                  </div>
                )}

                {/* Description */}
                <div className="pdf-export-field">
                  <label>Description / Notes</label>
                  <textarea
                    value={coverDescription}
                    onChange={(e) => setCoverDescription(e.target.value)}
                    placeholder="Optional description or notes"
                    rows={3}
                    disabled={!coverPageEnabled}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && <div className="pdf-export-error">{error}</div>}
        </div>

        <div className="pdf-export-footer">
          <button className="pdf-export-btn pdf-export-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="pdf-export-btn pdf-export-btn-primary"
            onClick={handleExport}
            disabled={isExporting || !filename.trim()}
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Logo Picker Modal */}
      <LogoPicker
        isOpen={logoPickerOpen}
        selectedId={coverLogoBlobId}
        onSelect={setCoverLogoBlobId}
        onClose={() => setLogoPickerOpen(false)}
      />
    </div>
  );
}
