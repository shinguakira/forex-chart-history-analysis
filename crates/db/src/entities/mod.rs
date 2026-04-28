pub mod backtest_runs;
pub mod candles;
pub mod ingestion_jobs;
pub mod notes;
pub mod practice_trades;
pub mod predictions;
pub mod trades;

pub mod prelude {
    pub use super::backtest_runs::Entity as BacktestRuns;
    pub use super::candles::Entity as Candles;
    pub use super::ingestion_jobs::Entity as IngestionJobs;
    pub use super::notes::Entity as Notes;
    pub use super::practice_trades::Entity as PracticeTrades;
    pub use super::predictions::Entity as Predictions;
    pub use super::trades::Entity as Trades;
}
