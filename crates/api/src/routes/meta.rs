use forex_core::{AiProviderKind, CandleSource, now_ms};
use forex_db::entities::app_settings;
use rspc_legacy::RouterBuilder;
use sea_orm::{EntityTrait, Set, sea_query::OnConflict};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::Ctx;

#[derive(Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub ok: bool,
    pub version: String,
}

#[derive(Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppConfigDto {
    pub candle_source_default: CandleSource,
    pub ai_provider: AiProviderKind,
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SetConfigInput {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub candle_source_default: Option<CandleSource>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ai_provider: Option<AiProviderKind>,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("meta.health", |t| {
        t(|_ctx, _: ()| Health {
            ok: true,
            version: env!("CARGO_PKG_VERSION").to_string(),
        })
    })
    .query("meta.config", |t| {
        t(|ctx: Ctx, _: ()| async move {
            let cfg = ctx.config.read().await;
            Ok::<AppConfigDto, rspc_legacy::Error>(AppConfigDto {
                candle_source_default: cfg.candle_source_default,
                ai_provider: cfg.ai_provider,
            })
        })
    })
    .mutation("meta.setConfig", |t| {
        t(|ctx: Ctx, input: SetConfigInput| async move {
            if let Some(v) = input.candle_source_default {
                upsert_setting(&ctx, "candle_source_default", &v).await?;
                ctx.config.write().await.candle_source_default = v;
            }
            if let Some(v) = input.ai_provider {
                upsert_setting(&ctx, "ai_provider", &v).await?;
                ctx.config.write().await.ai_provider = v;
            }
            let cfg = ctx.config.read().await;
            Ok::<AppConfigDto, rspc_legacy::Error>(AppConfigDto {
                candle_source_default: cfg.candle_source_default,
                ai_provider: cfg.ai_provider,
            })
        })
    })
}

async fn upsert_setting<T: serde::Serialize>(
    ctx: &Ctx,
    key: &str,
    value: &T,
) -> Result<(), rspc_legacy::Error> {
    let v = serde_json::to_value(value).map_err(|e| internal(&e.to_string()))?;
    let am = app_settings::ActiveModel {
        key: Set(key.to_string()),
        value: Set(v),
        updated_at: Set(now_ms()),
    };
    app_settings::Entity::insert(am)
        .on_conflict(
            OnConflict::column(app_settings::Column::Key)
                .update_columns([app_settings::Column::Value, app_settings::Column::UpdatedAt])
                .to_owned(),
        )
        .exec(&*ctx.db)
        .await
        .map_err(|e| internal(&e.to_string()))?;
    Ok(())
}

fn internal(msg: &str) -> rspc_legacy::Error {
    rspc_legacy::Error::new(rspc_legacy::ErrorCode::InternalServerError, msg.to_string())
}
