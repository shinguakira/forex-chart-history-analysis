use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as Json;

use forex_core::{AiProviderKind, Direction, Prediction, PredictionStatus, ValidationResult};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "predictions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub pair_id: String,
    pub direction: String,
    pub entry_price: f64,
    pub stop_loss: f64,
    pub take_profit: f64,
    pub timeframe: String,
    pub model: String,
    pub provider: String,
    pub created_at: i64,
    pub status: String,
    pub validated_at: Option<i64>,
    #[sea_orm(column_type = "JsonBinary", nullable)]
    pub validation_result: Option<Json>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    pub fn into_dto(self) -> Result<Prediction, serde_json::Error> {
        Ok(Prediction {
            id: self.id,
            pair_id: self.pair_id,
            direction: parse_direction(&self.direction),
            entry_price: self.entry_price,
            stop_loss: self.stop_loss,
            take_profit: self.take_profit,
            timeframe: self.timeframe,
            model: self.model,
            provider: parse_provider(&self.provider),
            created_at: self.created_at,
            status: parse_status(&self.status),
            validated_at: self.validated_at,
            validation_result: self
                .validation_result
                .map(serde_json::from_value::<ValidationResult>)
                .transpose()?,
        })
    }
}

fn parse_direction(s: &str) -> Direction {
    match s {
        "short" => Direction::Short,
        _ => Direction::Long,
    }
}

fn parse_provider(s: &str) -> AiProviderKind {
    match s {
        "ollama" => AiProviderKind::Ollama,
        _ => AiProviderKind::Claude,
    }
}

fn parse_status(s: &str) -> PredictionStatus {
    match s {
        "win" => PredictionStatus::Win,
        "loss" => PredictionStatus::Loss,
        "expired" => PredictionStatus::Expired,
        _ => PredictionStatus::Pending,
    }
}

pub fn direction_to_str(d: Direction) -> &'static str {
    match d {
        Direction::Long => "long",
        Direction::Short => "short",
    }
}

pub fn provider_to_str(p: AiProviderKind) -> &'static str {
    match p {
        AiProviderKind::Claude => "claude",
        AiProviderKind::Ollama => "ollama",
    }
}

pub fn status_to_str(s: PredictionStatus) -> &'static str {
    match s {
        PredictionStatus::Pending => "pending",
        PredictionStatus::Win => "win",
        PredictionStatus::Loss => "loss",
        PredictionStatus::Expired => "expired",
    }
}
