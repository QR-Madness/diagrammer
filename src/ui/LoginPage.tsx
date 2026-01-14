/**
 * Login Page component for Protected Local mode authentication.
 *
 * Features:
 * - Username/password login form
 * - First-time setup for admin user creation
 * - Error display
 * - Loading states
 */

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useUserStore } from '../store/userStore';
import { isTauri } from '../tauri/commands';
import './LoginPage.css';

interface LoginPageProps {
  /** Callback when login is successful */
  onLoginSuccess?: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const login = useUserStore((state) => state.login);
  const isAuthenticating = useUserStore((state) => state.isAuthenticating);
  const authError = useUserStore((state) => state.authError);
  const clearError = useUserStore((state) => state.clearError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  // Check environment and user existence
  useEffect(() => {
    setIsTauriEnv(isTauri());

    const checkHasUsers = async () => {
      if (!isTauri()) {
        setHasUsers(true); // Web mode doesn't need setup
        return;
      }

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<boolean>('has_users');
        setHasUsers(result);
        if (!result) {
          setIsSetupMode(true);
        }
      } catch {
        setHasUsers(true); // Assume users exist if check fails
      }
    };

    checkHasUsers();
  }, []);

  const handleLogin = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      clearError();

      // Read values directly from form to handle browser autofill
      const form = e.currentTarget;
      const formData = new FormData(form);
      const formUsername = (formData.get('username') as string || '').trim();
      const formPassword = formData.get('password') as string || '';

      if (!formUsername || !formPassword) {
        return;
      }

      // Update state to reflect form values (for consistency)
      setUsername(formUsername);
      setPassword(formPassword);

      const response = await login({ username: formUsername, password: formPassword });

      if (response.success) {
        onLoginSuccess?.();
      }
    },
    [login, clearError, onLoginSuccess]
  );

  const handleSetup = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSetupError(null);

      // Read values directly from form to handle browser autofill
      const form = e.currentTarget;
      const formData = new FormData(form);
      const formDisplayName = (formData.get('displayName') as string || '').trim();
      const formUsername = (formData.get('setupUsername') as string || '').trim();
      const formPassword = formData.get('setupPassword') as string || '';
      const formConfirmPassword = formData.get('confirmPassword') as string || '';

      if (!formUsername || !formDisplayName || !formPassword) {
        setSetupError('All fields are required');
        return;
      }

      if (formPassword !== formConfirmPassword) {
        setSetupError('Passwords do not match');
        return;
      }

      if (formPassword.length < 6) {
        setSetupError('Password must be at least 6 characters');
        return;
      }

      // Update state to reflect form values
      setDisplayName(formDisplayName);
      setUsername(formUsername);
      setPassword(formPassword);
      setConfirmPassword(formConfirmPassword);

      setIsCreatingUser(true);

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('create_user', {
          username: formUsername,
          password: formPassword,
          displayName: formDisplayName,
          role: 'admin',
        });

        // Now login with the created user
        const response = await login({ username: formUsername, password: formPassword });

        if (response.success) {
          onLoginSuccess?.();
        } else {
          setSetupError(response.error ?? 'Failed to login after setup');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create user';
        setSetupError(errorMsg);
      } finally {
        setIsCreatingUser(false);
      }
    },
    [login, onLoginSuccess]
  );

  // Loading state while checking for users
  if (hasUsers === null) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-loading">Loading...</div>
        </div>
      </div>
    );
  }

  // Web-only notice
  if (!isTauriEnv) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <h1>Diagrammer</h1>
            <p className="login-subtitle">Team Collaboration</p>
          </div>
          <div className="login-notice">
            <span className="notice-icon">ℹ️</span>
            <span>
              Team features are only available in the desktop application.
              Run <code>bun run tauri:dev</code> to use collaboration.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // First-time setup mode
  if (isSetupMode) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <h1>Diagrammer</h1>
            <p className="login-subtitle">First-Time Setup</p>
          </div>

          <p className="setup-description">
            Create an administrator account to get started with team collaboration.
          </p>

          <form className="login-form" onSubmit={handleSetup}>
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                autoComplete="name"
                disabled={isCreatingUser}
              />
            </div>

            <div className="form-group">
              <label htmlFor="setupUsername">Username</label>
              <input
                id="setupUsername"
                name="setupUsername"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                disabled={isCreatingUser}
              />
            </div>

            <div className="form-group">
              <label htmlFor="setupPassword">Password</label>
              <input
                id="setupPassword"
                name="setupPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
                disabled={isCreatingUser}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                disabled={isCreatingUser}
              />
            </div>

            {setupError && (
              <div className="login-error">
                <span className="error-icon">⚠️</span>
                <span>{setupError}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={isCreatingUser}
            >
              {isCreatingUser ? 'Creating Account...' : 'Create Admin Account'}
            </button>
          </form>

          {hasUsers && (
            <button
              className="link-button"
              onClick={() => setIsSetupMode(false)}
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  // Standard login form
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Diagrammer</h1>
          <p className="login-subtitle">Team Collaboration</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="loginUsername">Username</label>
            <input
              id="loginUsername"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              disabled={isAuthenticating}
            />
          </div>

          <div className="form-group">
            <label htmlFor="loginPassword">Password</label>
            <input
              id="loginPassword"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={isAuthenticating}
            />
          </div>

          {authError && (
            <div className="login-error">
              <span className="error-icon">⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isAuthenticating || !username.trim() || !password}
          >
            {isAuthenticating ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {!hasUsers && (
          <button
            className="link-button"
            onClick={() => setIsSetupMode(true)}
          >
            First-time setup
          </button>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
