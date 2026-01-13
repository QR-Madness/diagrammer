/**
 * Collaboration Settings component for the Settings modal.
 *
 * Contains:
 * - Server mode toggle (Offline / Protected Local)
 * - Host port configuration
 * - Server status indicator
 * - Connection status
 */

import { useState, useEffect, useCallback } from 'react';
import { useTeamStore } from '../../store/teamStore';
import { useUserStore } from '../../store/userStore';
import { isTauri, getServerStatus, ServerStatus } from '../../tauri/commands';
import './CollaborationSettings.css';

export function CollaborationSettings() {
  const serverMode = useTeamStore((state) => state.serverMode);
  const hostPort = useTeamStore((state) => state.hostPort);
  const connectionStatus = useTeamStore((state) => state.connectionStatus);
  const setHostPort = useTeamStore((state) => state.setHostPort);
  const startHosting = useTeamStore((state) => state.startHosting);
  const stopHosting = useTeamStore((state) => state.stopHosting);
  const goOffline = useTeamStore((state) => state.goOffline);

  const currentUser = useUserStore((state) => state.currentUser);

  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [portInput, setPortInput] = useState(hostPort.toString());
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  // Check if running in Tauri
  useEffect(() => {
    setIsTauriEnv(isTauri());
  }, []);

  // Poll server status when hosting
  useEffect(() => {
    if (!isTauriEnv || serverMode !== 'host') {
      setServerStatus(null);
      return;
    }

    const fetchStatus = async () => {
      try {
        const status = await getServerStatus();
        setServerStatus(status);
      } catch {
        setServerStatus(null);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [isTauriEnv, serverMode]);

  const handleStartServer = useCallback(async () => {
    const port = parseInt(portInput, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return;
    }

    setIsStarting(true);
    try {
      setHostPort(port);
      await startHosting(port);
    } finally {
      setIsStarting(false);
    }
  }, [portInput, setHostPort, startHosting]);

  const handleStopServer = useCallback(async () => {
    setIsStopping(true);
    try {
      await stopHosting();
    } finally {
      setIsStopping(false);
    }
  }, [stopHosting]);

  const handleGoOffline = useCallback(async () => {
    await goOffline();
  }, [goOffline]);

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPortInput(e.target.value);
  };

  const isServerRunning = serverMode === 'host' && connectionStatus.connected;

  return (
    <div className="collaboration-settings">
      <h3 className="settings-section-title">Collaboration</h3>

      {/* Tauri-only notice */}
      {!isTauriEnv && (
        <div className="settings-notice">
          <span className="notice-icon">ℹ️</span>
          <span>
            Collaboration features are only available in the desktop application.
            Run <code>bun run tauri:dev</code> to use these features.
          </span>
        </div>
      )}

      {/* Server Mode */}
      <div className="settings-group">
        <h4 className="settings-group-title">Server Mode</h4>

        <div className="server-mode-selector">
          <button
            className={`mode-button ${serverMode === 'offline' ? 'active' : ''}`}
            onClick={handleGoOffline}
            disabled={!isTauriEnv || serverMode === 'offline'}
          >
            <span className="mode-icon">🔒</span>
            <span className="mode-label">Offline</span>
            <span className="mode-description">Single user, local storage</span>
          </button>

          <button
            className={`mode-button ${serverMode === 'host' ? 'active' : ''}`}
            onClick={isServerRunning ? handleStopServer : handleStartServer}
            disabled={!isTauriEnv || isStarting || isStopping}
          >
            <span className="mode-icon">🌐</span>
            <span className="mode-label">
              {isServerRunning ? 'Hosting' : 'Protected Local'}
            </span>
            <span className="mode-description">
              {isServerRunning ? 'Click to stop server' : 'Host for team collaboration'}
            </span>
          </button>
        </div>
      </div>

      {/* Host Configuration */}
      <div className="settings-group">
        <h4 className="settings-group-title">Host Configuration</h4>

        <div className="settings-row">
          <label className="settings-label" htmlFor="host-port">
            Port
          </label>
          <input
            id="host-port"
            type="number"
            className="settings-input"
            value={portInput}
            onChange={handlePortChange}
            min={1}
            max={65535}
            disabled={!isTauriEnv || isServerRunning}
          />
          <span className="settings-hint">
            Port for WebSocket server (default: 9876)
          </span>
        </div>

        {!isServerRunning && isTauriEnv && (
          <button
            className="settings-button primary"
            onClick={handleStartServer}
            disabled={isStarting}
          >
            {isStarting ? 'Starting...' : 'Start Server'}
          </button>
        )}

        {isServerRunning && (
          <button
            className="settings-button danger"
            onClick={handleStopServer}
            disabled={isStopping}
          >
            {isStopping ? 'Stopping...' : 'Stop Server'}
          </button>
        )}
      </div>

      {/* Server Status */}
      {serverStatus && (
        <div className="settings-group">
          <h4 className="settings-group-title">Server Status</h4>

          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Status</span>
              <span className={`status-value ${serverStatus.running ? 'running' : 'stopped'}`}>
                {serverStatus.running ? '● Running' : '○ Stopped'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Address</span>
              <span className="status-value">
                {serverStatus.address || '-'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Port</span>
              <span className="status-value">
                {serverStatus.port || '-'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Clients</span>
              <span className="status-value">
                {serverStatus.connected_clients}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status (for errors) */}
      {connectionStatus.error && (
        <div className="settings-group">
          <div className="settings-error">
            <span className="error-icon">⚠️</span>
            <span>{connectionStatus.error}</span>
          </div>
        </div>
      )}

      {/* Current User */}
      {currentUser && (
        <div className="settings-group">
          <h4 className="settings-group-title">Current User</h4>
          <div className="user-info">
            <span className="user-name">{currentUser.displayName}</span>
            <span className="user-role">{currentUser.role}</span>
          </div>
        </div>
      )}
    </div>
  );
}
