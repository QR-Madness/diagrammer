# Protocol Fixtures

Cross-language golden fixtures for the WebSocket sync protocol. Loaded
by both the TypeScript renderer test suite and the Rust server test
suite to guarantee TS (`src/collaboration/protocol.ts`) and Rust
(`src-tauri/src/server/protocol.rs`, and the future `/relay/src/protocol.rs`)
stay in lockstep.

If you change a message payload shape on either side, you **must**
update or add a fixture here. CI will be red otherwise.

## Format

Each fixture is a single JSON file:

```json
{
  "messageType": 3,
  "messageName": "DOC_LIST",
  "kind": "request",
  "payload": { "requestId": "req-test-001" }
}
```

- `messageType` — numeric `MESSAGE_*` constant (must match both sides).
- `messageName` — human-readable label (uppercase, no `MESSAGE_` prefix).
- `kind` — `"request"`, `"response"`, `"event"`, or `"oneshot"`.
- `payload` — the JSON payload after the 1-byte type prefix. Keys use
  camelCase to match `serde(rename_all = "camelCase")` on the Rust side
  and the literal field names on the TS side.

`SYNC` (0) and `AWARENESS` (1) carry opaque binary Yjs payloads rather
than JSON; they have no fixtures here.

## Path

Lives at the repo root for now. Moves to `/relay/tests/protocol-fixtures/`
in Slice C of phase 20.3 (relay extraction) — at that point both
language test suites update their path references.
