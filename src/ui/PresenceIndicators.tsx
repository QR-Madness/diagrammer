/**
 * Presence Indicators component for showing active collaborators.
 *
 * Displays avatars/badges for users currently viewing the document,
 * with tooltips showing their names and connection status.
 */

import { useMemo } from 'react';
import { useCollaborationStore, RemoteUser } from '../collaboration';
import './PresenceIndicators.css';

/**
 * Generate a consistent color from a user ID.
 */
function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Get initials from a display name.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || '??').toUpperCase();
}

interface UserAvatarProps {
  user: RemoteUser;
  size?: 'small' | 'medium';
}

function UserAvatar({ user, size = 'medium' }: UserAvatarProps) {
  const color = user.color || getUserColor(user.id);
  const initials = getInitials(user.name);

  return (
    <div
      className={`presence-avatar presence-avatar-${size}`}
      style={{ backgroundColor: color }}
      title={user.name}
    >
      {initials}
    </div>
  );
}

export interface PresenceIndicatorsProps {
  /** Maximum number of avatars to show before collapsing */
  maxVisible?: number;
  /** Size of avatars */
  size?: 'small' | 'medium';
  /** Custom class name */
  className?: string;
}

export function PresenceIndicators({
  maxVisible = 5,
  size = 'medium',
  className = '',
}: PresenceIndicatorsProps) {
  const isActive = useCollaborationStore((state) => state.isActive);
  const remoteUsers = useCollaborationStore((state) => state.remoteUsers);
  const connectionStatus = useCollaborationStore((state) => state.connectionStatus);

  // Sort users by name for consistent display
  const sortedUsers = useMemo(() => {
    return [...remoteUsers].sort((a, b) => a.name.localeCompare(b.name));
  }, [remoteUsers]);

  const visibleUsers = sortedUsers.slice(0, maxVisible);
  const hiddenCount = sortedUsers.length - maxVisible;

  // Don't render if collaboration not active
  if (!isActive) {
    return null;
  }

  return (
    <div className={`presence-indicators ${className}`}>
      {/* Connection status indicator */}
      <div
        className={`presence-status presence-status-${connectionStatus}`}
        title={`Connection: ${connectionStatus}`}
      >
        <span className="presence-status-dot" />
      </div>

      {/* User avatars */}
      <div className="presence-avatars">
        {visibleUsers.map((user) => (
          <UserAvatar key={user.clientId} user={user} size={size} />
        ))}

        {/* Overflow indicator */}
        {hiddenCount > 0 && (
          <div
            className={`presence-avatar presence-avatar-${size} presence-overflow`}
            title={`+${hiddenCount} more users`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* User count */}
      {sortedUsers.length > 0 && (
        <span className="presence-count">
          {sortedUsers.length} collaborator{sortedUsers.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

export default PresenceIndicators;
