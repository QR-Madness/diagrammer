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
//! - Authentication is required for all connections
//! - Consider firewall rules for additional protection

pub mod documents;
pub mod protocol;

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
use std::collections::HashMap;
use std::net::IpAddr;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, RwLock};
use tower_http::cors::{Any, CorsLayer};

use documents::DocumentStore;
use protocol::*;
use crate::auth::{UserStore, create_token, verify_password, TokenConfig};

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

    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        for (_, ip) in interfaces {
            if let IpAddr::V4(ipv4) = ip {
                if ipv4.is_private() && !ipv4.is_loopback() {
                    ips.push(ip);
                }
            }
        }
    }

    ips
}

/// Per-client connection state
#[derive(Debug)]
struct ClientState {
    id: u64,
    user_id: Option<String>,
    username: Option<String>,
    role: Option<String>,
    current_doc_id: Option<String>,
    authenticated: bool,
    tx: mpsc::Sender<Vec<u8>>,
}

/// Broadcast message with routing info
#[derive(Clone)]
struct BroadcastMessage {
    /// Target document ID (None = broadcast to all)
    doc_id: Option<String>,
    /// Exclude this client from receiving
    exclude_client: Option<u64>,
    /// Message data
    data: Vec<u8>,
}

/// Shared state for the WebSocket server
pub struct ServerState {
    /// Broadcast channel for sending messages
    broadcast_tx: broadcast::Sender<BroadcastMessage>,
    /// Count of connected clients
    client_count: AtomicU16,
    /// Next client ID
    next_client_id: AtomicU64,
    /// Connected clients
    clients: RwLock<HashMap<u64, ClientState>>,
    /// Document store
    doc_store: Arc<DocumentStore>,
    /// JWT secret for token validation
    jwt_secret: String,
    /// User store for authentication (optional - only set on host)
    user_store: Option<Arc<UserStore>>,
    /// Token config for creating JWTs
    token_config: TokenConfig,
}

impl ServerState {
    fn new(
        app_data_dir: PathBuf,
        jwt_secret: String,
        user_store: Option<Arc<UserStore>>,
        token_config: TokenConfig,
    ) -> Self {
        let (broadcast_tx, _) = broadcast::channel(100);
        Self {
            broadcast_tx,
            client_count: AtomicU16::new(0),
            next_client_id: AtomicU64::new(1),
            clients: RwLock::new(HashMap::new()),
            doc_store: Arc::new(DocumentStore::new(app_data_dir)),
            jwt_secret,
            user_store,
            token_config,
        }
    }

    fn next_client_id(&self) -> u64 {
        self.next_client_id.fetch_add(1, Ordering::Relaxed)
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

    /// Broadcast a message to all clients on a document
    fn broadcast_to_doc(&self, doc_id: &str, data: Vec<u8>, exclude_client: Option<u64>) {
        let _ = self.broadcast_tx.send(BroadcastMessage {
            doc_id: Some(doc_id.to_string()),
            exclude_client,
            data,
        });
    }

    /// Broadcast a message to all authenticated clients
    fn broadcast_to_all(&self, data: Vec<u8>, exclude_client: Option<u64>) {
        let _ = self.broadcast_tx.send(BroadcastMessage {
            doc_id: None,
            exclude_client,
            data,
        });
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
    state: Arc<RwLock<Option<Arc<ServerState>>>>,
    /// Server configuration
    config: RwLock<ServerConfig>,
    /// App data directory for document storage
    app_data_dir: RwLock<Option<PathBuf>>,
    /// JWT secret
    jwt_secret: RwLock<String>,
    /// User store for authentication
    user_store: RwLock<Option<Arc<UserStore>>>,
    /// Token configuration
    token_config: RwLock<TokenConfig>,
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
            state: Arc::new(RwLock::new(None)),
            config: RwLock::new(ServerConfig::default()),
            app_data_dir: RwLock::new(None),
            jwt_secret: RwLock::new("diagrammer-jwt-secret-change-in-production".to_string()),
            user_store: RwLock::new(None),
            token_config: RwLock::new(TokenConfig::default()),
        }
    }

    /// Set the app data directory (called during Tauri setup)
    pub async fn set_app_data_dir(&self, dir: PathBuf) {
        *self.app_data_dir.write().await = Some(dir);
    }

    /// Set the JWT secret (called during Tauri setup)
    pub async fn set_jwt_secret(&self, secret: String) {
        *self.jwt_secret.write().await = secret;
    }

    /// Set the user store for authentication (called during Tauri setup)
    pub async fn set_user_store(&self, store: Arc<UserStore>) {
        *self.user_store.write().await = Some(store);
    }

