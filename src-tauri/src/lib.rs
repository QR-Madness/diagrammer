//! Diagrammer Tauri Backend
//!
//! This module provides the Rust backend for the Diagrammer desktop application,
//! including WebSocket server for Protected Local mode collaboration.

mod auth;
mod server;

use auth::{
    create_token, hash_password, verify_password, LoginResponse, SessionToken, TokenConfig, User,
    UserInfo, UserRole, UserStore,
};
use server::{ServerStatus, WebSocketServer};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tokio::sync::RwLock;

/// Application state for managing server mode and other runtime config
pub struct AppState {
    /// Whether the app is running in Protected Local (server) mode
    pub server_mode: AtomicBool,
    /// WebSocket server instance
    pub server: Arc<RwLock<WebSocketServer>>,
    /// User store for authentication
    pub user_store: Arc<UserStore>,
    /// JWT token configuration
    pub token_config: TokenConfig,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            server_mode: AtomicBool::new(false),
            server: Arc::new(RwLock::new(WebSocketServer::new())),
            user_store: Arc::new(UserStore::new()),
            token_config: TokenConfig::default(),
        }
    }
}

/// Get the current server mode status
#[tauri::command]
fn get_server_mode(state: tauri::State<AppState>) -> bool {
    state.server_mode.load(Ordering::Relaxed)
}

/// Set the server mode (Protected Local on/off)
#[tauri::command]
fn set_server_mode(state: tauri::State<AppState>, enabled: bool) {
    state.server_mode.store(enabled, Ordering::Relaxed);
    log::info!("Server mode set to: {}", enabled);
}

/// Get app version from Cargo.toml
#[tauri::command]
fn get_app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Get the current server status
#[tauri::command]
async fn get_server_status(state: tauri::State<'_, AppState>) -> Result<ServerStatus, String> {
    let server = state.server.read().await;
    Ok(server.status())
}

/// Start the WebSocket server for Protected Local mode
#[tauri::command]
async fn start_server(state: tauri::State<'_, AppState>, port: u16) -> Result<String, String> {
    let server = state.server.read().await;

    if server.is_running() {
        return Err("Server is already running".to_string());
    }

    // Drop read lock and acquire write lock
    drop(server);

    let server = state.server.write().await;
    let result = server.start(port).await?;

    // Update server mode
    state.server_mode.store(true, Ordering::Relaxed);

    log::info!("WebSocket server started: {}", result);
    Ok(result)
}

/// Stop the WebSocket server
#[tauri::command]
async fn stop_server(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let server = state.server.write().await;
    server.stop().await?;

    // Update server mode
    state.server_mode.store(false, Ordering::Relaxed);

    log::info!("WebSocket server stopped");
    Ok(())
}

// ============ Authentication Commands ============

/// Login with username and password
#[tauri::command]
fn login(state: tauri::State<AppState>, username: String, password: String) -> LoginResponse {
    // Find user by username
    let user = match state.user_store.get_user_by_username(&username) {
        Some(u) => u,
        None => {
            log::warn!("Login failed: user '{}' not found", username);
            return LoginResponse {
                success: false,
                user: None,
                token: None,
                error: Some("Invalid username or password".to_string()),
            };
        }
    };

    // Verify password
    match verify_password(&password, &user.password_hash) {
        Ok(true) => {}
        Ok(false) => {
            log::warn!("Login failed: invalid password for user '{}'", username);
            return LoginResponse {
                success: false,
                user: None,
                token: None,
                error: Some("Invalid username or password".to_string()),
            };
        }
        Err(e) => {
            log::error!("Password verification error: {}", e);
            return LoginResponse {
                success: false,
                user: None,
                token: None,
                error: Some("Authentication error".to_string()),
            };
        }
    }

    // Update last login time
    let _ = state.user_store.update_last_login(&user.id);

    // Create JWT token
    let (token, expires_at) = match create_token(
        &user.id,
        &user.username,
        &user.role.to_string(),
        &state.token_config,
    ) {
        Ok(t) => t,
        Err(e) => {
            log::error!("Token creation error: {}", e);
            return LoginResponse {
                success: false,
                user: None,
                token: None,
                error: Some("Failed to create session".to_string()),
            };
        }
    };

    log::info!("User '{}' logged in successfully", username);

    LoginResponse {
        success: true,
        user: Some(UserInfo::from(&user)),
        token: Some(SessionToken { token, expires_at }),
        error: None,
    }
}

/// Validate a JWT token and return user info
#[tauri::command]
fn validate_token(state: tauri::State<AppState>, token: String) -> LoginResponse {
    // Validate the token
    let claims = match auth::validate_token(&token, &state.token_config) {
        Ok(c) => c,
        Err(e) => {
            log::debug!("Token validation failed: {}", e);
            return LoginResponse {
                success: false,
                user: None,
                token: None,
                error: Some("Invalid or expired token".to_string()),
            };
        }
    };

    // Get the user
    let user = match state.user_store.get_user(&claims.sub) {
        Some(u) => u,
        None => {
            log::warn!("Token valid but user '{}' not found", claims.sub);
            return LoginResponse {
                success: false,
                user: None,
                token: None,
                error: Some("User not found".to_string()),
            };
        }
    };

    LoginResponse {
        success: true,
        user: Some(UserInfo::from(&user)),
        token: None, // Don't return token on validation
        error: None,
    }
}

/// Create a new user (admin only in production)
#[tauri::command]
fn create_user(
    state: tauri::State<AppState>,
    username: String,
    password: String,
    display_name: String,
    role: String,
) -> Result<UserInfo, String> {
    // Parse role
    let user_role = match role.as_str() {
        "admin" => UserRole::Admin,
        "user" => UserRole::User,
        _ => return Err("Invalid role".to_string()),
    };

    // Hash password
    let password_hash = hash_password(&password)?;

    // Generate user ID
    let id = nanoid::nanoid!();

    // Get current timestamp
    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let user = User {
        id,
        display_name: display_name.clone(),
        username: username.clone(),
        password_hash,
        role: user_role,
        created_at,
        last_login_at: None,
    };

    state.user_store.add_user(user.clone())?;

    log::info!("User '{}' created", username);

    Ok(UserInfo::from(&user))
}

/// Check if any users exist (for initial setup)
#[tauri::command]
fn has_users(state: tauri::State<AppState>) -> bool {
    state.user_store.has_users()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Log startup
            log::info!("Diagrammer v{} starting...", env!("CARGO_PKG_VERSION"));

            // Set window icon (for development mode - bundle icons handle production)
            if let Some(window) = app.get_webview_window("main") {
                // Load icon from embedded PNG bytes
                let icon_bytes = include_bytes!("../icons/icon.png");
                match tauri::image::Image::from_bytes(icon_bytes) {
                    Ok(icon) => {
                        if let Err(e) = window.set_icon(icon) {
                            log::warn!("Failed to set window icon: {}", e);
                        } else {
                            log::info!("Window icon set successfully");
                        }
                    }
                    Err(e) => log::warn!("Failed to load icon: {}", e),
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_server_mode,
            set_server_mode,
            get_app_version,
            get_server_status,
            start_server,
            stop_server,
            // Authentication
            login,
            validate_token,
            create_user,
            has_users,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Diagrammer");
}
