use std::path::PathBuf;

use clap::Parser;
use forex_core::Note;
use forex_db::{connect, entities::notes, migrate};
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use tracing::{info, warn};

#[derive(Parser, Debug)]
#[command(about = "Imports legacy frontend/data/*.json into the database (idempotent).")]
struct Args {
    #[arg(long, env = "DATABASE_URL", default_value = "sqlite://./forex.db?mode=rwc")]
    db_url: String,
    #[arg(long, default_value = "frontend/data")]
    data_dir: PathBuf,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("forex_migrate=info")),
        )
        .init();

    let args = Args::parse();
    info!("connecting to {}", args.db_url);
    let db = connect(&args.db_url).await?;
    migrate(&db).await?;

    import_notes(&db, &args.data_dir).await?;

    info!("done");
    Ok(())
}

async fn import_notes(
    db: &sea_orm::DatabaseConnection,
    data_dir: &std::path::Path,
) -> anyhow::Result<()> {
    let path = data_dir.join("notes.json");
    if !path.exists() {
        warn!("notes.json not found at {:?}, skipping", path);
        return Ok(());
    }
    let bytes = std::fs::read(&path)?;
    let entries: Vec<Note> = serde_json::from_slice(&bytes)?;
    let mut imported = 0u32;
    let mut skipped = 0u32;
    for n in entries {
        let exists = notes::Entity::find_by_id(n.id.clone())
            .one(db)
            .await?
            .is_some();
        if exists {
            skipped += 1;
            continue;
        }
        notes::ActiveModel {
            id: Set(n.id),
            text: Set(n.text),
            created_at: Set(n.created_at),
        }
        .insert(db)
        .await?;
        imported += 1;
    }
    info!("notes: imported={imported} skipped={skipped}");
    Ok(())
}
