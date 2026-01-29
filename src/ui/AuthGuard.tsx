/**
 * Auth Guard component for route protection.
 *
 * Wraps the main application and shows the login page when:
 * - In client mode and not authenticated via WebSocket
 * - In host mode for first-time setup (before any users exist)
 *
 * In offline mode, authentication is not required.
 * In client mode, authentication happens via WebSocket (connectionStore).
 */

import { useEffect, useState, ReactNode } from 'react';
import { useUserStore, validateStoredSession } from '../store/userStore';
import { useTeamStore } from '../store/teamStore';
import { useConnectionStore } from '../store/connectionStore';
import { LoginPage } from './LoginPage';

interface AuthGuardProps {
  /** Child components to render when authenticated */
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const serverMode = useTeamStore((state) => state.serverMode);
  
  // Local auth (for host mode - Tauri)
  const localUser = useUserStore((state) => state.currentUser);
  const sessionToken = useUserStore((state) => state.sessionToken);
  const isSessionValid = useUserStore((state) => state.isSessionValid);

  // Remote auth (for client mode - WebSocket)
  const connectionStatus = useConnectionStore((state) => state.status);
  const remoteUser = useConnectionStore((state) => state.user);

  const [isValidating, setIsValidating] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Validate stored session on mount (only for host mode)
  useEffect(() => {
    const validate = async () => {
      // Only validate local session if in host mode with stored token
      if (serverMode === 'host' && sessionToken) {
        await validateStoredSession();
      }
      setIsValidating(false);
    };

    validate();
  }, [sessionToken, serverMode]);

  // Determine if login is required
  useEffect(() => {
    if (isValidating) return;

    // In offline mode, no authentication needed
    if (serverMode === 'offline') {
      setShowLogin(false);
      return;
    }

    // In host mode, use local Tauri authentication
    // (They create their account during first-time setup via LoginPage)
    if (serverMode === 'host') {
      const needsLogin = !localUser || !sessionToken || !isSessionValid();
      setShowLogin(needsLogin);
      return;
    }

    // In client mode, authentication happens via WebSocket
    // The user enters credentials in ClientConnectionPanel, not LoginPage
    // connectionStore tracks auth status, not userStore
    if (serverMode === 'client') {
      // Don't show LoginPage for clients - they authenticate via ClientConnectionPanel
      setShowLogin(false);
      return;
    }

    // Default: no login needed
    setShowLogin(false);
  }, [serverMode, localUser, sessionToken, isSessionValid, isValidating, connectionStatus, remoteUser]);

  // Handle successful login
  const handleLoginSuccess = () => {
    setShowLogin(false);
  };

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="auth-guard-loading">
        <div className="loading-spinner">Validating session...</div>
      </div>
    );
  }

  // Show login page when needed
  if (showLogin) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Render children when authenticated or auth not required
  return <>{children}</>;
}

export default AuthGuard;
