use std::sync::Arc;

use forex_db::DatabaseConnection;
use forex_ingestor::YahooClient;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct Ctx {
    pub db: Arc<DatabaseConnection>,
    pub yahoo: Arc<YahooClient>,
    pub config: Arc<RwLock<AppConfig>>,
}

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub candle_source_default: forex_core::CandleSource,
    pub ai_provider: forex_core::AiProviderKind,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            candle_source_default: forex_core::CandleSource::Yahoo,
            ai_provider: forex_core::AiProviderKind::Claude,
        }
    }
}
