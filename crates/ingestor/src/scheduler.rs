use std::sync::Arc;
use std::time::Duration;

use forex_core::{TimeFrame, now_ms, now_seconds, pair_by_id};
use forex_db::entities::{candles, ingestion_jobs};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
    sea_query::OnConflict,
};
use tokio::time::sleep;
use tracing::{info, warn};

use crate::YahooClient;
use crate::chunking::yahoo_window_seconds;

/// Recommended catch-up interval per timeframe (seconds).
pub fn default_catchup_interval(tf: TimeFrame) -> i64 {
    match tf {
        TimeFrame::M1 => 120,            // 2 min
        TimeFrame::M5 => 5 * 60,
        TimeFrame::M15 => 15 * 60,
        TimeFrame::H1 => 30 * 60,
        TimeFrame::H4 => 60 * 60,
        TimeFrame::D1 => 6 * 60 * 60,
        TimeFrame::W1 => 24 * 60 * 60,
    }
}

/// Re-fetch overlap (seconds) for the trailing window so the latest unconfirmed
/// bar is always overwritten with the freshest values.
pub fn overlap_seconds(tf: TimeFrame) -> i64 {
    match tf {
        TimeFrame::M1 => 5 * 60,
        TimeFrame::M5 => 15 * 60,
        TimeFrame::M15 => 30 * 60,
        TimeFrame::H1 => 2 * 60 * 60,
        TimeFrame::H4 => 4 * 60 * 60,
        TimeFrame::D1 => 2 * 86_400,
        TimeFrame::W1 => 7 * 86_400,
    }
}

/// Spawn the long-running scheduler task. Polls every 30 s for catchup jobs whose
/// `next_run_at <= now()` and runs one cycle each.
pub fn spawn_scheduler(db: Arc<DatabaseConnection>, yahoo: Arc<YahooClient>) {
    tokio::spawn(async move {
        info!(target: "forex_ingestor::scheduler", "scheduler started");
        loop {
            if let Err(e) = tick(&db, &yahoo).await {
                warn!(target: "forex_ingestor::scheduler", "tick failed: {e}");
            }
            sleep(Duration::from_secs(30)).await;
        }
    });
}

async fn tick(db: &DatabaseConnection, yahoo: &Arc<YahooClient>) -> anyhow::Result<()> {
    let now = now_seconds();
    let due = ingestion_jobs::Entity::find()
        .filter(ingestion_jobs::Column::Kind.eq("catchup"))
        .filter(ingestion_jobs::Column::AutoResume.eq(true))
        .filter(ingestion_jobs::Column::Status.is_in(["pending", "paused"]))
        .filter(
            ingestion_jobs::Column::NextRunAt
                .lte(now)
                .or(ingestion_jobs::Column::NextRunAt.is_null()),
        )
        .order_by_asc(ingestion_jobs::Column::NextRunAt)
        .all(db)
        .await?;

    for job in due {
        if let Err(e) = run_catchup_cycle(db, yahoo, &job).await {
            warn!(target: "forex_ingestor::scheduler", "catchup {} failed: {e}", job.id);
            mark_failed(db, &job.id, &e.to_string()).await.ok();
        }
    }
    Ok(())
}

async fn run_catchup_cycle(
    db: &DatabaseConnection,
    yahoo: &Arc<YahooClient>,
    job: &ingestion_jobs::Model,
) -> anyhow::Result<()> {
    let tf: TimeFrame = job.timeframe.parse()?;
    let pair = pair_by_id(&job.pair_id)
        .ok_or_else(|| anyhow::anyhow!("unknown pair {}", job.pair_id))?;

    // Mark running
    set_status(db, &job.id, "running", None).await?;

    let now_s = now_seconds();
    let window = yahoo_window_seconds(tf);
    let last_db_time =
        latest_db_candle_time(db, &job.pair_id, tf.as_str()).await?;
    let from = last_db_time
        .map(|t| t - overlap_seconds(tf))
        .unwrap_or_else(|| now_s - window)
        .max(now_s - window);
    let to = now_s;

    let res = yahoo
        .fetch_candles(pair.yahoo_symbol, tf, from, to)
        .await?;

    let txn = db.begin().await?;
    if !res.candles.is_empty() {
        let now_ms = now_ms();
        let pair_id = job.pair_id.clone();
        let tf_str = tf.as_str().to_string();
        let active_models = res.candles.iter().map(|c| candles::ActiveModel {
            pair_id: Set(pair_id.clone()),
            timeframe: Set(tf_str.clone()),
            time: Set(c.time),
            open: Set(c.open),
            high: Set(c.high),
            low: Set(c.low),
            close: Set(c.close),
            ingested_at: Set(now_ms),
        });
        candles::Entity::insert_many(active_models)
            .on_conflict(
                OnConflict::columns([
                    candles::Column::PairId,
                    candles::Column::Timeframe,
                    candles::Column::Time,
                ])
                .update_columns([
                    candles::Column::Open,
                    candles::Column::High,
                    candles::Column::Low,
                    candles::Column::Close,
                    candles::Column::IngestedAt,
                ])
                .to_owned(),
            )
            .exec(&txn)
            .await?;
    }
    let interval = job
        .schedule_interval_seconds
        .unwrap_or_else(|| default_catchup_interval(tf));
    let mut am: ingestion_jobs::ActiveModel = job.clone().into();
    am.last_completed_chunk_end = Set(Some(to));
    am.completed_chunks = Set(job.completed_chunks.saturating_add(1));
    am.retry_count = Set(0);
    am.last_error = Set(None);
    am.status = Set("paused".into());
    am.next_run_at = Set(Some(now_s + interval));
    am.updated_at = Set(now_ms());
    am.update(&txn).await?;
    txn.commit().await?;
    Ok(())
}

async fn latest_db_candle_time(
    db: &DatabaseConnection,
    pair_id: &str,
    tf: &str,
) -> anyhow::Result<Option<i64>> {
    let row = candles::Entity::find()
        .filter(candles::Column::PairId.eq(pair_id))
        .filter(candles::Column::Timeframe.eq(tf))
        .order_by_desc(candles::Column::Time)
        .one(db)
        .await?;
    Ok(row.map(|r| r.time))
}

async fn set_status(
    db: &DatabaseConnection,
    id: &str,
    status: &str,
    err: Option<String>,
) -> anyhow::Result<()> {
    let now = now_ms();
    let mut q = ingestion_jobs::Entity::update_many()
        .col_expr(ingestion_jobs::Column::Status, status.to_string().into())
        .col_expr(ingestion_jobs::Column::UpdatedAt, now.into());
    if let Some(e) = err {
        q = q.col_expr(ingestion_jobs::Column::LastError, e.into());
    }
    q.filter(ingestion_jobs::Column::Id.eq(id)).exec(db).await?;
    Ok(())
}

async fn mark_failed(db: &DatabaseConnection, id: &str, err: &str) -> anyhow::Result<()> {
    set_status(db, id, "paused", Some(err.to_string())).await
}

/// On startup, flip any `running` rows back to `paused` (the original runner is gone).
pub async fn recover_orphaned_jobs(db: &DatabaseConnection) -> anyhow::Result<()> {
    let now = now_ms();
    ingestion_jobs::Entity::update_many()
        .col_expr(ingestion_jobs::Column::Status, "paused".to_string().into())
        .col_expr(ingestion_jobs::Column::UpdatedAt, now.into())
        .filter(ingestion_jobs::Column::Status.eq("running"))
        .exec(db)
        .await?;
    Ok(())
}
