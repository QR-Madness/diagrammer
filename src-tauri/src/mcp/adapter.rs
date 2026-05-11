//! LLM-optimized DSL ↔ Diagrammer shape JSON.
//!
//! The MCP tool surface accepts a small compact DSL so an LLM can think in
//! `{kind, x, y, w?, h?, text?, style?}` instead of the full `BaseShape`
//! structure. This module is the single source of truth for that mapping.
//!
//! Defaults mirror `src/shapes/Shape.ts` (DEFAULT_SHAPE_STYLE,
//! DEFAULT_RECTANGLE, DEFAULT_ELLIPSE, DEFAULT_TEXT). Foundation scope
//! covers rectangle, ellipse, and text only — connector, line, group are
//! intentionally deferred per the foundation plan.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// Compact shape kind accepted by the MCP DSL.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DslKind {
    Rectangle,
    Ellipse,
    Text,
}

/// Optional style block on a DSL shape. Any field set to the string `"AUTO"`
/// (case-insensitive) is forwarded as the literal sentinel `"auto"` so the
/// frontend's contrast-aware colour resolver picks an appropriate value at
/// render time (see memory: Color Palette UX Phase 19).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DslStyle {
    pub fill: Option<String>,
    pub stroke: Option<String>,
    pub stroke_width: Option<f64>,
    pub label_color: Option<String>,
}

/// Compact shape definition accepted by `diagrammer.add_shape`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DslShape {
    pub kind: DslKind,
    pub x: f64,
    pub y: f64,
    pub w: Option<f64>,
    pub h: Option<f64>,
    pub text: Option<String>,
    pub style: Option<DslStyle>,
    /// Caller-provided id. If absent, the tool generates one.
    pub id: Option<String>,
}

/// Convert a DSL shape into the on-disk shape JSON used by Diagrammer.
/// `id` must be unique within the page; callers are responsible for that.
pub fn dsl_to_shape_json(dsl: &DslShape, id: &str) -> Value {
    match dsl.kind {
        DslKind::Rectangle => rectangle(dsl, id),
        DslKind::Ellipse => ellipse(dsl, id),
        DslKind::Text => text(dsl, id),
    }
}

/// Lossy reverse mapping used by read tools so an LLM sees the same DSL
/// shape it would write. Unknown shape types are returned as `None` so the
/// caller can fall back to a generic representation.
pub fn shape_json_to_dsl(shape: &Value) -> Option<Value> {
    let kind = shape.get("type")?.as_str()?;
    let x = shape.get("x")?.as_f64()?;
    let y = shape.get("y")?.as_f64()?;

    let (dsl_kind, w, h) = match kind {
        "rectangle" => (
            "rectangle",
            shape.get("width").and_then(|v| v.as_f64()),
            shape.get("height").and_then(|v| v.as_f64()),
        ),
        "ellipse" => (
            "ellipse",
            shape.get("radiusX").and_then(|v| v.as_f64()).map(|r| r * 2.0),
            shape.get("radiusY").and_then(|v| v.as_f64()).map(|r| r * 2.0),
        ),
        "text" => (
            "text",
            shape.get("width").and_then(|v| v.as_f64()),
            shape.get("height").and_then(|v| v.as_f64()),
        ),
        _ => return None,
    };

    let mut out = json!({
        "id": shape.get("id"),
        "kind": dsl_kind,
        "x": x,
        "y": y,
    });

    if let Some(w) = w {
        out["w"] = json!(w);
    }
    if let Some(h) = h {
        out["h"] = json!(h);
    }
    if let Some(label) = shape.get("label").and_then(|v| v.as_str()) {
        out["text"] = json!(label);
    } else if let Some(content) = shape.get("content").and_then(|v| v.as_str()) {
        // text shape uses `content` rather than `label`
        out["text"] = json!(content);
    }

    let mut style = json!({});
    let mut any_style = false;
    for key in ["fill", "stroke", "labelColor"] {
        if let Some(v) = shape.get(key) {
            if !v.is_null() {
                style[key] = v.clone();
                any_style = true;
            }
        }
    }
    if let Some(sw) = shape.get("strokeWidth") {
        style["strokeWidth"] = sw.clone();
        any_style = true;
    }
    if any_style {
        out["style"] = style;
    }

    Some(out)
}

