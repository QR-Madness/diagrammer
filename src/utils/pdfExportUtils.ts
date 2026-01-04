/**
 * PDF export utilities for converting rich text documents to PDF.
 *
 * Uses jsPDF library to generate PDF from Tiptap JSON content.
 */

import { jsPDF } from 'jspdf';
import type { JSONContent } from '@tiptap/core';
import type { RichTextContent } from '../types/RichText';
import {
  PDFExportOptions,
  PDFCoverPage,
  getPageDimensions,
} from '../types/PDFExport';
import { blobStorage } from '../storage/BlobStorage';

/**
 * Font sizes for different heading levels (in points).
 */
const HEADING_SIZES: Record<number, number> = {
  1: 24,
  2: 20,
  3: 18,
  4: 16,
  5: 14,
  6: 12,
};

/**
 * Default body text size.
 */
const BODY_FONT_SIZE = 12;

/**
 * Line height multiplier.
 */
const LINE_HEIGHT = 1.4;

/**
 * Indentation for lists (in mm).
 */
const LIST_INDENT = 8;

/**
 * Code block styling.
 */
const CODE_BLOCK_PADDING = 3;
const CODE_BLOCK_BG_COLOR = '#f5f5f5';

/**
 * Footer height reserved for page numbers (in mm).
 */
const PAGE_NUMBER_FOOTER_HEIGHT = 10;

/**
 * Context for PDF rendering, tracks current position and state.
 */
interface PDFRenderContext {
  doc: jsPDF;
  y: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  pageNumber: number;
  totalPages: number;
  showPageNumbers: boolean;
  pageNumberFormat: 'numeric' | 'x-of-y';
  images: Map<string, string>; // blobId -> dataURL
}

/**
 * Export rich text content to PDF.
 *
 * @param options - PDF export options
 * @param richTextContent - Tiptap rich text content
 * @returns PDF blob
 */
export async function exportToPdf(
  options: PDFExportOptions,
  richTextContent: RichTextContent
): Promise<Blob> {
  const { width, height } = getPageDimensions(options.pageSize, options.orientation);

  // Create PDF document
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.pageSize,
  });

  // Load all embedded images first
  const images = await loadEmbeddedImages(richTextContent.content);

  // Load cover page logo if needed
  let logoDataUrl: string | null = null;
  if (options.coverPage.enabled && options.coverPage.logoBlobId) {
    console.log('[PDF Export] Loading logo blob:', options.coverPage.logoBlobId);
    logoDataUrl = await loadBlobAsDataUrl(options.coverPage.logoBlobId);
    console.log('[PDF Export] Logo data URL loaded:', logoDataUrl ? `${logoDataUrl.substring(0, 50)}...` : 'null');
  }

  // Calculate content area
  const contentWidth = width - options.margins.left - options.margins.right;

  // Create render context
  const ctx: PDFRenderContext = {
    doc,
    y: options.margins.top,
    pageWidth: width,
    pageHeight: height,
    contentWidth,
    marginLeft: options.margins.left,
    marginRight: options.margins.right,
    marginTop: options.margins.top,
    marginBottom: options.margins.bottom,
    pageNumber: 1,
    totalPages: 1, // Will be updated later
    showPageNumbers: options.showPageNumbers,
    pageNumberFormat: options.pageNumberFormat,
    images,
  };

  // Render cover page if enabled
  if (options.coverPage.enabled) {
    await renderCoverPage(ctx, options.coverPage, logoDataUrl);
    doc.addPage();
    ctx.pageNumber++;
    ctx.y = options.margins.top;
  }

  // Render document content
  if (richTextContent.content.content) {
    for (const node of richTextContent.content.content) {
      await renderNode(ctx, node, 0);
    }
  }

  // Store total pages
  ctx.totalPages = ctx.pageNumber;

  // Add page numbers to all pages
  if (options.showPageNumbers) {
    addPageNumbers(ctx, options.coverPage.enabled);
  }

  // Return as blob
  return doc.output('blob');
}

/**
 * Load all embedded images from content as data URLs.
 */
async function loadEmbeddedImages(content: JSONContent): Promise<Map<string, string>> {
  const images = new Map<string, string>();
  const blobIds = extractBlobIds(content);

  for (const blobId of blobIds) {
    const dataUrl = await loadBlobAsDataUrl(blobId);
    if (dataUrl) {
      images.set(blobId, dataUrl);
    }
  }

  return images;
}

