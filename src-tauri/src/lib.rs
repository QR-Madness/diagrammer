/// Application state for managing server mode and other runtime config
#[derive(Default)]
pub struct AppState {
    /// Whether the app is running in Protected Local (server) mode
    pub server_mode: std::sync::atomic::AtomicBool,
}

/// Get the current server mode status
#[tauri::command]
fn get_server_mode(state: tauri::State<AppState>) -> bool {
    state.server_mode.load(std::sync::atomic::Ordering::Relaxed)
}

/// Set the server mode (Protected Local on/off)
#[tauri::command]
fn set_server_mode(state: tauri::State<AppState>, enabled: bool) {
    state.server_mode.store(enabled, std::sync::atomic::Ordering::Relaxed);
    log::info!("Server mode set to: {}", enabled);
}

/// Get app version from Cargo.toml
#[tauri::command]
fn get_app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Placeholder for future: start WebSocket server for Protected Local mode
#[tauri::command]
async fn start_server(_port: u16) -> Result<String, String> {
    // TODO: Implement in Phase 14.0
    // This will start the Axum WebSocket server for CRDT sync
    Err("Server mode not yet implemented".to_string())
}

/// Placeholder for future: stop WebSocket server
#[tauri::command]
async fn stop_server() -> Result<(), String> {
    // TODO: Implement in Phase 14.0
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
            start_server,
            stop_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Diagrammer");
}
