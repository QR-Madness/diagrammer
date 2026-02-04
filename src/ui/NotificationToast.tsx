/**
 * Notification Toast Component
 *
 * Displays toast notifications from the notification store.
 *
 * Phase 14.9.2 - Error Handling & Resilience
 */

import { useNotificationStore, type Notification } from '../store/notificationStore';
import './NotificationToast.css';

/** Single toast notification */
function Toast({ notification }: { notification: Notification }) {
  const dismiss = useNotificationStore((state) => state.dismiss);

  const handleDismiss = () => {
    dismiss(notification.id);
  };

  const handleAction = () => {
    if (notification.onAction) {
      notification.onAction();
    }
    dismiss(notification.id);
  };

  return (
    <div
      className={`notification-toast notification-toast--${notification.severity}`}
      role="alert"
      aria-live={notification.severity === 'error' ? 'assertive' : 'polite'}
    >
      <div className="notification-toast__icon">
        {notification.severity === 'info' && <InfoIcon />}
        {notification.severity === 'success' && <SuccessIcon />}
        {notification.severity === 'warning' && <WarningIcon />}
        {notification.severity === 'error' && <ErrorIcon />}
      </div>

      <div className="notification-toast__content">
        <p className="notification-toast__message">{notification.message}</p>
        {notification.category === 'transient' && (
          <span className="notification-toast__hint">This may be temporary</span>
        )}
      </div>

      <div className="notification-toast__actions">
        {notification.actionLabel && notification.onAction && (
          <button
            className="notification-toast__action-btn"
            onClick={handleAction}
            type="button"
          >
            {notification.actionLabel}
          </button>
        )}
        <button
          className="notification-toast__dismiss-btn"
          onClick={handleDismiss}
          type="button"
          aria-label="Dismiss notification"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

/** Notification container - renders all active toasts */
export function NotificationToast() {
  const notifications = useNotificationStore((state) => state.notifications);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container" aria-label="Notifications">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

// ============ Icons ============

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v1a1 1 0 102 0V7zm-1 3a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
