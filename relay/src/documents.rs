//! Document metadata wire types.
//!
//! Slice C.1 lifts only the over-the-wire types out of
//! `src-tauri/src/server/documents.rs`. The `DocumentStore` filesystem
//! implementation moves in Slice C.2 (and lives behind the `Storage`
//! trait by Slice D).

use serde::{Deserialize, Serialize};

/// Document share entry — who has access and at what permission level.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentShare {
    pub user_id: String,
    pub user_name: String,
    /// "view" or "edit".
    pub permission: String,
    pub shared_at: u64,
}

/// Lightweight metadata for document listing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentMetadata {
    pub id: String,
    pub name: String,
    pub page_count: usize,
    pub modified_at: u64,
    pub created_at: u64,

    // Relay-document fields. The TS-side field is still called
    // `isTeamDocument` until PROTOCOL_VERSION bumps in a later phase;
    // we keep the wire name so PROTOCOL_VERSION stays at 1.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_team_document: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked_by_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shared_with: Option<Vec<DocumentShare>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_modified_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_modified_by_name: Option<String>,
}
