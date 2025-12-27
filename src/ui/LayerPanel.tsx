import { useCallback, useRef, useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useSessionStore } from '../store/sessionStore';
import { useHistoryStore } from '../store/historyStore';
import { Shape, isGroup, GroupShape } from '../shapes/Shape';
import { nanoid } from 'nanoid';
import './LayerPanel.css';

/**
 * Drop zone type for layer reordering.
 */
interface DropZone {
  type: 'before' | 'after' | 'into-group';
  targetId: string;
  groupId: string | null; // null for top-level, groupId for within a group
}

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
      const group = shape as GroupShape;
      return group.name || `Group (${group.childIds.length})`;
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
  const groupShapes = useDocumentStore((state) => state.groupShapes);
  const ungroupShape = useDocumentStore((state) => state.ungroupShape);
  const deleteShapes = useDocumentStore((state) => state.deleteShapes);
  const moveShapeInHierarchy = useDocumentStore((state) => state.moveShapeInHierarchy);
  const reorderChildrenInGroup = useDocumentStore((state) => state.reorderChildrenInGroup);
  const selectedIds = useSessionStore((state) => state.selectedIds);
  const select = useSessionStore((state) => state.select);
  const addToSelection = useSessionStore((state) => state.addToSelection);
  const clearSelection = useSessionStore((state) => state.clearSelection);
  const focusOnShape = useSessionStore((state) => state.focusOnShape);
  const push = useHistoryStore((state) => state.push);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shapeId: string } | null>(null);

  // Rename state
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Collapse state (collapsed by default)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Resize state
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(DEFAULT_HEIGHT);

  // Drag state for reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragSourceGroupId, setDragSourceGroupId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);

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

  // Handle drag start for any layer item
  const handleDragStart = useCallback((e: React.DragEvent, id: string, parentGroupId: string | null) => {
    setDraggedId(id);
    setDragSourceGroupId(parentGroupId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Add a small delay for visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  }, []);

  // Handle drag over - determine drop zone based on position
  const handleDragOver = useCallback((e: React.DragEvent, targetId: string, targetGroupId: string | null, isGroupItem: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedId || draggedId === targetId) return;

    // Prevent dropping a group into itself or its descendants
    if (draggedId) {
      const draggedShape = shapes[draggedId];
      if (draggedShape && isGroup(draggedShape)) {
        // Check if target is a descendant of dragged
        const isDescendant = (groupId: string, checkId: string): boolean => {
          const group = shapes[groupId] as GroupShape;
          if (!group || !isGroup(group)) return false;
          for (const childId of group.childIds) {
            if (childId === checkId) return true;
            const child = shapes[childId];
            if (child && isGroup(child) && isDescendant(childId, checkId)) return true;
          }
          return false;
        };
        if (isDescendant(draggedId, targetId)) return;
      }
    }

    // Calculate drop position based on mouse Y relative to the element
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const threshold = rect.height / 3;

    let dropType: 'before' | 'after' | 'into-group';
    if (isGroupItem && mouseY > threshold && mouseY < rect.height - threshold) {
      // Drop into group (middle third of the element)
      dropType = 'into-group';
    } else if (mouseY < rect.height / 2) {
      dropType = 'before';
    } else {
      dropType = 'after';
    }

    setDropZone({
      type: dropType,
      targetId,
      groupId: targetGroupId,
    });
  }, [draggedId, shapes]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the layer panel entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropZone(null);
    }
  }, []);

  // Handle drop - move shape to new location
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId || !dropZone) {
      setDraggedId(null);
      setDragSourceGroupId(null);
      setDropZone(null);
      return;
    }

    const { type, targetId, groupId: targetGroupId } = dropZone;

    // Don't do anything if dropping on self
    if (draggedId === targetId && type !== 'into-group') {
      setDraggedId(null);
      setDragSourceGroupId(null);
      setDropZone(null);
      return;
    }

    push('Move layer');

    if (type === 'into-group') {
      // Dropping into a group - add as child
      const targetGroup = shapes[targetId];
      if (targetGroup && isGroup(targetGroup)) {
        moveShapeInHierarchy(draggedId, targetId, 0); // Add at beginning (top in visual order)
        // Expand the group to show the dropped item
        setExpandedGroups((prev) => new Set([...prev, targetId]));
      }
    } else {
      // Dropping before/after a target
      if (dragSourceGroupId === targetGroupId) {
        // Same container - reorder within
        if (targetGroupId) {
          // Reorder within group
          const group = shapes[targetGroupId] as GroupShape;
          const newOrder = [...group.childIds];
          const fromIndex = newOrder.indexOf(draggedId);
          let toIndex = newOrder.indexOf(targetId);

          if (fromIndex !== -1) {
            newOrder.splice(fromIndex, 1);
            // Recalculate target index after removal
            toIndex = newOrder.indexOf(targetId);
            if (type === 'after') toIndex++;
            newOrder.splice(toIndex, 0, draggedId);
            reorderChildrenInGroup(targetGroupId, newOrder);
          }
        } else {
          // Reorder at top level
          const newOrder = [...shapeOrder];
          const fromIndex = newOrder.indexOf(draggedId);
          let toIndex = newOrder.indexOf(targetId);

          if (fromIndex !== -1 && toIndex !== -1) {
            newOrder.splice(fromIndex, 1);
            // Recalculate target index after removal
            toIndex = newOrder.indexOf(targetId);
            if (type === 'after') toIndex++;
            newOrder.splice(toIndex, 0, draggedId);
            reorderShapes(newOrder);
          }
        }
      } else {
        // Different containers - move between
        // Calculate insert index in target container
        let insertIndex: number;
        if (targetGroupId) {
          // Moving to a group
          const group = shapes[targetGroupId] as GroupShape;
          insertIndex = group.childIds.indexOf(targetId);
          if (type === 'after') insertIndex++;
        } else {
          // Moving to top level
          insertIndex = shapeOrder.indexOf(targetId);
          if (type === 'after') insertIndex++;
        }
        moveShapeInHierarchy(draggedId, targetGroupId, insertIndex);
      }
    }

    setDraggedId(null);
    setDragSourceGroupId(null);
    setDropZone(null);
  }, [draggedId, dropZone, dragSourceGroupId, shapes, shapeOrder, push, moveShapeInHierarchy, reorderChildrenInGroup, reorderShapes]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Reset opacity
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';

    setDraggedId(null);
    setDragSourceGroupId(null);
    setDropZone(null);
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

  // Group selected shapes
  const handleGroupSelected = useCallback(() => {
    const selectedArray = Array.from(selectedIds);
    if (selectedArray.length >= 2) {
      push('Group shapes');
      const groupId = nanoid();
      groupShapes(selectedArray, groupId);
      select([groupId]);
    }
    setContextMenu(null);
  }, [selectedIds, push, groupShapes, select]);

  // Ungroup a specific group
  const handleUngroup = useCallback((groupId: string) => {
    const shape = shapes[groupId];
    if (shape && isGroup(shape)) {
      push('Ungroup shapes');
      const childIds = [...shape.childIds];
      ungroupShape(groupId);
      select(childIds);
    }
    setContextMenu(null);
  }, [shapes, push, ungroupShape, select]);

  // Delete a shape
  const handleDelete = useCallback((id: string) => {
    push('Delete shape');
    deleteShapes([id]);
    clearSelection();
    setContextMenu(null);
  }, [push, deleteShapes, clearSelection]);

  // Start renaming a group
  const handleStartRename = useCallback((groupId: string) => {
    const shape = shapes[groupId];
    if (shape && isGroup(shape)) {
      const currentName = shape.name || '';
      setRenamingGroupId(groupId);
      setRenameValue(currentName);
      setContextMenu(null);
    }
  }, [shapes]);

  // Finish renaming a group
  const handleFinishRename = useCallback(() => {
    if (renamingGroupId) {
      push('Rename group');
      updateShape(renamingGroupId, { name: renameValue.trim() || undefined } as Partial<Shape>);
      setRenamingGroupId(null);
      setRenameValue('');
    }
  }, [renamingGroupId, renameValue, push, updateShape]);

  // Cancel renaming
  const handleCancelRename = useCallback(() => {
    setRenamingGroupId(null);
    setRenameValue('');
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, shapeId });
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  /**
   * Render a layer item (shape or group child).
   * @param shape - The shape to render
   * @param parentGroupId - ID of the parent group (null for top-level)
   */
  const renderLayerItem = useCallback((
    shape: Shape,
    parentGroupId: string | null
  ) => {
    const id = shape.id;
    const isSelected = selectedIds.has(id);
    const isDragging = draggedId === id;
    const isGroupShape = isGroup(shape);
    const isExpanded = expandedGroups.has(id);
    const isChild = parentGroupId !== null;

    // Calculate drop indicator styles
    const isDropBefore = dropZone?.targetId === id && dropZone?.type === 'before';
    const isDropAfter = dropZone?.targetId === id && dropZone?.type === 'after';
    const isDropInto = dropZone?.targetId === id && dropZone?.type === 'into-group';

    const classNames = [
      'layer-item',
      isSelected && 'selected',
      isDragging && 'dragging',
      isChild && 'child',
      isDropBefore && 'drop-before',
      isDropAfter && 'drop-after',
      isDropInto && 'drop-into',
    ].filter(Boolean).join(' ');

    return (
      <div key={id}>
        <div
          className={classNames}
          draggable
          onDragStart={(e) => handleDragStart(e, id, parentGroupId)}
          onDragOver={(e) => handleDragOver(e, id, parentGroupId, isGroupShape)}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onClick={(e) => handleSelectShape(e, id)}
          onContextMenu={(e) => handleContextMenu(e, id)}
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
              <DragIcon />
            </div>
          )}

          <div className="layer-item-info">
            {renamingGroupId === id ? (
              <input
                type="text"
                className="layer-item-rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename();
                  if (e.key === 'Escape') handleCancelRename();
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <span className="layer-item-type">{getShapeName(shape)}</span>
            )}
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
          </div>
        </div>

        {/* Render children if this is an expanded group */}
        {isGroupShape && isExpanded && (
          <div className="layer-group-children">
            {(shape as GroupShape).childIds.map((childId) => {
              const childShape = shapes[childId];
              if (!childShape) return null;
              return renderLayerItem(childShape, id);
            })}
          </div>
        )}
      </div>
    );
  }, [
    selectedIds, draggedId, dropZone, expandedGroups, shapes,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd,
    handleSelectShape, handleToggleExpand, handleToggleVisibility, handleToggleLock,
    handleMoveToFront, handleMoveToBack, handleContextMenu, renamingGroupId, renameValue,
    handleFinishRename, handleCancelRename
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
        <>
          {/* Group button when 2+ shapes selected */}
          {selectedIds.size >= 2 && (
            <div className="layer-panel-actions">
              <button
                className="layer-panel-action-btn"
                onClick={handleGroupSelected}
                title="Group selected shapes (Ctrl+G)"
              >
                <GroupIcon /> Group Selected
              </button>
            </div>
          )}
          <div className="layer-panel-list">
            {displayOrder.map((id) => {
              const shape = shapes[id];
              if (!shape) return null;
              return renderLayerItem(shape, null);
            })}
          </div>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="layer-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {shapes[contextMenu.shapeId] && isGroup(shapes[contextMenu.shapeId]!) && (
            <>
              <button
                className="layer-context-menu-item"
                onClick={() => handleStartRename(contextMenu.shapeId)}
              >
                Rename
              </button>
              <button
                className="layer-context-menu-item"
                onClick={() => handleUngroup(contextMenu.shapeId)}
              >
                Ungroup
              </button>
            </>
          )}
          {selectedIds.size >= 2 && (
            <button
              className="layer-context-menu-item"
              onClick={handleGroupSelected}
            >
              Group Selected
            </button>
          )}
          <button
            className="layer-context-menu-item"
            onClick={() => handleMoveToFront(contextMenu.shapeId)}
          >
            Bring to Front
          </button>
          <button
            className="layer-context-menu-item"
            onClick={() => handleMoveToBack(contextMenu.shapeId)}
          >
            Send to Back
          </button>
          <div className="layer-context-menu-separator" />
          <button
            className="layer-context-menu-item danger"
            onClick={() => handleDelete(contextMenu.shapeId)}
          >
            Delete
          </button>
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

function GroupIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="5" height="5" rx="1" />
      <rect x="8" y="8" width="5" height="5" rx="1" />
      <path d="M6 4h2M4 6v2M8 10h-2M10 8v-2" strokeDasharray="2 1" />
    </svg>
  );
}
