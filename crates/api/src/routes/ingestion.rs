use forex_core::{IngestionJob, TimeFrame};
use forex_db::entities::ingestion_jobs;
use forex_ingestor::{JobRunner, create_backfill};
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
