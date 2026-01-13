/**
 * Collaborative Cursors overlay component.
 *
 * Renders other users' cursor positions on the canvas as colored cursors
 * with their names. This creates the real-time collaborative experience
 * where you can see what other people are looking at.
 */

import { useMemo } from 'react';
import { useCollaborationStore, RemoteUser } from '../collaboration';
import { useSessionStore } from '../store/sessionStore';
import './CollaborativeCursors.css';

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

interface CursorProps {
  user: RemoteUser;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
}

function Cursor({ user, cameraX, cameraY, cameraZoom }: CursorProps) {
  if (!user.cursor) return null;

  const color = user.color || getUserColor(user.id);

  // Transform world coordinates to screen coordinates
  const screenX = (user.cursor.x - cameraX) * cameraZoom;
  const screenY = (user.cursor.y - cameraY) * cameraZoom;

  // Skip if cursor is off-screen (with some margin)
  if (screenX < -50 || screenY < -50) return null;

  return (
    <div
      className="collab-cursor"
      style={{
        left: screenX,
        top: screenY,
        '--cursor-color': color,
      } as React.CSSProperties}
    >
      {/* Cursor arrow SVG */}
      <svg
        className="collab-cursor-icon"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M1 1L6 14L8 8L14 6L1 1Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* User name label */}
      <span
        className="collab-cursor-label"
        style={{ backgroundColor: color }}
      >
        {user.name}
      </span>
    </div>
  );
}

export interface CollaborativeCursorsProps {
  /** Container width for bounds checking */
  width?: number;
  /** Container height for bounds checking */
  height?: number;
}

export function CollaborativeCursors({ width, height }: CollaborativeCursorsProps) {
  const isActive = useCollaborationStore((state) => state.isActive);
  const remoteUsers = useCollaborationStore((state) => state.remoteUsers);

  // Get camera state for coordinate transform
  const camera = useSessionStore((state) => state.camera);
  const cameraX = camera.x;
  const cameraY = camera.y;
  const cameraZoom = camera.zoom;

  // Filter to users with cursor positions
  const usersWithCursors = useMemo(() => {
    return remoteUsers.filter((user) => user.cursor != null);
  }, [remoteUsers]);

  // Don't render if collaboration not active or no cursors
  if (!isActive || usersWithCursors.length === 0) {
    return null;
  }

  return (
    <div
      className="collab-cursors-overlay"
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
      }}
    >
      {usersWithCursors.map((user) => (
        <Cursor
          key={user.clientId}
          user={user}
          cameraX={cameraX}
          cameraY={cameraY}
          cameraZoom={cameraZoom}
        />
      ))}
    </div>
  );
}

export default CollaborativeCursors;
