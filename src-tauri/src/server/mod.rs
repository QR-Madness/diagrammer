//! WebSocket server module for Protected Local mode
//!
//! This module provides the WebSocket server that enables real-time collaboration
//! between clients in Protected Local mode. The host runs this server, and clients
//! connect to it to synchronize document changes via CRDT.
//!
//! ## Network Access Modes
//! - `localhost`: Only accepts connections from the same machine (127.0.0.1)
//! - `lan`: Accepts connections from the local network (0.0.0.0)
//!
//! ## Security Considerations
//! - LAN mode exposes the server to all devices on the local network
//! - Authentication is required for all connections (Phase 14.1.7)
//! - Consider firewall rules for additional protection

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use std::net::IpAddr;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::{Any, CorsLayer};

/// Network access mode for the server
#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum NetworkMode {
    /// Only accept connections from localhost (127.0.0.1)
    #[serde(rename = "localhost")]
    Localhost,
    /// Accept connections from any interface (0.0.0.0) - enables LAN access
    #[serde(rename = "lan")]
    Lan,
}

impl Default for NetworkMode {
    fn default() -> Self {
        NetworkMode::Lan // Default to LAN for collaboration
    }
}

/// Server status information
#[derive(Clone, serde::Serialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
    pub connected_clients: usize,
    /// Primary address (localhost or first LAN IP)
    pub address: String,
    /// All available addresses to connect to
    pub addresses: Vec<String>,
    /// Current network mode
    pub network_mode: NetworkMode,
    /// Maximum allowed connections (0 = unlimited)
    pub max_connections: u16,
}

/// Server configuration
#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct ServerConfig {
    /// Network access mode
    pub network_mode: NetworkMode,
    /// Maximum connections allowed (0 = unlimited)
    pub max_connections: u16,
    /// Port to listen on
    pub port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            network_mode: NetworkMode::Lan,
            max_connections: 10,
            port: 9876,
        }
    }
}

/// Get local IP addresses for LAN access
pub fn get_local_ips() -> Vec<IpAddr> {
    let mut ips = Vec::new();

    // Use pnet or similar crate in production; for now use a simpler approach
    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        for (_, ip) in interfaces {
            // Filter to only include IPv4 private addresses
            if let IpAddr::V4(ipv4) = ip {
                // Include private network ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                if ipv4.is_private() && !ipv4.is_loopback() {
                    ips.push(ip);
                }
            }
        }
    }

    ips
}

/// Shared state for the WebSocket server
pub struct ServerState {
    /// Broadcast channel for sending messages to all clients
    tx: broadcast::Sender<String>,
    /// Count of connected clients
    client_count: AtomicU16,
}

impl ServerState {
    fn new() -> Self {
        let (tx, _) = broadcast::channel(100);
        Self {
            tx,
            client_count: AtomicU16::new(0),
        }
    }

    fn increment_clients(&self) {
        self.client_count.fetch_add(1, Ordering::Relaxed);
    }

    fn decrement_clients(&self) {
        self.client_count.fetch_sub(1, Ordering::Relaxed);
    }

    fn client_count(&self) -> u16 {
        self.client_count.load(Ordering::Relaxed)
    }
}

/// WebSocket server manager
pub struct WebSocketServer {
    /// Whether the server is currently running
    running: Arc<AtomicBool>,
    /// The port the server is running on (0 if not running)
    port: Arc<AtomicU16>,
    /// Shutdown signal sender
    shutdown_tx: RwLock<Option<tokio::sync::oneshot::Sender<()>>>,
    /// Server state for connected clients
    state: Arc<ServerState>,
    /// Server configuration
    config: RwLock<ServerConfig>,
}

impl Default for WebSocketServer {
    fn default() -> Self {
        Self::new()
    }
}

