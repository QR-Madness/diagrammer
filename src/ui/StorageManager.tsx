/**
 * StorageManager - UI for managing IndexedDB blob storage.
 *
 * Features:
 * - Display storage usage statistics
 * - List all stored blobs (Images tab)
 * - List and manage icons (Icons tab)
 * - Identify orphaned blobs
 * - Run garbage collection
 * - Delete individual blobs
 * - Upload custom icons
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { blobStorage } from '../storage/BlobStorage';
import { BlobGarbageCollector } from '../storage/BlobGarbageCollector';
import type { BlobMetadata, StorageStats, GCStats } from '../storage/BlobTypes';
import { useIconLibraryStore, initializeIconLibrary } from '../store/iconLibraryStore';
import type { IconMetadata } from '../storage/IconTypes';
import { formatFileSize } from '../utils/imageUtils';
import './StorageManager.css';

type TabId = 'images' | 'icons';

export interface StorageManagerProps {
  /** Called when the modal should close */
  onClose: () => void;
}

export function StorageManager({ onClose }: StorageManagerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('images');
  const [blobs, setBlobs] = useState<BlobMetadata[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [gcResult, setGcResult] = useState<GCStats | null>(null);

  // Icon state
  const [icons, setIcons] = useState<IconMetadata[]>([]);
  const [iconPreviews, setIconPreviews] = useState<Record<string, string>>({});
  const [isLoadingIcons, setIsLoadingIcons] = useState(true);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    getAllIcons,
    loadIconData,
    uploadIcon,
    deleteIcon,
  } = useIconLibraryStore();

  const loadBlobData = async () => {
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

  const loadIconData2 = useCallback(async () => {
    setIsLoadingIcons(true);
    try {
      // Initialize icon library if needed
      await initializeIconLibrary();

      const allIcons = getAllIcons();
      setIcons(allIcons);

      // Load previews for icons
      const previews: Record<string, string> = {};
      for (const icon of allIcons) {
        try {
          const iconData = await loadIconData(icon.id);
          if (iconData) {
            previews[icon.id] = iconData.dataUrl;
          }
        } catch {
          // Skip failed previews
        }
      }
      setIconPreviews(previews);
    } catch (error) {
      console.error('Failed to load icons:', error);
    } finally {
      setIsLoadingIcons(false);
    }
  }, [getAllIcons, loadIconData]);

  useEffect(() => {
    loadBlobData();
    loadIconData2();
  }, [loadIconData2]);

  const handleGarbageCollect = async () => {
    setIsCollecting(true);
    setGcResult(null);

    try {
      const gc = new BlobGarbageCollector(blobStorage);
      const result = await gc.collectGarbage();
      setGcResult(result);

      // Reload data
      await loadBlobData();

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
      await loadBlobData();
    } catch (error) {
      console.error('Failed to delete blob:', error);
      alert('Failed to delete blob. See console for details.');
    }
  };

  const handleDeleteIcon = async (iconId: string, name: string) => {
    const confirmed = confirm(
      `Delete icon "${name}"?\n\nWARNING: This will remove the icon from shapes that use it.`
    );

    if (!confirmed) return;

    try {
      await deleteIcon(iconId);
      await loadIconData2();
    } catch (error) {
      console.error('Failed to delete icon:', error);
      alert('Failed to delete icon. See console for details.');
    }
  };

  const handleUploadIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    e.target.value = '';

    if (!file.type.includes('svg')) {
      alert('Please select an SVG file.');
      return;
    }

    setIsUploadingIcon(true);

    try {
      const result = await uploadIcon(file, file.name);

      if (!result.success) {
        alert(result.error || 'Failed to upload icon');
        return;
      }

      // Reload icons
      await loadIconData2();
    } catch (error) {
      console.error('Failed to upload icon:', error);
      alert('Failed to upload icon. See console for details.');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const customIconCount = icons.filter((i) => i.type === 'custom').length;
  const builtinIconCount = icons.filter((i) => i.type === 'builtin').length;

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

        {/* Tabs */}
        <div className="storage-manager-tabs">
          <button
            className={`storage-manager-tab ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            Images ({blobs.length})
          </button>
          <button
            className={`storage-manager-tab ${activeTab === 'icons' ? 'active' : ''}`}
            onClick={() => setActiveTab('icons')}
          >
            Icons ({icons.length})
          </button>
        </div>

        {/* Images Tab */}
        {activeTab === 'images' && (
          <>
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
          </>
        )}

        {/* Icons Tab */}
        {activeTab === 'icons' && (
          <>
            {/* Icon stats */}
            <div className="storage-manager-stats">
              <div className="storage-stat">
                <span className="storage-stat-label">Built-in:</span>
                <span className="storage-stat-value">{builtinIconCount}</span>
              </div>
              <div className="storage-stat">
                <span className="storage-stat-label">Custom:</span>
                <span className="storage-stat-value">{customIconCount}</span>
              </div>
            </div>

            {/* Upload button */}
            <div className="storage-manager-actions">
              <button
                className="storage-manager-btn storage-manager-btn-primary"
                onClick={handleUploadIconClick}
                disabled={isUploadingIcon}
              >
                {isUploadingIcon ? 'Uploading...' : 'Upload SVG Icon'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleIconFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Icon grid */}
            <div className="storage-manager-content">
              {isLoadingIcons ? (
                <div className="storage-manager-loading">Loading...</div>
              ) : icons.length === 0 ? (
                <div className="storage-manager-empty">No icons available</div>
              ) : (
                <div className="storage-icon-grid">
                  {icons.map((icon) => (
                    <div key={icon.id} className="storage-icon-item">
                      <div
                        className="storage-icon-preview"
                        title={icon.name}
                      >
                        {iconPreviews[icon.id] ? (
                          <img
                            src={iconPreviews[icon.id]}
                            alt={icon.name}
                            className="storage-icon-image"
                          />
                        ) : (
                          <div className="storage-icon-placeholder">?</div>
                        )}
                      </div>
                      <div className="storage-icon-info">
                        <span className="storage-icon-name" title={icon.name}>
                          {icon.name}
                        </span>
                        <span className={`storage-icon-type ${icon.type}`}>
                          {icon.type}
                        </span>
                      </div>
                      {icon.type === 'custom' && (
                        <button
                          className="storage-icon-delete"
                          onClick={() => handleDeleteIcon(icon.id, icon.name)}
                          title="Delete icon"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
