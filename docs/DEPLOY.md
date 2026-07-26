# Deployment — Azure Container Apps

Single-container deployment. The Axum binary (`forex-server`) serves both
`/rspc` (API + WebSocket) and the bundled Vite frontend
(`STATIC_DIR=/app/dist`) — same origin, no CORS, no separate frontend
hosting.

```
       ┌──────────────────────────────────────┐
       │   ghcr.io/<owner>/                   │
       │   forex-chart-history-analysis       │  ← built in CI
       └──────────────┬───────────────────────┘
                      │ pulled on revision create / app restart
                      ▼
   ┌──────────────────────────────────────────┐
   │   Azure Container Apps                   │
   │   /rspc/*   → rspc procedures (HTTP+WS)  │
   │   /healthz  → liveness                   │
   │   anything else → React SPA (dist/)      │
   └──────────────────────────────────────────┘
                      │
                      ▼
              query1.finance.yahoo.com
```

The container expects:

| env var        | default                                       | notes                                                                 |
|----------------|-----------------------------------------------|-----------------------------------------------------------------------|
| `PORT`         | `8080` (set in Dockerfile)                    | bind address derived as `0.0.0.0:$PORT`                               |
| `STATIC_DIR`   | `/app/dist`                                   | path to the built Vite bundle; the server adds SPA fallback           |
| `DATABASE_URL` | `sqlite:///app/data/forex.db?mode=rwc`        | ephemeral inside Container Apps unless you mount an Azure Files volume |
| `RUST_LOG`     | `forex_server=info,forex_api=info,tower_http=info` | standard tracing filter                                          |

The image is built with the `sqlite` feature only; if you want to point
at a managed Postgres later, rebuild with `--features postgres` (or both)
and set `DATABASE_URL=postgres://…`.

## One-time setup

### 1. Confirm the image builds in CI

Push to `master` (or `develop`). The
[docker-publish workflow](../.github/workflows/docker-publish.yml) builds
the [Dockerfile](../Dockerfile) and publishes
`ghcr.io/<owner>/forex-chart-history-analysis:{latest,sha-<7chars>}` to
GitHub Container Registry.

Confirm in **GitHub → Packages**: the package appears under the repo.
By default GHCR makes new packages **private** — either:

- **Make it public** (Packages → package settings → Change visibility),
  so Container Apps can pull without credentials. Recommended for a PoC.
- **Keep it private** and wire a PAT — see step 3.

### 2. Create the Container App

Pick an **existing** resource group rather than creating a fresh one —
the user explicitly does not want orphaned RGs piling up. If you don't
have one already, ask first.

```powershell
$RG   = "<your-existing-rg>"
$ENV  = "<your-existing-container-apps-env>"   # required, see note below
$APP  = "forex-chart"
$IMG  = "ghcr.io/<owner>/forex-chart-history-analysis:latest"

az containerapp create `
  --name $APP `
  --resource-group $RG `
  --environment $ENV `
  --image $IMG `
  --target-port 8080 `
  --ingress external `
  --cpu 0.5 --memory 1.0Gi `
  --min-replicas 1 --max-replicas 1
```

> **Container Apps environment.** Every container app lives inside a
> Container Apps *environment* (a Log Analytics + virtual-network
> wrapper). If you don't already have one, create the cheapest possible
> Consumption-only env in the same resource group:
> ```powershell
> az containerapp env create `
>   --name $ENV --resource-group $RG --location japaneast
> ```
> This creates one (1) extra resource (the managed env) — necessary;
> no separate RG, no Log Analytics workspace unless you opt in.

### 3. (only if GHCR package is private) Wire credentials

Create a fine-scoped Personal Access Token (GitHub → Settings →
Developer settings → Personal access tokens (classic), scope:
`read:packages` only).

```powershell
az containerapp registry set `
  --name $APP --resource-group $RG `
  --server ghcr.io `
  --username <github-username> `
  --password <PAT>
```

### 4. Verify

The deploy URL is printed by `az containerapp create` (look for
`properties.configuration.ingress.fqdn`). Then:

```powershell
$URL = "https://$(az containerapp show -n $APP -g $RG --query properties.configuration.ingress.fqdn -o tsv)"
curl "$URL/healthz"      # → ok
curl -I "$URL/"          # → 200, text/html (the React SPA)
```

Open `$URL` in a browser. The chart UI should load and rspc calls
should resolve same-origin.

## Subsequent deploys

CI rebuilds `:latest` on every push to `master` / `develop`. Container
Apps does **not** auto-pull `:latest` — bump the image tag on the
revision to roll forward:

```powershell
# Option A — pin to the new short SHA (immutable, easy rollback):
az containerapp update `
  --name $APP --resource-group $RG `
  --image ghcr.io/<owner>/forex-chart-history-analysis:sha-<7chars>

# Option B — re-pull :latest by creating a new revision:
az containerapp update `
  --name $APP --resource-group $RG `
  --image ghcr.io/<owner>/forex-chart-history-analysis:latest `
  --revision-suffix "r$(Get-Date -Format yyyyMMddHHmm)"
```

## Caveats

- **Ephemeral storage.** Container Apps gives each replica a scratch
  filesystem. The default SQLite DB at `/app/data/forex.db` is wiped
  on every restart / revision. For persistence, either:
  - mount an **Azure Files** volume at `/app/data` (one extra resource:
    the storage account — confirm before adding it), or
  - flip to a managed Postgres and set `DATABASE_URL` accordingly.
- **WebSockets.** rspc subscriptions (`/rspc/ws`) work over Container
  Apps ingress with no extra config — TLS termination is handled
  upstream and the inner HTTP/1.1 Upgrade is passed through.
- **Yahoo Finance egress.** The ingestor calls
  `query1.finance.yahoo.com:443`. Container Apps allows outbound
  internet by default; no NSG rule needed.

## Troubleshooting

- **App shows the default Container Apps welcome page.** Image pull
  failed — check Log Stream for `manifest unknown` (wrong tag) or
  `denied` (private package + missing PAT).
- **Container starts but `/rspc` returns 404.** Either the image is
  stale or `STATIC_DIR` is unset and the SPA fallback ate the route.
  Confirm `STATIC_DIR=/app/dist` is on the revision.
- **`/healthz` returns ok but UI is blank.** The frontend was built
  with a non-empty `VITE_SERVER_URL` and is hitting a hardcoded host.
  Rebuild the image — the Dockerfile pins `VITE_SERVER_URL=""` so the
  bundle does same-origin fetches.
