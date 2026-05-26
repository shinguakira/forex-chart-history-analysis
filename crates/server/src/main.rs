use std::sync::Arc;

use axum::{routing::get, Router as AxumRouter};
use forex_api::{build_procedures, load_config_from_db, make_ctx};
use forex_db::{connect, migrate};
use tower_http::cors::CorsLayer;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("forex_server=info,forex_api=info")),
        )
        .init();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| default_db_url().to_string());
    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:4000".to_string());

    let db = Arc::new(connect(&db_url).await?);
    migrate(&db).await?;
    info!("connected to {} db: {}", backend_label(&db_url), db_url);

    let (procedures, _types) = build_procedures().map_err(|e| anyhow::anyhow!(e))?;
    let ctx = make_ctx(db.clone());
    load_config_from_db(&ctx).await?;
    forex_ingestor::recover_orphaned_jobs(&db).await?;
    forex_ingestor::spawn_scheduler(db.clone(), ctx.yahoo.clone());

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    let app = AxumRouter::new()
        .route("/healthz", get(|| async { "ok" }))
        .nest(
            "/rspc",
            rspc_axum::endpoint(procedures, move || ctx.clone()),
        )
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    info!("listening on http://{}", bind_addr);
    axum::serve(listener, app).await?;
    Ok(())
}

/// Default DATABASE_URL when none is set. Prefer postgres when compiled in
/// (server is postgres-first); fall back to a local sqlite file otherwise so
/// a `--no-default-features --features sqlite` build is still self-contained.
fn default_db_url() -> &'static str {
    #[cfg(feature = "postgres")]
    {
        "postgres://forex:forex@localhost:5432/forex"
    }
    #[cfg(all(feature = "sqlite", not(feature = "postgres")))]
    {
        "sqlite://./forex.db?mode=rwc"
    }
}

fn backend_label(url: &str) -> &'static str {
    if url.starts_with("postgres://") || url.starts_with("postgresql://") {
        "postgres"
    } else if url.starts_with("sqlite:") {
        "sqlite"
    } else {
        "unknown"
    }
}
