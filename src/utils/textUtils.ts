/**
 * Wrap text to fit within a given width.
 * Returns an array of lines.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string
): string[] {
  // Set up font for measurement
  ctx.font = `${fontSize}px ${fontFamily}`;

  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Render wrapped text centered within a bounding box.
 * @param ctx - Canvas rendering context
 * @param text - Text to render
 * @param maxWidth - Maximum width for text wrapping
 * @param maxHeight - Maximum height for text (for vertical centering)
 * @param fontSize - Font size in pixels
 * @param fontFamily - Font family
 * @param fillStyle - Fill color for text
 */
export function renderWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontSize: number,
  fontFamily: string,
  fillStyle: string
): void {
  const lines = wrapText(ctx, text, maxWidth, fontSize, fontFamily);
  const lineHeight = fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;

  // Calculate starting Y position to center text vertically
  const startY = -totalTextHeight / 2 + lineHeight / 2;

  ctx.fillStyle = fillStyle;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Only render lines that fit within maxHeight
  const maxLines = Math.floor(maxHeight / lineHeight);
  const linesToRender = lines.slice(0, maxLines);

  linesToRender.forEach((line, index) => {
    ctx.fillText(line, 0, startY + index * lineHeight);
  });
}
