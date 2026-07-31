use forex_core::{TimeFrame, now_ms};
use forex_db::entities::{candles, trades};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, Set, sea_query::OnConflict};
use tracing::{info, warn};

use crate::Ctx;

const PLAYBOOK_TF: &str = "60";
const PERIOD_SECS: i64 = 90 * 24 * 3600;
const AFTER_SECS: i64 = 86_400;
const MIN_CANDLES: u64 = 50;

fn trade_window(open_ts: i64) -> (i64, i64) {
    (open_ts - PERIOD_SECS, open_ts + AFTER_SECS)
}

fn parse_ts(date_str: &str) -> Option<i64> {
    chrono::DateTime::parse_from_rfc3339(date_str)
        .map(|dt| dt.timestamp())
        .ok()
        .or_else(|| {
            chrono::NaiveDateTime::parse_from_str(date_str, "%Y-%m-%d %H:%M:%S")
                .map(|dt| dt.and_utc().timestamp())
                .ok()
        })
}

/// Fetch H1 candle data for all trades not yet in the DB and insert them.
/// Safe to call multiple times — skips windows that already have ≥50 candles.
pub async fn seed_candles(ctx: &Ctx) -> anyhow::Result<()> {
    let all_trades = trades::Entity::find().all(&*ctx.db).await?;
    let mut seen = std::collections::HashSet::<(String, i64)>::new();
    let mut total = 0usize;
    let mut inserted = 0usize;
    let mut skipped = 0usize;

    for trade in &all_trades {
        let open_ts = match parse_ts(&trade.open_date) {
            Some(ts) => ts,
            None => continue,
        };
        let (from, to) = trade_window(open_ts);
        let key = (trade.pair_id.clone(), from / 86_400);
        if !seen.insert(key) {
            continue;
        }
        total += 1;

        let count = candles::Entity::find()
            .filter(candles::Column::PairId.eq(&trade.pair_id))
            .filter(candles::Column::Timeframe.eq(PLAYBOOK_TF))
            .filter(candles::Column::Time.gte(from))
            .filter(candles::Column::Time.lte(to))
            .count(&*ctx.db)
            .await
            .unwrap_or(0);

        if count >= MIN_CANDLES {
            skipped += 1;
            continue;
        }

        let pair = match forex_core::pair_by_id(&trade.pair_id) {
            Some(p) => p,
            None => {
                warn!("playbook seed: unknown pair {}", trade.pair_id);
                continue;
            }
        };

        match ctx.yahoo.fetch_candles(pair.yahoo_symbol, TimeFrame::H1, from, to).await {
            Ok(res) if !res.candles.is_empty() => {
                let n = res.candles.len();
                let now = now_ms();
                let pid = trade.pair_id.clone();
                let models = res.candles.iter().map(|c| candles::ActiveModel {
                    pair_id: Set(pid.clone()),
                    timeframe: Set(PLAYBOOK_TF.to_string()),
                    time: Set(c.time),
                    open: Set(c.open),
                    high: Set(c.high),
                    low: Set(c.low),
                    close: Set(c.close),
                    ingested_at: Set(now),
                });
                candles::Entity::insert_many(models)
                    .on_conflict(
                        OnConflict::columns([
                            candles::Column::PairId,
                            candles::Column::Timeframe,
                            candles::Column::Time,
                        ])
                        .update_columns([
                            candles::Column::Open,
                            candles::Column::High,
                            candles::Column::Low,
                            candles::Column::Close,
                            candles::Column::IngestedAt,
                        ])
                        .to_owned(),
                    )
                    .exec(&*ctx.db)
                    .await?;
                inserted += n;
                info!("playbook seed: {} {} +{} candles", trade.pair_id, trade.open_date, n);
            }
            Ok(_) => {
                warn!("playbook seed: no candles returned for {} {}", trade.pair_id, trade.open_date);
            }
            Err(e) => {
                warn!("playbook seed: fetch failed {} {}: {e}", trade.pair_id, trade.open_date);
            }
        }
    }

    info!(
        "playbook seed done: {} windows total, {} already had data, {} candles inserted",
        total, skipped, inserted
    );
    Ok(())
}