    /// Set the token config (called during Tauri setup)
    pub async fn set_token_config(&self, config: TokenConfig) {
        *self.token_config.write().await = config;
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

        let state_guard = self.state.read().await;
        let connected_clients = state_guard
            .as_ref()
            .map(|s| s.client_count() as usize)
            .unwrap_or(0);

        // Build list of available addresses
        let mut addresses = Vec::new();

        if running {
            match config.network_mode {
                NetworkMode::Localhost => {
                    addresses.push(format!("ws://localhost:{}", port));
                    addresses.push(format!("ws://127.0.0.1:{}", port));
                }
                NetworkMode::Lan => {
                    addresses.push(format!("ws://localhost:{}", port));
                    for ip in get_local_ips() {
                        addresses.push(format!("ws://{}:{}", ip, port));
                    }
                }
            }
        }

        let primary_address = if running {
            match config.network_mode {
                NetworkMode::Localhost => format!("ws://localhost:{}", port),
                NetworkMode::Lan => {
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
            connected_clients,
            address: primary_address,
            addresses,
            network_mode: config.network_mode,
            max_connections: config.max_connections,
        }
    }

    /// Start the WebSocket server on the specified port
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

        // Get app data directory
        let app_data_dir = self.app_data_dir.read().await
            .clone()
            .ok_or("App data directory not set")?;

        let jwt_secret = self.jwt_secret.read().await.clone();
        let user_store = self.user_store.read().await.clone();
        let token_config = self.token_config.read().await.clone();

        // Create server state with document store
        let server_state = Arc::new(ServerState::new(
            app_data_dir,
            jwt_secret,
            user_store,
            token_config,
        ));
        *self.state.write().await = Some(server_state.clone());

        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

        {
            let mut tx = self.shutdown_tx.write().await;
            *tx = Some(shutdown_tx);
        }

        // Create CORS layer
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        // Create router with WebSocket endpoint
        let app = Router::new()
            .route("/ws", get(ws_handler))
            .route("/health", get(health_handler))
            .with_state(server_state)
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

            running.store(false, Ordering::Relaxed);
            port_atomic.store(0, Ordering::Relaxed);
            log::info!("WebSocket server stopped");
        });

        // Return the primary address
        let primary_address = match config.network_mode {
            NetworkMode::Localhost => format!("ws://localhost:{}", actual_port),
            NetworkMode::Lan => {
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
            return Ok(());
        }

        let mut tx = self.shutdown_tx.write().await;
        if let Some(shutdown_tx) = tx.take() {
            let _ = shutdown_tx.send(());
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        self.running.store(false, Ordering::Relaxed);
        self.port.store(0, Ordering::Relaxed);
        *self.state.write().await = None;

        log::info!("WebSocket server stop requested");
        Ok(())
    }

    /// Get the document store (for direct access)
    pub async fn get_doc_store(&self) -> Option<Arc<DocumentStore>> {
        self.state.read().await.as_ref().map(|s| s.doc_store.clone())
    }

    /// Broadcast a document event to all connected clients
    /// Used when documents are saved via Tauri commands (not WebSocket)
    pub async fn broadcast_doc_event(&self, doc_id: &str, event_type: DocEventType, user_id: Option<String>) {
        let state_guard = self.state.read().await;
        if let Some(state) = state_guard.as_ref() {
            let metadata = state.doc_store.get_metadata(doc_id);
            let event = DocEvent {
                event_type,
                doc_id: doc_id.to_string(),
                metadata,
                user_id: user_id.unwrap_or_else(|| "system".to_string()),
            };

            if let Ok(event_data) = encode_message(MESSAGE_DOC_EVENT, &event) {
                state.broadcast_to_all(event_data, None);
                log::info!("Broadcast doc event: {:?} for doc {}", event_type, doc_id);
            }
        }
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
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Create channel for sending messages to this client
    let (tx, mut rx) = mpsc::channel::<Vec<u8>>(100);

    // Generate client ID
    let client_id = state.next_client_id();

    // Subscribe to broadcast channel
    let mut broadcast_rx = state.broadcast_tx.subscribe();

    // Add client to state
    {
        let mut clients = state.clients.write().await;
        clients.insert(client_id, ClientState {
            id: client_id,
            user_id: None,
            username: None,
            role: None,
            current_doc_id: None,
            authenticated: false,
            tx: tx.clone(),
        });
    }

    state.increment_clients();
    log::info!("Client {} connected. Total clients: {}", client_id, state.client_count());

    // Clone state for broadcast task
    let state_for_broadcast = state.clone();

    // Task to forward broadcast messages to this client
    let broadcast_task = tokio::spawn(async move {
        while let Ok(msg) = broadcast_rx.recv().await {
            // Check if message should go to this client
            let should_send = {
                let clients = state_for_broadcast.clients.read().await;
                if let Some(client) = clients.get(&client_id) {
                    // Skip if client is excluded
                    if msg.exclude_client == Some(client_id) {
                        false
                    } else if let Some(doc_id) = &msg.doc_id {
                        // Document-scoped message: only send if client is on this doc
                        client.current_doc_id.as_ref() == Some(doc_id)
                    } else {
                        // Broadcast to all authenticated clients
                        client.authenticated
                    }
                } else {
                    false
                }
            };

            if should_send {
                let _ = tx.send(msg.data).await;
            }
        }
    });

    // Task to send messages from rx channel to WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(data) = rx.recv().await {
            if ws_sender.send(Message::Binary(data)).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages from this client
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Binary(data) => {
                if let Some(msg_type) = decode_message_type(&data) {
                    handle_message(client_id, msg_type, &data, &state).await;
                }
            }
            Message::Text(text) => {
                // Legacy text message support - broadcast as-is
                log::debug!("Received text message from client {}: {}", client_id, text);
            }
            Message::Ping(_) => {
                log::trace!("Received ping from client {}", client_id);
            }
            Message::Pong(_) => {
                log::trace!("Received pong from client {}", client_id);
            }
            Message::Close(_) => {
                log::debug!("Client {} requested close", client_id);
                break;
            }
        }
    }

