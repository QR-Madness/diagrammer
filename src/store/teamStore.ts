/**
 * Team Store
 *
 * Manages team members, server mode, and connection status
 * for Protected Local (Team) mode collaboration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ServerMode,
  TeamMember,
  ConnectionStatus,
  User,
} from '../types/Auth';
import {
  startServer,
  stopServer,
  getServerStatus,
  isTauri,
} from '../tauri/commands';

/**
 * Team store state
 */
interface TeamState {
  /** Current server mode */
  serverMode: ServerMode;
  /** Team members (only populated in host mode) */
  members: TeamMember[];
  /** Connection status */
  connectionStatus: ConnectionStatus;
  /** Host port when in host mode */
  hostPort: number;
  /** Host address when in client mode */
  hostAddress: string;
}

/**
 * Team store actions
 */
interface TeamActions {
  /** Start hosting (Protected Local mode) */
  startHosting: (port?: number) => Promise<void>;
  /** Stop hosting */
  stopHosting: () => Promise<void>;
  /** Connect to a host as client */
  connectToHost: (address: string) => Promise<void>;
  /** Disconnect from host */
  disconnect: () => Promise<void>;
  /** Go offline (stop all connections) */
  goOffline: () => Promise<void>;
  /** Add a team member (host only) */
  addMember: (user: User) => void;
  /** Remove a team member (host only) */
  removeMember: (userId: string) => void;
  /** Update member online status */
  updateMemberStatus: (userId: string, online: boolean) => void;
  /** Refresh server status */
  refreshStatus: () => Promise<void>;
  /** Set host port preference */
  setHostPort: (port: number) => void;
}

/**
 * Default host port
 */
const DEFAULT_HOST_PORT = 9876;

/**
 * Initial state
 */
const initialState: TeamState = {
  serverMode: 'offline',
  members: [],
  connectionStatus: {
    mode: 'offline',
    connected: false,
  },
  hostPort: DEFAULT_HOST_PORT,
  hostAddress: '',
};

/**
 * Team store for managing collaboration in Protected Local mode.
 */
export const useTeamStore = create<TeamState & TeamActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      startHosting: async (port?: number) => {
        if (!isTauri()) {
          set({
            connectionStatus: {
              mode: 'offline',
              connected: false,
              error: 'Hosting only available in desktop app',
            },
          });
          return;
        }

        const hostPort = port ?? get().hostPort;

        try {
          const address = await startServer(hostPort);

          set({
            serverMode: 'host',
            hostPort,
            connectionStatus: {
              mode: 'host',
              connected: true,
              hostPort,
              hostAddress: address,
            },
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to start server';
          set({
            connectionStatus: {
              mode: 'offline',
              connected: false,
              error: errorMsg,
            },
          });
        }
      },

      stopHosting: async () => {
        try {
          await stopServer();
        } catch {
          // Ignore errors when stopping
        }

        set({
          serverMode: 'offline',
          members: [],
          connectionStatus: {
            mode: 'offline',
            connected: false,
          },
        });
      },

      connectToHost: async (address: string) => {
        // Update state to indicate client mode
        // Actual WebSocket connection is handled by collaborationStore.startSession()
        set({
          serverMode: 'client',
          hostAddress: address,
          connectionStatus: {
            mode: 'client',
            connected: false, // Will be true once WebSocket connects
            hostAddress: address,
          },
        });
      },

      disconnect: async () => {
        // TODO: Implement WebSocket disconnect in Phase 14.0
        set({
          serverMode: 'offline',
          hostAddress: '',
          connectionStatus: {
            mode: 'offline',
            connected: false,
          },
        });
      },

      goOffline: async () => {
        const { serverMode } = get();

        if (serverMode === 'host') {
          await get().stopHosting();
        } else if (serverMode === 'client') {
          await get().disconnect();
        }

        set({
          serverMode: 'offline',
          members: [],
          connectionStatus: {
            mode: 'offline',
            connected: false,
          },
        });
      },

      addMember: (user: User) => {
        set((state) => ({
          members: [
            ...state.members,
            {
              user,
              online: true,
              lastSeenAt: Date.now(),
            },
          ],
        }));
      },

      removeMember: (userId: string) => {
        set((state) => ({
          members: state.members.filter((m) => m.user.id !== userId),
        }));
      },

      updateMemberStatus: (userId: string, online: boolean) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.user.id === userId
              ? { ...m, online, lastSeenAt: Date.now() }
              : m
          ),
        }));
      },

      refreshStatus: async () => {
        if (!isTauri()) return;

        try {
          const status = await getServerStatus();

          if (status.running) {
            set((state) => ({
              connectionStatus: {
                ...state.connectionStatus,
                mode: 'host',
                connected: true,
                hostPort: status.port,
                hostAddress: status.address,
              },
            }));
          }
        } catch {
          // Ignore errors when refreshing
        }
      },

      setHostPort: (port: number) => {
        set({ hostPort: port });
      },
    }),
    {
      name: 'diagrammer-team',
      version: 1,
      partialize: (state) => ({
        // Only persist preferences, not runtime state
        hostPort: state.hostPort,
      }),
    }
  )
);

/**
 * Get the number of online team members
 */
export function getOnlineMemberCount(): number {
  return useTeamStore.getState().members.filter((m) => m.online).length;
}

/**
 * Check if currently hosting
 */
export function isHosting(): boolean {
  return useTeamStore.getState().serverMode === 'host';
}

/**
 * Check if currently connected as client
 */
export function isClient(): boolean {
  return useTeamStore.getState().serverMode === 'client';
}

/**
 * Check if in any team mode (host or client)
 */
export function isTeamMode(): boolean {
  const mode = useTeamStore.getState().serverMode;
  return mode === 'host' || mode === 'client';
}
