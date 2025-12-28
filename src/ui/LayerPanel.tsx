import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useSessionStore } from '../store/sessionStore';
import { useHistoryStore } from '../store/historyStore';
import { useLayerViewStore, getMatchingShapeIds } from '../store/layerViewStore';
import { Shape, isGroup, GroupShape } from '../shapes/Shape';
import { nanoid } from 'nanoid';
import { LayerViewManager } from './LayerViewManager';
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

/** Width constraints for horizontal resizing */
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 240;

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
      // Library shapes - capitalize the type
      return shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
  }
}

/**
 * Get preview text for a shape (label, text content, etc.) for display in layer panel.
 * Returns null if the shape has no displayable text.
 */
function getShapePreviewText(shape: Shape): string | null {
  // Check for label property (Rectangle, Ellipse, Connector, LibraryShape)
  if ('label' in shape && typeof shape.label === 'string' && shape.label.trim()) {
    return shape.label.trim();
  }
  // Check for text property (TextShape)
  if ('text' in shape && typeof shape.text === 'string' && shape.text.trim()) {
    return shape.text.trim();
  }
  return null;
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Preset colors for group color badges.
 */
const LAYER_COLOR_PRESETS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

/**
 * Find the parent group ID for a shape by searching through all groups.
 */
function findParentGroupId(shapeId: string, shapes: Record<string, Shape>): string | null {
  for (const shape of Object.values(shapes)) {
    if (isGroup(shape)) {
      const group = shape as GroupShape;
      if (group.childIds.includes(shapeId)) {
        return group.id;
      }
    }
  }
  return null;
}

/**
 * Get the effective layer color for a group, considering parent group inheritance.
 * Returns [color, isInherited] tuple.
 */
function getEffectiveGroupColor(
  shape: Shape,
  shapes: Record<string, Shape>,
  visited: Set<string> = new Set()
): [string | null, boolean] {
  if (!isGroup(shape)) return [null, false];

  const group = shape as GroupShape;
  if (group.layerColor) return [group.layerColor, false];

  // Check for parent group color (inheritance)
  if (visited.has(shape.id)) return [null, false]; // Prevent infinite loop
  visited.add(shape.id);

  const parentId = findParentGroupId(shape.id, shapes);
  if (parentId) {
    const parentShape = shapes[parentId];
    if (parentShape && isGroup(parentShape)) {
      const [parentColor] = getEffectiveGroupColor(parentShape, shapes, visited);
      if (parentColor) return [parentColor, true];
    }
  }

  return [null, false];
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

  // Layer view store
  const views = useLayerViewStore((state) => state.views);
  const activeViewId = useLayerViewStore((state) => state.activeViewId);
  const setActiveView = useLayerViewStore((state) => state.setActiveView);
  const toggleShapeInView = useLayerViewStore((state) => state.toggleShapeInView);
  const isShapeInView = useLayerViewStore((state) => state.isShapeInView);

  // View manager modal state
  const [isViewManagerOpen, setIsViewManagerOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shapeId: string } | null>(null);

  // Rename state
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Collapse state (collapsed by default)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Resize state (vertical)
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(DEFAULT_HEIGHT);

  // Resize state (horizontal)
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizingHorizontal, setIsResizingHorizontal] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  // Drag state for reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragSourceGroupId, setDragSourceGroupId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);

  // Expanded groups state (tracks which groups are expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Handle vertical resize (height)
  const handleVerticalResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingVertical(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizingVertical) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Dragging up increases height, dragging down decreases
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeightRef.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingVertical(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingVertical]);

  // Handle horizontal resize (width)
  const handleHorizontalResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingHorizontal(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizingHorizontal) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Dragging right increases width
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingHorizontal(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHorizontal]);

  const isResizing = isResizingVertical || isResizingHorizontal;

  // Toggle collapse
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Display order is reversed (top of list = front = end of shapeOrder)
  const displayOrder = [...shapeOrder].reverse();

  // Filter displayOrder based on active view
  const filteredDisplayOrder = useMemo(() => {
    if (!activeViewId) return displayOrder;

    const activeView = views.find((v) => v.id === activeViewId);
    if (!activeView) return displayOrder;

    const matchingIds = new Set(getMatchingShapeIds(activeView, shapes, shapeOrder));
    return displayOrder.filter((id) => matchingIds.has(id));
  }, [displayOrder, activeViewId, views, shapes, shapeOrder]);

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

  // Set group layer color
  const handleSetGroupColor = useCallback((groupId: string, color: string | null) => {
    push(color ? 'Set group color' : 'Clear group color');
    updateShape(groupId, { layerColor: color || undefined } as Partial<Shape>);
    setContextMenu(null);
  }, [push, updateShape]);

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

  // Auto-select text when entering rename mode
  useEffect(() => {
    if (renamingGroupId && renameInputRef.current) {
      // Use requestAnimationFrame to ensure the input is mounted and focused
      requestAnimationFrame(() => {
        renameInputRef.current?.select();
      });
    }
  }, [renamingGroupId]);

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

          {/* Color badge for groups */}
          {isGroupShape && (() => {
            const [effectiveColor, isInherited] = getEffectiveGroupColor(shape, shapes);
            return effectiveColor ? (
              <span
                className={`layer-item-color-badge ${isInherited ? 'inherited' : ''}`}
                style={{ backgroundColor: effectiveColor }}
                title={isInherited ? 'Inherited from parent group' : 'Group color'}
              />
            ) : null;
          })()}

          <div className="layer-item-info">
            {renamingGroupId === id ? (
              <input
                ref={renameInputRef}
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
            {/* Preview text for shapes with labels/text */}
            {(() => {
              const previewText = getShapePreviewText(shape);
              return previewText ? (
                <span className="layer-item-preview" title={previewText}>
                  {truncateText(previewText, 24)}
                </span>
              ) : null;
            })()}
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
      style={isCollapsed ? undefined : { height, width }}
    >
      {/* Vertical resize handle (top edge) - only show when expanded */}
      {!isCollapsed && (
        <div
          className="layer-panel-resize-handle-vertical"
          onMouseDown={handleVerticalResizeStart}
        />
      )}
      {/* Horizontal resize handle (right edge) - only show when expanded */}
      {!isCollapsed && (
        <div
          className="layer-panel-resize-handle-horizontal"
          onMouseDown={handleHorizontalResizeStart}
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
          {/* View selector */}
          {views.length > 0 && (
            <div className="layer-view-selector">
              <select
                value={activeViewId || ''}
                onChange={(e) => setActiveView(e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">All Layers</option>
                {views.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                  </option>
                ))}
              </select>
              <button
                className="layer-view-manage-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsViewManagerOpen(true);
                }}
                title="Manage views"
              >
                <GearIcon />
              </button>
            </div>
          )}
          {views.length === 0 && (
            <div className="layer-view-selector layer-view-selector-empty">
              <button
                className="layer-view-create-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsViewManagerOpen(true);
                }}
              >
                + Create View
              </button>
            </div>
          )}
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
            {filteredDisplayOrder.map((id) => {
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
              {/* Set Color submenu */}
              <div className="layer-context-menu-submenu">
                <button className="layer-context-menu-item layer-context-menu-submenu-trigger">
                  Set Color
                  <span className="layer-context-menu-arrow">▶</span>
                </button>
                <div className="layer-context-menu-submenu-content">
                  <div className="layer-color-picker-grid">
                    {LAYER_COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        className="layer-color-swatch"
                        style={{ backgroundColor: color }}
                        onClick={() => handleSetGroupColor(contextMenu.shapeId, color)}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    className="layer-context-menu-item"
                    onClick={() => handleSetGroupColor(contextMenu.shapeId, null)}
                  >
                    Clear Color
                  </button>
                </div>
              </div>
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
          {/* Add to View submenu */}
          {views.length > 0 && (
            <>
              <div className="layer-context-menu-separator" />
              <div className="layer-context-menu-submenu">
                <button className="layer-context-menu-item layer-context-menu-submenu-trigger">
                  Add to View
                  <span className="layer-context-menu-arrow">▶</span>
                </button>
                <div className="layer-context-menu-submenu-content">
                  {views.map((view) => (
                    <button
                      key={view.id}
                      className="layer-context-menu-item"
                      onClick={() => {
                        toggleShapeInView(view.id, contextMenu.shapeId);
                        setContextMenu(null);
                      }}
                    >
                      {isShapeInView(view.id, contextMenu.shapeId) ? '✓ ' : ''}
                      {view.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="layer-context-menu-separator" />
          <button
            className="layer-context-menu-item danger"
            onClick={() => handleDelete(contextMenu.shapeId)}
          >
            Delete
          </button>
        </div>
      )}

      {/* Layer View Manager Modal */}
      <LayerViewManager
        isOpen={isViewManagerOpen}
        onClose={() => setIsViewManagerOpen(false)}
      />
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

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="2" />
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1.06 1.06M10.44 10.44l1.06 1.06M2.5 11.5l1.06-1.06M10.44 3.56l1.06-1.06" />
    </svg>
  );
}
