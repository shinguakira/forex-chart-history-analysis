#![cfg(feature = "sqlite")]

use forex_db::{connect, entities::notes, migrate};
use sea_orm::{ActiveModelTrait, EntityTrait, Set};

#[tokio::test]
async fn migrate_and_crud_notes() {
    let conn = connect("sqlite::memory:").await.expect("connect");
    migrate(&conn).await.expect("migrate");

    let inserted = notes::ActiveModel {
        id: Set("test-id".to_string()),
        text: Set("hello".to_string()),
        created_at: Set(1_700_000_000_000),
    }
    .insert(&conn)
    .await
    .expect("insert");

    assert_eq!(inserted.id, "test-id");

    let listed = notes::Entity::find().all(&conn).await.expect("list");
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].text, "hello");

    notes::Entity::delete_by_id("test-id".to_string())
        .exec(&conn)
        .await
        .expect("delete");

    let after = notes::Entity::find().all(&conn).await.expect("list2");
    assert!(after.is_empty());
}