/**
 * Extract all blob IDs from content (recursive).
 */
function extractBlobIds(node: JSONContent): string[] {
  const ids: string[] = [];

  if (node.type === 'image' && node.attrs?.['src']) {
    const src = node.attrs['src'] as string;
    if (src.startsWith('blob://')) {
      ids.push(src.slice(7)); // Remove 'blob://' prefix
    }
  }

  if (node.content) {
    for (const child of node.content) {
      ids.push(...extractBlobIds(child));
    }
  }

  return ids;
}

/**
 * Load a blob as a data URL.
 */
async function loadBlobAsDataUrl(blobId: string): Promise<string | null> {
  try {
    console.log('[PDF Export] loadBlobAsDataUrl called with:', blobId);
    const blob = await blobStorage.loadBlob(blobId);
    console.log('[PDF Export] blobStorage.loadBlob returned:', blob ? `Blob(${blob.size} bytes, ${blob.type})` : 'null');
    if (!blob) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log('[PDF Export] FileReader loaded, result length:', (reader.result as string)?.length);
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load blob:', blobId, error);
    return null;
  }
}

/**
 * Image dimensions result.
 */
interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Check if a data URL is an SVG image.
 */
function isSvgDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith('data:image/svg+xml');
}

/**
 * Convert an SVG data URL to a PNG data URL using canvas.
 * This is needed because jsPDF doesn't support SVG directly.
 */
async function convertSvgToPng(svgDataUrl: string, scale: number = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas with scaled dimensions for better quality
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw SVG to canvas
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      // Convert to PNG data URL
      const pngDataUrl = canvas.toDataURL('image/png');
      console.log('[PDF Export] Converted SVG to PNG, length:', pngDataUrl.length);
      resolve(pngDataUrl);
    };
    img.onerror = () => {
      reject(new Error('Failed to load SVG image'));
    };
    img.src = svgDataUrl;
  });
}

/**
 * Extract image format from a data URL.
 * Returns format suitable for jsPDF addImage (JPEG, PNG, GIF, WEBP).
 */
function getImageFormat(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/([^;]+);/);
  if (match && match[1]) {
    const mimeSubtype = match[1].toLowerCase();
    console.log('[PDF Export] Detected image mime subtype:', mimeSubtype);

    // Map common formats
    if (mimeSubtype === 'jpeg' || mimeSubtype === 'jpg') return 'JPEG';
    if (mimeSubtype === 'png') return 'PNG';
    if (mimeSubtype === 'gif') return 'GIF';
    if (mimeSubtype === 'bmp') return 'BMP';
    if (mimeSubtype === 'webp') return 'WEBP';
  }
  // Default to PNG
  return 'PNG';
}

/**
 * Get image dimensions from a data URL.
 * Returns dimensions in pixels.
 */
async function getImageDimensions(dataUrl: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = dataUrl;
  });
}

/**
 * Calculate scaled dimensions to fit within max bounds while preserving aspect ratio.
 * @param width - Original width in pixels
 * @param height - Original height in pixels
 * @param maxWidth - Maximum width in mm
 * @param maxHeight - Maximum height in mm
 * @returns Scaled dimensions in mm
 */
function calculateScaledDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Convert pixels to mm (assuming 96 DPI for screen images)
  const pxToMm = 25.4 / 96;
  let imgWidthMm = width * pxToMm;
  let imgHeightMm = height * pxToMm;

  // Scale down if needed, preserving aspect ratio
  if (imgWidthMm > maxWidth) {
    const scale = maxWidth / imgWidthMm;
    imgWidthMm = maxWidth;
    imgHeightMm *= scale;
  }

  if (imgHeightMm > maxHeight) {
    const scale = maxHeight / imgHeightMm;
    imgHeightMm = maxHeight;
    imgWidthMm *= scale;
  }

  return { width: imgWidthMm, height: imgHeightMm };
}

/**
 * Render the cover page.
 */
