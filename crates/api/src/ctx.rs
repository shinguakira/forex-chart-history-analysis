use std::sync::Arc;

use forex_db::DatabaseConnection;
use forex_ingestor::YahooClient;

#[derive(Clone)]
pub struct Ctx {
    pub db: Arc<DatabaseConnection>,
    pub yahoo: Arc<YahooClient>,
    pub config: AppConfig,
}

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub candle_source_default: forex_core::CandleSource,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            candle_source_default: forex_core::CandleSource::Yahoo,
        }
    }
}
