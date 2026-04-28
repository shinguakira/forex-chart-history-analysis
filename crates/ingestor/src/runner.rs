use std::sync::Arc;

use forex_core::{TimeFrame, now_ms, pair_by_id};
use forex_db::entities::{candles, ingestion_jobs};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set,
    TransactionTrait,
    sea_query::OnConflict,
};
use tracing::{info, warn};

use crate::YahooClient;
use crate::chunking::backfill_chunk_seconds;

#[derive(Clone)]
pub struct JobRunner {
    pub db: Arc<DatabaseConnection>,
    pub yahoo: Arc<YahooClient>,
}

impl JobRunner {
    pub fn new(db: Arc<DatabaseConnection>, yahoo: Arc<YahooClient>) -> Self {
        Self { db, yahoo }
    }

    /// Drive a single job to completion (or until paused/failed).
    pub async fn run_to_completion(&self, job_id: &str) -> anyhow::Result<()> {
        loop {
            let job = ingestion_jobs::Entity::find_by_id(job_id.to_string())
                .one(&*self.db)
                .await?
                .ok_or_else(|| anyhow::anyhow!("job not found: {job_id}"))?;
            match job.status.as_str() {
                "completed" | "paused" | "failed" => return Ok(()),
                _ => {}
            }
            let advanced = self.run_one_chunk(&job).await?;
            if !advanced {
                return Ok(());
            }
        }
    }

    /// Process one chunk; returns Ok(true) if there is more work, Ok(false) if done.
    pub async fn run_one_chunk(&self, job: &ingestion_jobs::Model) -> anyhow::Result<bool> {
        let tf: TimeFrame = job.timeframe.parse()?;
        let cursor = job.last_completed_chunk_end.unwrap_or(job.range_start);
        if cursor >= job.range_end {
            self.mark_completed(&job.id).await?;
            return Ok(false);
        }
        let pair = pair_by_id(&job.pair_id)
            .ok_or_else(|| anyhow::anyhow!("unknown pair {}", job.pair_id))?;
        let chunk_end = (cursor + job.chunk_size_seconds).min(job.range_end);

        // Mark running
        self.set_status(&job.id, "running", None).await?;

        match self
            .yahoo
            .fetch_candles(pair.yahoo_symbol, tf, cursor, chunk_end)
            .await
        {
            Ok(res) => {
                let txn = self.db.begin().await?;
                if !res.candles.is_empty() {
                    let now = now_ms();
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
                        ingested_at: Set(now),
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
                let mut am: ingestion_jobs::ActiveModel = job.clone().into();
                am.last_completed_chunk_end = Set(Some(chunk_end));
                am.completed_chunks = Set(job.completed_chunks + 1);
                am.retry_count = Set(0);
                am.last_error = Set(None);
                am.updated_at = Set(now_ms());
                if chunk_end >= job.range_end {
                    am.status = Set("completed".into());
                }
                am.update(&txn).await?;
                txn.commit().await?;
                info!(
                    target: "forex_ingestor::runner",
                    "chunk done {}/{} for {}/{}",
                    job.completed_chunks + 1,
                    job.total_chunks,
                    job.pair_id,
                    tf.as_str()
                );
                Ok(chunk_end < job.range_end)
            }
            Err(e) => {
                let new_retry = job.retry_count + 1;
                let max_retries = 3;
                let mut am: ingestion_jobs::ActiveModel = job.clone().into();
                am.retry_count = Set(new_retry);
                am.last_error = Set(Some(e.to_string()));
                am.updated_at = Set(now_ms());
                if new_retry >= max_retries {
                    am.status = Set("failed".into());
                    warn!(target: "forex_ingestor::runner", "job {} failed after {new_retry} retries: {e}", job.id);
                } else {
                    am.status = Set("paused".into());
                }
                am.update(&*self.db).await?;
                Ok(false)
            }
        }
    }

    async fn mark_completed(&self, job_id: &str) -> anyhow::Result<()> {
        ingestion_jobs::Entity::update_many()
            .col_expr(ingestion_jobs::Column::Status, "completed".into())
            .col_expr(ingestion_jobs::Column::UpdatedAt, now_ms().into())
            .filter(ingestion_jobs::Column::Id.eq(job_id))
            .exec(&*self.db)
            .await?;
        Ok(())
    }

    async fn set_status(&self, job_id: &str, status: &str, err: Option<String>) -> anyhow::Result<()> {
        let now = now_ms();
        let mut q = ingestion_jobs::Entity::update_many()
            .col_expr(ingestion_jobs::Column::Status, status.to_string().into())
            .col_expr(ingestion_jobs::Column::UpdatedAt, now.into());
        if let Some(e) = err {
            q = q.col_expr(ingestion_jobs::Column::LastError, e.into());
        }
        q.filter(ingestion_jobs::Column::Id.eq(job_id))
            .exec(&*self.db)
            .await?;
        Ok(())
    }
}

/// Build a new backfill job, returning the inserted Model.
pub async fn create_backfill(
    db: &DatabaseConnection,
    pair_id: &str,
    tf: TimeFrame,
    range_start: i64,
    range_end: i64,
) -> anyhow::Result<ingestion_jobs::Model> {
    let chunk = backfill_chunk_seconds(tf);
    let total = crate::chunking::total_chunks(range_start, range_end, chunk) as i32;
    let id = uuid::Uuid::new_v4().to_string();
    let now_ms = now_ms();
    let am = ingestion_jobs::ActiveModel {
        id: Set(id.clone()),
        pair_id: Set(pair_id.to_string()),
        timeframe: Set(tf.as_str().to_string()),
        kind: Set("backfill".into()),
        range_start: Set(range_start),
        range_end: Set(range_end),
        chunk_size_seconds: Set(chunk),
        last_completed_chunk_end: Set(None),
        total_chunks: Set(total),
        completed_chunks: Set(0),
        status: Set("pending".to_string()),
        retry_count: Set(0),
        last_error: Set(None),
        schedule_interval_seconds: Set(None),
        next_run_at: Set(None),
        auto_resume: Set(true),
        created_at: Set(now_ms),
        updated_at: Set(now_ms),
    };
    am.insert(db).await.map_err(Into::into)
}
