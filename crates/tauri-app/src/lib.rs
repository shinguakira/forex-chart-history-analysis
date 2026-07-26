use std::sync::Arc;

#[cfg(feature = "sqlite")]
use anyhow::Context;
use forex_api::{Ctx, build_procedures, load_config_from_db, make_ctx};
use forex_db::{connect, migrate};
use tauri::{
    AppHandle, Manager, WindowEvent,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};
use tauri_plugin_autostart::MacosLauncher;

/// Resolve the DB URL the desktop app should use.
///
/// Precedence:
/// 1. `DATABASE_URL` env var (works for both sqlite:// and postgres:// — sea-orm
///    dispatches on scheme as long as the corresponding feature was compiled).
/// 2. SQLite file under the platform AppData dir, *only* when the `sqlite`
///    feature is enabled. Postgres-only builds require the env var.
fn resolve_db_url(app: &AppHandle) -> anyhow::Result<String> {
    if let Ok(url) = std::env::var("DATABASE_URL") {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    #[cfg(feature = "sqlite")]
    {
        let app_data = app.path().app_data_dir().context("app_data_dir")?;
        std::fs::create_dir_all(&app_data).ok();
        let db_path = app_data.join("forex.db");
        return Ok(format!("sqlite://{}?mode=rwc", db_path.display()));
    }

    #[cfg(not(feature = "sqlite"))]
    {
        let _ = app;
        anyhow::bail!(
            "no DATABASE_URL set and this build was compiled without the `sqlite` \
             feature — set DATABASE_URL to a postgres:// URL before launching",
        );
    }
}

fn backend_label(url: &str) -> &'static str {
    if url.starts_with("postgres://") || url.starts_with("postgresql://") {
        "postgres"
    } else if url.starts_with("sqlite:") {
        "sqlite"
    } else {
        "unknown"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Pick up .env from the working dir / parents so `cargo tauri dev` shares
    // the same DATABASE_URL conventions as the web server.
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new(
                    "forex_tauri=info,forex_api=info,forex_ingestor=info",
                )
            }),
        )
        .init();

    let (procedures, _types) = build_procedures().expect("build rspc router");

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--silent"]),
        ))
        .setup(|app| {
            let db_url = resolve_db_url(app.handle()).expect("resolve DATABASE_URL");
            tracing::info!("opening {} db: {}", backend_label(&db_url), db_url);

            let db = tauri::async_runtime::block_on(async {
                let db = connect(&db_url).await?;
                migrate(&db).await?;
                Ok::<_, anyhow::Error>(db)
            })
            .expect("db connect & migrate");

            let db_arc = Arc::new(db);
            let ctx = make_ctx(db_arc.clone());
            tauri::async_runtime::block_on(load_config_from_db(&ctx)).ok();
            tauri::async_runtime::block_on(forex_ingestor::recover_orphaned_jobs(&db_arc)).ok();
            tauri::async_runtime::block_on(async {
                forex_ingestor::spawn_scheduler(db_arc.clone(), ctx.yahoo.clone());
            });
            app.manage(ctx);

            // Open DevTools automatically in debug builds so chart / rspc IPC
            // issues are inspectable without right-click being enabled.
            #[cfg(debug_assertions)]
            if let Some(w) = app.get_webview_window("main") {
                w.open_devtools();
            }

            // Tray: tray menu lets the user re-show the window or quit. Closing
            // the window via the X just hides it, so the scheduler keeps running.
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            let icon = tauri::include_image!("icons/icon.png");
            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Forex Chart Analysis")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
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
