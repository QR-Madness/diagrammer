//! Diagrammer Tauri Backend
//!
//! This module provides the Rust backend for the Diagrammer desktop application,
//! including WebSocket server for Protected Local mode collaboration.

mod server;

use server::{ServerStatus, WebSocketServer};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Application state for managing server mode and other runtime config
pub struct AppState {
    /// Whether the app is running in Protected Local (server) mode
    pub server_mode: AtomicBool,
    /// WebSocket server instance
    pub server: Arc<RwLock<WebSocketServer>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            server_mode: AtomicBool::new(false),
            server: Arc::new(RwLock::new(WebSocketServer::new())),
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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_server_mode,
            set_server_mode,
            get_app_version,
            get_server_status,
            start_server,
            stop_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Diagrammer");
}
