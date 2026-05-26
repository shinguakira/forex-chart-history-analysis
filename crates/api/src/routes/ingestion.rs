use forex_core::{IngestionJob, TimeFrame, now_ms, now_seconds};
use forex_db::entities::ingestion_jobs;
use forex_ingestor::{JobRunner, create_backfill, default_catchup_interval};
use rspc_legacy::RouterBuilder;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde::Deserialize;
use specta::Type;

use crate::Ctx;

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StartBackfillInput {
    pub pair_id: String,
    pub timeframe: TimeFrame,
    #[specta(type = f64)]
    pub range_start: i64,
    #[specta(type = f64)]
    pub range_end: i64,
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JobIdInput {
    pub job_id: String,
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StartCatchupInput {
    pub pair_id: String,
    pub timeframe: TimeFrame,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[specta(type = Option<f64>)]
    pub interval_seconds: Option<i64>,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("ingestion.listJobs", |t| {
        t(|ctx: Ctx, _: ()| async move {
            let rows = ingestion_jobs::Entity::find()
                .order_by_desc(ingestion_jobs::Column::CreatedAt)
                .all(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            Ok::<Vec<IngestionJob>, rspc_legacy::Error>(
                rows.into_iter().map(ingestion_jobs::Model::into_dto).collect(),
            )
        })
    })
    .mutation("ingestion.startBackfill", |t| {
        t(|ctx: Ctx, input: StartBackfillInput| async move {
            let job = create_backfill(
                &ctx.db,
                &input.pair_id,
                input.timeframe,
                input.range_start,
                input.range_end,
            )
            .await
            .map_err(|e| internal(&e.to_string()))?;
            // Kick off runner in the background; the procedure returns immediately.
            let runner = JobRunner::new(ctx.db.clone(), ctx.yahoo.clone());
            let job_id = job.id.clone();
            tokio::spawn(async move {
                if let Err(e) = runner.run_to_completion(&job_id).await {
                    tracing::error!(target: "forex_api::ingestion", "job {job_id} failed: {e}");
                }
            });
            Ok::<IngestionJob, rspc_legacy::Error>(job.into_dto())
        })
    })
    .mutation("ingestion.resumeJob", |t| {
        t(|ctx: Ctx, input: JobIdInput| async move {
            let row = ingestion_jobs::Entity::find_by_id(input.job_id.clone())
                .one(&*ctx.db)
                .await
                .map_err(map_db_err)?
                .ok_or_else(|| user_err("job not found"))?;
            let mut am: ingestion_jobs::ActiveModel = row.into();
            am.status = Set("pending".into());
            am.last_error = Set(None);
            am.update(&*ctx.db).await.map_err(map_db_err)?;
            let runner = JobRunner::new(ctx.db.clone(), ctx.yahoo.clone());
            let job_id = input.job_id.clone();
            tokio::spawn(async move {
                if let Err(e) = runner.run_to_completion(&job_id).await {
                    tracing::error!(target: "forex_api::ingestion", "resume {job_id} failed: {e}");
                }
            });
            Ok::<(), rspc_legacy::Error>(())
        })
    })
    .mutation("ingestion.pauseJob", |t| {
        t(|ctx: Ctx, input: JobIdInput| async move {
            let row = ingestion_jobs::Entity::find_by_id(input.job_id.clone())
                .one(&*ctx.db)
                .await
                .map_err(map_db_err)?
                .ok_or_else(|| user_err("job not found"))?;
            let mut am: ingestion_jobs::ActiveModel = row.into();
            am.status = Set("paused".into());
            am.update(&*ctx.db).await.map_err(map_db_err)?;
            Ok::<(), rspc_legacy::Error>(())
        })
    })
    .mutation("ingestion.startCatchup", |t| {
        t(|ctx: Ctx, input: StartCatchupInput| async move {
            // Idempotent: if a catchup job already exists for the (pair, timeframe) pair, return it.
            let existing = ingestion_jobs::Entity::find()
                .filter(ingestion_jobs::Column::Kind.eq("catchup"))
                .filter(ingestion_jobs::Column::PairId.eq(input.pair_id.clone()))
                .filter(ingestion_jobs::Column::Timeframe.eq(input.timeframe.as_str()))
                .one(&*ctx.db)
                .await
                .map_err(map_db_err)?;
            if let Some(row) = existing {
                return Ok::<IngestionJob, rspc_legacy::Error>(row.into_dto());
            }
            let interval = input
                .interval_seconds
                .unwrap_or_else(|| default_catchup_interval(input.timeframe));
            let id = uuid::Uuid::new_v4().to_string();
            let now_ms_v = now_ms();
            let now_s = now_seconds();
            let am = ingestion_jobs::ActiveModel {
                id: Set(id),
                pair_id: Set(input.pair_id.clone()),
                timeframe: Set(input.timeframe.as_str().to_string()),
                kind: Set("catchup".into()),
                range_start: Set(now_s),
                range_end: Set(i64::MAX / 2),
                chunk_size_seconds: Set(interval),
                last_completed_chunk_end: Set(None),
                total_chunks: Set(0),
                completed_chunks: Set(0),
                status: Set("pending".into()),
                retry_count: Set(0),
                last_error: Set(None),
                schedule_interval_seconds: Set(Some(interval)),
                next_run_at: Set(Some(now_s)),
                auto_resume: Set(true),
                created_at: Set(now_ms_v),
                updated_at: Set(now_ms_v),
            };
            let model = am.insert(&*ctx.db).await.map_err(map_db_err)?;
            Ok(model.into_dto())
        })
    })
    .mutation("ingestion.deleteJob", |t| {
        t(|ctx: Ctx, input: JobIdInput| async move {
            ingestion_jobs::Entity::delete_many()
                .filter(ingestion_jobs::Column::Id.eq(input.job_id))
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

fn user_err(msg: &str) -> rspc_legacy::Error {
    rspc_legacy::Error::new(rspc_legacy::ErrorCode::BadRequest, msg.to_string())
}
