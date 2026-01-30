/**
 * Client Connection Panel
 *
 * Allows users to connect to a host server by entering IP address and port.
 * Includes:
 * - IP address input with validation
 * - Port number input
 * - Connect/Disconnect buttons
 * - Connection status indicator
 * - Recent connections history
 */

import { useState, useEffect, useCallback } from 'react';
import { useTeamStore } from '../../store/teamStore';
import { useCollaborationStore } from '../../collaboration';
import { usePersistenceStore } from '../../store/persistenceStore';
import './ClientConnectionPanel.css';

/**
 * Recent connection entry
 */
interface RecentConnection {
  address: string;
  port: number;
  lastUsed: number;
  label?: string;
}

/**
 * Local storage key for recent connections
 */
const RECENT_CONNECTIONS_KEY = 'diagrammer-recent-connections';

/**
 * Max recent connections to store
 */
const MAX_RECENT_CONNECTIONS = 5;

/**
 * Load recent connections from localStorage
 */
function loadRecentConnections(): RecentConnection[] {
  try {
    const stored = localStorage.getItem(RECENT_CONNECTIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Save recent connections to localStorage
 */
function saveRecentConnections(connections: RecentConnection[]): void {
  try {
    localStorage.setItem(RECENT_CONNECTIONS_KEY, JSON.stringify(connections));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Add or update a recent connection
 */
function addRecentConnection(address: string, port: number): RecentConnection[] {
  const connections = loadRecentConnections();

  // Remove existing entry for same address:port
  const filtered = connections.filter(
    (c) => !(c.address === address && c.port === port)
  );

  // Add new entry at the beginning
  const updated: RecentConnection[] = [
    { address, port, lastUsed: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_CONNECTIONS);

  saveRecentConnections(updated);
  return updated;
}

/**
 * Validate IP address format (IPv4 or hostname)
 */
function isValidAddress(address: string): boolean {
  if (!address) return false;

  // Allow localhost
  if (address === 'localhost') return true;

  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(address)) {
    const parts = address.split('.').map(Number);
    return parts.every((p) => p >= 0 && p <= 255);
  }

  // Hostname pattern (alphanumeric with dots and hyphens)
  const hostnamePattern = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/;
  return hostnamePattern.test(address);
}

export function ClientConnectionPanel() {
  const serverMode = useTeamStore((state) => state.serverMode);
  const connectionStatus = useTeamStore((state) => state.connectionStatus);
  const connectToHost = useTeamStore((state) => state.connectToHost);
  const disconnect = useTeamStore((state) => state.disconnect);

  const startSession = useCollaborationStore((state) => state.startSession);
  const stopSession = useCollaborationStore((state) => state.stopSession);
  const collabStatus = useCollaborationStore((state) => state.connectionStatus);
  const collabError = useCollaborationStore((state) => state.error);
  const isCollabActive = useCollaborationStore((state) => state.isActive);

  const currentDocumentId = usePersistenceStore((state) => state.currentDocumentId);

  const [address, setAddress] = useState('');
  const [port, setPort] = useState('9876');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [recentConnections, setRecentConnections] = useState<RecentConnection[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load recent connections on mount
  useEffect(() => {
    setRecentConnections(loadRecentConnections());
  }, []);

  // Validate inputs
  useEffect(() => {
    if (address && !isValidAddress(address)) {
      setValidationError('Invalid IP address or hostname');
    } else {
      const portNum = parseInt(port, 10);
      if (port && (isNaN(portNum) || portNum < 1 || portNum > 65535)) {
        setValidationError('Port must be between 1 and 65535');
      } else {
        setValidationError(null);
      }
    }
  }, [address, port]);

  // Check if we have required credentials
  const hasCredentials = username.trim().length > 0 && password.length > 0;

  const handleConnect = useCallback(async () => {
    if (!address || validationError || !hasCredentials) return;

    const portNum = parseInt(port, 10) || 9876;
    const serverUrl = `ws://${address}:${portNum}/ws`;

    setIsConnecting(true);
    try {
      // Update team store
      await connectToHost(`${address}:${portNum}`);

      // Start collaboration session with credentials for host authentication
      const docId = currentDocumentId || 'default';

      // Use a temporary user object - actual user info will come from host after auth
      startSession({
        serverUrl,
        documentId: docId,
        credentials: {
          username: username.trim(),
          password,
        },
        user: {
          id: 'pending', // Will be updated after authentication
          name: username.trim(),
          color: '#e67e22', // Orange for clients
        },
      });

      // Save to recent connections
      const updated = addRecentConnection(address, portNum);
      setRecentConnections(updated);
    } finally {
      setIsConnecting(false);
    }
  }, [address, port, username, password, validationError, hasCredentials, connectToHost, currentDocumentId, startSession]);

  const handleDisconnect = useCallback(async () => {
    stopSession();
    await disconnect();
  }, [stopSession, disconnect]);

  const handleRecentSelect = useCallback((conn: RecentConnection) => {
    setAddress(conn.address);
    setPort(conn.port.toString());
  }, []);

  const handleRemoveRecent = useCallback((conn: RecentConnection, e: React.MouseEvent) => {
    e.stopPropagation();
    const connections = loadRecentConnections();
    const filtered = connections.filter(
      (c) => !(c.address === conn.address && c.port === conn.port)
    );
    saveRecentConnections(filtered);
    setRecentConnections(filtered);
  }, []);

  const isConnected = serverMode === 'client' && isCollabActive;
  const showStatus = serverMode === 'client' || isCollabActive;

  // Get connection status display
  const getStatusDisplay = () => {
    if (isConnecting) return { text: 'Connecting...', className: 'connecting' };
    if (collabStatus === 'authenticated') return { text: 'Authenticated', className: 'connected' };
    if (collabStatus === 'connected') return { text: 'Connected', className: 'connected' };
    if (collabStatus === 'authenticating') return { text: 'Authenticating...', className: 'authenticating' };
    if (collabStatus === 'connecting') return { text: 'Connecting...', className: 'connecting' };
    if (collabError) return { text: 'Error', className: 'error' };
    return { text: 'Disconnected', className: 'disconnected' };
  };

  const status = getStatusDisplay();

  return (
    <div className="client-connection-panel">
      <h4 className="settings-group-title">Join Server</h4>

      {/* Connection Form */}
      {!isConnected && (
        <div className="connection-form">
          <div className="form-row">
            <label className="form-label" htmlFor="server-address">
              Server Address
            </label>
            <input
              id="server-address"
              type="text"
              className="form-input"
              placeholder="192.168.1.100 or hostname"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isConnecting}
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="server-port">
              Port
            </label>
            <input
              id="server-port"
              type="number"
              className="form-input port-input"
              placeholder="9876"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              min={1}
              max={65535}
              disabled={isConnecting}
            />
          </div>

          <div className="form-divider" />

          <div className="form-row">
            <label className="form-label" htmlFor="host-username">
              Username
            </label>
            <input
              id="host-username"
              type="text"
              className="form-input"
              placeholder="Your username on host"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isConnecting}
              autoComplete="username"
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="host-password">
              Password
            </label>
            <input
              id="host-password"
              type="password"
              className="form-input"
              placeholder="Your password on host"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isConnecting}
              autoComplete="current-password"
            />
          </div>

          {validationError && (
            <div className="validation-error">{validationError}</div>
          )}

          <button
            className="connect-button"
            onClick={handleConnect}
            disabled={!address || !hasCredentials || !!validationError || isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      )}

      {/* Connected State */}
      {isConnected && (
        <div className="connected-state">
          <div className="connection-info">
            <span className="connection-label">Connected to:</span>
            <span className="connection-value">
              {connectionStatus.hostAddress || `${address}:${port}`}
            </span>
          </div>

          <button
            className="disconnect-button"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Connection Status */}
      {showStatus && (
        <div className="connection-status">
          <span className={`status-indicator ${status.className}`} />
          <span className="status-text">{status.text}</span>
          {collabError && (
            <span className="status-error">{collabError}</span>
          )}
        </div>
      )}

      {/* Recent Connections */}
      {!isConnected && recentConnections.length > 0 && (
        <div className="recent-connections">
          <h5 className="recent-title">Recent</h5>
          <ul className="recent-list">
            {recentConnections.map((conn) => (
              <li
                key={`${conn.address}:${conn.port}`}
                className="recent-item"
                onClick={() => handleRecentSelect(conn)}
              >
                <span className="recent-address">
                  {conn.address}:{conn.port}
                </span>
                <button
                  className="recent-remove"
                  onClick={(e) => handleRemoveRecent(conn, e)}
                  title="Remove"
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ClientConnectionPanel;
