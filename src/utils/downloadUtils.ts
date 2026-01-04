/**
 * Download utilities for exporting files.
 */

/**
 * Trigger a file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download an SVG string as a file.
 */
export function downloadSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  downloadBlob(blob, filename);
}

/**
 * Download a PNG blob as a file.
 */
export function downloadPng(blob: Blob, filename: string): void {
  downloadBlob(blob, filename);
}

/**
 * Download a PDF blob as a file.
 */
export function downloadPdf(blob: Blob, filename: string): void {
  downloadBlob(blob, filename);
}
