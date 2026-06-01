use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use sea_orm_migration::MigratorTrait;
use std::time::Duration;

use crate::migration::Migrator;

pub async fn connect(url: &str) -> Result<DatabaseConnection, DbErr> {
    let mut opts = ConnectOptions::new(append_sqlite_pragmas(url));
    let is_sqlite = is_sqlite_url(url);
    opts.acquire_timeout(Duration::from_secs(10))
        .idle_timeout(Duration::from_secs(60))
        .sqlx_logging(false);
    if is_sqlite {
        // SQLite is single-writer. When the file lives on Azure Files (SMB),
        // multiple pooled writers cause `database is locked` immediately —
        // a single connection serializes writes inside the process and we
        // lean on PRAGMA busy_timeout to ride out any cross-process retries.
        opts.max_connections(1).min_connections(1);
    } else {
        opts.max_connections(8).min_connections(1);
    }
    Database::connect(opts).await
}

fn is_sqlite_url(url: &str) -> bool {
    url.starts_with("sqlite:")
}

/// Tack SMB-friendly PRAGMAs onto a SQLite URL so the DB works on an
/// Azure Files mount as well as a local disk. No-op for non-sqlite URLs.
///
/// - `journal_mode=DELETE` skips the WAL/.shm shared-memory file — SMB
///   doesn't implement the mmap semantics WAL relies on, so WAL connects
///   bail with `database is locked` on first write.
/// - `synchronous=NORMAL` halves the fsync count vs FULL (each fsync is a
///   billable SMB flush op), with negligible durability loss for our
///   personal-use workload.
/// - `busy_timeout=5000` makes sqlx retry locked tables for 5s instead of
///   failing immediately on contention.
fn append_sqlite_pragmas(url: &str) -> String {
    if !is_sqlite_url(url) {
        return url.to_string();
    }
    const PRAGMAS: &[(&str, &str)] = &[
        ("journal_mode", "DELETE"),
        ("synchronous", "NORMAL"),
        ("busy_timeout", "5000"),
    ];
    let mut out = url.to_string();
    for (k, v) in PRAGMAS {
        if !out.contains(&format!("{k}=")) {
            out.push(if out.contains('?') { '&' } else { '?' });
            out.push_str(&format!("{k}={v}"));
        }
    }
    out
}

pub async fn migrate(conn: &DatabaseConnection) -> Result<(), DbErr> {
    Migrator::up(conn, None).await
}
