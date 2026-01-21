/**
 * Presence Store
 *
 * Manages real-time presence information for collaborative editing:
 * - Remote user cursors and positions
 * - Remote user selections
 * - User identity (name, color)
 *
 * This store is separate from collaborationStore to:
 * - Provide optimized selectors for rendering
 * - Handle cursor throttling for performance
 * - Support future presence features (typing indicators, etc.)
 *
 * Phase 14.1.4 Collaboration Overhaul
 */

import { create } from 'zustand';

// ============ Types ============

/** Remote user presence state */
export interface RemotePresence {
  /** Unique client ID from Yjs awareness */
  clientId: number;
  /** User ID from authentication */
  userId: string;
  /** Display name */
  name: string;
  /** User color for cursor/selection */
  color: string;
  /** Cursor position in world coordinates (null if not in viewport) */
  cursor: { x: number; y: number } | null;
  /** Selected shape IDs */
  selection: string[];
  /** Last update timestamp (for stale detection) */
  lastUpdated: number;
}

/** Presence store state */
interface PresenceState {
  /** Remote users by client ID */
  remoteUsers: Map<number, RemotePresence>;
  /** Local user info for display */
  localUser: {
    userId: string;
    name: string;
    color: string;
  } | null;
  /** Whether presence is enabled */
  enabled: boolean;
  /** Cursor visibility threshold in ms (hide cursors older than this) */
  cursorStaleThreshold: number;
}

/** Presence store actions */
interface PresenceActions {
  /** Set local user info */
  setLocalUser: (user: { userId: string; name: string; color: string } | null) => void;

  /** Enable/disable presence */
  setEnabled: (enabled: boolean) => void;

  /** Update a remote user's presence */
  updateRemoteUser: (
    clientId: number,
    update: Partial<Omit<RemotePresence, 'clientId' | 'lastUpdated'>>
  ) => void;

  /** Remove a remote user */
  removeRemoteUser: (clientId: number) => void;

  /** Batch update all remote users (from awareness sync) */
  syncRemoteUsers: (
    users: Map<
      number,
      {
        id: string;
        name: string;
        color: string;
        cursor?: { x: number; y: number };
        selection?: string[];
      }
    >
  ) => void;

  /** Clear all remote users */
  clearRemoteUsers: () => void;

  /** Get users selecting a specific shape */
  getUsersSelectingShape: (shapeId: string) => RemotePresence[];

  /** Get all visible cursors (non-stale) */
  getVisibleCursors: () => RemotePresence[];

  /** Clean up stale presence data */
  cleanupStalePresence: () => void;
}

// ============ Default Values ============

const DEFAULT_CURSOR_STALE_THRESHOLD = 30000; // 30 seconds

// ============ Store ============

/**
 * Presence store for managing collaborative presence.
 *
 * Usage:
 * ```typescript
 * // Get remote users
 * const remoteUsers = usePresenceStore((s) => s.remoteUsers);
 *
 * // Sync from awareness
 * usePresenceStore.getState().syncRemoteUsers(awarenessUsers);
 *
 * // Get users selecting a shape
 * const selectingUsers = usePresenceStore.getState().getUsersSelectingShape(shapeId);
 * ```
 */
