# AGENTS.md

## Project

Forex chart history analysis app. Two deliverables share a single
React frontend:

- **Web**: Axum + Postgres backend (`crates/server`).
- **Tauri desktop**: same backend mounted via Tauri IPC, SQLite local
  store (`crates/tauri-app`).

## Stack

- **Frontend**: React 19 + TypeScript + Vite, TanStack Router /
  Query, Zustand, Tailwind v4, lightweight-charts, Biome
- **Backend**: Rust (Cargo workspace), rspc 0.4 (legacy procedure
  syntax) for the API layer, SeaORM with sqlite + postgres feature
  flags, Axum for HTTP + WebSocket, tauri-plugin-rspc for desktop
  IPC, reqwest for the Yahoo Finance fetcher
- **Type sharing**: Specta exports `frontend/src/generated/bindings.ts`
  from the rspc Router so the frontend is fully typed against the
  Rust DTOs.

## Layout

```
forex-chart-history-analysis/
├── Cargo.toml                 # workspace root
├── crates/
│   ├── core                   # DTOs / enums / TimeFrame / pair config
│   ├── db                     # SeaORM entities + migrations (sqlite|postgres)
│   ├── ai                     # AI provider trait (placeholder; AI still in frontend)
│   ├── ingestor               # YahooClient + JobRunner + chunking
│   ├── api                    # rspc Router + Ctx
│   ├── server                 # Axum binary + bindings exporter
│   ├── tauri-app              # Tauri v2 binary
│   └── migrate-from-json      # one-shot importer for legacy data/*.json
└── frontend/                  # the React app
    ├── src/
    │   ├── components/        # UI
    │   ├── config/            # static constants (pairs, indicators)
    │   ├── hooks/             # rspc-backed data hooks
    │   ├── lib/               # client-side utilities (rspc.ts, indicators, AI provider, etc.)
    │   ├── routes/            # TanStack Router file-based
    │   ├── store/             # Zustand stores
    │   ├── types/             # TypeScript types (mirror core crate's DTOs)
    │   └── generated/         # bindings.ts (auto, gitignored)
    ├── data/                  # legacy JSON fixtures consumed by migrate-from-json (gitignored)
    └── ...standard Vite files
```

## Conventions

- Biome handles all linting and formatting. No ESLint/Prettier.
- Run `pnpm --dir frontend lint:fix` to auto-fix.
- a11y rules are disabled in `frontend/biome.json` — personal-use app,
  no accessibility requirements.
- Do NOT use `biome-ignore` inline suppressions. If a rule is noisy,
  disable it in `frontend/biome.json` under `linter.rules`.
- Do NOT add aria attributes unless explicitly asked.
- Single quotes, no semicolons, 2-space indent, 100 char line width.
- Path alias `@/` maps to `frontend/src/`.
- Auto-generated files: `frontend/src/routeTree.gen.ts` and
  `frontend/src/generated/bindings.ts` — never edit by hand.

## Data flow

- **Persistence** (notes / predictions / backtests / practice trades /
  trades history / candles / ingestion jobs): all stored in the DB
  (Postgres on web, SQLite on Tauri) and accessed via rspc procedures
  from the frontend.
- **Yahoo Finance**: fetched server-side by the Rust ingestor;
  `candles.list` is the only chart endpoint and supports a per-request
  `source: 'yahoo' | 'db'` flag (defaults to `Ctx.config.candle_source_default`).
- **Backfill**: `ingestion.startBackfill` enqueues a job that
  chunks the requested range (sizes per timeframe in
  `crates/ingestor/src/chunking.rs`), upserts candles transactionally,
  and resumes from `last_completed_chunk_end` after restart.
- **AI providers** (Claude / Ollama): live in `crates/ai`. The frontend
  calls `ai.stream` (rspc subscription, WebSocket on web / Tauri channel
  on desktop). API keys are backend-only — set `ANTHROPIC_API_KEY`,
  `OLLAMA_URL`, `OLLAMA_MODEL`, and `AI_PROVIDER` in the backend's
  `.env`.

## Running

```bash
# Frontend dev server (Web mode):
pnpm --dir frontend install
pnpm --dir frontend dev

# Backend dev server:
DATABASE_URL=sqlite://./dev.db?mode=rwc \
  cargo run -p forex-server --bin forex-server \
  --features sqlite --no-default-features

# Re-export TS bindings after touching rspc procedures:
cargo run -p forex-server --bin export-bindings \
  --features sqlite --no-default-features

# Tauri desktop dev:
cargo tauri dev   # from crates/tauri-app

# Import legacy data/*.json into the DB (idempotent):
cargo run -p forex-migrate -- \
  --db-url "sqlite://./dev.db?mode=rwc" \
  --data-dir frontend/data
```
