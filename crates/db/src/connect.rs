use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use sea_orm_migration::MigratorTrait;
use std::time::Duration;

use crate::migration::Migrator;

pub async fn connect(url: &str) -> Result<DatabaseConnection, DbErr> {
    let mut opts = ConnectOptions::new(url);
    opts.max_connections(8)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(10))
        .idle_timeout(Duration::from_secs(60))
        .sqlx_logging(false);
    Database::connect(opts).await
}

pub async fn migrate(conn: &DatabaseConnection) -> Result<(), DbErr> {
    Migrator::up(conn, None).await
}
