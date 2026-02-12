import { useEffect, useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import './ConnectionStatusBanner.css';

/**
 * Banner that shows WebSocket connection status to users.
 * Displays when disconnected, reconnecting, or connection failed.
 * Hidden when connected or not in server mode.
 */
export function ConnectionStatusBanner() {
  const status = useConnectionStore((s) => s.status);
  const reconnectAttempts = useConnectionStore((s) => s.reconnectAttempts);
  const autoReconnect = useConnectionStore((s) => s.autoReconnect);
  const setAutoReconnect = useConnectionStore((s) => s.setAutoReconnect);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when status changes
  useEffect(() => {
    setDismissed(false);
  }, [status]);

  // Don't show when connected or in initial disconnected state
  if (status === 'authenticated' || status === 'connected' || dismissed) {
    return null;
  }

  // Don't show banner in initial disconnected state (not in server mode)
  if (status === 'disconnected' && reconnectAttempts === 0) {
    return null;
  }

  const isReconnecting = status === 'connecting' && reconnectAttempts > 0;
  const isFailed = status === 'disconnected' && reconnectAttempts > 0 && !autoReconnect;

  let message: string;
  let variant: string;

  if (isReconnecting) {
    message = `Reconnecting... (attempt ${reconnectAttempts})`;
    variant = 'warning';
  } else if (isFailed) {
    message = 'Connection lost. Changes are saved locally.';
    variant = 'error';
  } else if (status === 'disconnected' && reconnectAttempts > 0) {
    message = `Connection lost. Retrying... (attempt ${reconnectAttempts})`;
    variant = 'warning';
  } else if (status === 'connecting') {
    message = 'Connecting to server...';
    variant = 'info';
  } else {
    return null;
  }

  return (
    <div className={`connection-banner connection-banner--${variant}`}>
      <span className="connection-banner__icon">
        {variant === 'error' ? '⚠' : '⟳'}
      </span>
      <span className="connection-banner__message">{message}</span>
      <div className="connection-banner__actions">
        {isFailed && (
          <button
            className="connection-banner__retry"
            onClick={() => setAutoReconnect(true)}
          >
            Retry
          </button>
        )}
        <button
          className="connection-banner__dismiss"
          onClick={() => setDismissed(true)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