// ---------------------------------------------------------------------------
// Per-kind builders. Keep field names and defaults in sync with the TS
// handlers in src/shapes/{Rectangle,Ellipse,Text}.ts.
// ---------------------------------------------------------------------------

fn base_object(id: &str, ty: &str, dsl: &DslShape) -> serde_json::Map<String, Value> {
    let mut o = serde_json::Map::new();
    o.insert("id".into(), json!(id));
    o.insert("type".into(), json!(ty));
    o.insert("x".into(), json!(dsl.x));
    o.insert("y".into(), json!(dsl.y));
    o.insert("rotation".into(), json!(0));
    o.insert("opacity".into(), json!(1));
    o.insert("locked".into(), json!(false));
    o.insert("visible".into(), json!(true));
    o
}

fn rectangle(dsl: &DslShape, id: &str) -> Value {
    let mut o = base_object(id, "rectangle", dsl);
    let (fill, stroke, stroke_width, label_color) = resolve_style(
        dsl.style.as_ref(),
        // DEFAULT_SHAPE_STYLE
        Some("#4a90d9"),
        Some("#2c5282"),
        2.0,
        None,
    );
    o.insert("fill".into(), value_or_null(fill));
    o.insert("stroke".into(), value_or_null(stroke));
    o.insert("strokeWidth".into(), json!(stroke_width));
    o.insert("width".into(), json!(dsl.w.unwrap_or(100.0)));
    o.insert("height".into(), json!(dsl.h.unwrap_or(80.0)));
    o.insert("cornerRadius".into(), json!(0));
    if let Some(label) = &dsl.text {
        o.insert("label".into(), json!(label));
    }
    if let Some(c) = label_color {
        o.insert("labelColor".into(), json!(c));
    }
    Value::Object(o)
}

fn ellipse(dsl: &DslShape, id: &str) -> Value {
    let mut o = base_object(id, "ellipse", dsl);
    let (fill, stroke, stroke_width, label_color) = resolve_style(
        dsl.style.as_ref(),
        Some("#4a90d9"),
        Some("#2c5282"),
        2.0,
        None,
    );
    o.insert("fill".into(), value_or_null(fill));
    o.insert("stroke".into(), value_or_null(stroke));
    o.insert("strokeWidth".into(), json!(stroke_width));
    // Diameter → radius. Defaults from DEFAULT_ELLIPSE (radiusX=50, radiusY=40).
    let rx = dsl.w.map(|w| w / 2.0).unwrap_or(50.0);
    let ry = dsl.h.map(|h| h / 2.0).unwrap_or(40.0);
    o.insert("radiusX".into(), json!(rx));
    o.insert("radiusY".into(), json!(ry));
    if let Some(label) = &dsl.text {
        o.insert("label".into(), json!(label));
    }
    if let Some(c) = label_color {
        o.insert("labelColor".into(), json!(c));
    }
    Value::Object(o)
}

fn text(dsl: &DslShape, id: &str) -> Value {
    let mut o = base_object(id, "text", dsl);
    // DEFAULT_TEXT: fill=null, stroke=null, strokeWidth=0
    let (fill, stroke, stroke_width, label_color) =
        resolve_style(dsl.style.as_ref(), None, None, 0.0, Some("auto"));
    o.insert("fill".into(), value_or_null(fill));
    o.insert("stroke".into(), value_or_null(stroke));
    o.insert("strokeWidth".into(), json!(stroke_width));
    o.insert("width".into(), json!(dsl.w.unwrap_or(200.0)));
    o.insert("height".into(), json!(dsl.h.unwrap_or(50.0)));
    o.insert("fontSize".into(), json!(16));
    o.insert("fontFamily".into(), json!("sans-serif"));
    o.insert("textAlign".into(), json!("left"));
    o.insert("verticalAlign".into(), json!("top"));
    o.insert("content".into(), json!(dsl.text.clone().unwrap_or_default()));
    if let Some(c) = label_color {
        o.insert("labelColor".into(), json!(c));
    }
    Value::Object(o)
}

