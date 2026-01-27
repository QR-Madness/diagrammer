/**
 * SyncStatusBadge component
 *
 * Visual indicator for document synchronization state.
 * Shows sync status (synced, syncing, pending, error, offline) with appropriate icons and colors.
 */

import { useMemo } from 'react';
import type { SyncState } from '../types/DocumentRegistry';
import './SyncStatusBadge.css';

export type ExtendedSyncState = SyncState | 'local' | 'offline';

interface SyncStatusBadgeProps {
  /** Sync state to display */
  state: ExtendedSyncState;
  /** Show text label next to icon */
  showLabel?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Additional CSS class */
  className?: string;
}

interface SyncStateConfig {
  icon: string;
  label: string;
  className: string;
  title: string;
}

const SYNC_STATE_CONFIGS: Record<ExtendedSyncState, SyncStateConfig> = {
  synced: {
    icon: '✓',
    label: 'Synced',
    className: 'sync-status--synced',
    title: 'Document is synced with the host',
  },
  syncing: {
    icon: '↻',
    label: 'Syncing',
    className: 'sync-status--syncing',
    title: 'Document is currently syncing',
  },
  pending: {
    icon: '◐',
    label: 'Pending',
    className: 'sync-status--pending',
    title: 'Document has pending changes waiting to sync',
  },
  error: {
    icon: '✕',
    label: 'Error',
    className: 'sync-status--error',
    title: 'Failed to sync document',
  },
  local: {
    icon: '●',
    label: 'Local',
    className: 'sync-status--local',
    title: 'Personal document (not synced)',
  },
  offline: {
    icon: '◎',
    label: 'Offline',
    className: 'sync-status--offline',
    title: 'Cached offline - changes will sync when reconnected',
  },
};

export function SyncStatusBadge({
  state,
  showLabel = false,
  size = 'small',
  className = '',
}: SyncStatusBadgeProps) {
  const config = useMemo(() => SYNC_STATE_CONFIGS[state], [state]);

  return (
    <span
      className={`sync-status-badge sync-status--${size} ${config.className} ${className}`}
      title={config.title}
    >
      <span className="sync-status-icon">{config.icon}</span>
      {showLabel && <span className="sync-status-label">{config.label}</span>}
    </span>
  );
}

export default SyncStatusBadge;
