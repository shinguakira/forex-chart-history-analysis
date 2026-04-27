use serde::{Deserialize, Serialize};

use crate::direction::{AiProviderKind, Direction, WinLoss};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum BacktestStatus {
    Win,
    Loss,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BacktestConfig {
    #[specta(type = f64)]
    pub start_timestamp: i64,
    #[specta(type = f64)]
    pub end_timestamp: i64,
    #[specta(type = f64)]
    pub interval_days: i64,
    pub pair_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(type = Option<f64>)]
    pub count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BacktestValidationResult {
    pub exit_price: f64,
    #[specta(type = f64)]
    pub exit_time: i64,
    pub pips_gained: f64,
    pub result: WinLoss,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BacktestPrediction {
    pub id: String,
    pub pair_id: String,
    pub direction: Direction,
    pub entry_price: f64,
    pub stop_loss: f64,
    pub take_profit: f64,
    pub timeframe: String,
    #[specta(type = f64)]
    pub cutoff_timestamp: i64,
    pub status: BacktestStatus,
    pub validation_result: Option<BacktestValidationResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BacktestRunStats {
    #[specta(type = f64)]
    pub total: i64,
    #[specta(type = f64)]
    pub wins: i64,
    #[specta(type = f64)]
    pub losses: i64,
    #[specta(type = f64)]
    pub expired: i64,
    pub win_rate: f64,
    pub total_pips: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BacktestRun {
    pub id: String,
    pub config: BacktestConfig,
    pub predictions: Vec<BacktestPrediction>,
    pub model: String,
    pub provider: AiProviderKind,
    #[specta(type = f64)]
    pub created_at: i64,
    pub stats: BacktestRunStats,
}
