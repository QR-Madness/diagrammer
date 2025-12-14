import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useDocumentStore } from '../store/documentStore';
import { pushHistory } from '../store/historyStore';
import { isText } from '../shapes/Shape';
import { Vec2 } from '../math/Vec2';
import { Camera } from '../engine/Camera';
import './TextEditor.css';

export interface TextEditorProps {
  camera: Camera | null;
}

/**
 * Inline text editor component that overlays on the canvas.
 *
 * Shows a textarea positioned over the text shape being edited.
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
  const textShape = shape && isText(shape) ? shape : null;

  // Focus the textarea when editing starts
  useEffect(() => {
    if (textShape && textareaRef.current) {
      originalTextRef.current = textShape.text;
      textareaRef.current.value = textShape.text;
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [textShape]);

  const handleSave = useCallback(() => {
    if (!editingTextId || !textareaRef.current) return;

    const newText = textareaRef.current.value;
    if (newText !== originalTextRef.current) {
      pushHistory('Edit text');
      updateShape(editingTextId, { text: newText });
    }
    stopTextEdit();
  }, [editingTextId, updateShape, stopTextEdit]);

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
  if (!textShape || !camera) {
    return null;
  }

  // Calculate position in screen coordinates
  const screenPos = camera.worldToScreen(new Vec2(textShape.x, textShape.y));

  // Estimate text dimensions based on font size and content
  const fontSize = textShape.fontSize * camera.zoom;
  const minWidth = Math.max(100, textShape.width * camera.zoom);
  const minHeight = fontSize * 1.5;

  // Position the textarea at the text shape's position
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screenPos.x}px`,
    top: `${screenPos.y}px`,
    transform: `rotate(${textShape.rotation}rad)`,
    transformOrigin: 'left top',
    fontSize: `${fontSize}px`,
    fontFamily: textShape.fontFamily,
    color: textShape.fill || '#000000',
    minWidth: `${minWidth}px`,
    minHeight: `${minHeight}px`,
    textAlign: textShape.textAlign,
  };

  return (
    <div className="text-editor-overlay">
      <textarea
        ref={textareaRef}
        className="text-editor-textarea"
        style={style}
        defaultValue={textShape.text}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export default TextEditor;
