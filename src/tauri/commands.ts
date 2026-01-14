/**
 * Tauri IPC Commands
 *
 * This module provides TypeScript bindings for Tauri backend commands.
 * These commands communicate with the Rust backend via Tauri's IPC system.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Network access mode for the server
 */
export type NetworkMode = 'localhost' | 'lan';

/**
 * Server configuration
 */
export interface ServerConfig {
  /** Network access mode */
  network_mode: NetworkMode;
  /** Maximum connections allowed (0 = unlimited) */
  max_connections: number;
  /** Port to listen on */
  port: number;
}

/**
 * Server status information from the Tauri backend
 */
export interface ServerStatus {
  /** Whether the server is currently running */
  running: boolean;
  /** Port the server is listening on (0 if not running) */
  port: number;
  /** Number of connected clients */
  connected_clients: number;
  /** Primary WebSocket address (empty if not running) */
  address: string;
  /** All available addresses to connect to */
  addresses: string[];
  /** Current network mode */
  network_mode: NetworkMode;
  /** Maximum allowed connections (0 = unlimited) */
  max_connections: number;
}

/**
 * Check if running in Tauri environment
 * Tauri v2 uses __TAURI_INTERNALS__ instead of __TAURI__
 */
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

/**
 * Get the current server mode status
 * @returns true if Protected Local mode is enabled
 */
export async function getServerMode(): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>('get_server_mode');
}

/**
 * Set the server mode (Protected Local on/off)
 * @param enabled - Whether to enable server mode
 */
export async function setServerMode(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>('set_server_mode', { enabled });
}

/**
 * Get the app version from Cargo.toml
 * @returns Version string (e.g., "0.1.0")
 */
export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return '0.1.0-web';
  return invoke<string>('get_app_version');
}

/**
 * Start the WebSocket server for Protected Local mode
 * @param port - Port to listen on
 * @returns Server URL on success
 */
export async function startServer(port: number): Promise<string> {
  if (!isTauri()) {
    throw new Error('Server mode only available in desktop app');
  }
  return invoke<string>('start_server', { port });
}

/**
 * Stop the WebSocket server
 */
export async function stopServer(): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>('stop_server');
}

/**
 * Get the current server status
 * @returns Server status information
 */
export async function getServerStatus(): Promise<ServerStatus> {
  if (!isTauri()) {
    return {
      running: false,
      port: 0,
      connected_clients: 0,
      address: '',
      addresses: [],
      network_mode: 'lan',
      max_connections: 10,
    };
  }
  return invoke<ServerStatus>('get_server_status');
}

/**
 * Get the current server configuration
 * @returns Server configuration
 */
export async function getServerConfig(): Promise<ServerConfig> {
  if (!isTauri()) {
    return {
      network_mode: 'lan',
      max_connections: 10,
      port: 9876,
    };
  }
  return invoke<ServerConfig>('get_server_config');
}

/**
 * Update server configuration (only when server is not running)
 * @param config - New server configuration
 */
export async function setServerConfig(config: ServerConfig): Promise<void> {
  if (!isTauri()) {
    throw new Error('Server configuration only available in desktop app');
  }
  return invoke<void>('set_server_config', { config });
}

/**
 * Get available LAN IP addresses for client connections
 * @returns Array of IP address strings
 */
export async function getLanAddresses(): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<string[]>('get_lan_addresses');
}
