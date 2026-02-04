/**
 * Storage Quota Monitor
 *
 * Proactively monitors storage usage and warns users before
 * quota is exceeded. Prevents data loss from failed saves.
 *
 * Phase 14.9.2 - Storage quota monitoring
 */

import { BlobStorage } from './BlobStorage';
import { useNotificationStore } from '../store/notificationStore';

// ============ Types ============

/** Storage quota thresholds */
export interface QuotaThresholds {
  /** Warning threshold (percentage, default: 80) */
  warning: number;
  /** Critical threshold (percentage, default: 95) */
  critical: number;
}

/** Storage quota status */
export type QuotaStatus = 'ok' | 'warning' | 'critical';

/** Quota check result */
export interface QuotaCheckResult {
  /** Current status */
  status: QuotaStatus;
  /** Percentage used (0-100) */
  percentUsed: number;
  /** Bytes used */
  used: number;
  /** Bytes available */
  available: number;
  /** Human-readable used string */
  usedFormatted: string;
  /** Human-readable available string */
  availableFormatted: string;
}

// ============ Constants ============

const DEFAULT_THRESHOLDS: QuotaThresholds = {
  warning: 80,
  critical: 95,
};

// Track if we've already warned in this session
let lastWarningStatus: QuotaStatus = 'ok';

// ============ Utility Functions ============

/**
 * Format bytes as human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============ Main Functions ============

/**
 * Check current storage quota status.
 */
export async function checkStorageQuota(
  thresholds: QuotaThresholds = DEFAULT_THRESHOLDS
): Promise<QuotaCheckResult> {
  const storage = BlobStorage.getInstance();
  const stats = await storage.getStorageStats();

  let status: QuotaStatus = 'ok';
  if (stats.percentUsed >= thresholds.critical) {
    status = 'critical';
  } else if (stats.percentUsed >= thresholds.warning) {
    status = 'warning';
  }

  return {
    status,
    percentUsed: stats.percentUsed,
    used: stats.used,
    available: stats.available,
    usedFormatted: formatBytes(stats.used),
    availableFormatted: formatBytes(stats.available),
  };
}

/**
 * Check storage quota and show notification if needed.
 * Only shows notification once per status level per session.
 */
export async function checkAndNotifyQuota(
  thresholds: QuotaThresholds = DEFAULT_THRESHOLDS
): Promise<QuotaCheckResult> {
  const result = await checkStorageQuota(thresholds);
  const { notify } = useNotificationStore.getState();

  // Only notify if status worsened
  if (result.status !== lastWarningStatus) {
    if (result.status === 'critical' && lastWarningStatus !== 'critical') {
      notify({
        message: `Storage almost full (${result.percentUsed.toFixed(0)}% used). Save may fail. Delete unused files.`,
        severity: 'error',
        category: 'permanent',
        duration: 0, // Manual dismiss only
        actionLabel: 'Manage Storage',
      });
      lastWarningStatus = 'critical';
    } else if (result.status === 'warning' && lastWarningStatus === 'ok') {
      notify({
        message: `Storage ${result.percentUsed.toFixed(0)}% full (${result.usedFormatted} of ${result.availableFormatted})`,
        severity: 'warning',
        category: 'info',
        duration: 8000,
      });
      lastWarningStatus = 'warning';
    } else if (result.status === 'ok' && lastWarningStatus !== 'ok') {
      // Reset warning status when space is freed
      lastWarningStatus = 'ok';
    }
  }

  return result;
}

/**
 * Check if there's enough space for a new blob.
 * Returns true if save should proceed, false if quota is too low.
 */
export async function hasSpaceForBlob(
  blobSize: number,
  thresholds: QuotaThresholds = DEFAULT_THRESHOLDS
): Promise<boolean> {
  const result = await checkStorageQuota(thresholds);

  // Calculate what percentage would be used after adding this blob
  const newUsed = result.used + blobSize;
  const newPercentUsed = result.available > 0 ? (newUsed / result.available) * 100 : 100;

  // Warn if this would push us over the critical threshold
  if (newPercentUsed >= thresholds.critical) {
    const { warning } = useNotificationStore.getState();
    warning(
      `This file (${formatBytes(blobSize)}) would exceed storage quota. Free up space first.`
    );
    return false;
  }

  return true;
}

/**
 * Reset warning status (e.g., after user acknowledges and frees space).
 */
export function resetQuotaWarningStatus(): void {
  lastWarningStatus = 'ok';
}

/**
 * Get estimated remaining space.
 */
export async function getRemainingSpace(): Promise<{ bytes: number; formatted: string }> {
  const storage = BlobStorage.getInstance();
  const stats = await storage.getStorageStats();
  const remaining = Math.max(0, stats.available - stats.used);

  return {
    bytes: remaining,
    formatted: formatBytes(remaining),
  };
}
