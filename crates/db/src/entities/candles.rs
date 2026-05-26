use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "candles")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub pair_id: String,
    #[sea_orm(primary_key, auto_increment = false)]
    pub timeframe: String,
    #[sea_orm(primary_key, auto_increment = false)]
    pub time: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub ingested_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    pub fn into_dto(self) -> forex_core::Candle {
        forex_core::Candle {
            time: self.time,
            open: self.open,
            high: self.high,
            low: self.low,
            close: self.close,
        }
    }
}
