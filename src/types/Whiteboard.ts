/**
 * Whiteboard type definitions for sticky notes.
 *
 * The whiteboard is a document-global overlay for idea tracking and brainstorming.
 * Notes are NOT canvas shapes - they're separate UI elements for quick drafting.
 */

/**
 * Default sticky note color (hex).
 */
export const DEFAULT_NOTE_COLOR = '#fef3c7';

/**
 * Preset colors for the color picker.
 */
export const NOTE_PRESET_COLORS = [
  '#fef3c7',
  '#fce7f3',
  '#dbeafe',
  '#d1fae5',
  '#ffedd5',
  '#fde68a',
  '#fecaca',
  '#bfdbfe',
  '#a7f3d0',
  '#fed7aa',
  '#e9d5ff',
  '#cffafe',
];

/**
 * A single sticky note on the whiteboard.
 */
export interface WhiteboardNote {
  /** Unique note identifier */
  id: string;
  /** X position in pixels from left */
  x: number;
  /** Y position in pixels from top */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Note background color (hex string) */
  color: string;
  /** HTML content (allowed: b, i, br) */
  content: string;
  /** Z-index for stacking order */
  zIndex: number;
  /** Timestamp when created */
  createdAt: number;
  /** Timestamp when last modified */
  modifiedAt: number;
}

/**
 * Whiteboard state stored in a document.
 */
export interface WhiteboardState {
  /** All notes keyed by ID */
  notes: Record<string, WhiteboardNote>;
  /** Note IDs in z-order (first = bottom) */
  noteOrder: string[];
  /** Whether the whiteboard overlay is visible */
  isVisible: boolean;
}

/**
 * Default dimensions for new notes.
 */
export const DEFAULT_NOTE_WIDTH = 200;
export const DEFAULT_NOTE_HEIGHT = 150;
export const MIN_NOTE_WIDTH = 100;
export const MIN_NOTE_HEIGHT = 80;

/**
 * Create a new empty whiteboard state.
 */
export function createEmptyWhiteboardState(): WhiteboardState {
  return {
    notes: {},
    noteOrder: [],
    isVisible: false,
  };
}

/**
 * Create a new note with default values.
 */
export function createNote(
  id: string,
  x: number,
  y: number,
  color: string = DEFAULT_NOTE_COLOR
): WhiteboardNote {
  const now = Date.now();
  return {
    id,
    x,
    y,
    width: DEFAULT_NOTE_WIDTH,
    height: DEFAULT_NOTE_HEIGHT,
    color,
    content: '',
    zIndex: 1,
    createdAt: now,
    modifiedAt: now,
  };
}

/**
 * Sanitize note content to only allow safe HTML tags.
 * Allowed: <b>, <i>, <br>, <strong>, <em>
 */
export function sanitizeNoteContent(html: string): string {
  let sanitized = html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/on\w+\s*=/gi, '');

  sanitized = sanitized.replace(/<(\/?)[^>]+>/gi, (match) => {
    const tagMatch = match.match(/<(\/?)(\w+)/);
    if (tagMatch) {
      const tag = tagMatch[2]?.toLowerCase();
      if (tag && ['b', 'i', 'br', 'strong', 'em'].includes(tag)) {
        return match;
      }
    }
    return '';
  });

  return sanitized;
}
