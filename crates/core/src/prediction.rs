use serde::{Deserialize, Serialize};

use crate::direction::{AiProviderKind, Direction, WinLoss};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum PredictionStatus {
    Pending,
    Win,
    Loss,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub exit_price: f64,
    #[specta(type = f64)]
    pub exit_time: i64,
    pub pips_gained: f64,
    pub result: WinLoss,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Prediction {
    pub id: String,
    pub pair_id: String,
    pub direction: Direction,
    pub entry_price: f64,
    pub stop_loss: f64,
    pub take_profit: f64,
    pub timeframe: String,
    pub model: String,
    pub provider: AiProviderKind,
    #[specta(type = f64)]
    pub created_at: i64,
    pub status: PredictionStatus,
    #[specta(type = Option<f64>)]
    pub validated_at: Option<i64>,
    pub validation_result: Option<ValidationResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PredictionInput {
    pub pair_id: String,
    pub direction: Direction,
    pub entry_price: f64,
    pub stop_loss: f64,
    pub take_profit: f64,
    pub timeframe: String,
    pub model: String,
    pub provider: AiProviderKind,
}
