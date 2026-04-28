use forex_core::Trade;
use forex_db::entities::trades;
use rspc_legacy::RouterBuilder;
use sea_orm::{EntityTrait, QueryOrder};

use crate::Ctx;

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("trades.list", |t| {
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
    })
}
