/**
 * User Store
 *
 * Manages current user session, authentication state, and login/logout.
 * Used in Protected Local (Team) mode for user identification.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  SessionToken,
  LoginCredentials,
  LoginResponse,
  isAdmin,
} from '../types/Auth';

/**
 * User store state
 */
interface UserState {
  /** Currently logged in user (null if not logged in) */
  currentUser: User | null;
  /** Current session token (null if not logged in) */
  sessionToken: SessionToken | null;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Last authentication error */
  authError: string | null;
}

/**
 * User store actions
 */
interface UserActions {
  /** Login with credentials */
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  /** Logout current user */
  logout: () => void;
  /** Set user from external source (e.g., token validation) */
  setUser: (user: User, token: SessionToken) => void;
  /** Clear auth error */
  clearError: () => void;
  /** Check if current user is admin */
  isCurrentUserAdmin: () => boolean;
  /** Check if session is valid (not expired) */
  isSessionValid: () => boolean;
  /** Get time until session expires (in ms) */
  getSessionTimeRemaining: () => number;
}

/**
 * Initial state
 */
const initialState: UserState = {
  currentUser: null,
  sessionToken: null,
  isAuthenticating: false,
  authError: null,
};

/**
 * User store for authentication and session management.
 *
 * Session token is persisted to localStorage for persistence across
 * browser sessions. The token is validated on app startup.
 */
export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        set({ isAuthenticating: true, authError: null });

        try {
          // In Tauri environment, call the Rust backend
          // For now, this is a placeholder that will be connected to the backend
          const { isTauri } = await import('../tauri/commands');

          if (!isTauri()) {
            // Web mode - no authentication available
            set({ isAuthenticating: false });
            return {
              success: false,
              error: 'Authentication only available in desktop app',
            };
          }

          // Call Tauri backend for authentication
          const { invoke } = await import('@tauri-apps/api/core');
          const response = await invoke<LoginResponse>('login', {
            username: credentials.username,
            password: credentials.password,
          });

          if (response.success && response.user && response.token) {
            set({
              currentUser: response.user,
              sessionToken: response.token,
              isAuthenticating: false,
              authError: null,
            });
          } else {
            set({
              isAuthenticating: false,
              authError: response.error ?? 'Login failed',
            });
          }

          return response;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Login failed';
          set({
            isAuthenticating: false,
            authError: errorMsg,
          });
          return { success: false, error: errorMsg };
        }
      },

      logout: () => {
        set({
          currentUser: null,
          sessionToken: null,
          authError: null,
        });
      },

      setUser: (user: User, token: SessionToken) => {
        set({
          currentUser: user,
          sessionToken: token,
          authError: null,
        });
      },

      clearError: () => {
        set({ authError: null });
      },

      isCurrentUserAdmin: () => {
        return isAdmin(get().currentUser);
      },

      isSessionValid: () => {
        const { sessionToken } = get();
        if (!sessionToken) return false;
        return Date.now() < sessionToken.expiresAt;
      },

      getSessionTimeRemaining: () => {
        const { sessionToken } = get();
        if (!sessionToken) return 0;
        const remaining = sessionToken.expiresAt - Date.now();
        return Math.max(0, remaining);
      },
    }),
    {
      name: 'diagrammer-user',
      version: 1,
      partialize: (state) => ({
        // Only persist token - user will be re-fetched on validation
        sessionToken: state.sessionToken,
      }),
    }
  )
);

/**
 * Validate the stored session token on app startup.
 * If valid, restores the user session. If expired, clears the session.
 */
export async function validateStoredSession(): Promise<boolean> {
  const store = useUserStore.getState();
  const { sessionToken } = store;

  if (!sessionToken) {
    return false;
  }

  // Check if token is expired locally
  if (Date.now() >= sessionToken.expiresAt) {
    store.logout();
    return false;
  }

  try {
    // Validate with backend
    const { isTauri } = await import('../tauri/commands');
    if (!isTauri()) {
      store.logout();
      return false;
    }

    const { invoke } = await import('@tauri-apps/api/core');
    const response = await invoke<LoginResponse>('validate_token', {
      token: sessionToken.token,
    });

    if (response.success && response.user) {
      store.setUser(response.user, sessionToken);
      return true;
    } else {
      store.logout();
      return false;
    }
  } catch {
    // Backend not available or token invalid
    store.logout();
    return false;
  }
}
