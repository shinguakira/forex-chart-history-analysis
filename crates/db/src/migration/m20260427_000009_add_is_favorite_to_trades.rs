use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260427_000009_add_is_favorite_to_trades"
    }
}

#[derive(DeriveIden)]
enum Trades {
    Table,
    IsFavorite,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Trades::Table)
                    .add_column(
                        ColumnDef::new(Trades::IsFavorite)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // SQLite does not support DROP COLUMN before version 3.35.0; no-op down
        let _ = manager;
        Ok(())
    }
}
