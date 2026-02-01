/**
 * SearchReplacePanel - Search and replace functionality for the rich text editor.
 *
 * Features:
 * - Find text with highlighting
 * - Replace single or all occurrences
 * - Regex support
 * - Case-sensitive toggle
 * - Draggable floating panel
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import './SearchReplacePanel.css';

interface SearchReplaceProps {
  editor: Editor;
  onClose: () => void;
}

interface SearchResult {
  from: number;
  to: number;
  text: string;
}

export function SearchReplacePanel({ editor, onClose }: SearchReplaceProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showReplace, setShowReplace] = useState(false);
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const decorationsRef = useRef<{ clear: () => void } | null>(null);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Clear decorations on unmount
  useEffect(() => {
    return () => {
      decorationsRef.current?.clear();
    };
  }, []);

  // Dragging handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.search-replace-header')) {
      setIsDragging(true);
      const rect = panelRef.current?.getBoundingClientRect();
      if (rect) {
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Perform search
  const performSearch = useCallback(() => {
    if (!searchText) {
      setResults([]);
      setCurrentIndex(-1);
      return;
    }

    const doc = editor.state.doc;
    const foundResults: SearchResult[] = [];

    try {
      let pattern: RegExp;
      if (useRegex) {
        pattern = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
      } else {
        const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
      }

      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          let match;
          while ((match = pattern.exec(node.text)) !== null) {
            foundResults.push({
              from: pos + match.index,
              to: pos + match.index + match[0].length,
              text: match[0],
            });
          }
        }
      });
    } catch {
      // Invalid regex, ignore
    }

    setResults(foundResults);
    setCurrentIndex(foundResults.length > 0 ? 0 : -1);

    // Scroll to first result
    if (foundResults.length > 0) {
      const first = foundResults[0];
      if (first) {
        editor.commands.setTextSelection({ from: first.from, to: first.to });
        // Scroll into view
        const view = editor.view;
        const coords = view.coordsAtPos(first.from);
        const editorRect = view.dom.getBoundingClientRect();
        if (coords.top < editorRect.top || coords.bottom > editorRect.bottom) {
          view.dom.scrollTo({
            top: coords.top - editorRect.top + view.dom.scrollTop - 50,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [searchText, useRegex, caseSensitive, editor]);

  // Search on input change
  useEffect(() => {
    const timeout = setTimeout(performSearch, 150);
    return () => clearTimeout(timeout);
  }, [performSearch]);

  // Navigate to next/previous result
  const goToResult = useCallback((index: number) => {
    if (results.length === 0) return;
    
    const newIndex = ((index % results.length) + results.length) % results.length;
    setCurrentIndex(newIndex);
    
    const result = results[newIndex];
    if (result) {
      editor.commands.setTextSelection({ from: result.from, to: result.to });
      editor.commands.focus();
    }
  }, [results, editor]);

  const goToNext = useCallback(() => goToResult(currentIndex + 1), [goToResult, currentIndex]);
  const goToPrevious = useCallback(() => goToResult(currentIndex - 1), [goToResult, currentIndex]);

  // Replace current
  const replaceCurrent = useCallback(() => {
    const result = results[currentIndex];
    if (!result) return;

    editor.chain()
      .setTextSelection({ from: result.from, to: result.to })
      .deleteSelection()
      .insertContent(replaceText)
      .run();

    // Re-search after replace
    setTimeout(performSearch, 50);
  }, [results, currentIndex, replaceText, editor, performSearch]);

  // Replace all
  const replaceAll = useCallback(() => {
    if (results.length === 0) return;

    // Replace in reverse order to maintain positions
    const sortedResults = [...results].sort((a, b) => b.from - a.from);
    
    editor.chain().command(({ tr }) => {
      for (const result of sortedResults) {
        tr.replaceWith(result.from, result.to, editor.schema.text(replaceText));
      }
      return true;
    }).run();

    setResults([]);
    setCurrentIndex(-1);
  }, [results, replaceText, editor]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        goToPrevious();
      } else {
        goToNext();
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'F3') {
      if (e.shiftKey) {
        goToPrevious();
      } else {
        goToNext();
      }
      e.preventDefault();
    }
  }, [goToNext, goToPrevious, onClose]);

  return (
    <div 
      ref={panelRef}
      className={`search-replace-panel ${isDragging ? 'dragging' : ''}`}
      style={{ left: position.x, top: position.y }}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
    >
      <div className="search-replace-header">
        <span className="search-replace-drag-handle">⋮⋮</span>
        <span className="search-replace-title">
          {showReplace ? 'Find & Replace' : 'Find'}
        </span>
        <button
          className="search-replace-toggle"
          onClick={() => setShowReplace(!showReplace)}
          title={showReplace ? 'Hide Replace' : 'Show Replace'}
        >
          {showReplace ? '▼' : '▶'}
        </button>
        <button className="search-replace-close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>

      <div className="search-replace-body">
        {/* Search input */}
        <div className="search-input-row">
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span className="search-count">
            {results.length > 0 ? `${currentIndex + 1} of ${results.length}` : 'No results'}
          </span>
        </div>

        {/* Replace input */}
        {showReplace && (
          <div className="search-input-row">
            <input
              type="text"
              className="search-input"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
            />
          </div>
        )}

        {/* Options */}
        <div className="search-options">
          <label className="search-option">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span>Aa</span>
            <span className="search-option-label">Case sensitive</span>
          </label>
          <label className="search-option">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
            />
            <span>.*</span>
            <span className="search-option-label">Regex</span>
          </label>
        </div>

        {/* Navigation and replace buttons */}
        <div className="search-actions">
          <button
            className="search-action-btn"
            onClick={goToPrevious}
            disabled={results.length === 0}
            title="Previous (Shift+Enter)"
          >
            ↑
          </button>
          <button
            className="search-action-btn"
            onClick={goToNext}
            disabled={results.length === 0}
            title="Next (Enter)"
          >
            ↓
          </button>
          {showReplace && (
            <>
              <button
                className="search-action-btn replace-btn"
                onClick={replaceCurrent}
                disabled={results.length === 0}
                title="Replace"
              >
                Replace
              </button>
              <button
                className="search-action-btn replace-all-btn"
                onClick={replaceAll}
                disabled={results.length === 0}
                title="Replace All"
              >
                Replace All
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
