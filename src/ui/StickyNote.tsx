/**
 * StickyNote component for the whiteboard.
 *
 * Features:
 * - Draggable within whiteboard bounds
 * - Resizable via corner handle
 * - Customizable color via color picker with presets + recent colors
 * - contentEditable with basic formatting (Ctrl+B bold, Ctrl+I italic)
 * - Delete button
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore';
import { useColorPaletteStore } from '../store/colorPaletteStore';
import { NOTE_PRESET_COLORS } from '../types/Whiteboard';
import { getContrastColor, darken } from '../utils/color';

interface StickyNoteProps {
  id: string;
}

const RESIZE_HANDLE_SIZE = 8;
const DRAG_HANDLE_HEIGHT = 28;

export const StickyNote: React.FC<StickyNoteProps> = ({ id }) => {
  const note = useWhiteboardStore((state) => state.notes[id]);
  const moveNote = useWhiteboardStore((state) => state.moveNote);
  const resizeNote = useWhiteboardStore((state) => state.resizeNote);
  const deleteNote = useWhiteboardStore((state) => state.deleteNote);
  const setNoteColor = useWhiteboardStore((state) => state.setNoteColor);
  const setNoteContent = useWhiteboardStore((state) => state.setNoteContent);
  const bringToFront = useWhiteboardStore((state) => state.bringToFront);
  const addRecentColor = useColorPaletteStore((state) => state.addRecentColor);
  const recentColors = useColorPaletteStore((state) => state.recentColors);

  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isInitialMount = useRef(true);

  // Set initial content only once on mount
  useEffect(() => {
    if (contentRef.current && isInitialMount.current && note) {
      isInitialMount.current = false;
      if (note.content && contentRef.current.innerHTML !== note.content) {
        contentRef.current.innerHTML = note.content;
      }
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.note-controls')) return;
      if ((e.target as HTMLElement).closest('.resize-handle')) return;
      if ((e.target as HTMLElement).closest('.color-picker')) return;
      if ((e.target as HTMLElement).closest('.note-content')) return;
      if (!note) return;

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: e.clientX - note.x, y: e.clientY - note.y });
      bringToFront(id);
    },
    [id, note, bringToFront]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    []
  );

  useEffect(() => {
    if (!note || (!isDragging && !isResizing)) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        moveNote(id, Math.max(0, newX), Math.max(0, newY));
      } else if (isResizing) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const newWidth = note.width + deltaX;
        const newHeight = note.height + deltaY;
        resizeNote(id, newWidth, newHeight);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, id, note, moveNote, resizeNote]);

  const handleContentChange = useCallback(() => {
    if (contentRef.current) {
      const content = contentRef.current.innerHTML;
      setNoteContent(id, content);
    }
  }, [id, setNoteContent]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteNote(id);
    },
    [id, deleteNote]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      setNoteColor(id, color);
      addRecentColor(color);
      setShowColorPicker(false);
    },
    [id, setNoteColor, addRecentColor]
  );

  if (!note) return null;

  const borderColor = darken(note.color, 15);
  const textColor = getContrastColor(note.color);
  const headerBg = darken(note.color, 8);

  return (
    <div
      className="sticky-note"
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        backgroundColor: note.color,
        border: `2px solid ${borderColor}`,
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: note.zIndex,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header / drag handle */}
      <div
        className="note-header"
        style={{
          height: DRAG_HANDLE_HEIGHT,
          backgroundColor: headerBg,
          borderRadius: '2px 2px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
          cursor: 'grab',
          flexShrink: 0,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleMouseDown(e);
        }}
      >
        <span
          style={{
            color: textColor,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Note
        </span>
        <div className="note-controls" style={{ display: 'flex', gap: 4 }}>
          {/* Color picker */}
          <div className="color-picker" style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              style={{
                width: 16,
                height: 16,
                borderRadius: 2,
                border: `1px solid ${textColor}66`,
                backgroundColor: note.color,
                cursor: 'pointer',
              }}
              title="Change color"
            />
            {showColorPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 0,
                  background: '#fff',
                  borderRadius: 6,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  padding: 8,
                  zIndex: 10,
                  minWidth: 160,
                }}
              >
                {/* Preset colors */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {NOTE_PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColorChange(c);
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 3,
                        border:
                          c === note.color
                            ? '2px solid #333'
                            : '1px solid rgba(0,0,0,0.1)',
                        backgroundColor: c,
                        cursor: 'pointer',
                      }}
                      title={c}
                    />
                  ))}
                </div>
                {/* Recent colors */}
                {recentColors.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Recent
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {recentColors.map((c) => (
                        <button
                          key={c}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleColorChange(c);
                          }}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 3,
                            border:
                              c === note.color
                                ? '2px solid #333'
                                : '1px solid rgba(0,0,0,0.1)',
                            backgroundColor: c,
                            cursor: 'pointer',
                          }}
                          title={c}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Delete button */}
          <button
            onClick={handleDelete}
            style={{
              width: 16,
              height: 16,
              borderRadius: 2,
              border: 'none',
              backgroundColor: `${textColor}33`,
              color: textColor,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
            title="Delete note"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        className="note-content"
        contentEditable
        suppressContentEditableWarning
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
              e.preventDefault();
              document.execCommand('bold', false);
            } else if (e.key === 'i') {
              e.preventDefault();
              document.execCommand('italic', false);
            }
          }
        }}
        onInput={handleContentChange}
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          padding: 8,
          fontSize: 13,
          lineHeight: 1.4,
          color: '#333',
          overflow: 'auto',
          cursor: 'text',
          outline: 'none',
          userSelect: 'text',
        }}
      />

      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: RESIZE_HANDLE_SIZE,
          height: RESIZE_HANDLE_SIZE,
          cursor: 'nwse-resize',
          background:
            'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 50%)',
        }}
      />
    </div>
  );
};
