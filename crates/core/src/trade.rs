use serde::{Deserialize, Serialize};

use crate::direction::TradeDirection;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Trade {
    pub pair_id: String,
    pub direction: TradeDirection,
    pub open_price: f64,
    pub close_price: f64,
    pub size: f64,
    pub pl: f64,
    pub open_date: String,
    pub close_date: String,
    #[serde(rename = "ref")]
    pub trade_ref: String,
}
