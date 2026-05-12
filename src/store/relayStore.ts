/**
 * Relay Store
 *
 * Manages relay membership, server mode, and connection status for
 * collaboration. Renamed from `teamStore` in Phase 20.3 Slice B; the
 * persisted zustand key migrates from `diagrammer-team` to
 * `diagrammer-relay` via `src/migrations/relayRename.ts`.
 *
 * In v2 the host/client distinction collapses (every client connects
 * to an external relay) — Slice E will simplify this module further.
 * For now it retains the pre-extraction host/client API surface.
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
 * Relay store state.
 */
interface RelayState {
  /** Current server mode */
  serverMode: ServerMode;
  /** Connected members (only populated in host mode) */
  members: TeamMember[];
  /** Connection status */
  connectionStatus: ConnectionStatus;
  /** Host port when in host mode */
  hostPort: number;
  /** Host address when in client mode */
  hostAddress: string;
}

/**
 * Relay store actions.
 */
interface RelayActions {
  /** Start hosting a relay (legacy Relay path — removed in Slice E) */
  startHosting: (port?: number) => Promise<void>;
  /** Stop hosting */
  stopHosting: () => Promise<void>;
  /** Connect to a relay as client */
  connectToHost: (address: string) => Promise<void>;
  /** Disconnect from relay */
  disconnect: () => Promise<void>;
  /** Go offline (stop all connections) */
  goOffline: () => Promise<void>;
  /** Add a member (host only) */
  addMember: (user: User) => void;
  /** Remove a member (host only) */
  removeMember: (userId: string) => void;
  /** Update member online status */
  updateMemberStatus: (userId: string, online: boolean) => void;
  /** Refresh server status */
  refreshStatus: () => Promise<void>;
  /** Set host port preference */
  setHostPort: (port: number) => void;
}

const DEFAULT_HOST_PORT = 9876;

const initialState: RelayState = {
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
 * Relay store for managing collaboration connections.
 */
export const useRelayStore = create<RelayState & RelayActions>()(
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
        set({
          serverMode: 'client',
          hostAddress: address,
          connectionStatus: {
            mode: 'client',
            connected: false,
            hostAddress: address,
          },
        });
      },

      disconnect: async () => {
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
      name: 'diagrammer-relay',
      version: 1,
      partialize: (state) => ({
        hostPort: state.hostPort,
      }),
    }
  )
);

/** Number of online members. */
export function getOnlineMemberCount(): number {
  return useRelayStore.getState().members.filter((m) => m.online).length;
}

/** True if currently hosting. */
export function isHosting(): boolean {
  return useRelayStore.getState().serverMode === 'host';
}

/** True if currently connected as client. */
export function isClient(): boolean {
  return useRelayStore.getState().serverMode === 'client';
}

/** True if in any relay mode (host or client). */
export function isRelayMode(): boolean {
  const mode = useRelayStore.getState().serverMode;
  return mode === 'host' || mode === 'client';
}
