/**
 * EmbeddedGroupComponent - React component for rendering embedded groups in Tiptap.
 *
 * Renders a canvas group as an image within the rich text editor.
 * The group is exported to PNG on demand and cached for performance.
 */

import { useEffect, useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useDocumentStore } from '../store/documentStore';
import { isGroup, type GroupShape, type Shape } from '../shapes/Shape';
import { exportToPng, type ExportData } from '../utils/exportUtils';
import './EmbeddedGroupComponent.css';

/**
 * Export scale for high-quality rendering.
 */
const EXPORT_SCALE = 2;

/**
 * Get all shape IDs within a group (recursive for nested groups).
 */
function getGroupShapeIds(groupId: string, shapes: Record<string, unknown>): string[] {
  const group = shapes[groupId] as GroupShape | undefined;
  if (!group || !isGroup(group)) return [];

  const ids: string[] = [];
  for (const childId of group.childIds) {
    ids.push(childId);
    const child = shapes[childId];
    if (child && isGroup(child as GroupShape)) {
      ids.push(...getGroupShapeIds(childId, shapes));
    }
  }
  return ids;
}

export function EmbeddedGroupComponent({ node, updateAttributes, selected }: NodeViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupId = node.attrs['groupId'] as string;
  const groupName = node.attrs['groupName'] as string | undefined;

  // Get shape data from store
  const shapes = useDocumentStore((state) => state.shapes);
  const shapeOrder = useDocumentStore((state) => state.shapeOrder);

  // Export group to PNG
  const exportGroup = useCallback(async () => {
    if (!groupId) {
      setError('No group ID specified');
      setIsLoading(false);
      return;
    }

    const group = shapes[groupId];
    if (!group || !isGroup(group)) {
      setError('Group not found');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get all shapes within this group (including nested)
      const groupShapeIds = new Set([groupId, ...getGroupShapeIds(groupId, shapes)]);

      // Filter shapes to only include those in this group
      const groupShapes: Record<string, Shape> = {};
      for (const id of groupShapeIds) {
        if (shapes[id]) {
          groupShapes[id] = shapes[id];
        }
      }

      // Order shapes according to shapeOrder (maintain z-order)
      const groupShapeOrder = shapeOrder.filter((id) => groupShapeIds.has(id));

      const exportData: ExportData = {
        shapes: groupShapes,
        shapeOrder: groupShapeOrder,
        selectedIds: [groupId], // Export the group
      };

      // Export as PNG
      const blob = await exportToPng(exportData, {
        format: 'png',
        scope: 'selection',
        scale: EXPORT_SCALE,
        background: '#ffffff',
        padding: 10,
        filename: 'group',
      });

      // Convert blob to object URL
      const url = URL.createObjectURL(blob);
      setImageUrl(url);

      // Update cached URL in node attributes for persistence
      updateAttributes({ cachedImageUrl: url });
    } catch (err) {
      console.error('Failed to export group:', err);
      setError('Failed to render group');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, shapes, shapeOrder, updateAttributes]);

  // Export group on mount and when group changes
  useEffect(() => {
    exportGroup();

    // Cleanup object URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [groupId]); // Re-export when groupId changes

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    exportGroup();
  }, [exportGroup]);

  // Render loading state
  if (isLoading) {
    return (
      <NodeViewWrapper className="embedded-group-wrapper">
        <div className="embedded-group embedded-group-loading">
          <div className="embedded-group-spinner" />
          <span>Loading group...</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Render error state
  if (error) {
    return (
      <NodeViewWrapper className="embedded-group-wrapper">
        <div className="embedded-group embedded-group-error">
          <span className="embedded-group-error-icon">⚠</span>
          <span>{error}</span>
          <button className="embedded-group-retry-btn" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="embedded-group-wrapper">
      <div className={`embedded-group ${selected ? 'embedded-group-selected' : ''}`}>
        {groupName && <div className="embedded-group-name">{groupName}</div>}
        <div className="embedded-group-image-container">
          <img
            src={imageUrl || ''}
            alt={groupName || 'Embedded diagram group'}
            className="embedded-group-image"
          />
        </div>
        <button
          className="embedded-group-refresh-btn"
          onClick={handleRefresh}
          title="Refresh group preview"
        >
          ↻
        </button>
      </div>
    </NodeViewWrapper>
  );
}