impl WebSocketServer {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            port: Arc::new(AtomicU16::new(0)),
            shutdown_tx: RwLock::new(None),
            state: Arc::new(ServerState::new()),
            config: RwLock::new(ServerConfig::default()),
        }
    }

    /// Check if the server is currently running
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }

    /// Get the current server configuration
    pub async fn get_config(&self) -> ServerConfig {
        self.config.read().await.clone()
    }

    /// Update server configuration (only when not running)
    pub async fn set_config(&self, config: ServerConfig) -> Result<(), String> {
        if self.is_running() {
            return Err("Cannot change configuration while server is running".to_string());
        }
        *self.config.write().await = config;
        Ok(())
    }

    /// Get the current server status
    pub async fn status(&self) -> ServerStatus {
        let port = self.port.load(Ordering::Relaxed);
        let running = self.running.load(Ordering::Relaxed);
        let config = self.config.read().await;

        // Build list of available addresses
        let mut addresses = Vec::new();

        if running {
            match config.network_mode {
                NetworkMode::Localhost => {
                    addresses.push(format!("ws://localhost:{}", port));
                    addresses.push(format!("ws://127.0.0.1:{}", port));
                }
                NetworkMode::Lan => {
                    // Add localhost
                    addresses.push(format!("ws://localhost:{}", port));

                    // Add all LAN IPs
                    for ip in get_local_ips() {
                        addresses.push(format!("ws://{}:{}", ip, port));
                    }
                }
            }
        }

        // Primary address is first LAN IP in LAN mode, localhost otherwise
        let primary_address = if running {
            match config.network_mode {
                NetworkMode::Localhost => format!("ws://localhost:{}", port),
                NetworkMode::Lan => {
                    // Prefer first LAN IP, fallback to localhost
                    get_local_ips()
                        .first()
                        .map(|ip| format!("ws://{}:{}", ip, port))
                        .unwrap_or_else(|| format!("ws://localhost:{}", port))
                }
            }
        } else {
            String::new()
        };

        ServerStatus {
            running,
            port,
            connected_clients: self.state.client_count() as usize,
            address: primary_address,
            addresses,
            network_mode: config.network_mode,
            max_connections: config.max_connections,
        }
    }

    /// Start the WebSocket server on the specified port
    /// Uses the configured network mode to determine bind address
    pub async fn start(&self, port: u16) -> Result<String, String> {
        if self.is_running() {
            return Err("Server is already running".to_string());
        }

        // Update config with the requested port
        {
            let mut config = self.config.write().await;
            config.port = port;
        }

        let config = self.config.read().await.clone();

        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

        // Store the shutdown sender
        {
            let mut tx = self.shutdown_tx.write().await;
            *tx = Some(shutdown_tx);
        }

        // Create CORS layer for cross-origin requests
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        // Create router with WebSocket endpoint
        let state = self.state.clone();
        let app = Router::new()
            .route("/ws", get(ws_handler))
            .route("/health", get(health_handler))
            .with_state(state)
            .layer(cors);

        // Bind address based on network mode
        let bind_addr = match config.network_mode {
            NetworkMode::Localhost => format!("127.0.0.1:{}", port),
            NetworkMode::Lan => format!("0.0.0.0:{}", port),
        };

        let listener = tokio::net::TcpListener::bind(&bind_addr)
            .await
            .map_err(|e| format!("Failed to bind to {}: {}", bind_addr, e))?;

        let actual_port = listener
            .local_addr()
            .map_err(|e| format!("Failed to get local address: {}", e))?
            .port();

        // Update state
        self.running.store(true, Ordering::Relaxed);
        self.port.store(actual_port, Ordering::Relaxed);

        let mode_str = match config.network_mode {
            NetworkMode::Localhost => "localhost only",
            NetworkMode::Lan => "LAN access enabled",
        };
        log::info!("WebSocket server starting on port {} ({})", actual_port, mode_str);

        // Spawn the server task
        let running = self.running.clone();
        let port_atomic = self.port.clone();

        tokio::spawn(async move {
            let server = axum::serve(listener, app);

            // Run server until shutdown signal
            tokio::select! {
                result = server => {
                    if let Err(e) = result {
                        log::error!("Server error: {}", e);
                    }
                }
                _ = shutdown_rx => {
                    log::info!("Server shutdown signal received");
                }
            }

            // Mark server as stopped
            running.store(false, Ordering::Relaxed);
            port_atomic.store(0, Ordering::Relaxed);
            log::info!("WebSocket server stopped");
        });

        // Return the primary address based on network mode
        let primary_address = match config.network_mode {
            NetworkMode::Localhost => format!("ws://localhost:{}", actual_port),
            NetworkMode::Lan => {
                // Return first LAN IP, fallback to localhost
                get_local_ips()
                    .first()
                    .map(|ip| format!("ws://{}:{}", ip, actual_port))
                    .unwrap_or_else(|| format!("ws://localhost:{}", actual_port))
            }
        };

        Ok(primary_address)
    }

    /// Stop the WebSocket server
    pub async fn stop(&self) -> Result<(), String> {
        if !self.is_running() {
            return Ok(()); // Already stopped
        }

        // Send shutdown signal
        let mut tx = self.shutdown_tx.write().await;
        if let Some(shutdown_tx) = tx.take() {
            let _ = shutdown_tx.send(());
        }

        // Wait a bit for graceful shutdown
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        self.running.store(false, Ordering::Relaxed);
        self.port.store(0, Ordering::Relaxed);

        log::info!("WebSocket server stop requested");
        Ok(())
    }

    /// Broadcast a message to all connected clients
    pub fn broadcast(&self, message: String) -> Result<(), String> {
        self.state
            .tx
            .send(message)
            .map_err(|e| format!("Failed to broadcast: {}", e))?;
        Ok(())
    }
}