export const usePresenceStore = create<PresenceState & PresenceActions>()((set, get) => ({
  // Initial state
  remoteUsers: new Map(),
  localUser: null,
  enabled: true,
  cursorStaleThreshold: DEFAULT_CURSOR_STALE_THRESHOLD,

  // ============ Local User ============

  setLocalUser: (user) => {
    set({ localUser: user });
  },

  // ============ Enable/Disable ============

  setEnabled: (enabled) => {
    set({ enabled });
    if (!enabled) {
      // Clear remote users when disabled
      set({ remoteUsers: new Map() });
    }
  },

  // ============ Remote User Updates ============

  updateRemoteUser: (clientId, update) => {
    set((state) => {
      const newUsers = new Map(state.remoteUsers);
      const existing = newUsers.get(clientId);

      if (existing) {
        newUsers.set(clientId, {
          ...existing,
          ...update,
          lastUpdated: Date.now(),
        });
      } else if (update.userId && update.name && update.color) {
        // Create new user if we have required fields
        newUsers.set(clientId, {
          clientId,
          userId: update.userId,
          name: update.name,
          color: update.color,
          cursor: update.cursor ?? null,
          selection: update.selection ?? [],
          lastUpdated: Date.now(),
        });
      }

      return { remoteUsers: newUsers };
    });
  },

  removeRemoteUser: (clientId) => {
    set((state) => {
      const newUsers = new Map(state.remoteUsers);
      newUsers.delete(clientId);
      return { remoteUsers: newUsers };
    });
  },

  syncRemoteUsers: (users) => {
    if (!get().enabled) return;

    const now = Date.now();
    const newUsers = new Map<number, RemotePresence>();

    users.forEach((user, clientId) => {
      newUsers.set(clientId, {
        clientId,
        userId: user.id,
        name: user.name,
        color: user.color,
        cursor: user.cursor ?? null,
        selection: user.selection ?? [],
        lastUpdated: now,
      });
    });

    set({ remoteUsers: newUsers });
  },

  clearRemoteUsers: () => {
    set({ remoteUsers: new Map() });
  },

  // ============ Queries ============

  getUsersSelectingShape: (shapeId) => {
    const { remoteUsers, enabled } = get();
    if (!enabled) return [];

    const result: RemotePresence[] = [];
    remoteUsers.forEach((user) => {
      if (user.selection.includes(shapeId)) {
        result.push(user);
      }
    });
    return result;
  },

  getVisibleCursors: () => {
    const { remoteUsers, enabled, cursorStaleThreshold } = get();
    if (!enabled) return [];

    const now = Date.now();
    const result: RemotePresence[] = [];

    remoteUsers.forEach((user) => {
      // Include if cursor exists and is not stale
      if (user.cursor && now - user.lastUpdated < cursorStaleThreshold) {
        result.push(user);
      }
    });

    return result;
  },

  cleanupStalePresence: () => {
    const { remoteUsers, cursorStaleThreshold } = get();
    const now = Date.now();
    let hasStale = false;

    remoteUsers.forEach((user) => {
      if (now - user.lastUpdated > cursorStaleThreshold * 2) {
        hasStale = true;
      }
    });

    if (hasStale) {
      set((state) => {
        const newUsers = new Map<number, RemotePresence>();
        state.remoteUsers.forEach((user, clientId) => {
          if (now - user.lastUpdated <= state.cursorStaleThreshold * 2) {
            newUsers.set(clientId, user);
          }
        });
        return { remoteUsers: newUsers };
      });
    }
  },
}));

// ============ Selectors ============

/**
 * Get array of all remote users with presence.
 */
export function useRemoteUsers(): RemotePresence[] {
  return usePresenceStore((state) => Array.from(state.remoteUsers.values()));
}

/**
 * Get remote users with visible cursors.
 */
export function useVisibleCursors(): RemotePresence[] {
  const remoteUsers = usePresenceStore((state) => state.remoteUsers);
  const enabled = usePresenceStore((state) => state.enabled);
  const cursorStaleThreshold = usePresenceStore((state) => state.cursorStaleThreshold);

  if (!enabled) return [];

  const now = Date.now();
  const result: RemotePresence[] = [];

  remoteUsers.forEach((user) => {
    if (user.cursor && now - user.lastUpdated < cursorStaleThreshold) {
      result.push(user);
    }
  });

  return result;
}

/**
 * Get whether presence is enabled.
 */
export function usePresenceEnabled(): boolean {
  return usePresenceStore((state) => state.enabled);
}

/**
 * Get local user info.
 */
export function useLocalPresence(): { userId: string; name: string; color: string } | null {
  return usePresenceStore((state) => state.localUser);
}

/**
 * Get a specific remote user by client ID.
 */
export function useRemoteUser(clientId: number): RemotePresence | undefined {
  return usePresenceStore((state) => state.remoteUsers.get(clientId));
}

export default usePresenceStore;