async function renderCoverPage(
  ctx: PDFRenderContext,
  coverPage: PDFCoverPage,
  logoDataUrl: string | null
): Promise<void> {
  const centerX = ctx.pageWidth / 2;
  let y = ctx.marginTop + 30;

  console.log('[PDF Export] renderCoverPage called, logoDataUrl:', logoDataUrl ? 'present' : 'null');

  // Logo at top
  if (logoDataUrl) {
    try {
      // Convert SVG to PNG if needed
      let imageDataUrl = logoDataUrl;
      if (isSvgDataUrl(logoDataUrl)) {
        console.log('[PDF Export] Converting SVG logo to PNG...');
        imageDataUrl = await convertSvgToPng(logoDataUrl);
      }

      // Get actual image dimensions
      console.log('[PDF Export] Getting image dimensions...');
      const dimensions = await getImageDimensions(imageDataUrl);
      console.log('[PDF Export] Image dimensions:', dimensions);

      // Calculate scaled dimensions (max width = coverPage.logoMaxWidth, max height = 60mm)
      const scaled = calculateScaledDimensions(
        dimensions.width,
        dimensions.height,
        coverPage.logoMaxWidth,
        60 // max height in mm
      );
      console.log('[PDF Export] Scaled dimensions:', scaled);

      const format = getImageFormat(imageDataUrl);
      console.log('[PDF Export] Logo format:', format);
      ctx.doc.addImage(
        imageDataUrl,
        format,
        centerX - scaled.width / 2,
        y,
        scaled.width,
        scaled.height
      );
      console.log('[PDF Export] Logo added to PDF');

      y += scaled.height + 15;
    } catch (error) {
      console.error('Failed to add logo to PDF:', error);
    }
  }

  // Decorative line
  ctx.doc.setDrawColor(100, 100, 100);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.marginLeft + 20, y, ctx.pageWidth - ctx.marginRight - 20, y);
  y += 20;

  // Title
  if (coverPage.title) {
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(24);
    const titleLines = ctx.doc.splitTextToSize(coverPage.title, ctx.contentWidth - 40);
    ctx.doc.text(titleLines, centerX, y, { align: 'center' });
    y += titleLines.length * 10 + 10;
  }

  // Thin line under title
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(ctx.marginLeft + 40, y, ctx.pageWidth - ctx.marginRight - 40, y);
  y += 20;

  // Metadata
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(12);

  if (coverPage.version) {
    ctx.doc.text(`Version: ${coverPage.version}`, centerX, y, { align: 'center' });
    y += 8;
  }

  if (coverPage.author) {
    ctx.doc.text(`Author: ${coverPage.author}`, centerX, y, { align: 'center' });
    y += 8;
  }

  if (coverPage.date) {
    ctx.doc.text(`Date: ${coverPage.date}`, centerX, y, { align: 'center' });
    y += 8;
  }

  // Description
  if (coverPage.description) {
    y += 15;
    ctx.doc.setFontSize(10);
    ctx.doc.setFont('helvetica', 'italic');
    const descLines = ctx.doc.splitTextToSize(coverPage.description, ctx.contentWidth - 60);
    ctx.doc.text(descLines, centerX, y, { align: 'center' });
  }
}

/**
 * Render a Tiptap node to PDF.
 */
async function renderNode(
  ctx: PDFRenderContext,
  node: JSONContent,
  listLevel: number,
  listCounter?: { value: number }
): Promise<void> {
  switch (node.type) {
    case 'heading':
      renderHeading(ctx, node);
      break;

    case 'paragraph':
      renderParagraph(ctx, node, listLevel);
      break;

    case 'bulletList':
      await renderBulletList(ctx, node, listLevel);
      break;

    case 'orderedList':
      await renderOrderedList(ctx, node, listLevel);
      break;

    case 'listItem':
      await renderListItem(ctx, node, listLevel, listCounter);
      break;

    case 'codeBlock':
      renderCodeBlock(ctx, node);
      break;

    case 'blockquote':
      await renderBlockquote(ctx, node);
      break;

    case 'image':
      await renderImage(ctx, node);
      break;

    case 'horizontalRule':
      renderHorizontalRule(ctx);
      break;

    default:
      // For unknown nodes with content, render children
      if (node.content) {
        for (const child of node.content) {
          await renderNode(ctx, child, listLevel, listCounter);
        }
      }
  }
}

/**
 * Render a heading node.
 */
function renderHeading(ctx: PDFRenderContext, node: JSONContent): void {
  const level = (node.attrs?.['level'] as number | undefined) || 1;
  const fontSize = HEADING_SIZES[level] || 12;

  checkPageBreak(ctx, fontSize * LINE_HEIGHT);

  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(fontSize);

  const text = extractText(node);
  const lines = ctx.doc.splitTextToSize(text, ctx.contentWidth);
  ctx.doc.text(lines, ctx.marginLeft, ctx.y);

  ctx.y += lines.length * (fontSize * 0.352778 * LINE_HEIGHT) + 4;
}

