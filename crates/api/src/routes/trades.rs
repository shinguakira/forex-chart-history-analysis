use forex_core::Trade;
use forex_db::entities::trades;
use rspc_legacy::RouterBuilder;
use sea_orm::{ActiveModelTrait, EntityTrait, QueryOrder, Set};

use crate::Ctx;

#[derive(serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
struct SetFavoriteInput {
    trade_ref: String,
    is_favorite: bool,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    let r = r.query("trades.list", |t| {
        t(|ctx: Ctx, _: ()| async move {
            let rows = trades::Entity::find()
                .order_by_asc(trades::Column::OpenDate)
                .all(&*ctx.db)
                .await
                .map_err(|e| {
                    rspc_legacy::Error::new(
                        rspc_legacy::ErrorCode::InternalServerError,
                        e.to_string(),
                    )
                })?;
            Ok::<Vec<Trade>, rspc_legacy::Error>(
                rows.into_iter().map(trades::Model::into_dto).collect(),
            )
        })
    });

    let r = r.mutation("trades.setFavorite", |t| {
        t(|ctx: Ctx, input: SetFavoriteInput| async move {
            let row = trades::Entity::find_by_id(&input.trade_ref)
                .one(&*ctx.db)
                .await
                .map_err(|e| {
                    rspc_legacy::Error::new(
                        rspc_legacy::ErrorCode::InternalServerError,
                        e.to_string(),
                    )
                })?
                .ok_or_else(|| {
                    rspc_legacy::Error::new(
                        rspc_legacy::ErrorCode::NotFound,
                        format!("trade {} not found", input.trade_ref),
                    )
                })?;
            let mut active: trades::ActiveModel = row.into();
            active.is_favorite = Set(if input.is_favorite { 1 } else { 0 });
            active
                .update(&*ctx.db)
                .await
                .map_err(|e| {
                    rspc_legacy::Error::new(
                        rspc_legacy::ErrorCode::InternalServerError,
                        e.to_string(),
                    )
                })?;
            Ok::<(), rspc_legacy::Error>(())
        })
    });

    r
}
