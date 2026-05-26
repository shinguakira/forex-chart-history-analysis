use forex_core::{Direction, Prediction, PredictionStatus, ValidationResult, now_ms};
use forex_db::entities::predictions;
use rspc_legacy::RouterBuilder;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::Ctx;

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateInput {
    pub items: Vec<Prediction>,
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateValidationInput {
    pub id: String,
    pub status: PredictionStatus,
    #[specta(type = f64)]
    pub validated_at: i64,
    pub validation_result: Option<ValidationResult>,
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PredictionsDeleteInput {
    pub id: String,
}

#[derive(Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ModelStat {
    pub model: String,
    pub wins: u32,
    pub losses: u32,
    pub pending: u32,
    pub total: u32,
    pub win_rate: i32,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("predictions.list", |t| {
        t(|ctx: Ctx, _: ()| async move {
            let rows = predictions::Entity::find()
                .order_by_desc(predictions::Column::CreatedAt)
                .all(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            rows.into_iter()
                .map(|m| m.into_dto().map_err(|e| internal(&e.to_string())))
                .collect::<Result<Vec<Prediction>, _>>()
        })
    })
    .query("predictions.modelStats", |t| {
        t(|ctx: Ctx, _: ()| async move {
            let rows = predictions::Entity::find()
                .all(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            let mut by_model: std::collections::HashMap<String, (u32, u32, u32)> = Default::default();
            for r in rows {
                let entry = by_model.entry(r.model).or_insert((0, 0, 0));
                match r.status.as_str() {
                    "win" => entry.0 += 1,
                    "loss" => entry.1 += 1,
                    "pending" => entry.2 += 1,
                    _ => {}
                }
            }
            Ok::<Vec<ModelStat>, rspc_legacy::Error>(
                by_model
                    .into_iter()
                    .map(|(model, (w, l, p))| {
                        let decided = w + l;
                        let total = w + l + p;
                        let win_rate = if decided > 0 { ((w as f64 / decided as f64) * 100.0).round() as i32 } else { 0 };
                        ModelStat { model, wins: w, losses: l, pending: p, total, win_rate }
                    })
                    .collect(),
            )
        })
    })
    .mutation("predictions.create", |t| {
        t(|ctx: Ctx, input: CreateInput| async move {
            for p in &input.items {
                let am = predictions::ActiveModel {
                    id: Set(p.id.clone()),
                    pair_id: Set(p.pair_id.clone()),
                    direction: Set(predictions::direction_to_str(p.direction).to_string()),
                    entry_price: Set(p.entry_price),
                    stop_loss: Set(p.stop_loss),
                    take_profit: Set(p.take_profit),
                    timeframe: Set(p.timeframe.clone()),
                    model: Set(p.model.clone()),
                    provider: Set(predictions::provider_to_str(p.provider).to_string()),
                    created_at: Set(p.created_at),
                    status: Set(predictions::status_to_str(p.status).to_string()),
                    validated_at: Set(p.validated_at),
                    validation_result: Set(p
                        .validation_result
                        .as_ref()
                        .map(serde_json::to_value)
                        .transpose()
                        .map_err(|e| internal(&e.to_string()))?),
                };
                am.insert(&*ctx.db).await.map_err(map_db_err)?;
            }
            Ok::<(), rspc_legacy::Error>(())
        })
    })
    .mutation("predictions.updateValidation", |t| {
        t(|ctx: Ctx, input: UpdateValidationInput| async move {
            let _ = (Direction::Long, now_ms()); // silence unused imports if pruned
            let am = predictions::ActiveModel {
                id: Set(input.id),
                status: Set(predictions::status_to_str(input.status).to_string()),
                validated_at: Set(Some(input.validated_at)),
                validation_result: Set(input
                    .validation_result
                    .as_ref()
                    .map(serde_json::to_value)
                    .transpose()
                    .map_err(|e| internal(&e.to_string()))?),
                ..Default::default()
            };
            am.update(&*ctx.db).await.map_err(map_db_err)?;
            Ok::<(), rspc_legacy::Error>(())
        })
    })
    .mutation("predictions.delete", |t| {
        t(|ctx: Ctx, input: PredictionsDeleteInput| async move {
            predictions::Entity::delete_many()
                .filter(predictions::Column::Id.eq(input.id))
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
