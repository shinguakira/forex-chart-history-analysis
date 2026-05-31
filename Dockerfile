# syntax=docker/dockerfile:1.6
#
# Single-container production image for the forex-chart-history-analysis app.
#
#   stage 1 (frontend) — vite build → frontend/dist/
#   stage 2 (backend)  — cargo build --release -p forex-server (sqlite feature)
#   stage 3 (runtime)  — debian-slim with the binary + frontend dist
#
# At runtime the Axum binary serves `/rspc` (API + WS) plus the bundled
# Vite frontend via tower-http ServeDir, with index.html as the SPA
# fallback. Same origin, no CORS. The container listens on $PORT.

# ───────────────────── stage 1: frontend ─────────────────────
FROM node:20-bookworm-slim AS frontend
WORKDIR /app/frontend

# The host package-lock.json was generated on Windows and records
# win32-only optional binaries for rollup / tailwind oxide / biome.
# `npm ci` against that lockfile in a Linux image refuses to fetch
# the linux-x64-gnu variants and rollup crashes at vite-build time
# (npm/cli#4828). Resolving fresh with `npm install` avoids it.
COPY frontend/package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund

# The rspc client picks its base URL from VITE_SERVER_URL. Empty string
# forces same-origin relative fetches ("/rspc" instead of
# "http://localhost:4000/rspc") so the bundled SPA talks to the
# co-located Axum backend.
COPY frontend/ ./
ENV VITE_SERVER_URL=""
RUN npm run build

# ───────────────────── stage 2: backend ──────────────────────
FROM rust:1.85-slim-bookworm AS backend
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Workspace manifests first — lets the registry/git fetch layer cache
# even when only Rust sources change. We need every member's manifest
# so cargo can resolve the workspace.
COPY Cargo.toml Cargo.lock ./
COPY crates/core/Cargo.toml         crates/core/Cargo.toml
COPY crates/db/Cargo.toml           crates/db/Cargo.toml
COPY crates/ai/Cargo.toml           crates/ai/Cargo.toml
COPY crates/ingestor/Cargo.toml     crates/ingestor/Cargo.toml
COPY crates/api/Cargo.toml          crates/api/Cargo.toml
COPY crates/server/Cargo.toml       crates/server/Cargo.toml
COPY crates/tauri-app/Cargo.toml    crates/tauri-app/Cargo.toml
COPY crates/migrate-from-json/Cargo.toml crates/migrate-from-json/Cargo.toml

COPY crates/ crates/

# sqlite-only build: container persistence is ephemeral by default
# (Container Apps disks are scratch unless an Azure Files volume is
# mounted). Skips pulling postgres drivers entirely. The `-p forex-server`
# scope means tauri-app is NOT compiled (its deps are still resolved,
# but no system libs like webkit2gtk are needed).
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p forex-server --no-default-features --features sqlite \
    && cp /app/target/release/forex-server /app/forex-server

# ───────────────────── stage 3: runtime ──────────────────────
FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --shell /usr/sbin/nologin app \
    && mkdir -p /app/data \
    && chown -R app:app /app

WORKDIR /app
COPY --from=backend  /app/forex-server ./forex-server
COPY --from=frontend /app/frontend/dist ./dist

# /app/data/forex.db is ephemeral inside Container Apps unless you mount
# an Azure Files volume. Override DATABASE_URL to point at an external
# Postgres if you want persistence — the binary handles either scheme.
ENV STATIC_DIR=/app/dist \
    DATABASE_URL="sqlite:///app/data/forex.db?mode=rwc" \
    RUST_LOG="forex_server=info,forex_api=info,tower_http=info" \
    PORT=8080

USER app
EXPOSE 8080
CMD ["./forex-server"]
