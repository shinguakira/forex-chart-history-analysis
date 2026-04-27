use std::sync::Arc;

use forex_api::{build_procedures, make_ctx, Ctx};
use forex_db::{connect, migrate};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("forex_tauri=info,forex_api=info")),
        )
        .init();

    let (procedures, _types) = build_procedures().expect("build rspc router");

    tauri::Builder::default()
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("app_data_dir");
            std::fs::create_dir_all(&app_data).ok();
            let db_path = app_data.join("forex.db");
            let db_url = format!("sqlite://{}?mode=rwc", db_path.display());
            tracing::info!("opening sqlite at {db_url}");

            let db = tauri::async_runtime::block_on(async move {
                let db = connect(&db_url).await?;
                migrate(&db).await?;
                Ok::<_, anyhow::Error>(db)
            })
            .expect("db connect & migrate");

            app.manage(make_ctx(Arc::new(db)));
            Ok(())
        })
        .plugin(tauri_plugin_rspc::init(procedures, |window: tauri::Window| {
            window
                .app_handle()
                .state::<Ctx>()
                .inner()
                .clone()
        }))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
