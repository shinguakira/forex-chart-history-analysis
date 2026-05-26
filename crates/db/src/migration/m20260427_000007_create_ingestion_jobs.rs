use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum IngestionJobs {
    Table,
    Id,
    PairId,
    Timeframe,
    Kind,
    RangeStart,
    RangeEnd,
    ChunkSizeSeconds,
    LastCompletedChunkEnd,
    TotalChunks,
    CompletedChunks,
    Status,
    RetryCount,
    LastError,
    ScheduleIntervalSeconds,
    NextRunAt,
    AutoResume,
    CreatedAt,
    UpdatedAt,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(IngestionJobs::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(IngestionJobs::Id).text().not_null().primary_key())
                    .col(ColumnDef::new(IngestionJobs::PairId).text().not_null())
                    .col(ColumnDef::new(IngestionJobs::Timeframe).text().not_null())
                    .col(ColumnDef::new(IngestionJobs::Kind).text().not_null())
                    .col(ColumnDef::new(IngestionJobs::RangeStart).big_integer().not_null())
                    .col(ColumnDef::new(IngestionJobs::RangeEnd).big_integer().not_null())
                    .col(ColumnDef::new(IngestionJobs::ChunkSizeSeconds).big_integer().not_null())
                    .col(ColumnDef::new(IngestionJobs::LastCompletedChunkEnd).big_integer().null())
                    .col(ColumnDef::new(IngestionJobs::TotalChunks).integer().not_null())
                    .col(ColumnDef::new(IngestionJobs::CompletedChunks).integer().not_null().default(0))
                    .col(ColumnDef::new(IngestionJobs::Status).text().not_null())
                    .col(ColumnDef::new(IngestionJobs::RetryCount).integer().not_null().default(0))
                    .col(ColumnDef::new(IngestionJobs::LastError).text().null())
                    .col(ColumnDef::new(IngestionJobs::ScheduleIntervalSeconds).big_integer().null())
                    .col(ColumnDef::new(IngestionJobs::NextRunAt).big_integer().null())
                    .col(ColumnDef::new(IngestionJobs::AutoResume).boolean().not_null().default(true))
                    .col(ColumnDef::new(IngestionJobs::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(IngestionJobs::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_ingestion_jobs_status_next")
                    .table(IngestionJobs::Table)
                    .col(IngestionJobs::Status)
                    .col(IngestionJobs::NextRunAt)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(IngestionJobs::Table).to_owned())
            .await
    }
}
