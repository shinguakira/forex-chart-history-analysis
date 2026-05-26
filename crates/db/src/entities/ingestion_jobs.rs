use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use forex_core::{
    IngestionJob, IngestionJobKind, IngestionJobStatus, TimeFrame,
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ingestion_jobs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub pair_id: String,
    pub timeframe: String,
    pub kind: String,
    pub range_start: i64,
    pub range_end: i64,
    pub chunk_size_seconds: i64,
    pub last_completed_chunk_end: Option<i64>,
    pub total_chunks: i32,
    pub completed_chunks: i32,
    pub status: String,
    pub retry_count: i32,
    pub last_error: Option<String>,
    pub schedule_interval_seconds: Option<i64>,
    pub next_run_at: Option<i64>,
    pub auto_resume: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    pub fn into_dto(self) -> IngestionJob {
        IngestionJob {
            id: self.id,
            pair_id: self.pair_id,
            timeframe: self.timeframe.parse().unwrap_or(TimeFrame::D1),
            kind: parse_kind(&self.kind),
            range_start: self.range_start,
            range_end: self.range_end,
            chunk_size_seconds: self.chunk_size_seconds,
            last_completed_chunk_end: self.last_completed_chunk_end,
            total_chunks: self.total_chunks as i64,
            completed_chunks: self.completed_chunks as i64,
            status: parse_status(&self.status),
            retry_count: self.retry_count as i64,
            last_error: self.last_error,
            schedule_interval_seconds: self.schedule_interval_seconds,
            next_run_at: self.next_run_at,
            auto_resume: self.auto_resume,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

pub fn kind_to_str(k: IngestionJobKind) -> &'static str {
    match k {
        IngestionJobKind::Backfill => "backfill",
        IngestionJobKind::Catchup => "catchup",
    }
}

pub fn status_to_str(s: IngestionJobStatus) -> &'static str {
    match s {
        IngestionJobStatus::Pending => "pending",
        IngestionJobStatus::Running => "running",
        IngestionJobStatus::Paused => "paused",
        IngestionJobStatus::Failed => "failed",
        IngestionJobStatus::Completed => "completed",
    }
}

fn parse_kind(s: &str) -> IngestionJobKind {
    match s {
        "catchup" => IngestionJobKind::Catchup,
        _ => IngestionJobKind::Backfill,
    }
}

fn parse_status(s: &str) -> IngestionJobStatus {
    match s {
        "pending" => IngestionJobStatus::Pending,
        "running" => IngestionJobStatus::Running,
        "paused" => IngestionJobStatus::Paused,
        "failed" => IngestionJobStatus::Failed,
        "completed" => IngestionJobStatus::Completed,
        _ => IngestionJobStatus::Pending,
    }
}
