use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Trades {
    Table,
    #[sea_orm(iden = "ref")]
    Ref,
    PairId,
    Direction,
    OpenPrice,
    ClosePrice,
    Size,
    Pl,
    OpenDate,
    CloseDate,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Trades::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Trades::Ref).text().not_null().primary_key())
                    .col(ColumnDef::new(Trades::PairId).text().not_null())
                    .col(ColumnDef::new(Trades::Direction).text().not_null())
                    .col(ColumnDef::new(Trades::OpenPrice).double().not_null())
                    .col(ColumnDef::new(Trades::ClosePrice).double().not_null())
                    .col(ColumnDef::new(Trades::Size).double().not_null())
                    .col(ColumnDef::new(Trades::Pl).double().not_null())
                    .col(ColumnDef::new(Trades::OpenDate).text().not_null())
                    .col(ColumnDef::new(Trades::CloseDate).text().not_null())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_trades_pair_open_date")
                    .table(Trades::Table)
                    .col(Trades::PairId)
                    .col(Trades::OpenDate)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Trades::Table).to_owned())
            .await
    }
}