    // Cleanup
    broadcast_task.abort();
    send_task.abort();

    {
        let mut clients = state.clients.write().await;
        clients.remove(&client_id);
    }

    state.decrement_clients();
    log::info!("Client {} disconnected. Total clients: {}", client_id, state.client_count());
}

/// Handle a protocol message from a client
async fn handle_message(client_id: u64, msg_type: u8, data: &[u8], state: &Arc<ServerState>) {
    match msg_type {
        MESSAGE_AUTH => handle_auth(client_id, data, state).await,
        MESSAGE_AUTH_LOGIN => handle_auth_login(client_id, data, state).await,
        MESSAGE_SYNC => handle_sync(client_id, data, state).await,
        MESSAGE_AWARENESS => handle_awareness(client_id, data, state).await,
        MESSAGE_DOC_LIST => handle_doc_list(client_id, data, state).await,
        MESSAGE_DOC_GET => handle_doc_get(client_id, data, state).await,
        MESSAGE_DOC_SAVE => handle_doc_save(client_id, data, state).await,
        MESSAGE_DOC_DELETE => handle_doc_delete(client_id, data, state).await,
        MESSAGE_JOIN_DOC => handle_join_doc(client_id, data, state).await,
        _ => {
            log::warn!("Unknown message type {} from client {}", msg_type, client_id);
        }
    }
}

/// Handle authentication message (JWT token auth)
async fn handle_auth(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let token: String = match decode_payload(data) {
        Ok(t) => t,
        Err(e) => {
            log::warn!("Failed to decode auth token from client {}: {}", client_id, e);
            send_auth_response(client_id, false, None, None, None, None, None, Some("Invalid token format"), state).await;
            return;
        }
    };

    // Validate JWT token
    match validate_jwt(&token, &state.jwt_secret) {
        Ok(claims) => {
            // Update client state
            {
                let mut clients = state.clients.write().await;
                if let Some(client) = clients.get_mut(&client_id) {
                    client.user_id = Some(claims.sub.clone());
                    client.username = Some(claims.username.clone());
                    client.role = Some(claims.role.clone());
                    client.authenticated = true;
                }
            }

            log::info!("Client {} authenticated as user {}", client_id, claims.username);
            send_auth_response(client_id, true, Some(claims.sub), Some(claims.username), Some(claims.role), None, None, None, state).await;
        }
        Err(e) => {
            log::warn!("Auth failed for client {}: {}", client_id, e);
            send_auth_response(client_id, false, None, None, None, None, None, Some(&e), state).await;
        }
    }
}