/**
 * Render a paragraph node.
 */
function renderParagraph(ctx: PDFRenderContext, node: JSONContent, indent: number): void {
  const fontSize = BODY_FONT_SIZE;
  checkPageBreak(ctx, fontSize * LINE_HEIGHT);

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(fontSize);

  const text = extractText(node);
  if (!text.trim()) {
    // Empty paragraph - add some space
    ctx.y += fontSize * 0.352778 * LINE_HEIGHT;
    return;
  }

  const indentMm = indent * LIST_INDENT;
  const availableWidth = ctx.contentWidth - indentMm;
  const lines = ctx.doc.splitTextToSize(text, availableWidth);

  // Render with marks (simplified - full implementation would handle inline formatting)
  ctx.doc.text(lines, ctx.marginLeft + indentMm, ctx.y);
  ctx.y += lines.length * (fontSize * 0.352778 * LINE_HEIGHT) + 2;
}

/**
 * Render a bullet list.
 */
async function renderBulletList(
  ctx: PDFRenderContext,
  node: JSONContent,
  listLevel: number
): Promise<void> {
  if (!node.content) return;

  for (const child of node.content) {
    await renderNode(ctx, child, listLevel + 1);
  }

  ctx.y += 2;
}

/**
 * Render an ordered list.
 */
async function renderOrderedList(
  ctx: PDFRenderContext,
  node: JSONContent,
  listLevel: number
): Promise<void> {
  if (!node.content) return;

  const counter = { value: (node.attrs?.['start'] as number | undefined) || 1 };

  for (const child of node.content) {
    await renderNode(ctx, child, listLevel + 1, counter);
  }

  ctx.y += 2;
}

/**
 * Render a list item.
 */
async function renderListItem(
  ctx: PDFRenderContext,
  node: JSONContent,
  listLevel: number,
  listCounter?: { value: number }
): Promise<void> {
  if (!node.content) return;

  const fontSize = BODY_FONT_SIZE;
  checkPageBreak(ctx, fontSize * LINE_HEIGHT);

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(fontSize);

  const indentMm = listLevel * LIST_INDENT;

  // Draw bullet or number
  const bulletX = ctx.marginLeft + indentMm - 4;

  if (listCounter) {
    // Ordered list
    ctx.doc.text(`${listCounter.value}.`, bulletX, ctx.y);
    listCounter.value++;
  } else {
    // Bullet list
    ctx.doc.setFillColor(0, 0, 0);
    ctx.doc.circle(bulletX, ctx.y - 1.5, 1, 'F');
  }

  // Render list item content
  for (const child of node.content) {
    await renderNode(ctx, child, listLevel);
  }
}

/**
 * Render a code block.
 */
function renderCodeBlock(ctx: PDFRenderContext, node: JSONContent): void {
  const text = extractText(node);
  const fontSize = 10;

  ctx.doc.setFont('courier', 'normal');
  ctx.doc.setFontSize(fontSize);

  const lines = ctx.doc.splitTextToSize(text, ctx.contentWidth - CODE_BLOCK_PADDING * 2);
  const blockHeight = lines.length * (fontSize * 0.352778 * LINE_HEIGHT) + CODE_BLOCK_PADDING * 2;

  checkPageBreak(ctx, blockHeight);

  // Draw background
  ctx.doc.setFillColor(CODE_BLOCK_BG_COLOR);
  ctx.doc.rect(
    ctx.marginLeft,
    ctx.y - 3,
    ctx.contentWidth,
    blockHeight,
    'F'
  );

  // Draw text
  ctx.doc.setTextColor(0, 0, 0);
  ctx.doc.text(lines, ctx.marginLeft + CODE_BLOCK_PADDING, ctx.y + CODE_BLOCK_PADDING);

  ctx.y += blockHeight + 4;

  // Reset font
  ctx.doc.setFont('helvetica', 'normal');
}

/**
 * Render a blockquote.
 */
async function renderBlockquote(ctx: PDFRenderContext, node: JSONContent): Promise<void> {
  if (!node.content) return;

  const startY = ctx.y;

  // Render content with indent
  ctx.doc.setFont('helvetica', 'italic');

  for (const child of node.content) {
    await renderNode(ctx, child, 1);
  }

  // Draw left border
  ctx.doc.setDrawColor(150, 150, 150);
  ctx.doc.setLineWidth(1);
  ctx.doc.line(ctx.marginLeft + 2, startY - 2, ctx.marginLeft + 2, ctx.y - 2);

  ctx.doc.setFont('helvetica', 'normal');
  ctx.y += 2;
}

