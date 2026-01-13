/**
 * File System Backend Implementation
 *
 * Implements StorageBackend using Tauri's file system API.
 * Used for Team Documents in Protected Local mode.
 */

import { DiagramDocument } from '../types/Document';
import { StorageBackend, StorageBackendConfig, StorageResult } from './StorageBackend';
import { isTauri } from '../tauri/commands';

// Tauri fs imports - these will only work in Tauri environment
let tauriFs: typeof import('@tauri-apps/plugin-fs') | null = null;
let tauriPath: typeof import('@tauri-apps/api/path') | null = null;

/**
 * Lazily load Tauri fs modules
 */
async function loadTauriModules(): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    if (!tauriFs) {
      tauriFs = await import('@tauri-apps/plugin-fs');
    }
    if (!tauriPath) {
      tauriPath = await import('@tauri-apps/api/path');
    }
    return true;
  } catch (error) {
    console.error('Failed to load Tauri modules:', error);
    return false;
  }
}

/**
 * File system-based document storage backend.
 *
 * Documents are stored as JSON files in a configurable directory.
 * This backend is only available in Tauri (desktop) environments.
 */
export class FileSystemBackend implements StorageBackend {
  readonly type = 'fileSystem' as const;

  private basePath: string;
  private initialized: boolean = false;

  /**
   * Create a FileSystemBackend with the specified base path
   * @param config - Configuration with basePath for document storage
   */
  constructor(config?: StorageBackendConfig) {
    // Default to app data directory + /documents
    this.basePath = config?.basePath ?? '';
  }

  /**
   * Initialize the backend and ensure the base directory exists
   */
  private async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    const loaded = await loadTauriModules();
    if (!loaded || !tauriFs || !tauriPath) {
      return false;
    }

    try {
      // If no base path configured, use app data directory
      if (!this.basePath) {
        const appDataDir = await tauriPath.appDataDir();
        this.basePath = `${appDataDir}documents`;
      }

      // Ensure directory exists
      const exists = await tauriFs.exists(this.basePath);
      if (!exists) {
        await tauriFs.mkdir(this.basePath, { recursive: true });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('FileSystemBackend initialization failed:', error);
      return false;
    }
  }

  /**
   * Check if the file system backend is available
   */
  async isAvailable(): Promise<boolean> {
    return this.initialize();
  }

  /**
   * Save a document to the file system
   */
  async saveDocument(doc: DiagramDocument): Promise<StorageResult<void>> {
    if (!(await this.initialize()) || !tauriFs) {
      return { success: false, error: 'File system not available' };
    }

    try {
      const filePath = this.getFilePath(doc.id);
      const json = JSON.stringify(doc, null, 2);

      await tauriFs.writeTextFile(filePath, json);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save document';
      console.error('FileSystemBackend.saveDocument error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Load a document from the file system
   */
  async loadDocument(id: string): Promise<StorageResult<DiagramDocument>> {
    if (!(await this.initialize()) || !tauriFs) {
      return { success: false, error: 'File system not available' };
    }

    try {
      const filePath = this.getFilePath(id);

      const exists = await tauriFs.exists(filePath);
      if (!exists) {
        return { success: false, error: `Document ${id} not found` };
      }

      const json = await tauriFs.readTextFile(filePath);
      const doc = JSON.parse(json) as DiagramDocument;
      return { success: true, data: doc };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load document';
      console.error('FileSystemBackend.loadDocument error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a document from the file system
   */
  async deleteDocument(id: string): Promise<StorageResult<void>> {
    if (!(await this.initialize()) || !tauriFs) {
      return { success: false, error: 'File system not available' };
    }

    try {
      const filePath = this.getFilePath(id);

      const exists = await tauriFs.exists(filePath);
      if (exists) {
        await tauriFs.remove(filePath);
      }

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete document';
      console.error('FileSystemBackend.deleteDocument error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Check if a document exists in the file system
   */
  async documentExists(id: string): Promise<StorageResult<boolean>> {
    if (!(await this.initialize()) || !tauriFs) {
      return { success: false, error: 'File system not available' };
    }

    try {
      const filePath = this.getFilePath(id);
      const exists = await tauriFs.exists(filePath);
      return { success: true, data: exists };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to check document';
      console.error('FileSystemBackend.documentExists error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * List all document IDs in the file system directory
   */
  async listDocumentIds(): Promise<StorageResult<string[]>> {
    if (!(await this.initialize()) || !tauriFs) {
      return { success: false, error: 'File system not available' };
    }

    try {
      const entries = await tauriFs.readDir(this.basePath);
      const ids: string[] = [];

      for (const entry of entries) {
        if (entry.name && entry.name.endsWith('.json')) {
          const id = entry.name.slice(0, -5); // Remove .json extension
          ids.push(id);
        }
      }

      return { success: true, data: ids };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to list documents';
      console.error('FileSystemBackend.listDocumentIds error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Get storage location description
   */
  getStorageLocation(id: string): string {
    return this.getFilePath(id);
  }

  /**
   * Get the base path for document storage
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Set a custom base path for document storage
   */
  setBasePath(path: string): void {
    this.basePath = path;
    this.initialized = false; // Force re-initialization
  }

  /**
   * Get the file path for a document ID
   */
  private getFilePath(id: string): string {
    return `${this.basePath}/${id}.json`;
  }
}

/**
 * Create a FileSystemBackend instance
 * Returns null if not in Tauri environment
 */
export function createFileSystemBackend(
  config?: StorageBackendConfig
): FileSystemBackend | null {
  if (!isTauri()) {
    return null;
  }
  return new FileSystemBackend(config);
}
