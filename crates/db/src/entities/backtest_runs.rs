use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as Json;

use forex_core::BacktestRun;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "backtest_runs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub model: String,
    pub provider: String,
    pub created_at: i64,
    #[sea_orm(column_type = "JsonBinary")]
    pub data: Json,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    pub fn into_dto(self) -> Result<BacktestRun, serde_json::Error> {
        serde_json::from_value(self.data)
    }
}
