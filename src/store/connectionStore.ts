/**
 * Connection Store
 *
 * Centralized store for managing WebSocket connection state.
 * Used by UnifiedSyncProvider and consumed by UI components.
 *
 * Phase 14.1 Collaboration Overhaul
 */

import { create } from 'zustand';

// ============ Types ============

/** Connection status */
export type ConnectionStatus =
  | 'disconnected'  // Not connected
  | 'connecting'    // Attempting to connect
  | 'connected'     // WebSocket open, not yet authenticated
  | 'authenticating' // Sending credentials/token
  | 'authenticated' // Ready for operations
  | 'error';        // Connection or auth error

/** Authentication method */
export type AuthMethod = 'token' | 'credentials' | 'none';

/** Host connection info */
export interface HostInfo {
  /** Host address (e.g., "192.168.1.100:9876") */
  address: string;
  /** Full WebSocket URL */
  url: string;
  /** Host display name (if known) */
  name?: string;
}

/** Authenticated user info */
export interface AuthenticatedUser {
  id: string;
  username: string;
  role?: string | undefined;
}

/** Connection state */
interface ConnectionState {
  /** Current connection status */
  status: ConnectionStatus;
  /** Host we're connected/connecting to */
  host: HostInfo | null;
  /** Authentication method being used */
  authMethod: AuthMethod;
  /** Authenticated user (after successful auth) */
  user: AuthenticatedUser | null;
  /** JWT token (for reconnection) */
  token: string | null;
  /** Token expiration timestamp */
  tokenExpiresAt: number | null;
  /** Error message (if status is 'error') */
  error: string | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Timestamp of last successful connection */
  lastConnectedAt: number | null;
  /** Whether auto-reconnect is enabled */
  autoReconnect: boolean;
}

/** Connection actions */
interface ConnectionActions {
  /** Set connection status */
  setStatus: (status: ConnectionStatus, error?: string) => void;
  /** Set host info (on connect attempt) */
  setHost: (host: HostInfo | null) => void;
  /** Set authentication method */
  setAuthMethod: (method: AuthMethod) => void;
  /** Set authenticated user (on auth success) */
  setUser: (user: AuthenticatedUser | null) => void;
  /** Set JWT token (received from server) */
  setToken: (token: string | null, expiresAt?: number | null) => void;
  /** Increment reconnect attempts */
  incrementReconnectAttempts: () => void;
  /** Reset reconnect attempts (on successful connect) */
  resetReconnectAttempts: () => void;
  /** Set auto-reconnect flag */
  setAutoReconnect: (enabled: boolean) => void;
  /** Reset all connection state (on disconnect) */
  reset: () => void;
  /** Check if token is still valid */
  isTokenValid: () => boolean;
}

// ============ Initial State ============

const initialState: ConnectionState = {
  status: 'disconnected',
  host: null,
  authMethod: 'none',
  user: null,
  token: null,
  tokenExpiresAt: null,
  error: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  autoReconnect: true,
};

// ============ Store ============

/**
 * Connection store for managing WebSocket connection state.
 */
export const useConnectionStore = create<ConnectionState & ConnectionActions>()(
  (set, get) => ({
    ...initialState,

    setStatus: (status, error) => {
      const updates: Partial<ConnectionState> = { status };

      if (error !== undefined) {
        updates.error = error;
      } else if (status !== 'error') {
        updates.error = null;
      }

      // Track last successful connection
      if (status === 'authenticated') {
        updates.lastConnectedAt = Date.now();
      }

      set(updates);
    },

    setHost: (host) => {
      set({ host });
    },

    setAuthMethod: (method) => {
      set({ authMethod: method });
    },

    setUser: (user) => {
      set({ user });
    },

    setToken: (token, expiresAt = null) => {
      set({ token, tokenExpiresAt: expiresAt });
    },

    incrementReconnectAttempts: () => {
      set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }));
    },

    resetReconnectAttempts: () => {
      set({ reconnectAttempts: 0 });
    },

    setAutoReconnect: (enabled) => {
      set({ autoReconnect: enabled });
    },

    reset: () => {
      set(initialState);
    },

    isTokenValid: () => {
      const { token, tokenExpiresAt } = get();
      if (!token) return false;
      if (!tokenExpiresAt) return true; // No expiry means assume valid
      return Date.now() < tokenExpiresAt;
    },
  })
);

// ============ Selectors ============

/**
 * Check if currently connected and authenticated.
 */
export function useIsConnected(): boolean {
  return useConnectionStore((state) => state.status === 'authenticated');
}

/**
 * Check if currently in a connecting/authenticating state.
 */
export function useIsConnecting(): boolean {
  return useConnectionStore((state) =>
    state.status === 'connecting' || state.status === 'authenticating'
  );
}

/**
 * Get connection error if any.
 */
export function useConnectionError(): string | null {
  return useConnectionStore((state) =>
    state.status === 'error' ? state.error : null
  );
}

/**
 * Get current host info.
 */
export function useCurrentHost(): HostInfo | null {
  return useConnectionStore((state) => state.host);
}

/**
 * Get authenticated user.
 */
export function useAuthenticatedUser(): AuthenticatedUser | null {
  return useConnectionStore((state) => state.user);
}

export default useConnectionStore;
