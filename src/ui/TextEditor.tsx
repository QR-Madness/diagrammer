import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useDocumentStore } from '../store/documentStore';
import { pushHistory } from '../store/historyStore';
import { isText, isRectangle, isEllipse, Shape } from '../shapes/Shape';
import { Vec2 } from '../math/Vec2';
import { Camera } from '../engine/Camera';
import './TextEditor.css';

export interface TextEditorProps {
  camera: Camera | null;
}

/**
 * Get the text content to edit for a shape.
 */
function getEditableText(shape: Shape): string {
  if (isText(shape)) {
    return shape.text;
  }
  if (isRectangle(shape) || isEllipse(shape)) {
    return shape.label || '';
  }
  return '';
}

/**
 * Get the font size for editing.
 */
function getEditFontSize(shape: Shape): number {
  if (isText(shape)) {
    return shape.fontSize;
  }
  if (isRectangle(shape) || isEllipse(shape)) {
    return shape.labelFontSize || 14;
  }
  return 14;
}

/**
 * Get the edit width for a shape.
 */
function getEditWidth(shape: Shape): number {
  if (isText(shape)) {
    return shape.width;
  }
  if (isRectangle(shape)) {
    return shape.width;
  }
  if (isEllipse(shape)) {
    return shape.radiusX * 2;
  }
  return 100;
}

/**
 * Inline text editor component that overlays on the canvas.
 *
 * Shows a textarea positioned over the shape being edited.
 * Works with Text shapes (editing text content) and Rectangle/Ellipse shapes (editing labels).
 * Saves changes on blur or Enter (with Shift+Enter for newlines).
 */
export function TextEditor({ camera }: TextEditorProps) {
  const editingTextId = useSessionStore((state) => state.editingTextId);
  const stopTextEdit = useSessionStore((state) => state.stopTextEdit);
  const shapes = useDocumentStore((state) => state.shapes);
  const updateShape = useDocumentStore((state) => state.updateShape);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalTextRef = useRef<string>('');

  // Get the shape being edited
  const shape = editingTextId ? shapes[editingTextId] : null;
  const canEdit = shape && (isText(shape) || isRectangle(shape) || isEllipse(shape));

  // Focus the textarea when editing starts
  useEffect(() => {
    if (canEdit && shape && textareaRef.current) {
      const text = getEditableText(shape);
      originalTextRef.current = text;
      textareaRef.current.value = text;
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      });
    }
  }, [canEdit, shape, editingTextId]);

  const handleSave = useCallback(() => {
    if (!editingTextId || !textareaRef.current || !shape) return;

    const newText = textareaRef.current.value;
    if (newText !== originalTextRef.current) {
      if (isText(shape)) {
        pushHistory('Edit text');
        updateShape(editingTextId, { text: newText });
      } else if (isRectangle(shape) || isEllipse(shape)) {
        pushHistory('Edit label');
        // Use empty string instead of undefined for TypeScript compatibility
        updateShape(editingTextId, newText ? { label: newText } : { label: '' });
      }
    }
    stopTextEdit();
  }, [editingTextId, shape, updateShape, stopTextEdit]);

  const handleCancel = useCallback(() => {
    stopTextEdit();
  }, [stopTextEdit]);

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      // Shift+Enter allows newlines
    },
    [handleSave, handleCancel]
  );

  // Don't render if not editing or no camera
  if (!canEdit || !shape || !camera) {
    return null;
  }

  // Calculate position in screen coordinates
  const screenPos = camera.worldToScreen(new Vec2(shape.x, shape.y));

  // Get font size and dimensions
  const baseFontSize = getEditFontSize(shape);
  const fontSize = baseFontSize * camera.zoom;
  const editWidth = getEditWidth(shape);
  const minWidth = Math.max(100, editWidth * camera.zoom);
  const minHeight = fontSize * 1.5;

  // Get text alignment (color is handled by CSS for consistent theme)
  const textAlign = isText(shape) ? shape.textAlign : 'center';

  // Calculate position offset for centered shapes
  let offsetX = 0;
  let offsetY = 0;

  if (isRectangle(shape) || isEllipse(shape)) {
    // Center the textarea on the shape
    offsetX = -minWidth / 2;
    offsetY = -minHeight / 2;
  }

  // Position the textarea at the shape's position
  // Note: color is handled by CSS to ensure good contrast with themed background
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screenPos.x + offsetX}px`,
    top: `${screenPos.y + offsetY}px`,
    transform: `rotate(${shape.rotation}rad)`,
    transformOrigin: isText(shape) ? 'left top' : 'center center',
    fontSize: `${fontSize}px`,
    fontFamily: isText(shape) ? shape.fontFamily : 'sans-serif',
    minWidth: `${minWidth}px`,
    minHeight: `${minHeight}px`,
    textAlign: textAlign,
  };

  return (
    <div className="text-editor-overlay">
      <textarea
        ref={textareaRef}
        className="text-editor-textarea"
        style={style}
        defaultValue={getEditableText(shape)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder={isRectangle(shape) || isEllipse(shape) ? 'Enter label...' : ''}
      />
    </div>
  );
}

export default TextEditor;
