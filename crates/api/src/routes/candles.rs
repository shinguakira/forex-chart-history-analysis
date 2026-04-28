use forex_core::{CandleSource, CandlesResponse, TimeFrame};
use forex_db::entities::candles;
use rspc_legacy::RouterBuilder;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use serde::Deserialize;
use specta::Type;

use crate::Ctx;

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CandlesListInput {
    pub pair_id: String,
    pub timeframe: TimeFrame,
    #[specta(type = f64)]
    pub from: i64,
    #[specta(type = f64)]
    pub to: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<CandleSource>,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("candles.list", |t| {
        t(|ctx: Ctx, input: CandlesListInput| async move {
            let default_source = ctx.config.read().await.candle_source_default;
            let source = input.source.unwrap_or(default_source);
            match source {
                CandleSource::Yahoo => fetch_yahoo(&ctx, &input).await,
                CandleSource::Db => fetch_db(&ctx, &input).await,
            }
        })
    })
}

async fn fetch_yahoo(ctx: &Ctx, input: &CandlesListInput) -> Result<CandlesResponse, rspc_legacy::Error> {
    let pair = forex_core::pair_by_id(&input.pair_id)
        .ok_or_else(|| user_err(&format!("unknown pair {}", input.pair_id)))?;
    let res = ctx
        .yahoo
        .fetch_candles(pair.yahoo_symbol, input.timeframe, input.from, input.to)
        .await
        .map_err(|e| internal(&e.to_string()))?;
    Ok(CandlesResponse {
        candles: res.candles,
        regular_market_price: res.regular_market_price,
        previous_close: res.previous_close,
    })
}

async fn fetch_db(ctx: &Ctx, input: &CandlesListInput) -> Result<CandlesResponse, rspc_legacy::Error> {
    let rows = candles::Entity::find()
        .filter(candles::Column::PairId.eq(input.pair_id.clone()))
        .filter(candles::Column::Timeframe.eq(input.timeframe.as_str()))
        .filter(candles::Column::Time.gte(input.from))
        .filter(candles::Column::Time.lte(input.to))
        .order_by_asc(candles::Column::Time)
        .all(&*ctx.db)
        .await
        .map_err(|e| internal(&e.to_string()))?;
    let cs: Vec<forex_core::Candle> = rows.into_iter().map(candles::Model::into_dto).collect();
    let last_close = cs.last().map(|c| c.close).unwrap_or(0.0);
    let prev_close = cs
        .iter()
        .rev()
        .nth(1)
        .map(|c| c.close)
        .unwrap_or(last_close);
    Ok(CandlesResponse {
        candles: cs,
        regular_market_price: last_close,
        previous_close: prev_close,
    })
}

fn internal(msg: &str) -> rspc_legacy::Error {
    rspc_legacy::Error::new(rspc_legacy::ErrorCode::InternalServerError, msg.to_string())
}

fn user_err(msg: &str) -> rspc_legacy::Error {
    rspc_legacy::Error::new(rspc_legacy::ErrorCode::BadRequest, msg.to_string())
}
