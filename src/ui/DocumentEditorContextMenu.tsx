/**
 * DocumentEditorContextMenu - Context menu for the rich text editor.
 *
 * Provides options for:
 * - Inserting embedded groups from the canvas
 * - Basic text formatting shortcuts
 */

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { useDocumentStore } from '../store/documentStore';
import { isGroup, type GroupShape } from '../shapes/Shape';
import './DocumentEditorContextMenu.css';

export interface DocumentEditorContextMenuProps {
  /** X position in viewport */
  x: number;
  /** Y position in viewport */
  y: number;
  /** Close callback */
  onClose: () => void;
  /** Tiptap editor instance */
  editor: Editor | null;
}

/**
 * Get all groups from the document store.
 */
function getAvailableGroups(
  shapes: Record<string, unknown>,
  shapeOrder: string[]
): GroupShape[] {
  const groups: GroupShape[] = [];

  for (const id of shapeOrder) {
    const shape = shapes[id];
    if (shape && isGroup(shape as GroupShape)) {
      groups.push(shape as GroupShape);
    }
  }

  return groups;
}

export function DocumentEditorContextMenu({
  x,
  y,
  onClose,
  editor,
}: DocumentEditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const menuItemRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showGroupSubmenu, setShowGroupSubmenu] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Get groups from document store
  const shapes = useDocumentStore((state) => state.shapes);
  const shapeOrder = useDocumentStore((state) => state.shapeOrder);
  const groups = getAvailableGroups(shapes, shapeOrder);

  // Get group display name
  const getGroupName = useCallback((group: GroupShape): string => {
    if (group.name) return group.name;
    if (group.label) return group.label;
    return `Group (${group.childIds.length} items)`;
  }, []);

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter((group) => {
      const name = getGroupName(group).toLowerCase();
      return name.includes(query);
    });
  }, [groups, searchQuery, getGroupName]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInMenu = menuRef.current?.contains(target);
      const isInSubmenu = submenuRef.current?.contains(target);

      if (!isInMenu && !isInSubmenu) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGroupSubmenu) {
          setShowGroupSubmenu(false);
          setSearchQuery('');
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, showGroupSubmenu]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Focus search input when submenu opens
  useEffect(() => {
    if (showGroupSubmenu && searchInputRef.current) {
      // Small delay to ensure the input is rendered
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [showGroupSubmenu]);

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(x, window.innerWidth - 220),
    y: Math.min(y, window.innerHeight - 200),
  };

  // Handle inserting an embedded group
  const handleInsertGroup = useCallback(
    (groupId: string, groupName: string | undefined) => {
      if (!editor) return;

      // Only pass groupName if it's defined
      const attrs: { groupId: string; groupName?: string } = { groupId };
      if (groupName !== undefined) {
        attrs.groupName = groupName;
      }
      editor.chain().focus().insertEmbeddedGroup(attrs).run();
      onClose();
    },
    [editor, onClose]
  );

  // Handle hover on "Insert Group" to show submenu
  const handleGroupMenuEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (groups.length === 0) return;

      // Clear any pending close timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      setSubmenuPosition({
        x: rect.right + 4,
        y: rect.top - 8, // Offset up to account for search input
      });
      setShowGroupSubmenu(true);
    },
    [groups.length]
  );

  const handleMenuItemLeave = useCallback(() => {
    // Delay closing to allow mouse to move to submenu
    hoverTimeoutRef.current = setTimeout(() => {
      setShowGroupSubmenu(false);
      setSearchQuery('');
    }, 150);
  }, []);

  const handleSubmenuEnter = useCallback(() => {
    // Cancel close timeout when entering submenu
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleSubmenuLeave = useCallback(() => {
    // Close submenu when leaving it
    hoverTimeoutRef.current = setTimeout(() => {
      setShowGroupSubmenu(false);
      setSearchQuery('');
    }, 150);
  }, []);

  return createPortal(
    <>
      <div
        ref={menuRef}
        className="doc-editor-context-menu"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        {/* Insert Group option with submenu */}
        <div
          ref={menuItemRef}
          className={`doc-editor-context-menu-item ${groups.length === 0 ? 'disabled' : 'has-submenu'}`}
          onMouseEnter={handleGroupMenuEnter}
          onMouseLeave={handleMenuItemLeave}
        >
          <span className="doc-editor-context-menu-icon">📊</span>
          <span className="doc-editor-context-menu-label">Insert Group</span>
          {groups.length > 0 && <span className="doc-editor-context-menu-arrow">›</span>}
          {groups.length === 0 && (
            <span className="doc-editor-context-menu-hint">No groups</span>
          )}
        </div>

        <div className="doc-editor-context-menu-divider" />

        {/* Basic formatting options */}
        <div
          className="doc-editor-context-menu-item"
          onClick={() => {
            editor?.chain().focus().toggleBold().run();
            onClose();
          }}
        >
          <span className="doc-editor-context-menu-icon">B</span>
          <span className="doc-editor-context-menu-label">Bold</span>
          <span className="doc-editor-context-menu-shortcut">Ctrl+B</span>
        </div>

        <div
          className="doc-editor-context-menu-item"
          onClick={() => {
            editor?.chain().focus().toggleItalic().run();
            onClose();
          }}
        >
          <span className="doc-editor-context-menu-icon" style={{ fontStyle: 'italic' }}>
            I
          </span>
          <span className="doc-editor-context-menu-label">Italic</span>
          <span className="doc-editor-context-menu-shortcut">Ctrl+I</span>
        </div>

        <div className="doc-editor-context-menu-divider" />

        {/* Horizontal rule */}
        <div
          className="doc-editor-context-menu-item"
          onClick={() => {
            editor?.chain().focus().setHorizontalRule().run();
            onClose();
          }}
        >
          <span className="doc-editor-context-menu-icon">—</span>
          <span className="doc-editor-context-menu-label">Horizontal Rule</span>
        </div>
      </div>

      {/* Group submenu - rendered separately for better hover handling */}
      {showGroupSubmenu && groups.length > 0 && (
        <div
          ref={submenuRef}
          className="doc-editor-context-submenu"
          style={{
            left: submenuPosition.x,
            top: submenuPosition.y,
          }}
          onMouseEnter={handleSubmenuEnter}
          onMouseLeave={handleSubmenuLeave}
        >
          {/* Search input */}
          <div className="doc-editor-submenu-search">
            <input
              ref={searchInputRef}
              type="text"
              className="doc-editor-submenu-search-input"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Group list */}
          <div className="doc-editor-submenu-list">
            {filteredGroups.length === 0 ? (
              <div className="doc-editor-context-menu-item disabled">
                <span className="doc-editor-context-menu-label">No matching groups</span>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="doc-editor-context-menu-item"
                  onClick={() => handleInsertGroup(group.id, group.name || group.label)}
                >
                  {group.layerColor && (
                    <span
                      className="doc-editor-context-menu-color"
                      style={{ backgroundColor: group.layerColor }}
                    />
                  )}
                  <span className="doc-editor-context-menu-label">
                    {getGroupName(group)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
