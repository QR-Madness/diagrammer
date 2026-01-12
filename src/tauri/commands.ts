/**
 * Tauri IPC Commands
 *
 * This module provides TypeScript bindings for Tauri backend commands.
 * These commands communicate with the Rust backend via Tauri's IPC system.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
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
