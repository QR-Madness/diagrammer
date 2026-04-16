# AGENTS.md — Diagrammer

## Critical Rules

- **Bun, not Node.js** — `bun` is the JS runtime and package manager. Never use `npm`, `yarn`, or `node` directly.
- **Document format is sacred** — v1.1.0-beta.1 is released; all document changes must be backwards-compatible. New store fields must be optional with defaults. Never remove shape types — deprecate and keep rendering.
- **Protocol sync** — `src/collaboration/protocol.ts` and `src-tauri/src/server/protocol.rs` must stay in sync. Message type constants (0–13) are defined in both files; edit both or break the WebSocket protocol.

## Commands

```bash
# Verification (matches CI order)
bun run typecheck                                    # TS type check — run first
bun run test --run                                   # all Vitest tests once
cargo check --manifest-path src-tauri/Cargo.toml     # Rust compile check
cargo test --manifest-path src-tauri/Cargo.toml      # Rust tests

# Task runner shortcuts (requires https://taskfile.dev/)
task check                    # typecheck + tests (JS and Rust)
task dev                      # Tauri desktop dev (runs tauri:dev, NOT web-only vite)

# Single test file
bun run test src/engine/Camera.test.ts

# Web-only dev server (no Tauri/Rust)
bun run dev

# Docs site (separate sub-project, own bun install)
cd docs-site && bun install && bun run build:offline
```

## Architecture Notes

- **Canvas rendering** — React is UI chrome only; canvas uses `requestAnimationFrame` in the engine core (`src/engine/`). Never render canvas content via React.
- **Coordinate transforms** — Always use `camera.screenToWorld()` / `camera.worldToScreen()`. Never manually apply pan/zoom math.
- **State mutations** — All document changes through Immer via Zustand stores. DocumentStore is the single source of truth.
- **Shape system** — Shapes are plain data objects. Behavior is external via ShapeRegistry handlers (`render`, `hitTest`, `getBounds`, `getHandles`, `create`). No methods on shape objects.
- **Path alias** — `@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`). Use `@/` imports.

## TypeScript Strict Flags

Beyond `strict: true`: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. Index access returns `T | undefined` — always handle the `undefined` case.

## Testing

- Vitest with jsdom environment. Config is inline in `vite.config.ts`.
- Test globals (`describe`, `it`, `expect`) are available without imports.
- Test files live alongside source with `.test.ts` suffix (44 test files).

## CI Verification Order

PR checks against `master` run in this order (see `.github/workflows/pr-check.yml`):
`typecheck` → `test --run` → `docs build:offline` → `cargo check` → `cargo test`

## Directory Ownership

| Directory | Purpose |
|-----------|---------|
| `src/engine/` | Camera, Renderer, InputHandler, SpatialIndex, HitTester, ToolManager |
| `src/store/` | Zustand stores (DocumentStore, SessionStore, HistoryStore, PageStore, etc.) |
| `src/collaboration/` | Yjs CRDT sync, WebSocket protocol, OfflineQueue, SyncStateManager |
| `src/storage/` | BlobStorage, TeamDocumentCache, TrashStorage, BackupService |
| `src/shapes/` | ShapeRegistry, shape handlers, shape libraries (`library/` subfolder) |
| `src/math/` | Vec2, Mat3, Box, geometry — heavily tested |
| `src/services/` | DocumentCacheManager, DocumentTransferService |
| `src-tauri/src/server/` | Rust WebSocket server, JWT auth, blob storage, permissions |
| `docs-site/` | VitePress documentation site (separate package.json, own `bun install`) |

## Rust Backend

- Tauri v2 desktop shell. Rust edition 2021, MSRV 1.77.2.
- Backend serves WebSocket for "Protected Local" collaboration mode (Axum + Tokio).
- `cargo check`/`cargo test` must be run from `src-tauri/` or with `--manifest-path src-tauri/Cargo.toml`.
