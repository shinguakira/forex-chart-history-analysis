pub mod connect;
pub mod entities;
pub mod migration;

pub use connect::{connect, migrate};
pub use sea_orm::{DatabaseConnection, DbErr};

pub async fn candles_count(db: &DatabaseConnection) -> u64 {
    use sea_orm::{EntityTrait, PaginatorTrait};
    entities::candles::Entity::find()
        .count(db)
        .await
        .unwrap_or(0)
}
