use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260427_000003_create_backtest_runs"
    }
}

#[derive(DeriveIden)]
enum BacktestRuns {
    Table,
    Id,
    Model,
    Provider,
    CreatedAt,
    Data,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(BacktestRuns::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(BacktestRuns::Id).text().not_null().primary_key())
                    .col(ColumnDef::new(BacktestRuns::Model).text().not_null())
                    .col(ColumnDef::new(BacktestRuns::Provider).text().not_null())
                    .col(ColumnDef::new(BacktestRuns::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(BacktestRuns::Data).json_binary().not_null())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_backtest_runs_created_at")
                    .table(BacktestRuns::Table)
                    .col(BacktestRuns::CreatedAt)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(BacktestRuns::Table).to_owned())
            .await
    }
}
