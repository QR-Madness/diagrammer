/**
 * Auth Guard component for route protection.
 *
 * Wraps the main application and shows the login page when:
 * - In client mode and not authenticated
 * - Session has expired
 *
 * In offline mode or host mode, authentication is not required.
 */

import { useEffect, useState, ReactNode } from 'react';
import { useUserStore, validateStoredSession } from '../store/userStore';
import { useTeamStore } from '../store/teamStore';
import { LoginPage } from './LoginPage';

interface AuthGuardProps {
  /** Child components to render when authenticated */
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const serverMode = useTeamStore((state) => state.serverMode);
  const currentUser = useUserStore((state) => state.currentUser);
  const sessionToken = useUserStore((state) => state.sessionToken);
  const isSessionValid = useUserStore((state) => state.isSessionValid);

  const [isValidating, setIsValidating] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Validate stored session on mount
  useEffect(() => {
    const validate = async () => {
      // Only validate if we have a stored token
      if (sessionToken) {
        await validateStoredSession();
      }
      setIsValidating(false);
    };

    validate();
  }, [sessionToken]);

  // Determine if login is required
  useEffect(() => {
    if (isValidating) return;

    // In offline mode, no authentication needed
    if (serverMode === 'offline') {
      setShowLogin(false);
      return;
    }

    // In host mode, the host user is the admin - no login needed
    // (They create their account during first-time setup)
    if (serverMode === 'host') {
      setShowLogin(false);
      return;
    }

    // In client mode, authentication is required
    if (serverMode === 'client') {
      const needsLogin = !currentUser || !sessionToken || !isSessionValid();
      setShowLogin(needsLogin);
      return;
    }

    // Default: no login needed
    setShowLogin(false);
  }, [serverMode, currentUser, sessionToken, isSessionValid, isValidating]);

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
