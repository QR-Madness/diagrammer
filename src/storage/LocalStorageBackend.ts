/**
 * LocalStorage Backend Implementation
 *
 * Implements StorageBackend using browser localStorage.
 * This is the default storage for Personal Documents.
 */

import { DiagramDocument, STORAGE_KEYS } from '../types/Document';
import { StorageBackend, StorageResult } from './StorageBackend';

/**
 * LocalStorage-based document storage backend.
 *
 * Documents are stored as JSON strings with keys prefixed by DOCUMENT_PREFIX.
 * This backend is always available in browser environments.
 */
export class LocalStorageBackend implements StorageBackend {
  readonly type = 'localStorage' as const;

  /**
   * Check if localStorage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save a document to localStorage
   */
  async saveDocument(doc: DiagramDocument): Promise<StorageResult<void>> {
    try {
      const key = this.getStorageKey(doc.id);
      const json = JSON.stringify(doc);

      // Check size before saving (localStorage typically has 5-10MB limit)
      const sizeBytes = new Blob([json]).size;
      if (sizeBytes > 4 * 1024 * 1024) {
        // 4MB soft limit
        console.warn(
          `Document ${doc.id} is ${(sizeBytes / 1024 / 1024).toFixed(2)}MB, approaching localStorage limits`
        );
      }

      localStorage.setItem(key, json);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save document';
      console.error('LocalStorageBackend.saveDocument error:', error);
      return {
        success: false,
        error:
          message.includes('quota') || message.includes('QuotaExceeded')
            ? 'Storage quota exceeded. Please delete some documents.'
            : message,
      };
    }
  }

  /**
   * Load a document from localStorage
   */
  async loadDocument(id: string): Promise<StorageResult<DiagramDocument>> {
    try {
      const key = this.getStorageKey(id);
      const json = localStorage.getItem(key);

      if (!json) {
        return {
          success: false,
          error: `Document ${id} not found`,
        };
      }

      const doc = JSON.parse(json) as DiagramDocument;
      return { success: true, data: doc };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load document';
      console.error('LocalStorageBackend.loadDocument error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a document from localStorage
   */
  async deleteDocument(id: string): Promise<StorageResult<void>> {
    try {
      const key = this.getStorageKey(id);
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete document';
      console.error('LocalStorageBackend.deleteDocument error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Check if a document exists in localStorage
   */
  async documentExists(id: string): Promise<StorageResult<boolean>> {
    try {
      const key = this.getStorageKey(id);
      const exists = localStorage.getItem(key) !== null;
      return { success: true, data: exists };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to check document';
      console.error('LocalStorageBackend.documentExists error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * List all document IDs in localStorage
   */
  async listDocumentIds(): Promise<StorageResult<string[]>> {
    try {
      const ids: string[] = [];
      const prefix = STORAGE_KEYS.DOCUMENT_PREFIX;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const id = key.slice(prefix.length);
          ids.push(id);
        }
      }

      return { success: true, data: ids };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to list documents';
      console.error('LocalStorageBackend.listDocumentIds error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Get storage location description
   */
  getStorageLocation(id: string): string {
    return `localStorage:${this.getStorageKey(id)}`;
  }

  /**
   * Get the localStorage key for a document ID
   */
  private getStorageKey(id: string): string {
    return `${STORAGE_KEYS.DOCUMENT_PREFIX}${id}`;
  }
}

/**
 * Singleton instance of LocalStorageBackend
 */
export const localStorageBackend = new LocalStorageBackend();
