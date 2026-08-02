use std::path::PathBuf;

use clap::Parser;
use forex_core::{BacktestRun, Note, PracticeMode, PracticeTrade, Prediction, Trade, TradeDirection};
use forex_db::{
    connect,
    entities::{backtest_runs, notes, practice_trades, predictions, trades},
    migrate,
};
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
    import_predictions(&db, &args.data_dir).await?;
    import_backtests(&db, &args.data_dir).await?;
    import_practice(&db, &args.data_dir).await?;
    import_trades(&db, &args.data_dir).await?;

    info!("done");
    Ok(())
}

async fn import_trades(
    db: &sea_orm::DatabaseConnection,
    data_dir: &std::path::Path,
) -> anyhow::Result<()> {
    let path = data_dir.join("trades.json");
    if !path.exists() {
        warn!("trades.json not found, skipping");
        return Ok(());
    }
    let entries: Vec<Trade> = serde_json::from_slice(&std::fs::read(&path)?)?;
    let mut imported = 0u32;
    let mut skipped = 0u32;
    for t in entries {
        if trades::Entity::find_by_id(t.trade_ref.clone()).one(db).await?.is_some() {
            skipped += 1;
            continue;
        }
        let am = trades::ActiveModel {
            trade_ref: Set(t.trade_ref),
            pair_id: Set(t.pair_id),
            direction: Set(match t.direction {
                TradeDirection::Bull => "bull".to_string(),
                TradeDirection::Bear => "bear".to_string(),
            }),
            open_price: Set(t.open_price),
            close_price: Set(t.close_price),
            size: Set(t.size),
            pl: Set(t.pl),
            open_date: Set(t.open_date),
            close_date: Set(t.close_date),
            is_favorite: Set(0),
        };
        am.insert(db).await?;
        imported += 1;
    }
    info!("trades: imported={imported} skipped={skipped}");
    Ok(())
}

async fn import_predictions(
    db: &sea_orm::DatabaseConnection,
    data_dir: &std::path::Path,
) -> anyhow::Result<()> {
    let path = data_dir.join("predictions.json");
    if !path.exists() {
        warn!("predictions.json not found, skipping");
        return Ok(());
    }
    let entries: Vec<Prediction> = serde_json::from_slice(&std::fs::read(&path)?)?;
    let mut imported = 0u32;
    let mut skipped = 0u32;
    for p in entries {
        if predictions::Entity::find_by_id(p.id.clone()).one(db).await?.is_some() {
            skipped += 1;
            continue;
        }
        let am = predictions::ActiveModel {
            id: Set(p.id),
            pair_id: Set(p.pair_id),
            direction: Set(predictions::direction_to_str(p.direction).to_string()),
            entry_price: Set(p.entry_price),
            stop_loss: Set(p.stop_loss),
            take_profit: Set(p.take_profit),
            timeframe: Set(p.timeframe),
            model: Set(p.model),
            provider: Set(predictions::provider_to_str(p.provider).to_string()),
            created_at: Set(p.created_at),
            status: Set(predictions::status_to_str(p.status).to_string()),
            validated_at: Set(p.validated_at),
            validation_result: Set(p.validation_result.as_ref().map(serde_json::to_value).transpose()?),
        };
        am.insert(db).await?;
        imported += 1;
    }
    info!("predictions: imported={imported} skipped={skipped}");
    Ok(())
}

async fn import_backtests(
    db: &sea_orm::DatabaseConnection,
    data_dir: &std::path::Path,
) -> anyhow::Result<()> {
    let path = data_dir.join("backtests.json");
    if !path.exists() {
        warn!("backtests.json not found, skipping");
        return Ok(());
    }
    let entries: Vec<BacktestRun> = serde_json::from_slice(&std::fs::read(&path)?)?;
    let mut imported = 0u32;
    let mut skipped = 0u32;
    for b in entries {
        if backtest_runs::Entity::find_by_id(b.id.clone()).one(db).await?.is_some() {
            skipped += 1;
            continue;
        }
        let provider_str = match b.provider {
            forex_core::AiProviderKind::Claude => "claude".to_string(),
            forex_core::AiProviderKind::Ollama => "ollama".to_string(),
        };
        let data = serde_json::to_value(&b)?;
        let am = backtest_runs::ActiveModel {
            id: Set(b.id),
            model: Set(b.model),
            provider: Set(provider_str),
            created_at: Set(b.created_at),
            data: Set(data),
        };
        am.insert(db).await?;
        imported += 1;
    }
    info!("backtests: imported={imported} skipped={skipped}");
    Ok(())
}

async fn import_practice(
    db: &sea_orm::DatabaseConnection,
    data_dir: &std::path::Path,
) -> anyhow::Result<()> {
    let path = data_dir.join("practice-sessions.json");
    if !path.exists() {
        warn!("practice-sessions.json not found, skipping");
        return Ok(());
    }
    let entries: Vec<PracticeTrade> = serde_json::from_slice(&std::fs::read(&path)?)?;
    let mut imported = 0u32;
    let mut skipped = 0u32;
    for p in entries {
        if practice_trades::Entity::find_by_id(p.id.clone()).one(db).await?.is_some() {
            skipped += 1;
            continue;
        }
        let mode_str = match p.mode {
            PracticeMode::Replay => "replay",
            PracticeMode::Quiz => "quiz",
            PracticeMode::Setup => "setup",
            PracticeMode::TradeReview => "trade-review",
        };
        let data = serde_json::to_value(&p)?;
        let am = practice_trades::ActiveModel {
            id: Set(p.id),
            mode: Set(mode_str.to_string()),
            pair_id: Set(p.pair_id),
            timeframe: Set(p.timeframe.as_str().to_string()),
            cutoff_timestamp: Set(p.cutoff_timestamp),
            created_at: Set(p.created_at),
            data: Set(data),
        };
        am.insert(db).await?;
        imported += 1;
    }
    info!("practice: imported={imported} skipped={skipped}");
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