/// Handle authentication with username/password (for clients without local UserStore)
async fn handle_auth_login(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let request: AuthLoginRequest = match decode_payload(data) {
        Ok(r) => r,
        Err(e) => {
            log::warn!("Failed to decode auth login request from client {}: {}", client_id, e);
            send_auth_response(client_id, false, None, None, None, None, None, Some("Invalid request format"), state).await;
            return;
        }
    };

    // Check if we have a user store
    let user_store = match &state.user_store {
        Some(store) => store,
        None => {
            log::warn!("Auth login failed for client {}: No user store configured", client_id);
            send_auth_response(client_id, false, None, None, None, None, None, Some("Server not configured for login"), state).await;
            return;
        }
    };

    // Find user by username
    let user = match user_store.get_user_by_username(&request.username) {
        Some(u) => u,
        None => {
            log::warn!("Auth login failed for client {}: user '{}' not found", client_id, request.username);
            send_auth_response(client_id, false, None, None, None, None, None, Some("Invalid username or password"), state).await;
            return;
        }
    };

    // Verify password
    match verify_password(&request.password, &user.password_hash) {
        Ok(true) => {}
        Ok(false) => {
            log::warn!("Auth login failed for client {}: invalid password for user '{}'", client_id, request.username);
            send_auth_response(client_id, false, None, None, None, None, None, Some("Invalid username or password"), state).await;
            return;
        }
        Err(e) => {
            log::error!("Password verification error for client {}: {}", client_id, e);
            send_auth_response(client_id, false, None, None, None, None, None, Some("Authentication error"), state).await;
            return;
        }
    }

    // Update last login time
    let _ = user_store.update_last_login(&user.id);

    // Create JWT token
    let (token, expires_at) = match create_token(
        &user.id,
        &user.username,
        &user.role.to_string(),
        &state.token_config,
    ) {
        Ok(t) => t,
        Err(e) => {
            log::error!("Token creation error for client {}: {}", client_id, e);
            send_auth_response(client_id, false, None, None, None, None, None, Some("Failed to create session"), state).await;
            return;
        }
    };

    // Update client state
    {
        let mut clients = state.clients.write().await;
        if let Some(client) = clients.get_mut(&client_id) {
            client.user_id = Some(user.id.clone());
            client.username = Some(user.username.clone());
            client.role = Some(user.role.to_string());
            client.authenticated = true;
        }
    }

    log::info!("Client {} logged in as user {}", client_id, user.username);
    send_auth_response(
        client_id,
        true,
        Some(user.id),
        Some(user.username),
        Some(user.role.to_string()),
        Some(token),
        Some(expires_at),
        None,
        state,
    ).await;
}

/// Simple JWT claims structure
#[derive(Debug, serde::Deserialize)]
struct JwtClaims {
    sub: String,
    username: String,
    role: String,
    exp: u64,
}

/// Validate a JWT token (simplified - uses same secret as Tauri auth module)
fn validate_jwt(token: &str, secret: &str) -> Result<JwtClaims, String> {
    use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};

    let validation = Validation::new(Algorithm::HS256);
    let token_data = decode::<JwtClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation
    ).map_err(|e| format!("JWT validation failed: {}", e))?;

    // Check expiration
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    if token_data.claims.exp < now {
        return Err("Token expired".to_string());
    }

    Ok(token_data.claims)
}

/// Send authentication response
async fn send_auth_response(
    client_id: u64,
    success: bool,
    user_id: Option<String>,
    username: Option<String>,
    role: Option<String>,
    token: Option<String>,
    token_expires_at: Option<u64>,
    error: Option<&str>,
    state: &Arc<ServerState>,
) {
    let response = AuthResponse {
        success,
        user_id,
        username,
        role,
        token,
        token_expires_at,
        error: error.map(String::from),
    };

    if let Ok(data) = encode_message(MESSAGE_AUTH_RESPONSE, &response) {
        send_to_client(client_id, data, state).await;
    }
}

/// Handle CRDT sync message - forward to clients on same document
async fn handle_sync(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let doc_id = {
        let clients = state.clients.read().await;
        clients.get(&client_id).and_then(|c| c.current_doc_id.clone())
    };

    if let Some(doc_id) = doc_id {
        // Forward to all clients on the same document except sender
        state.broadcast_to_doc(&doc_id, data.to_vec(), Some(client_id));
    }
}

/// Handle awareness message - forward to clients on same document
async fn handle_awareness(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let doc_id = {
        let clients = state.clients.read().await;
        clients.get(&client_id).and_then(|c| c.current_doc_id.clone())
    };

    if let Some(doc_id) = doc_id {
        state.broadcast_to_doc(&doc_id, data.to_vec(), Some(client_id));
    }
}

/// Handle document list request
async fn handle_doc_list(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let request: DocListRequest = match decode_payload(data) {
        Ok(r) => r,
        Err(e) => {
            log::warn!("Failed to decode doc list request: {}", e);
            return;
        }
    };

    let documents = state.doc_store.list_documents();

    let response = DocListResponse {
        request_id: request.request_id,
        documents,
    };

    if let Ok(data) = encode_message(MESSAGE_DOC_LIST, &response) {
        send_to_client(client_id, data, state).await;
    }
}

