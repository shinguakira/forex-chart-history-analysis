use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260427_000002_create_predictions"
    }
}

#[derive(DeriveIden)]
enum Predictions {
    Table,
    Id,
    PairId,
    Direction,
    EntryPrice,
    StopLoss,
    TakeProfit,
    Timeframe,
    Model,
    Provider,
    CreatedAt,
    Status,
    ValidatedAt,
    ValidationResult,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Predictions::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Predictions::Id).text().not_null().primary_key())
                    .col(ColumnDef::new(Predictions::PairId).text().not_null())
                    .col(ColumnDef::new(Predictions::Direction).text().not_null())
                    .col(ColumnDef::new(Predictions::EntryPrice).double().not_null())
                    .col(ColumnDef::new(Predictions::StopLoss).double().not_null())
                    .col(ColumnDef::new(Predictions::TakeProfit).double().not_null())
                    .col(ColumnDef::new(Predictions::Timeframe).text().not_null())
                    .col(ColumnDef::new(Predictions::Model).text().not_null())
                    .col(ColumnDef::new(Predictions::Provider).text().not_null())
                    .col(ColumnDef::new(Predictions::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Predictions::Status).text().not_null())
                    .col(ColumnDef::new(Predictions::ValidatedAt).big_integer().null())
                    .col(ColumnDef::new(Predictions::ValidationResult).json_binary().null())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_predictions_status_created_at")
                    .table(Predictions::Table)
                    .col(Predictions::Status)
                    .col(Predictions::CreatedAt)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_predictions_model")
                    .table(Predictions::Table)
                    .col(Predictions::Model)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Predictions::Table).to_owned())
            .await
    }
}