fn resolve_style(
    style: Option<&DslStyle>,
    default_fill: Option<&str>,
    default_stroke: Option<&str>,
    default_stroke_width: f64,
    default_label_color: Option<&str>,
) -> (Option<String>, Option<String>, f64, Option<String>) {
    let fill = style
        .and_then(|s| s.fill.clone())
        .map(normalize_auto)
        .or_else(|| default_fill.map(String::from));
    let stroke = style
        .and_then(|s| s.stroke.clone())
        .map(normalize_auto)
        .or_else(|| default_stroke.map(String::from));
    let stroke_width = style
        .and_then(|s| s.stroke_width)
        .unwrap_or(default_stroke_width);
    let label_color = style
        .and_then(|s| s.label_color.clone())
        .map(normalize_auto)
        .or_else(|| default_label_color.map(String::from));
    (fill, stroke, stroke_width, label_color)
}

fn normalize_auto(s: String) -> String {
    if s.eq_ignore_ascii_case("auto") {
        "auto".to_string()
    } else {
        s
    }
}

fn value_or_null(opt: Option<String>) -> Value {
    match opt {
        Some(s) => json!(s),
        None => Value::Null,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make(kind: DslKind, x: f64, y: f64) -> DslShape {
        DslShape {
            kind,
            x,
            y,
            w: None,
            h: None,
            text: None,
            style: None,
            id: None,
        }
    }

    #[test]
    fn rectangle_defaults_match_typescript() {
        let s = dsl_to_shape_json(&make(DslKind::Rectangle, 10.0, 20.0), "r1");
        assert_eq!(s["type"], "rectangle");
        assert_eq!(s["x"], 10.0);
        assert_eq!(s["y"], 20.0);
        assert_eq!(s["width"], 100.0);
        assert_eq!(s["height"], 80.0);
        assert_eq!(s["fill"], "#4a90d9");
        assert_eq!(s["stroke"], "#2c5282");
        assert_eq!(s["strokeWidth"], 2.0);
        assert_eq!(s["rotation"], 0);
        assert_eq!(s["cornerRadius"], 0);
    }

    #[test]
    fn ellipse_converts_diameter_to_radius() {
        let mut d = make(DslKind::Ellipse, 0.0, 0.0);
        d.w = Some(200.0);
        d.h = Some(80.0);
        let s = dsl_to_shape_json(&d, "e1");
        assert_eq!(s["radiusX"], 100.0);
        assert_eq!(s["radiusY"], 40.0);
    }

    #[test]
    fn text_defaults_have_null_fill_and_stroke() {
        let mut d = make(DslKind::Text, 5.0, 5.0);
        d.text = Some("hello".into());
        let s = dsl_to_shape_json(&d, "t1");
        assert_eq!(s["type"], "text");
        assert!(s["fill"].is_null());
        assert!(s["stroke"].is_null());
        assert_eq!(s["strokeWidth"], 0.0);
        assert_eq!(s["content"], "hello");
        assert_eq!(s["labelColor"], "auto");
    }

    #[test]
    fn auto_sentinel_is_normalized_case_insensitively() {
        let mut d = make(DslKind::Rectangle, 0.0, 0.0);
        d.style = Some(DslStyle {
            fill: Some("AUTO".into()),
            stroke: Some("Auto".into()),
            stroke_width: None,
            label_color: Some("auto".into()),
        });
        let s = dsl_to_shape_json(&d, "r");
        assert_eq!(s["fill"], "auto");
        assert_eq!(s["stroke"], "auto");
        assert_eq!(s["labelColor"], "auto");
    }

    #[test]
    fn label_is_propagated_for_rectangle() {
        let mut d = make(DslKind::Rectangle, 0.0, 0.0);
        d.text = Some("Box".into());
        let s = dsl_to_shape_json(&d, "r");
        assert_eq!(s["label"], "Box");
    }

    #[test]
    fn reverse_mapping_round_trips_basics() {
        let mut d = make(DslKind::Rectangle, 50.0, 60.0);
        d.w = Some(120.0);
        d.h = Some(40.0);
        d.text = Some("hi".into());
        let shape = dsl_to_shape_json(&d, "r1");

        let back = shape_json_to_dsl(&shape).expect("should map back");
        assert_eq!(back["kind"], "rectangle");
        assert_eq!(back["x"], 50.0);
        assert_eq!(back["y"], 60.0);
        assert_eq!(back["w"], 120.0);
        assert_eq!(back["h"], 40.0);
        assert_eq!(back["text"], "hi");
    }

    #[test]
    fn reverse_mapping_returns_none_for_unknown_type() {
        let shape = json!({"type": "connector", "x": 0, "y": 0});
        assert!(shape_json_to_dsl(&shape).is_none());
    }
}
