use sea_orm_migration::MigrationTrait;
pub use sea_orm_migration::MigratorTrait;

mod m20260427_000001_create_notes;
mod m20260427_000002_create_predictions;
mod m20260427_000003_create_backtest_runs;
mod m20260427_000004_create_practice_trades;
mod m20260427_000005_create_trades;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260427_000001_create_notes::Migration),
            Box::new(m20260427_000002_create_predictions::Migration),
            Box::new(m20260427_000003_create_backtest_runs::Migration),
            Box::new(m20260427_000004_create_practice_trades::Migration),
            Box::new(m20260427_000005_create_trades::Migration),
        ]
    }
}