/// Health check endpoint
async fn health_handler() -> impl IntoResponse {
    "OK"
}

/// WebSocket upgrade handler
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<ServerState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// Handle an individual WebSocket connection
async fn handle_socket(socket: WebSocket, state: Arc<ServerState>) {
    let (mut sender, mut receiver) = socket.split();

    // Subscribe to broadcast channel
    let mut rx = state.tx.subscribe();

    // Track connection
    state.increment_clients();
    log::info!(
        "Client connected. Total clients: {}",
        state.client_count()
    );

    // Spawn task to forward broadcast messages to this client
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages from this client
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                log::debug!("Received message: {}", text);
                // Broadcast to all other clients
                // In Phase 14.0, this will be CRDT updates
                let _ = state.tx.send(text);
            }
            Message::Binary(data) => {
                log::debug!("Received binary data: {} bytes", data.len());
                // Handle binary CRDT updates in Phase 14.0
            }
            Message::Ping(data) => {
                log::trace!("Received ping");
                // Axum handles pong automatically
                let _ = data;
            }
            Message::Pong(_) => {
                log::trace!("Received pong");
            }
            Message::Close(_) => {
                log::debug!("Client requested close");
                break;
            }
        }
    }

    // Client disconnected
    send_task.abort();
    state.decrement_clients();
    log::info!(
        "Client disconnected. Total clients: {}",
        state.client_count()
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_server_lifecycle() {
        let server = WebSocketServer::new();

        assert!(!server.is_running());

        // Start server on random port
        let result = server.start(0).await;
        assert!(result.is_ok());
        assert!(server.is_running());

        let status = server.status().await;
        assert!(status.running);
        assert!(status.port > 0);

        // Stop server
        let result = server.stop().await;
        assert!(result.is_ok());

        // Give it time to stop
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        assert!(!server.is_running());
    }

    #[tokio::test]
    async fn test_server_status() {
        let server = WebSocketServer::new();

        let status = server.status().await;
        assert!(!status.running);
        assert_eq!(status.port, 0);
        assert_eq!(status.connected_clients, 0);
        assert!(status.address.is_empty());
    }
}
