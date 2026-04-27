use sea_orm_migration::MigrationTrait;
pub use sea_orm_migration::MigratorTrait;

mod m20260427_000001_create_notes;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(m20260427_000001_create_notes::Migration)]
    }
}
