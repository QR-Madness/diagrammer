/**
 * ShapeSearchPanel — Ctrl+F opens a floating panel to search shapes by label/text/type.
 * Navigate matches with ↑/↓ and the camera auto-zooms to the focused shape.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useSessionStore } from '../store/sessionStore';
import type { Shape } from '../shapes/Shape';
import './ShapeSearchPanel.css';

export interface ShapeSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional callback to zoom camera to a shape's bounds */
  onNavigate?: (shape: Shape) => void;
}

/**
 * Get the searchable text content from a shape.
 */
function getSearchableText(shape: Shape): string {
  const parts: string[] = [shape.type];
  if ('label' in shape && typeof shape.label === 'string') parts.push(shape.label);
  if ('text' in shape && typeof shape.text === 'string') parts.push(shape.text);
  if ('name' in shape && typeof shape.name === 'string') parts.push(shape.name);
  return parts.join(' ');
}

export function ShapeSearchPanel({ isOpen, onClose, onNavigate }: ShapeSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shapes = useDocumentStore((s) => s.shapes);
  const shapeOrder = useDocumentStore((s) => s.shapeOrder);
  const select = useSessionStore((s) => s.select);

  // Find matches in shape order
  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = caseSensitive ? query : query.toLowerCase();
    const result: Shape[] = [];
    for (const id of shapeOrder) {
      const shape = shapes[id];
      if (!shape) continue;
      const text = caseSensitive ? getSearchableText(shape) : getSearchableText(shape).toLowerCase();
      if (text.includes(q)) {
        result.push(shape);
      }
    }
    return result;
  }, [query, caseSensitive, shapes, shapeOrder]);

  // Clamp index when matches change
  useEffect(() => {
    if (currentIndex >= matches.length) {
      setCurrentIndex(matches.length > 0 ? matches.length - 1 : 0);
    }
  }, [matches.length, currentIndex]);

  // Navigate to current match
  useEffect(() => {
    const match = matches[currentIndex];
    if (match) {
      select([match.id]);
      onNavigate?.(match);
    }
  }, [currentIndex, matches, select, onNavigate]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCurrentIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const goToNext = useCallback(() => {
    if (matches.length > 0) {
      setCurrentIndex((i) => (i + 1) % matches.length);
    }
  }, [matches.length]);

  const goToPrev = useCallback(() => {
    if (matches.length > 0) {
      setCurrentIndex((i) => (i - 1 + matches.length) % matches.length);
    }
  }, [matches.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) goToPrev();
        else goToNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [goToNext, goToPrev, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="shape-search-panel" onKeyDown={handleKeyDown}>
      <div className="shape-search-header">
        <input
          ref={inputRef}
          className="shape-search-input"
          type="text"
          placeholder="Search shapes…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentIndex(0);
          }}
        />
        <span className="shape-search-count">
          {query.trim() ? `${matches.length > 0 ? currentIndex + 1 : 0} of ${matches.length}` : ''}
        </span>
      </div>
      <div className="shape-search-actions">
        <button
          className={`shape-search-btn ${caseSensitive ? 'active' : ''}`}
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Match case"
        >
          Aa
        </button>
        <button className="shape-search-btn" onClick={goToPrev} disabled={matches.length === 0} title="Previous match (Shift+Enter)">
          ▲
        </button>
        <button className="shape-search-btn" onClick={goToNext} disabled={matches.length === 0} title="Next match (Enter)">
          ▼
        </button>
        <button className="shape-search-btn shape-search-close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>
    </div>
  );
}
