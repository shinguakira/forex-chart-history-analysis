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

    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://forex:forex@localhost:5432/forex".to_string());
    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:4000".to_string());

    let db = Arc::new(connect(&db_url).await?);
    migrate(&db).await?;
    info!("connected to db: {}", db_url);

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
