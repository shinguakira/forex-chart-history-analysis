use serde::{Deserialize, Serialize};

use crate::timeframe::TimeFrame;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum IngestionJobKind {
    Backfill,
    Catchup,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum IngestionJobStatus {
    Pending,
    Running,
    Paused,
    Failed,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IngestionJob {
    pub id: String,
    pub pair_id: String,
    pub timeframe: TimeFrame,
    pub kind: IngestionJobKind,
    #[specta(type = f64)]
    pub range_start: i64,
    #[specta(type = f64)]
    pub range_end: i64,
    #[specta(type = f64)]
    pub chunk_size_seconds: i64,
    #[specta(type = Option<f64>)]
    pub last_completed_chunk_end: Option<i64>,
    #[specta(type = f64)]
    pub total_chunks: i64,
    #[specta(type = f64)]
    pub completed_chunks: i64,
    pub status: IngestionJobStatus,
    #[specta(type = f64)]
    pub retry_count: i64,
    pub last_error: Option<String>,
    #[specta(type = Option<f64>)]
    pub schedule_interval_seconds: Option<i64>,
    #[specta(type = Option<f64>)]
    pub next_run_at: Option<i64>,
    pub auto_resume: bool,
    #[specta(type = f64)]
    pub created_at: i64,
    #[specta(type = f64)]
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct JobProgress {
    pub job_id: String,
    #[specta(type = f64)]
    pub completed_chunks: i64,
    #[specta(type = f64)]
    pub total_chunks: i64,
    #[specta(type = Option<f64>)]
    pub last_chunk_end: Option<i64>,
    pub status: IngestionJobStatus,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum DataGapReason {
    YahooWindowExceeded,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DataGap {
    pub id: String,
    pub pair_id: String,
    pub timeframe: TimeFrame,
    #[specta(type = f64)]
    pub gap_start: i64,
    #[specta(type = f64)]
    pub gap_end: i64,
    pub reason: DataGapReason,
}
