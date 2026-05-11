//! MCP tool surface for Diagrammer — foundation set.
//!
//! Four tools, all namespaced `diagrammer.*`:
//!   - list_documents
//!   - get_document
//!   - get_page
//!   - add_shape
//!
//! Richer write tools (batch add, connect, layout, group, comments) are
//! deferred until the foundation is debugged.

use std::sync::Arc;

use serde::Deserialize;
use serde_json::{json, Value};

use crate::server::documents::DocumentStore;

use super::adapter::{dsl_to_shape_json, shape_json_to_dsl, DslShape};

/// A single MCP tool descriptor (name, description, input schema).
pub struct ToolDescriptor {
    pub name: &'static str,
    pub description: &'static str,
    pub input_schema: Value,
}

/// Return the list of foundation tools advertised via `tools/list`.
pub fn descriptors() -> Vec<ToolDescriptor> {
    vec![
        ToolDescriptor {
            name: "diagrammer.list_documents",
            description:
                "List Diagrammer team documents stored on this host. Returns id, name, pageCount, modifiedAt for each.",
            input_schema: json!({
                "type": "object",
                "properties": {},
                "additionalProperties": false
            }),
        },
        ToolDescriptor {
            name: "diagrammer.get_document",
            description:
                "Return a document by id: top-level metadata plus a list of pages with their ids and names.",
            input_schema: json!({
                "type": "object",
                "properties": {
                    "docId": {"type": "string"}
                },
                "required": ["docId"],
                "additionalProperties": false
            }),
        },
        ToolDescriptor {
            name: "diagrammer.get_page",
            description:
                "Return the shapes on a single page as DSL objects. Shape kinds outside the foundation set (rectangle/ellipse/text) are returned in a generic form.",
            input_schema: json!({
                "type": "object",
                "properties": {
                    "docId": {"type": "string"},
                    "pageId": {"type": "string"}
                },
                "required": ["docId", "pageId"],
                "additionalProperties": false
            }),
        },
        ToolDescriptor {
            name: "diagrammer.add_shape",
            description:
                "Add a single shape (rectangle, ellipse, or text) to a page. Returns the id assigned. Warns if the document is locked by another user.",
            input_schema: json!({
                "type": "object",
                "properties": {
                    "docId": {"type": "string"},
                    "pageId": {"type": "string"},
                    "shape": {
                        "type": "object",
                        "properties": {
                            "kind": {"type": "string", "enum": ["rectangle", "ellipse", "text"]},
                            "x": {"type": "number"},
                            "y": {"type": "number"},
                            "w": {"type": "number"},
                            "h": {"type": "number"},
                            "text": {"type": "string"},
                            "id": {"type": "string"},
                            "style": {
                                "type": "object",
                                "properties": {
                                    "fill": {"type": "string"},
                                    "stroke": {"type": "string"},
                                    "strokeWidth": {"type": "number"},
                                    "labelColor": {"type": "string"}
                                },
                                "additionalProperties": false
                            }
                        },
                        "required": ["kind", "x", "y"],
                        "additionalProperties": false
                    }
                },
                "required": ["docId", "pageId", "shape"],
                "additionalProperties": false
            }),
        },
    ]
}

/// Outcome of a tool call.
#[derive(Debug)]
pub struct ToolOutcome {
    /// JSON value returned to the caller (wrapped by transport into MCP
    /// content blocks).
    pub result: Value,
    /// If `Some`, the transport should also broadcast a doc-changed event
    /// for this document id so the running app reloads.
    pub changed_doc_id: Option<String>,
}

/// Dispatch a `tools/call` request. `name` is the tool name as advertised
/// in `descriptors()`; `args` is the `arguments` object from the call.
pub fn dispatch(
    store: &Arc<DocumentStore>,
    name: &str,
    args: &Value,
) -> Result<ToolOutcome, String> {
    // Always refresh the index from disk first so reads see any writes the
    // WebSocket server (or another MCP write) made since last call.
    store.reload_index();

    match name {
        "diagrammer.list_documents" => list_documents(store),
        "diagrammer.get_document" => get_document(store, args),
        "diagrammer.get_page" => get_page(store, args),
        "diagrammer.add_shape" => add_shape(store, args),
        _ => Err(format!("Unknown tool: {}", name)),
    }
    .map(|outcome| outcome)
}

fn list_documents(store: &Arc<DocumentStore>) -> Result<ToolOutcome, String> {
    let docs = store.list_documents();
    let payload: Vec<Value> = docs
        .iter()
        .map(|m| {
            json!({
                "id": m.id,
                "name": m.name,
                "pageCount": m.page_count,
                "modifiedAt": m.modified_at,
            })
        })
        .collect();
    Ok(ToolOutcome {
        result: json!({"documents": payload}),
        changed_doc_id: None,
    })
}

