use forex_core::{Note, now_ms};
use forex_db::entities::notes;
use rspc_legacy::RouterBuilder;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};
use serde::Deserialize;
use specta::Type;

use crate::Ctx;

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpsertInput {
    pub id: Option<String>,
    pub text: String,
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteInput {
    pub id: String,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("notes.list", |t| {
        t(|ctx: Ctx, _: ()| async move {
            let rows = notes::Entity::find()
                .order_by_desc(notes::Column::CreatedAt)
                .all(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            Ok::<Vec<Note>, rspc_legacy::Error>(rows.into_iter().map(notes::Model::into_dto).collect())
        })
    })
    .mutation("notes.upsert", |t| {
        t(|ctx: Ctx, input: UpsertInput| async move {
            let id = input.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            let existing = notes::Entity::find_by_id(id.clone())
                .one(&*ctx.db)
                .await
                .map_err(map_db_err)?;

            let model = match existing {
                Some(_) => {
                    let am = notes::ActiveModel {
                        id: Set(id.clone()),
                        text: Set(input.text),
                        ..Default::default()
                    };
                    am.update(&*ctx.db).await.map_err(map_db_err)?
                }
                None => {
                    let am = notes::ActiveModel {
                        id: Set(id.clone()),
                        text: Set(input.text),
                        created_at: Set(now_ms()),
                    };
                    am.insert(&*ctx.db).await.map_err(map_db_err)?
                }
            };
            Ok::<Note, rspc_legacy::Error>(model.into_dto())
        })
    })
    .mutation("notes.delete", |t| {
        t(|ctx: Ctx, input: DeleteInput| async move {
            notes::Entity::delete_many()
                .filter(notes::Column::Id.eq(input.id))
                .exec(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            Ok::<(), rspc_legacy::Error>(())
        })
    })
}

fn map_db_err(e: sea_orm::DbErr) -> rspc_legacy::Error {
    rspc_legacy::Error::new(rspc_legacy::ErrorCode::InternalServerError, e.to_string())
}
