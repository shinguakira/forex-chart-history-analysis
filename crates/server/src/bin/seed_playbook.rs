use std::sync::Arc;
use forex_api::{make_ctx, routes::playbook::seed_candles};
use forex_db::{connect, migrate};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("seed_playbook=info,forex_api=info")),
        )
        .init();

    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://./forex.db?mode=rwc".to_string());

    let db = Arc::new(connect(&db_url).await?);
    migrate(&db).await?;

    let ctx = make_ctx(db);
    seed_candles(&ctx).await?;

    Ok(())
}