/**
 * Render an image.
 */
async function renderImage(ctx: PDFRenderContext, node: JSONContent): Promise<void> {
  const src = node.attrs?.['src'] as string | undefined;
  if (!src) return;

  let dataUrl: string | undefined;

  if (src.startsWith('blob://')) {
    const blobId = src.slice(7);
    dataUrl = ctx.images.get(blobId);
  } else if (src.startsWith('data:')) {
    dataUrl = src;
  }

  if (!dataUrl) {
    // Image not found - skip
    return;
  }

  try {
    // Convert SVG to PNG if needed
    let imageDataUrl = dataUrl;
    if (isSvgDataUrl(dataUrl)) {
      console.log('[PDF Export] Converting SVG image to PNG...');
      imageDataUrl = await convertSvgToPng(dataUrl);
    }

    // Get actual image dimensions from the data URL
    const dimensions = await getImageDimensions(imageDataUrl);

    // Calculate max dimensions for the content area
    const maxWidth = ctx.contentWidth * 0.9;
    const footerSpace = ctx.showPageNumbers ? PAGE_NUMBER_FOOTER_HEIGHT : 0;
    const maxHeight = ctx.pageHeight - ctx.marginTop - ctx.marginBottom - footerSpace - 10;

    // Calculate scaled dimensions preserving aspect ratio
    const scaled = calculateScaledDimensions(
      dimensions.width,
      dimensions.height,
      maxWidth,
      maxHeight
    );

    checkPageBreak(ctx, scaled.height + 4);

    // Center the image
    const x = ctx.marginLeft + (ctx.contentWidth - scaled.width) / 2;

    const format = getImageFormat(imageDataUrl);
    ctx.doc.addImage(imageDataUrl, format, x, ctx.y, scaled.width, scaled.height);
    ctx.y += scaled.height + 6;
  } catch (error) {
    console.error('Failed to add image to PDF:', error);
  }
}

/**
 * Render a horizontal rule.
 */
function renderHorizontalRule(ctx: PDFRenderContext): void {
  checkPageBreak(ctx, 10);

  ctx.y += 4;
  ctx.doc.setDrawColor(200, 200, 200);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.marginLeft, ctx.y, ctx.marginLeft + ctx.contentWidth, ctx.y);
  ctx.y += 6;
}

/**
 * Extract plain text from a node (recursive).
 */
function extractText(node: JSONContent): string {
  if (node.type === 'text') {
    return node.text || '';
  }

  if (!node.content) {
    return '';
  }

  return node.content.map((child) => extractText(child)).join('');
}

/**
 * Check if we need a page break, and add one if necessary.
 * Accounts for footer space when page numbers are enabled.
 */
function checkPageBreak(ctx: PDFRenderContext, requiredHeight: number): void {
  // Reserve extra space for page numbers if enabled
  const footerSpace = ctx.showPageNumbers ? PAGE_NUMBER_FOOTER_HEIGHT : 0;
  const availableHeight = ctx.pageHeight - ctx.marginBottom - footerSpace - ctx.y;

  if (requiredHeight > availableHeight) {
    ctx.doc.addPage();
    ctx.pageNumber++;
    ctx.y = ctx.marginTop;
  }
}

/**
 * Add page numbers to all pages.
 */
function addPageNumbers(ctx: PDFRenderContext, hasCoverPage: boolean): void {
  const totalPages = ctx.doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    ctx.doc.setPage(i);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(10);
    ctx.doc.setTextColor(128, 128, 128);

    let pageText: string;
    if (ctx.pageNumberFormat === 'x-of-y') {
      if (hasCoverPage) {
        if (i === 1) {
          pageText = `Page 1 of ${totalPages}`;
        } else {
          pageText = `Page ${i} of ${totalPages}`;
        }
      } else {
        pageText = `Page ${i} of ${totalPages}`;
      }
    } else {
      pageText = `${i}`;
    }

    ctx.doc.text(
      pageText,
      ctx.pageWidth - ctx.marginRight,
      ctx.pageHeight - ctx.marginBottom / 2,
      { align: 'right' }
    );
  }

  // Reset text color
  ctx.doc.setTextColor(0, 0, 0);
}
