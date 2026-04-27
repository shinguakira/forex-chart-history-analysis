use std::path::PathBuf;

use forex_api::{build_procedures, export_typescript_bindings};

fn main() -> anyhow::Result<()> {
    let (_procedures, types) = build_procedures().map_err(|e| anyhow::anyhow!(e))?;
    let output = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../frontend/src/generated/bindings.ts");
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)?;
    }
    export_typescript_bindings(&types, &output)?;
    println!("wrote bindings to {}", output.display());
    Ok(())
}