/// Handle document get request
async fn handle_doc_get(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let request: DocGetRequest = match decode_payload(data) {
        Ok(r) => r,
        Err(e) => {
            log::warn!("Failed to decode doc get request: {}", e);
            return;
        }
    };

    let response = match state.doc_store.get_document(&request.doc_id) {
        Ok(doc) => DocGetResponse {
            request_id: request.request_id,
            document: Some(doc),
            error: None,
        },
        Err(e) => DocGetResponse {
            request_id: request.request_id,
            document: None,
            error: Some(e),
        },
    };

    if let Ok(data) = encode_message(MESSAGE_DOC_GET, &response) {
        send_to_client(client_id, data, state).await;
    }
}

/// Handle document save request
async fn handle_doc_save(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let request: DocSaveRequest = match decode_payload(data) {
        Ok(r) => r,
        Err(e) => {
            log::warn!("Failed to decode doc save request: {}", e);
            return;
        }
    };

    let doc_id = request.document.get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Get user info for the event
    let user_id = {
        let clients = state.clients.read().await;
        clients.get(&client_id).and_then(|c| c.user_id.clone()).unwrap_or_default()
    };

    let response = match state.doc_store.save_document(request.document) {
        Ok(()) => {
            // Broadcast document event to all clients
            let metadata = state.doc_store.get_metadata(&doc_id);
            let event = DocEvent {
                event_type: if metadata.is_some() { DocEventType::Updated } else { DocEventType::Created },
                doc_id: doc_id.clone(),
                metadata,
                user_id,
            };

            if let Ok(event_data) = encode_message(MESSAGE_DOC_EVENT, &event) {
                state.broadcast_to_all(event_data, None);
            }

            DocSaveResponse {
                request_id: request.request_id,
                success: true,
                error: None,
            }
        }
        Err(e) => DocSaveResponse {
            request_id: request.request_id,
            success: false,
            error: Some(e),
        },
    };

    if let Ok(data) = encode_message(MESSAGE_DOC_SAVE, &response) {
        send_to_client(client_id, data, state).await;
    }
}

/// Handle document delete request
async fn handle_doc_delete(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let request: DocDeleteRequest = match decode_payload(data) {
        Ok(r) => r,
        Err(e) => {
            log::warn!("Failed to decode doc delete request: {}", e);
            return;
        }
    };

    // Get user info for the event
    let user_id = {
        let clients = state.clients.read().await;
        clients.get(&client_id).and_then(|c| c.user_id.clone()).unwrap_or_default()
    };

    let response = match state.doc_store.delete_document(&request.doc_id) {
        Ok(deleted) => {
            if deleted {
                // Broadcast delete event
                let event = DocEvent {
                    event_type: DocEventType::Deleted,
                    doc_id: request.doc_id.clone(),
                    metadata: None,
                    user_id,
                };

                if let Ok(event_data) = encode_message(MESSAGE_DOC_EVENT, &event) {
                    state.broadcast_to_all(event_data, None);
                }
            }

            DocDeleteResponse {
                request_id: request.request_id,
                success: deleted,
                error: None,
            }
        }
        Err(e) => DocDeleteResponse {
            request_id: request.request_id,
            success: false,
            error: Some(e),
        },
    };

    if let Ok(data) = encode_message(MESSAGE_DOC_DELETE, &response) {
        send_to_client(client_id, data, state).await;
    }
}

/// Handle join document request (for CRDT routing)
async fn handle_join_doc(client_id: u64, data: &[u8], state: &Arc<ServerState>) {
    let request: JoinDocRequest = match decode_payload(data) {
        Ok(r) => r,
        Err(e) => {
            log::warn!("Failed to decode join doc request: {}", e);
            return;
        }
    };

    {
        let mut clients = state.clients.write().await;
        if let Some(client) = clients.get_mut(&client_id) {
            client.current_doc_id = Some(request.doc_id.clone());
            log::info!("Client {} joined document {}", client_id, request.doc_id);
        }
    }
}

/// Send data to a specific client
async fn send_to_client(client_id: u64, data: Vec<u8>, state: &Arc<ServerState>) {
    let clients = state.clients.read().await;
    if let Some(client) = clients.get(&client_id) {
        let _ = client.tx.send(data).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_server_lifecycle() {
        let server = WebSocketServer::new();

        // Set app data dir for test
        let temp_dir = tempfile::tempdir().unwrap();
        server.set_app_data_dir(temp_dir.path().to_path_buf()).await;

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
