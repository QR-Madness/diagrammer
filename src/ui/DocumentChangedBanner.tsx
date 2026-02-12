/**
 * Document Changed Banner
 *
 * A notification banner shown when the current document has been
 * modified externally (e.g., by another client or tab).
 * Provides reload and dismiss actions.
 *
 * Phase 16 - Document Version Tracking UI
 */

import { useState } from 'react';
import './DocumentChangedBanner.css';

export interface DocumentChangedBannerProps {
  isVisible: boolean;
  serverVersion: number;
  onReload: () => void;
  onDismiss: () => void;
}

export function DocumentChangedBanner({
  isVisible,
  serverVersion,
  onReload,
  onDismiss,
}: DocumentChangedBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isVisible || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div className="document-changed-banner" role="alert">
      <span className="document-changed-banner__icon">ℹ</span>
      <span className="document-changed-banner__message">
        This document was updated externally (v{serverVersion}).
      </span>
      <button
        className="document-changed-banner__btn document-changed-banner__btn--reload"
        onClick={onReload}
      >
        Reload
      </button>
      <button
        className="document-changed-banner__btn document-changed-banner__btn--dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
