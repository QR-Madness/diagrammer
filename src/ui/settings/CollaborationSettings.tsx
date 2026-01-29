/**
 * Collaboration Settings component for the Settings modal.
 *
 * Contains:
 * - Server mode toggle (Offline / Host / Client)
 * - Host port configuration and server status
 * - Client connection panel for joining remote servers
 * - Connection status
 */

import { useState, useEffect, useCallback } from 'react';
import { useTeamStore } from '../../store/teamStore';
import { useUserStore } from '../../store/userStore';
import { useCollaborationStore } from '../../collaboration';
import {
  isTauri,
  getServerStatus,
  getServerConfig,
  setServerConfig,
  ServerStatus,
  ServerConfig,
  NetworkMode,
} from '../../tauri/commands';
import { usePersistenceStore } from '../../store/persistenceStore';
import { ClientConnectionPanel } from './ClientConnectionPanel';
import { TeamDocumentsManager } from './TeamDocumentsManager';
import { TeamMembersManager } from './TeamMembersManager';
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

  // Collaboration store
  const startSession = useCollaborationStore((state) => state.startSession);
  const stopSession = useCollaborationStore((state) => state.stopSession);
  const collabStatus = useCollaborationStore((state) => state.connectionStatus);
  const isCollabActive = useCollaborationStore((state) => state.isActive);

  // Get current document ID
  const currentDocumentId = usePersistenceStore((state) => state.currentDocumentId);

  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [portInput, setPortInput] = useState(hostPort.toString());
  const [networkMode, setNetworkMode] = useState<NetworkMode>('lan');
  const [maxConnections, setMaxConnections] = useState(10);
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  // Check if running in Tauri and load config
  useEffect(() => {
    const tauriEnv = isTauri();
    setIsTauriEnv(tauriEnv);

    if (tauriEnv) {
      // Load server config
      getServerConfig().then((config) => {
        setNetworkMode(config.network_mode);
        setMaxConnections(config.max_connections);
        setPortInput(config.port.toString());
      });
    }
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

  // Save server config (when not running)
  const handleSaveConfig = useCallback(async (newConfig: Partial<ServerConfig>) => {
    if (!isTauriEnv) return;

    const updatedConfig: ServerConfig = {
      network_mode: newConfig.network_mode ?? networkMode,
      max_connections: newConfig.max_connections ?? maxConnections,
      port: newConfig.port ?? (parseInt(portInput, 10) || 9876),
    };

    try {
      await setServerConfig(updatedConfig);
    } catch (error) {
      console.error('Failed to save server config:', error);
    }
  }, [isTauriEnv, networkMode, maxConnections, portInput]);

  // Handle network mode change
  const handleNetworkModeChange = useCallback(async (mode: NetworkMode) => {
    setNetworkMode(mode);
    await handleSaveConfig({ network_mode: mode });
  }, [handleSaveConfig]);

  // Handle max connections change
  const handleMaxConnectionsChange = useCallback(async (value: number) => {
    setMaxConnections(value);
    await handleSaveConfig({ max_connections: value });
  }, [handleSaveConfig]);

  const handleStartServer = useCallback(async () => {
    const port = parseInt(portInput, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return;
    }

    setIsStarting(true);
    try {
      // Save config before starting
      await handleSaveConfig({ port });

      setHostPort(port);
      await startHosting(port);

      // Start collaboration session after server is up
      // Use localhost for the host itself (always works)
      const docId = currentDocumentId || 'default';
      const user = currentUser || { id: 'host', displayName: 'Host', role: 'admin' as const };

      startSession({
        serverUrl: `ws://localhost:${port}/ws`,
        documentId: docId,
        user: {
          id: user.id,
          name: user.displayName,
          color: '#4a90d9',
        },
      });
    } finally {
      setIsStarting(false);
    }
  }, [portInput, setHostPort, startHosting, currentDocumentId, currentUser, startSession, handleSaveConfig]);

  const handleStopServer = useCallback(async () => {
    setIsStopping(true);
    try {
      // Stop collaboration session first
      stopSession();
      await stopHosting();
    } finally {
      setIsStopping(false);
    }
  }, [stopHosting, stopSession]);

  const handleGoOffline = useCallback(async () => {
    // Stop collaboration session
    stopSession();
    await goOffline();
  }, [goOffline, stopSession]);

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
            disabled={serverMode === 'offline'}
          >
            <span className="mode-icon">🔒</span>
            <span className="mode-label">Offline</span>
            <span className="mode-description">Single user, local storage</span>
          </button>

          <button
            className={`mode-button ${serverMode === 'host' ? 'active' : ''}`}
            onClick={isServerRunning ? handleStopServer : handleStartServer}
            disabled={!isTauriEnv || isStarting || isStopping || serverMode === 'client'}
          >
            <span className="mode-icon">🌐</span>
            <span className="mode-label">
              {isServerRunning ? 'Hosting' : 'Host'}
            </span>
            <span className="mode-description">
              {isServerRunning ? 'Server running' : 'Host for team'}
            </span>
          </button>

          <button
            className={`mode-button ${serverMode === 'client' ? 'active' : ''}`}
            onClick={() => {/* Mode is set by ClientConnectionPanel */}}
            disabled={serverMode === 'host' && isServerRunning}
          >
            <span className="mode-icon">🔗</span>
            <span className="mode-label">
              {serverMode === 'client' && isCollabActive ? 'Connected' : 'Join'}
            </span>
            <span className="mode-description">
              {serverMode === 'client' ? 'Connected to server' : 'Join a host'}
            </span>
          </button>
        </div>
      </div>

      {/* Client Connection Panel - shown when in client mode or wanting to join */}
      {(serverMode === 'client' || serverMode === 'offline') && !isServerRunning && (
        <div className="settings-group">
          <ClientConnectionPanel />
        </div>
      )}

      {/* Host Configuration - shown when in host mode or offline */}
      {serverMode !== 'client' && (
      <div className="settings-group">
        <h4 className="settings-group-title">Host Configuration</h4>

        {/* Network Mode */}
        <div className="settings-row">
          <label className="settings-label">Network Access</label>
          <div className="network-mode-selector">
            <button
              className={`network-mode-button ${networkMode === 'localhost' ? 'active' : ''}`}
              onClick={() => handleNetworkModeChange('localhost')}
              disabled={!isTauriEnv || isServerRunning}
              title="Only accept connections from this machine"
            >
              Localhost Only
            </button>
            <button
              className={`network-mode-button ${networkMode === 'lan' ? 'active' : ''}`}
              onClick={() => handleNetworkModeChange('lan')}
              disabled={!isTauriEnv || isServerRunning}
              title="Accept connections from your local network"
            >
              LAN Access
            </button>
          </div>
          <span className="settings-hint">
            {networkMode === 'lan'
              ? 'Other devices on your network can connect'
              : 'Only this machine can connect'}
          </span>
        </div>

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

        <div className="settings-row">
          <label className="settings-label" htmlFor="max-connections">
            Max Connections
          </label>
          <input
            id="max-connections"
            type="number"
            className="settings-input"
            value={maxConnections}
            onChange={(e) => handleMaxConnectionsChange(parseInt(e.target.value, 10) || 10)}
            min={1}
            max={50}
            disabled={!isTauriEnv || isServerRunning}
          />
          <span className="settings-hint">
            Maximum simultaneous client connections (1-50)
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
      )}

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
              <span className="status-label">Mode</span>
              <span className="status-value">
                {serverStatus.network_mode === 'lan' ? 'LAN Access' : 'Localhost Only'}
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
                {serverStatus.connected_clients} / {serverStatus.max_connections || '∞'}
              </span>
            </div>
          </div>

          {/* Connection Addresses */}
          {serverStatus.running && serverStatus.addresses.length > 0 && (
            <div className="server-addresses">
              <span className="addresses-label">Connection Addresses:</span>
              <div className="addresses-list">
                {serverStatus.addresses.map((addr, index) => (
                  <div key={index} className="address-item">
                    <code className="address-code">{addr}</code>
                    <button
                      className="copy-button"
                      onClick={() => navigator.clipboard.writeText(addr)}
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
              <span className="settings-hint">
                Share one of these addresses with clients to connect
              </span>
            </div>
          )}
        </div>
      )}

      {/* Collaboration Sync Status */}
      {isCollabActive && (
        <div className="settings-group">
          <h4 className="settings-group-title">Sync Status</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Sync</span>
              <span className={`status-value ${collabStatus === 'connected' || collabStatus === 'authenticated' ? 'running' : 'stopped'}`}>
                {collabStatus === 'authenticated' ? '● Authenticated' :
                 collabStatus === 'connected' ? '● Connected' :
                 collabStatus === 'connecting' || collabStatus === 'authenticating' ? '○ Connecting...' : '○ Disconnected'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Document</span>
              <span className="status-value">
                {currentDocumentId || 'default'}
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

      {/* Team Documents Manager */}
      <div className="settings-group">
        <TeamDocumentsManager />
      </div>

      {/* Team Members Manager (Admin only) */}
      <div className="settings-group">
        <TeamMembersManager />
      </div>

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
