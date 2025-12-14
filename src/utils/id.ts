import { nanoid } from 'nanoid';

/**
 * Generate a unique ID for shapes and other entities.
 * Uses nanoid for compact, URL-safe, unique IDs.
 *
 * @param size - Optional length of the ID (default: 21)
 * @returns A unique ID string
 */
export function generateId(size?: number): string {
  return nanoid(size);
}

/**
 * Generate a short ID (8 characters).
 * Useful for display purposes or when collision risk is acceptable.
 *
 * @returns A short unique ID string
 */
export function generateShortId(): string {
  return nanoid(8);
}

/**
 * Check if a string looks like a valid nanoid.
 * Note: This only checks format, not uniqueness.
 *
 * @param id - String to check
 * @returns true if the string has valid nanoid format
 */
export function isValidId(id: string): boolean {
  // nanoid uses A-Za-z0-9_- characters
  return /^[A-Za-z0-9_-]+$/.test(id) && id.length > 0;
}

// Re-export nanoid for direct usage if needed
export { nanoid };
