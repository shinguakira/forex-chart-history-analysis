use forex_core::PracticeTrade;
use forex_db::entities::practice_trades;
use rspc_legacy::RouterBuilder;
use sea_orm::{
    ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set, sea_query::OnConflict,
};
use serde::Deserialize;
use specta::Type;

use crate::Ctx;

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PracticeDeleteInput {
    pub id: String,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("practice.list", |t| {
        t(|ctx: Ctx, _: ()| async move {
            let rows = practice_trades::Entity::find()
                .order_by_desc(practice_trades::Column::CreatedAt)
                .all(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            rows.into_iter()
                .map(|m| m.into_dto().map_err(|e| internal(&e.to_string())))
                .collect::<Result<Vec<PracticeTrade>, _>>()
        })
    })
    .mutation("practice.upsert", |t| {
        t(|ctx: Ctx, input: PracticeTrade| async move {
            let data = serde_json::to_value(&input).map_err(|e| internal(&e.to_string()))?;
            let mode = match input.mode {
                forex_core::PracticeMode::Replay => "replay",
                forex_core::PracticeMode::Quiz => "quiz",
                forex_core::PracticeMode::Setup => "setup",
                forex_core::PracticeMode::TradeReview => "trade-review",
            };
            let am = practice_trades::ActiveModel {
                id: Set(input.id),
                mode: Set(mode.to_string()),
                pair_id: Set(input.pair_id),
                timeframe: Set(input.timeframe.as_str().to_string()),
                cutoff_timestamp: Set(input.cutoff_timestamp),
                created_at: Set(input.created_at),
                data: Set(data),
            };
            practice_trades::Entity::insert(am)
                .on_conflict(
                    OnConflict::column(practice_trades::Column::Id)
                        .update_columns([
                            practice_trades::Column::Mode,
                            practice_trades::Column::PairId,
                            practice_trades::Column::Timeframe,
                            practice_trades::Column::CutoffTimestamp,
                            practice_trades::Column::CreatedAt,
                            practice_trades::Column::Data,
                        ])
                        .to_owned(),
                )
                .exec(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            Ok::<(), rspc_legacy::Error>(())
        })
    })
    .mutation("practice.delete", |t| {
        t(|ctx: Ctx, input: PracticeDeleteInput| async move {
            practice_trades::Entity::delete_many()
                .filter(practice_trades::Column::Id.eq(input.id))
                .exec(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            Ok::<(), rspc_legacy::Error>(())
        })
    })
    .mutation("practice.clearAll", |t| {
        t(|ctx: Ctx, _: ()| async move {
            practice_trades::Entity::delete_many()
                .exec(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            Ok::<(), rspc_legacy::Error>(())
        })
    })
}

fn map_db_err(e: sea_orm::DbErr) -> rspc_legacy::Error {
    internal(&e.to_string())
}

fn internal(msg: &str) -> rspc_legacy::Error {
    rspc_legacy::Error::new(rspc_legacy::ErrorCode::InternalServerError, msg.to_string())
}
