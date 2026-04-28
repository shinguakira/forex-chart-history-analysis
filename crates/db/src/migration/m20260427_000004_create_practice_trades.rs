use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum PracticeTrades {
    Table,
    Id,
    Mode,
    PairId,
    Timeframe,
    CutoffTimestamp,
    CreatedAt,
    Data,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PracticeTrades::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(PracticeTrades::Id).text().not_null().primary_key())
                    .col(ColumnDef::new(PracticeTrades::Mode).text().not_null())
                    .col(ColumnDef::new(PracticeTrades::PairId).text().not_null())
                    .col(ColumnDef::new(PracticeTrades::Timeframe).text().not_null())
                    .col(ColumnDef::new(PracticeTrades::CutoffTimestamp).big_integer().not_null())
                    .col(ColumnDef::new(PracticeTrades::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(PracticeTrades::Data).json_binary().not_null())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_practice_mode_created_at")
                    .table(PracticeTrades::Table)
                    .col(PracticeTrades::Mode)
                    .col(PracticeTrades::CreatedAt)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PracticeTrades::Table).to_owned())
            .await
    }
}
