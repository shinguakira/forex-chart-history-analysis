use forex_core::BacktestRun;
use forex_db::entities::backtest_runs;
use rspc_legacy::RouterBuilder;
use sea_orm::{
    ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set, sea_query::OnConflict,
};
use serde::Deserialize;
use specta::Type;

use crate::Ctx;

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BacktestsDeleteInput {
    pub id: String,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("backtests.list", |t| {
        t(|ctx: Ctx, _: ()| async move {
            let rows = backtest_runs::Entity::find()
                .order_by_desc(backtest_runs::Column::CreatedAt)
                .all(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            rows.into_iter()
                .map(|m| m.into_dto().map_err(|e| internal(&e.to_string())))
                .collect::<Result<Vec<BacktestRun>, _>>()
        })
    })
    .mutation("backtests.upsert", |t| {
        t(|ctx: Ctx, input: BacktestRun| async move {
            let data = serde_json::to_value(&input).map_err(|e| internal(&e.to_string()))?;
            let provider_str = match input.provider {
                forex_core::AiProviderKind::Claude => "claude".to_string(),
                forex_core::AiProviderKind::Ollama => "ollama".to_string(),
            };
            let am = backtest_runs::ActiveModel {
                id: Set(input.id),
                model: Set(input.model),
                provider: Set(provider_str),
                created_at: Set(input.created_at),
                data: Set(data),
            };
            backtest_runs::Entity::insert(am)
                .on_conflict(
                    OnConflict::column(backtest_runs::Column::Id)
                        .update_columns([
                            backtest_runs::Column::Model,
                            backtest_runs::Column::Provider,
                            backtest_runs::Column::CreatedAt,
                            backtest_runs::Column::Data,
                        ])
                        .to_owned(),
                )
                .exec(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            Ok::<(), rspc_legacy::Error>(())
        })
    })
    .mutation("backtests.delete", |t| {
        t(|ctx: Ctx, input: BacktestsDeleteInput| async move {
            backtest_runs::Entity::delete_many()
                .filter(backtest_runs::Column::Id.eq(input.id))
                .exec(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            Ok::<(), rspc_legacy::Error>(())
        })
    })
    .mutation("backtests.clearAll", |t| {
        t(|ctx: Ctx, _: ()| async move {
            backtest_runs::Entity::delete_many()
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
