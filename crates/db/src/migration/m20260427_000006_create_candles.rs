use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Candles {
    Table,
    PairId,
    Timeframe,
    Time,
    Open,
    High,
    Low,
    Close,
    IngestedAt,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Candles::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Candles::PairId).text().not_null())
                    .col(ColumnDef::new(Candles::Timeframe).text().not_null())
                    .col(ColumnDef::new(Candles::Time).big_integer().not_null())
                    .col(ColumnDef::new(Candles::Open).double().not_null())
                    .col(ColumnDef::new(Candles::High).double().not_null())
                    .col(ColumnDef::new(Candles::Low).double().not_null())
                    .col(ColumnDef::new(Candles::Close).double().not_null())
                    .col(ColumnDef::new(Candles::IngestedAt).big_integer().not_null())
                    .primary_key(
                        Index::create()
                            .col(Candles::PairId)
                            .col(Candles::Timeframe)
                            .col(Candles::Time),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Candles::Table).to_owned())
            .await
    }
}
