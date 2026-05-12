//! Diagrammer Relay library crate.
//!
//! Carries the wire-protocol types, sync/api/mcp/auth modules, and the
//! `Storage` trait. The `relay` binary in `main.rs` composes these into
//! a running server. The library shape exists so integration tests in
//! `/relay/tests/` can exercise modules in isolation.
//!
//! Phase 20.3 Slice C — extraction of `src-tauri/src/{server,mcp,auth}/`
//! into a standalone crate. Subsequent slices delete the Tauri copies
//! (Slice E) and switch the wire on the renderer side.

pub mod documents;
pub mod protocol;
