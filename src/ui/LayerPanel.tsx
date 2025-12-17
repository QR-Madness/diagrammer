import { useCallback, useRef, useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useSessionStore } from '../store/sessionStore';
import { useHistoryStore } from '../store/historyStore';
import { Shape, isGroup, GroupShape } from '../shapes/Shape';
import './LayerPanel.css';

/** Height constraints for resizable panel */
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 250;

/**
 * Get a display name for a shape based on its type.
 */
function getShapeName(shape: Shape): string {
  switch (shape.type) {
    case 'rectangle':
      return 'Rectangle';
    case 'ellipse':
      return 'Ellipse';
    case 'line':
      return 'Line';
    case 'text':
      return 'Text';
    case 'connector':
      return 'Connector';
    case 'group':
      return `Group (${(shape as GroupShape).childIds.length})`;
    default:
      return 'Shape';
  }
}

/**
 * Layer panel for viewing and managing shape z-order.
 * Displays all shapes with controls to:
 * - Reorder (drag to change z-order)
 * - Lock/unlock shapes
 * - Show/hide shapes
 * - Select shapes
 */
export function LayerPanel() {
  const shapes = useDocumentStore((state) => state.shapes);
  const shapeOrder = useDocumentStore((state) => state.shapeOrder);
  const reorderShapes = useDocumentStore((state) => state.reorderShapes);
  const updateShape = useDocumentStore((state) => state.updateShape);
  const selectedIds = useSessionStore((state) => state.selectedIds);
  const select = useSessionStore((state) => state.select);
  const addToSelection = useSessionStore((state) => state.addToSelection);
  const focusOnShape = useSessionStore((state) => state.focusOnShape);
  const push = useHistoryStore((state) => state.push);

  // Collapse state (collapsed by default)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Resize state
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(DEFAULT_HEIGHT);

  // Drag state for reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartIndex = useRef<number | null>(null);

  // Expanded groups state (tracks which groups are expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Dragging up increases height, dragging down decreases
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeightRef.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Toggle collapse
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Display order is reversed (top of list = front = end of shapeOrder)
  const displayOrder = [...shapeOrder].reverse();

  const handleDragStart = useCallback((e: React.DragEvent, id: string, index: number) => {
    setDraggedId(id);
    dragStartIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedId && dragStartIndex.current !== null && dragStartIndex.current !== dropIndex) {
      push('Reorder shapes');

      // Convert display indices back to shapeOrder indices
      // displayOrder is reversed, so we need to convert
      const fromShapeOrderIndex = shapeOrder.length - 1 - dragStartIndex.current;
      const toShapeOrderIndex = shapeOrder.length - 1 - dropIndex;

      // Create new order
      const newOrder = [...shapeOrder];
      const [movedId] = newOrder.splice(fromShapeOrderIndex, 1);
      if (movedId) {
        newOrder.splice(toShapeOrderIndex, 0, movedId);
        reorderShapes(newOrder);
      }
    }

    setDraggedId(null);
    setDragOverIndex(null);
    dragStartIndex.current = null;
  }, [draggedId, shapeOrder, push, reorderShapes]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverIndex(null);
    dragStartIndex.current = null;
  }, []);

  const handleToggleLock = useCallback((id: string, currentLocked: boolean) => {
    push(currentLocked ? 'Unlock shape' : 'Lock shape');
    updateShape(id, { locked: !currentLocked });
  }, [push, updateShape]);

  const handleToggleVisibility = useCallback((id: string, currentVisible: boolean) => {
    push(currentVisible ? 'Hide shape' : 'Show shape');
    updateShape(id, { visible: !currentVisible });
  }, [push, updateShape]);

  const handleSelectShape = useCallback((e: React.MouseEvent, id: string) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      addToSelection([id]);
    } else {
      select([id]);
    }
    // Focus camera on the shape and trigger emphasis animation
    focusOnShape(id);
  }, [addToSelection, select, focusOnShape]);

  const handleMoveToFront = useCallback((id: string) => {
    push('Bring to front');
    const index = shapeOrder.indexOf(id);
    if (index !== -1 && index !== shapeOrder.length - 1) {
      const newOrder = [...shapeOrder];
      newOrder.splice(index, 1);
      newOrder.push(id);
      reorderShapes(newOrder);
    }
  }, [push, shapeOrder, reorderShapes]);

  const handleMoveToBack = useCallback((id: string) => {
    push('Send to back');
    const index = shapeOrder.indexOf(id);
    if (index !== -1 && index !== 0) {
      const newOrder = [...shapeOrder];
      newOrder.splice(index, 1);
      newOrder.unshift(id);
      reorderShapes(newOrder);
    }
  }, [push, shapeOrder, reorderShapes]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Render a layer item (shape or group child).
   */
  const renderLayerItem = useCallback((
    shape: Shape,
    index: number,
    isChild: boolean = false
  ) => {
    const id = shape.id;
    const isSelected = selectedIds.has(id);
    const isDragging = draggedId === id;
    const isDragOver = dragOverIndex === index;
    const isGroupShape = isGroup(shape);
    const isExpanded = expandedGroups.has(id);

    return (
      <div key={id}>
        <div
          className={`layer-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isChild ? 'child' : ''}`}
          draggable={!isChild}
          onDragStart={isChild ? undefined : (e) => handleDragStart(e, id, index)}
          onDragOver={isChild ? undefined : (e) => handleDragOver(e, index)}
          onDragLeave={isChild ? undefined : handleDragLeave}
          onDrop={isChild ? undefined : (e) => handleDrop(e, index)}
          onDragEnd={isChild ? undefined : handleDragEnd}
          onClick={(e) => handleSelectShape(e, id)}
        >
          {/* Expand/collapse toggle for groups */}
          {isGroupShape ? (
            <button
              className="layer-item-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(id);
              }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ChevronIcon collapsed={!isExpanded} />
            </button>
          ) : (
            <div className="layer-item-drag-handle">
              {!isChild && <DragIcon />}
            </div>
          )}

          <div className="layer-item-info">
            <span className="layer-item-type">{getShapeName(shape)}</span>
            <span className="layer-item-id">{id.slice(0, 6)}</span>
          </div>

          <div className="layer-item-actions">
            <button
              className={`layer-action-btn ${shape.visible ? '' : 'inactive'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleVisibility(id, shape.visible);
              }}
              title={shape.visible ? 'Hide' : 'Show'}
            >
              {shape.visible ? <EyeIcon /> : <EyeOffIcon />}
            </button>
            <button
              className={`layer-action-btn ${shape.locked ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLock(id, shape.locked);
              }}
              title={shape.locked ? 'Unlock' : 'Lock'}
            >
              {shape.locked ? <LockIcon /> : <UnlockIcon />}
            </button>
            {!isChild && (
              <>
                <button
                  className="layer-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToFront(id);
                  }}
                  title="Bring to front"
                >
                  <MoveUpIcon />
                </button>
                <button
                  className="layer-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToBack(id);
                  }}
                  title="Send to back"
                >
                  <MoveDownIcon />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Render children if this is an expanded group */}
        {isGroupShape && isExpanded && (
          <div className="layer-group-children">
            {(shape as GroupShape).childIds.map((childId) => {
              const childShape = shapes[childId];
              if (!childShape) return null;
              return renderLayerItem(childShape, -1, true);
            })}
          </div>
        )}
      </div>
    );
  }, [
    selectedIds, draggedId, dragOverIndex, expandedGroups, shapes,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd,
    handleSelectShape, handleToggleExpand, handleToggleVisibility, handleToggleLock,
    handleMoveToFront, handleMoveToBack
  ]);

  if (displayOrder.length === 0) {
    return (
      <div className={`layer-panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div
          className="layer-panel-header"
          onClick={handleToggleCollapse}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronIcon collapsed={isCollapsed} />
          <span>Layers</span>
        </div>
        {!isCollapsed && (
          <div className="layer-panel-empty">No shapes</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`layer-panel ${isCollapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
      style={isCollapsed ? undefined : { height }}
    >
      {/* Resize handle - only show when expanded */}
      {!isCollapsed && (
        <div
          className="layer-panel-resize-handle"
          onMouseDown={handleResizeStart}
        />
      )}
      <div
        className="layer-panel-header"
        onClick={handleToggleCollapse}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        <ChevronIcon collapsed={isCollapsed} />
        <span>Layers ({displayOrder.length})</span>
      </div>
      {!isCollapsed && (
        <div className="layer-panel-list">
          {displayOrder.map((id, index) => {
            const shape = shapes[id];
            if (!shape) return null;
            return renderLayerItem(shape, index);
          })}
        </div>
      )}
    </div>
  );
}

// SVG Icons

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <path d="M4 5l3 3 3-3" />
    </svg>
  );
}

function DragIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="3" r="1" />
      <circle cx="8" cy="3" r="1" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9" r="1" />
      <circle cx="8" cy="9" r="1" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
      <circle cx="7" cy="7" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
      <line x1="2" y1="2" x2="12" y2="12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="6" width="8" height="6" rx="1" />
      <path d="M5 6V4a2 2 0 0 1 4 0v2" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="6" width="8" height="6" rx="1" />
      <path d="M5 6V4a2 2 0 0 1 4 0" />
    </svg>
  );
}

function MoveUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 12V2M3 5l4-4 4 4" />
    </svg>
  );
}

function MoveDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 2v10M3 9l4 4 4-4" />
    </svg>
  );
}
