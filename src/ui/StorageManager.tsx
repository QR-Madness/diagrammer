/**
 * StorageManager - UI for managing IndexedDB blob storage.
 *
 * Features:
 * - Display storage usage statistics
 * - List all stored blobs
 * - Identify orphaned blobs
 * - Run garbage collection
 * - Delete individual blobs
 */

import { useState, useEffect } from 'react';
import { blobStorage } from '../storage/BlobStorage';
import { BlobGarbageCollector } from '../storage/BlobGarbageCollector';
import type { BlobMetadata, StorageStats, GCStats } from '../storage/BlobTypes';
import { formatFileSize } from '../utils/imageUtils';
import './StorageManager.css';

export interface StorageManagerProps {
  /** Called when the modal should close */
  onClose: () => void;
}

export function StorageManager({ onClose }: StorageManagerProps) {
  const [blobs, setBlobs] = useState<BlobMetadata[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [gcResult, setGcResult] = useState<GCStats | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const gc = new BlobGarbageCollector(blobStorage);
      const [blobList, storageStats, orphaned] = await Promise.all([
        blobStorage.listAllBlobs(),
        blobStorage.getStorageStats(),
        gc.getOrphanedBlobs(),
      ]);

      setBlobs(blobList.sort((a, b) => b.createdAt - a.createdAt));
      setStats(storageStats);
      setOrphanedCount(orphaned.length);
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGarbageCollect = async () => {
    setIsCollecting(true);
    setGcResult(null);

    try {
      const gc = new BlobGarbageCollector(blobStorage);
      const result = await gc.collectGarbage();
      setGcResult(result);

      // Reload data
      await loadData();

      // Clear result after 5 seconds
      setTimeout(() => setGcResult(null), 5000);
    } catch (error) {
      console.error('Garbage collection failed:', error);
      alert('Garbage collection failed. See console for details.');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleDeleteBlob = async (blobId: string, name: string) => {
    const confirmed = confirm(
      `Delete blob "${name}"?\n\nWARNING: This will break any documents that reference this image.`
    );

    if (!confirmed) return;

    try {
      await blobStorage.deleteBlob(blobId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete blob:', error);
      alert('Failed to delete blob. See console for details.');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="storage-manager-overlay" onClick={onClose}>
      <div className="storage-manager" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="storage-manager-header">
          <h2>Storage Manager</h2>
          <button
            className="storage-manager-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Storage stats */}
        {stats && (
          <div className="storage-manager-stats">
            <div className="storage-stat">
              <span className="storage-stat-label">Used:</span>
              <span className="storage-stat-value">{formatFileSize(stats.used)}</span>
            </div>
            <div className="storage-stat">
              <span className="storage-stat-label">Available:</span>
              <span className="storage-stat-value">{formatFileSize(stats.available)}</span>
            </div>
            <div className="storage-stat">
              <span className="storage-stat-label">Usage:</span>
              <span className="storage-stat-value">{stats.percentUsed.toFixed(1)}%</span>
            </div>
            {orphanedCount > 0 && (
              <div className="storage-stat storage-stat-warning">
                <span className="storage-stat-label">Orphaned blobs:</span>
                <span className="storage-stat-value">{orphanedCount}</span>
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        {stats && (
          <div className="storage-progress">
            <div
              className="storage-progress-bar"
              style={{ width: `${Math.min(100, stats.percentUsed)}%` }}
            />
          </div>
        )}

        {/* Garbage collection */}
        <div className="storage-manager-actions">
          <button
            className="storage-manager-btn storage-manager-btn-primary"
            onClick={handleGarbageCollect}
            disabled={isCollecting || orphanedCount === 0}
          >
            {isCollecting ? 'Cleaning up...' : `Clean Up${orphanedCount > 0 ? ` (${orphanedCount})` : ''}`}
          </button>

          {gcResult && (
            <div className="storage-manager-gc-result">
              Freed {formatFileSize(gcResult.bytesFreed)} ({gcResult.blobsDeleted} blob
              {gcResult.blobsDeleted !== 1 ? 's' : ''}) in {gcResult.durationMs}ms
            </div>
          )}
        </div>

        {/* Blob list */}
        <div className="storage-manager-content">
          {isLoading ? (
            <div className="storage-manager-loading">Loading...</div>
          ) : blobs.length === 0 ? (
            <div className="storage-manager-empty">No images stored</div>
          ) : (
            <div className="storage-manager-list">
              <div className="storage-manager-list-header">
                <span className="storage-blob-name">Name</span>
                <span className="storage-blob-type">Type</span>
                <span className="storage-blob-size">Size</span>
                <span className="storage-blob-usage">Usage</span>
                <span className="storage-blob-date">Created</span>
                <span className="storage-blob-actions">Actions</span>
              </div>

              {blobs.map((blob) => (
                <div key={blob.id} className="storage-manager-list-item">
                  <span className="storage-blob-name" title={blob.name}>
                    {blob.name}
                  </span>
                  <span className="storage-blob-type">{blob.type.replace('image/', '')}</span>
                  <span className="storage-blob-size">{formatFileSize(blob.size)}</span>
                  <span className="storage-blob-usage">
                    {blob.usageCount === 0 ? (
                      <span className="storage-orphan-badge">Orphaned</span>
                    ) : (
                      `${blob.usageCount}×`
                    )}
                  </span>
                  <span className="storage-blob-date" title={formatDate(blob.createdAt)}>
                    {new Date(blob.createdAt).toLocaleDateString()}
                  </span>
                  <span className="storage-blob-actions">
                    <button
                      className="storage-manager-btn-small"
                      onClick={() => handleDeleteBlob(blob.id, blob.name)}
                      title="Delete blob"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
