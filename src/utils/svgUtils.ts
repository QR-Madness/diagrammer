/**
 * SVG utilities for processing, sanitizing, and rendering SVG icons.
 */

/**
 * Dangerous SVG elements that could execute code.
 */
const DANGEROUS_ELEMENTS = [
  'script',
  'iframe',
  'object',
  'embed',
  'foreignObject',
  'use', // Can reference external resources
];

/**
 * Dangerous SVG attributes that could execute code.
 */
const DANGEROUS_ATTRIBUTES = [
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onreset',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onmousedown',
  'onmouseup',
  'onmousemove',
];

/**
 * Result of SVG validation.
 */
export interface SvgValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
  viewBox?: string;
}

/**
 * Sanitize an SVG string by removing dangerous elements and attributes.
 *
 * @param svgContent - Raw SVG content
 * @returns Sanitized SVG content
 */
export function sanitizeSvg(svgContent: string): string {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid SVG: ' + parserError.textContent);
  }

  // Get the SVG element
  const svg = doc.querySelector('svg');
  if (!svg) {
    throw new Error('No SVG element found');
  }

  // Remove dangerous elements
  for (const tagName of DANGEROUS_ELEMENTS) {
    const elements = svg.getElementsByTagName(tagName);
    // Remove from end to avoid index shifting
    for (let i = elements.length - 1; i >= 0; i--) {
      elements[i]?.remove();
    }
  }

  // Remove dangerous attributes from all elements
  const allElements = svg.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i];
    if (!element) continue;

    // Remove event handlers
    for (const attr of DANGEROUS_ATTRIBUTES) {
      element.removeAttribute(attr);
    }

    // Remove href/xlink:href that point to external resources or javascript
    const href = element.getAttribute('href') || element.getAttribute('xlink:href');
    if (href) {
      if (
        href.startsWith('javascript:') ||
        href.startsWith('data:text/html') ||
        (href.startsWith('http') && !href.includes('data:image'))
      ) {
        element.removeAttribute('href');
        element.removeAttribute('xlink:href');
      }
    }

    // Remove style attributes that could contain expressions
    const style = element.getAttribute('style');
    if (style && (style.includes('expression') || style.includes('javascript'))) {
      element.removeAttribute('style');
    }
  }

  // Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

/**
 * Validate an SVG string.
 *
 * @param svgContent - SVG content to validate
 * @returns Validation result
 */
export function validateSvg(svgContent: string): SvgValidationResult {
  try {
    // Try to parse as SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { valid: false, error: 'Invalid SVG markup' };
    }

    // Get the SVG element
    const svg = doc.querySelector('svg');
    if (!svg) {
      return { valid: false, error: 'No SVG element found' };
    }

    // Extract dimensions
    const viewBox = svg.getAttribute('viewBox') || undefined;
    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');

    let width: number | undefined;
    let height: number | undefined;

    // Try to get dimensions from width/height attributes
    if (widthAttr) {
      width = parseFloat(widthAttr);
    }
    if (heightAttr) {
      height = parseFloat(heightAttr);
    }

    // Fall back to viewBox
    if (viewBox && (!width || !height)) {
      const parts = viewBox.split(/\s+/);
      if (parts.length === 4) {
        width = width || parseFloat(parts[2]!);
        height = height || parseFloat(parts[3]!);
      }
    }

    // Build result object, only including defined values
    const result: SvgValidationResult = { valid: true };
    if (width !== undefined) result.width = width;
    if (height !== undefined) result.height = height;
    if (viewBox !== undefined) result.viewBox = viewBox;
    return result;
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert SVG content to a data URL.
 *
 * @param svgContent - SVG content
 * @returns Data URL (data:image/svg+xml;base64,...)
 */
export function svgToDataUrl(svgContent: string): string {
  // Ensure xmlns is present for proper image rendering
  let svg = svgContent;
  if (!svg.includes('xmlns=')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Encode as base64
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Extract viewBox dimensions from SVG content.
 *
 * @param svgContent - SVG content
 * @returns ViewBox dimensions or undefined
 */
export function extractViewBox(
  svgContent: string
): { width: number; height: number } | undefined {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg) return undefined;

  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/\s+/);
    if (parts.length === 4) {
      return {
        width: parseFloat(parts[2]!),
        height: parseFloat(parts[3]!),
      };
    }
  }

  // Try width/height attributes
  const width = svg.getAttribute('width');
  const height = svg.getAttribute('height');
  if (width && height) {
    return {
      width: parseFloat(width),
      height: parseFloat(height),
    };
  }

  return undefined;
}

/**
 * Normalize SVG to have a standard viewBox and be colorizable.
 *
 * @param svgContent - SVG content
 * @param options - Normalization options
 * @returns Normalized SVG content
 */
export function normalizeSvg(
  svgContent: string,
  options: {
    /** Force a specific viewBox */
    viewBox?: string;
    /** Replace fill colors with currentColor */
    useCurrentColor?: boolean;
    /** Remove width/height attributes */
    removeSize?: boolean;
  } = {}
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg) {
    throw new Error('No SVG element found');
  }

  // Set viewBox if specified
  if (options.viewBox) {
    svg.setAttribute('viewBox', options.viewBox);
  } else if (!svg.getAttribute('viewBox')) {
    // Create viewBox from width/height if missing
    const width = svg.getAttribute('width');
    const height = svg.getAttribute('height');
    if (width && height) {
      svg.setAttribute('viewBox', `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
    }
  }

  // Remove size attributes
  if (options.removeSize) {
    svg.removeAttribute('width');
    svg.removeAttribute('height');
  }

  // Replace colors with currentColor for theming
  if (options.useCurrentColor) {
    const allElements = svg.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      if (!element) continue;

      const fill = element.getAttribute('fill');
      if (fill && fill !== 'none' && fill !== 'currentColor') {
        element.setAttribute('fill', 'currentColor');
      }

      const stroke = element.getAttribute('stroke');
      if (stroke && stroke !== 'none' && stroke !== 'currentColor') {
        element.setAttribute('stroke', 'currentColor');
      }
    }
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

/**
 * Render SVG icon to canvas at specified position and size.
 *
 * @param ctx - Canvas 2D context
 * @param svgContent - SVG content
 * @param x - X position
 * @param y - Y position
 * @param size - Icon size (width and height)
 * @param color - Fill/stroke color (replaces currentColor)
 * @returns Promise that resolves when rendering is complete
 */
export async function renderSvgToCanvas(
  ctx: CanvasRenderingContext2D,
  svgContent: string,
  x: number,
  y: number,
  size: number,
  color?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Replace currentColor with the specified color
    let processedSvg = svgContent;
    if (color) {
      processedSvg = processedSvg.replace(/currentColor/g, color);
    }

    // Create an image element
    const img = new Image();

    img.onload = () => {
      ctx.drawImage(img, x, y, size, size);
      resolve();
    };

    img.onerror = () => {
      reject(new Error('Failed to load SVG image'));
    };

    // Set the source as a data URL
    img.src = svgToDataUrl(processedSvg);
  });
}

/**
 * Create an Image object from SVG content for caching.
 *
 * @param svgContent - SVG content
 * @param color - Fill/stroke color (replaces currentColor)
 * @returns Promise that resolves to an Image element
 */
export async function createSvgImage(
  svgContent: string,
  color?: string
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let processedSvg = svgContent;
    if (color) {
      processedSvg = processedSvg.replace(/currentColor/g, color);
    }

    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load SVG image'));

    img.src = svgToDataUrl(processedSvg);
  });
}
