pub mod connect;
pub mod entities;
pub mod migration;

pub use connect::{connect, migrate};
pub use sea_orm::{DatabaseConnection, DbErr};
