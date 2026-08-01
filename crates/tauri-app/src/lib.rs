use std::sync::{Arc, OnceLock};

#[cfg(feature = "sqlite")]
use anyhow::Context;
use forex_api::{Ctx, build_procedures, load_config_from_db, make_ctx};
use forex_db::{connect, migrate};
use tauri::{AppHandle, Manager};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{
    WindowEvent,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_autostart::MacosLauncher;

type CtxOnce = Arc<OnceLock<Ctx>>;

/// On Android, seed the DB from the bundled snapshot if the candles table is empty or missing.
/// Runs on every launch so APK updates with fresh candle data are picked up automatically.
#[cfg(target_os = "android")]
fn seed_db_if_missing(app: &AppHandle) -> anyhow::Result<()> {
    use anyhow::Context;
    let app_data = app.path().app_data_dir().context("app_data_dir")?;
    std::fs::create_dir_all(&app_data).ok();
    let db_path = app_data.join("forex.db");

    let needs_seed = if !db_path.exists() {
        true
    } else {
        // Check candles count without running migrations
        let candle_count: u64 = tauri::async_runtime::block_on(async {
            let url = format!("sqlite://{}?mode=ro", db_path.display());
            let db = forex_db::connect(&url).await.ok()?;
            Some(forex_db::candles_count(&db).await)
        })
        .unwrap_or(0);
        candle_count == 0
    };

    if needs_seed {
        let snapshot = include_bytes!("../../../forex.db");
        std::fs::write(&db_path, snapshot).context("write seeded forex.db")?;
        tracing::info!("seeded DB from bundled snapshot ({} bytes)", snapshot.len());
    }
    Ok(())
}

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

    // Create the once-cell before the builder so it can be managed at the
    // earliest possible point — before setup() runs and before the WebView
    // can issue its first IPC call. The rspc resolver spins until it is
    // populated, preventing the `state() called before manage()` panic.
    let ctx_once: CtxOnce = Arc::new(OnceLock::new());
    let ctx_once_for_setup = ctx_once.clone();

    let builder = tauri::Builder::default()
        .manage(ctx_once);

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_autostart::init(
        MacosLauncher::LaunchAgent,
        Some(vec!["--silent"]),
    ));

    let builder = builder.setup(move |app| {
        #[cfg(target_os = "android")]
        seed_db_if_missing(app.handle()).expect("seed DB");

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

        // Publish ctx so any IPC calls that were spin-waiting can proceed.
        ctx_once_for_setup.set(ctx).ok();

        let ctx = ctx_once_for_setup.get().unwrap().clone();
        let db_arc2 = db_arc.clone();
        tauri::async_runtime::spawn(async move {
            load_config_from_db(&ctx).await.ok();
            forex_ingestor::recover_orphaned_jobs(&db_arc2).await.ok();
            forex_ingestor::spawn_scheduler(db_arc2, ctx.yahoo.clone());
        });

        #[cfg(debug_assertions)]
        if let Some(w) = app.get_webview_window("main") {
            w.open_devtools();
        }

        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        {
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
        }

        Ok(())
    });

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.on_window_event(|window, event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            let _ = window.hide();
            api.prevent_close();
        }
    });

    builder
        .plugin(tauri_plugin_rspc::init(procedures, |window: tauri::Window| {
            // Spin until setup() populates the once-cell. The JavaBridge
            // thread can call this before DB init completes on Android.
            let once = window.app_handle().state::<CtxOnce>();
            loop {
                if let Some(ctx) = once.get() {
                    return ctx.clone();
                }
                std::thread::sleep(std::time::Duration::from_millis(5));
            }
        }))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
