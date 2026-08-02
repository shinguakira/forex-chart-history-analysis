use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use forex_core::{Trade, TradeDirection};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "trades")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_name = "ref")]
    pub trade_ref: String,
    pub pair_id: String,
    pub direction: String,
    pub open_price: f64,
    pub close_price: f64,
    pub size: f64,
    pub pl: f64,
    pub open_date: String,
    pub close_date: String,
    pub is_favorite: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    pub fn into_dto(self) -> Trade {
        Trade {
            pair_id: self.pair_id,
            direction: match self.direction.as_str() {
                "bull" => TradeDirection::Bull,
                _ => TradeDirection::Bear,
            },
            open_price: self.open_price,
            close_price: self.close_price,
            size: self.size,
            pl: self.pl,
            open_date: self.open_date,
            close_date: self.close_date,
            trade_ref: self.trade_ref,
            is_favorite: self.is_favorite != 0,
        }
    }
}