#[derive(Deserialize)]
struct GetDocumentArgs {
    #[serde(rename = "docId")]
    doc_id: String,
}

fn get_document(store: &Arc<DocumentStore>, args: &Value) -> Result<ToolOutcome, String> {
    let parsed: GetDocumentArgs =
        serde_json::from_value(args.clone()).map_err(|e| format!("Invalid arguments: {}", e))?;
    let doc = store.get_document(&parsed.doc_id)?;

    let pages: Vec<Value> = doc
        .get("pageOrder")
        .and_then(|v| v.as_array())
        .map(|order| {
            order
                .iter()
                .filter_map(|id| id.as_str())
                .filter_map(|id| {
                    let page = doc.get("pages")?.get(id)?;
                    let shape_count = page
                        .get("shapeOrder")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    Some(json!({
                        "id": id,
                        "name": page.get("name").cloned().unwrap_or(json!("")),
                        "shapeCount": shape_count,
                    }))
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(ToolOutcome {
        result: json!({
            "id": doc.get("id").cloned().unwrap_or(Value::Null),
            "name": doc.get("name").cloned().unwrap_or(Value::Null),
            "modifiedAt": doc.get("modifiedAt").cloned().unwrap_or(Value::Null),
            "lockedBy": doc.get("lockedBy").cloned().unwrap_or(Value::Null),
            "pages": pages,
        }),
        changed_doc_id: None,
    })
}

#[derive(Deserialize)]
struct GetPageArgs {
    #[serde(rename = "docId")]
    doc_id: String,
    #[serde(rename = "pageId")]
    page_id: String,
}

fn get_page(store: &Arc<DocumentStore>, args: &Value) -> Result<ToolOutcome, String> {
    let parsed: GetPageArgs =
        serde_json::from_value(args.clone()).map_err(|e| format!("Invalid arguments: {}", e))?;
    let doc = store.get_document(&parsed.doc_id)?;
    let page = doc
        .get("pages")
        .and_then(|p| p.get(&parsed.page_id))
        .ok_or_else(|| format!("Page '{}' not found", parsed.page_id))?;

    let order: Vec<String> = page
        .get("shapeOrder")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    let shapes_obj = page.get("shapes").cloned().unwrap_or_else(|| json!({}));

    let shapes: Vec<Value> = order
        .iter()
        .filter_map(|id| shapes_obj.get(id))
        .map(|shape| {
            shape_json_to_dsl(shape).unwrap_or_else(|| {
                // Fallback: pass through a minimal generic descriptor for
                // shape kinds the foundation adapter doesn't model yet.
                json!({
                    "id": shape.get("id"),
                    "kind": shape.get("type"),
                    "x": shape.get("x"),
                    "y": shape.get("y"),
                    "_unmapped": true,
                })
            })
        })
        .collect();

    Ok(ToolOutcome {
        result: json!({"shapes": shapes}),
        changed_doc_id: None,
    })
}

#[derive(Deserialize)]
struct AddShapeArgs {
    #[serde(rename = "docId")]
    doc_id: String,
    #[serde(rename = "pageId")]
    page_id: String,
    shape: DslShape,
}

fn add_shape(store: &Arc<DocumentStore>, args: &Value) -> Result<ToolOutcome, String> {
    let parsed: AddShapeArgs =
        serde_json::from_value(args.clone()).map_err(|e| format!("Invalid arguments: {}", e))?;

    let mut doc = store.get_document(&parsed.doc_id)?;

    // Surface a lock warning rather than refusing — write still proceeds.
    let locked_warning = doc
        .get("lockedBy")
        .and_then(|v| v.as_str())
        .map(|uid| format!("Document is locked by user '{}' — write may be overwritten.", uid));

    let id = parsed
        .shape
        .id
        .clone()
        .unwrap_or_else(|| format!("shape-{}", nanoid::nanoid!(10)));

    let shape_json = dsl_to_shape_json(&parsed.shape, &id);

    let pages = doc
        .get_mut("pages")
        .and_then(|v| v.as_object_mut())
        .ok_or("Document missing 'pages'")?;
    let page = pages
        .get_mut(&parsed.page_id)
        .and_then(|v| v.as_object_mut())
        .ok_or_else(|| format!("Page '{}' not found", parsed.page_id))?;

    let shapes = page
        .entry("shapes")
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or("Page 'shapes' is not an object")?;
    if shapes.contains_key(&id) {
        return Err(format!("Shape id '{}' already exists on page", id));
    }
    shapes.insert(id.clone(), shape_json);

    let order = page
        .entry("shapeOrder")
        .or_insert_with(|| json!([]))
        .as_array_mut()
        .ok_or("Page 'shapeOrder' is not an array")?;
    order.push(json!(id));

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    page.insert("modifiedAt".into(), json!(now));
    doc["modifiedAt"] = json!(now);

    store.save_document(doc)?;

    Ok(ToolOutcome {
        result: json!({
            "id": id,
            "warning": locked_warning,
        }),
        changed_doc_id: Some(parsed.doc_id),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn seed_doc(dir: &PathBuf, doc_id: &str, page_id: &str) -> Arc<DocumentStore> {
        let store = Arc::new(DocumentStore::new(dir.clone()));
        let doc = json!({
            "id": doc_id,
            "name": "Test Doc",
            "version": 1,
            "createdAt": 1u64,
            "modifiedAt": 1u64,
            "activePageId": page_id,
            "pageOrder": [page_id],
            "pages": {
                page_id: {
                    "id": page_id,
                    "name": "Page 1",
                    "shapes": {},
                    "shapeOrder": [],
                    "createdAt": 1u64,
                    "modifiedAt": 1u64,
                }
            }
        });
        store.save_document(doc).unwrap();
        store
    }

    #[test]
    fn list_returns_seeded_doc() {
        let dir = TempDir::new().unwrap();
        let store = seed_doc(&dir.path().to_path_buf(), "doc1", "p1");
        let out = dispatch(&store, "diagrammer.list_documents", &json!({})).unwrap();
        let docs = out.result["documents"].as_array().unwrap();
        assert_eq!(docs.len(), 1);
        assert_eq!(docs[0]["id"], "doc1");
    }

    #[test]
    fn get_document_lists_pages() {
        let dir = TempDir::new().unwrap();
        let store = seed_doc(&dir.path().to_path_buf(), "doc1", "p1");
        let out = dispatch(
            &store,
            "diagrammer.get_document",
            &json!({"docId": "doc1"}),
        )
        .unwrap();
        assert_eq!(out.result["pages"][0]["id"], "p1");
        assert_eq!(out.result["pages"][0]["shapeCount"], 0);
    }

    #[test]
    fn add_shape_persists_and_appears_in_get_page() {
        let dir = TempDir::new().unwrap();
        let store = seed_doc(&dir.path().to_path_buf(), "doc1", "p1");

        let out = dispatch(
            &store,
            "diagrammer.add_shape",
            &json!({
                "docId": "doc1",
                "pageId": "p1",
                "shape": {"kind": "rectangle", "x": 50, "y": 50, "text": "Hi"}
            }),
        )
        .unwrap();
        let id = out.result["id"].as_str().unwrap().to_string();
        assert_eq!(out.changed_doc_id.as_deref(), Some("doc1"));

        let page = dispatch(
            &store,
            "diagrammer.get_page",
            &json!({"docId": "doc1", "pageId": "p1"}),
        )
        .unwrap();
        let shapes = page.result["shapes"].as_array().unwrap();
        assert_eq!(shapes.len(), 1);
        assert_eq!(shapes[0]["id"], id);
        assert_eq!(shapes[0]["kind"], "rectangle");
        assert_eq!(shapes[0]["text"], "Hi");
    }

    #[test]
    fn add_shape_rejects_duplicate_id() {
        let dir = TempDir::new().unwrap();
        let store = seed_doc(&dir.path().to_path_buf(), "doc1", "p1");
        let args = json!({
            "docId": "doc1",
            "pageId": "p1",
            "shape": {"kind": "rectangle", "x": 0, "y": 0, "id": "fixed"}
        });
        dispatch(&store, "diagrammer.add_shape", &args).unwrap();
        let err = dispatch(&store, "diagrammer.add_shape", &args).unwrap_err();
        assert!(err.contains("already exists"));
    }

    #[test]
    fn add_shape_warns_when_doc_is_locked() {
        let dir = TempDir::new().unwrap();
        let store = seed_doc(&dir.path().to_path_buf(), "doc1", "p1");
        store.set_lock("doc1", Some("other-user"), Some("Other")).unwrap();
        let out = dispatch(
            &store,
            "diagrammer.add_shape",
            &json!({
                "docId": "doc1",
                "pageId": "p1",
                "shape": {"kind": "rectangle", "x": 0, "y": 0}
            }),
        )
        .unwrap();
        assert!(out.result["warning"].as_str().unwrap().contains("locked"));
    }

    #[test]
    fn unknown_tool_errors() {
        let dir = TempDir::new().unwrap();
        let store = seed_doc(&dir.path().to_path_buf(), "doc1", "p1");
        let err = dispatch(&store, "diagrammer.nope", &json!({})).unwrap_err();
        assert!(err.contains("Unknown tool"));
    }
}
