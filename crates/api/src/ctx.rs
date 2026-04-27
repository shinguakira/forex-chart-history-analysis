use std::sync::Arc;

use forex_db::DatabaseConnection;

#[derive(Clone)]
pub struct Ctx {
    pub db: Arc<DatabaseConnection>,
}
