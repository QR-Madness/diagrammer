import { Shape } from '../shapes/Shape';
import { ContrastCache } from './ContrastResolver';

/**
 * Per-frame state shared between the Renderer and shape handlers.
 *
 * Shape handlers have a fixed `(ctx, shape) => void` signature, so any
 * extra information they need at render time (currently only the
 * contrast resolver) is exposed via this module-level slot. The Renderer
 * sets it at the start of each frame and clears it at the end; handlers
 * read it when they encounter the AUTO color sentinel.
 *
 * Outside a render frame, `getRenderContext()` returns null and handlers
 * fall back to their pre-AUTO behavior (treating "auto" as a literal
 * unknown color, which most paths already handle gracefully).
 */
export interface RenderContext {
  /** Shape map for the frame currently being rendered. */
  shapes: Record<string, Shape>;
  /** Z-ordered shape ids (first = bottom). */
  shapeOrder: string[];
  /** Page/canvas background color used as the contrast fallback. */
  pageBackground: string;
  /** Per-frame memoization cache for contrast lookups. */
  contrastCache: ContrastCache;
}

let current: RenderContext | null = null;

export function setRenderContext(ctx: RenderContext | null): void {
  current = ctx;
}

export function getRenderContext(): RenderContext | null {
  return current;
}
