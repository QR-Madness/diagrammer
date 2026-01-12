/**
 * Tauri Integration Module
 *
 * Provides access to Tauri-specific functionality when running as a desktop app.
 * All exports gracefully handle non-Tauri environments (web browser).
 */

export * from './commands';
export { isTauri } from './commands';
