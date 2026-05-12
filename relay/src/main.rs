//! Diagrammer Relay binary entry point.
//!
//! Provides two subcommands:
//!   `relay init`   — write a fresh `relay.toml` with a generated JWT
//!                    secret (wired up in Slice D).
//!   `relay serve`  — start the HTTP + WebSocket server (wired up in
//!                    Slice C.4 once `sync`/`api`/`mcp`/`auth` are lifted).
//!
//! Slice C.1 only stands up the CLI shell so the crate compiles and
//! `cargo test` runs. Real behavior arrives in later sub-slices.

use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(name = "relay", version, about = "Diagrammer Relay server")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// Generate a fresh `relay.toml` with a random JWT secret.
    Init {
        #[arg(long, default_value = "relay.toml")]
        config: String,
    },
    /// Start the relay server.
    Serve {
        #[arg(long, default_value = "relay.toml")]
        config: String,
    },
}

fn main() -> anyhow::Result<()> {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let cli = Cli::parse();
    match cli.command {
        Command::Init { config } => {
            log::info!("`relay init` is a placeholder; full TOML config writer arrives in Slice D");
            log::info!("(would have written: {})", config);
            Ok(())
        }
        Command::Serve { config: _ } => {
            log::info!("`relay serve` is a placeholder; sync/api/mcp wiring arrives in Slice C.4");
            anyhow::bail!("relay serve not yet implemented — see Phase 20.3 Slice C.4");
        }
    }
}
