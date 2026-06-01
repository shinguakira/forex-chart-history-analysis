use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, DbErr,
    Statement,
};
use sea_orm_migration::MigratorTrait;
use std::time::Duration;

use crate::migration::Migrator;

pub async fn connect(url: &str) -> Result<DatabaseConnection, DbErr> {
    let is_sqlite = url.starts_with("sqlite:");
    let mut opts = ConnectOptions::new(url);
    opts.acquire_timeout(Duration::from_secs(10))
        .sqlx_logging(false);

    if is_sqlite {
        // SQLite is single-writer. When the DB file lives on Azure Files
        // (SMB), multiple pooled writers hit `database is locked` immediately,
        // so we serialize writes inside the process with a single connection
        // and keep it pinned for the lifetime of the server.
        opts.max_connections(1)
            .min_connections(1)
            .max_lifetime(Duration::from_secs(60 * 60 * 24 * 365))
            .idle_timeout(Duration::from_secs(60 * 60 * 24 * 365));
    } else {
        opts.max_connections(8)
            .min_connections(1)
            .idle_timeout(Duration::from_secs(60));
    }

    let db = Database::connect(opts).await?;

    if is_sqlite {
        // SMB-safe PRAGMAs:
        //   journal_mode=DELETE — WAL relies on mmap .shm, which SMB doesn't
        //       implement; the first writer otherwise dies with
        //       `database is locked`. DELETE journal works fine over SMB.
        //   synchronous=NORMAL — halves billable SMB flush ops vs FULL,
        //       with negligible durability loss for our workload.
        //   busy_timeout=5000 — retry locks for 5s on contention instead
        //       of failing the request.
        for stmt in [
            "PRAGMA journal_mode=DELETE",
            "PRAGMA synchronous=NORMAL",
            "PRAGMA busy_timeout=5000",
        ] {
            db.execute(Statement::from_string(DatabaseBackend::Sqlite, stmt))
                .await?;
        }
    }

    Ok(db)
}

pub async fn migrate(conn: &DatabaseConnection) -> Result<(), DbErr> {
    Migrator::up(conn, None).await
}
