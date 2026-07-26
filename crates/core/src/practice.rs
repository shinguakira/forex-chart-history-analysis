use serde::{Deserialize, Serialize};

use crate::timeframe::TimeFrame;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum PracticeMode {
    Replay,
    Quiz,
    Setup,
    #[serde(rename = "trade-review")]
    TradeReview,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum ReplayDirection {
    Long,
    Short,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum ReplayResult {
    Win,
    Loss,
    Manual,
    Breakeven,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum ExitReason {
    Tp,
    Sl,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ReplayDetail {
    pub direction: ReplayDirection,
    pub entry_price: f64,
    pub stop_loss: f64,
    pub take_profit: f64,
    pub exit_price: f64,
    pub exit_reason: ExitReason,
    #[specta(type = f64)]
    pub entry_time: i64,
    #[specta(type = f64)]
    pub exit_time: i64,
    pub pips: f64,
    pub result: ReplayResult,
    #[specta(type = f64)]
    pub hold_bars: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum QuizPrediction {
    Up,
    Down,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct QuizDetail {
    pub prediction: QuizPrediction,
    #[specta(type = f64)]
    pub bars_ahead: i64,
    pub actual_move: f64,
    pub correct: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "kebab-case")]
pub enum SetupJudgement {
    Long,
    Short,
    NoTrade,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SetupDetail {
    pub judgement: SetupJudgement,
    pub confidence: u8,
    pub reason: String,
    pub outcome_pips: f64,
    #[specta(type = f64)]
    pub outcome_bars: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "kebab-case")]
pub enum TradeReviewJudgement {
    Long,
    Short,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TradeReviewDetail {
    pub judgement: TradeReviewJudgement,
    /// Price movement from openPrice to closePrice in pips (positive = up).
    pub outcome_pips: f64,
    /// What you actually did on this trade (supplementary context).
    pub actual_direction: String,
    pub actual_pl: f64,
    pub trade_ref: String,
    pub correct: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PracticeTrade {
    pub id: String,
    pub mode: PracticeMode,
    pub pair_id: String,
    pub timeframe: TimeFrame,
    #[specta(type = f64)]
    pub cutoff_timestamp: i64,
    #[specta(type = f64)]
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replay: Option<ReplayDetail>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quiz: Option<QuizDetail>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub setup: Option<SetupDetail>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trade_review: Option<TradeReviewDetail>,
}
