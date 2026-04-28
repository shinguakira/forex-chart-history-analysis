pub mod backtest_runs;
pub mod notes;
pub mod practice_trades;
pub mod predictions;

pub mod prelude {
    pub use super::backtest_runs::Entity as BacktestRuns;
    pub use super::notes::Entity as Notes;
    pub use super::practice_trades::Entity as PracticeTrades;
    pub use super::predictions::Entity as Predictions;
}
