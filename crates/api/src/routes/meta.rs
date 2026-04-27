use rspc_legacy::RouterBuilder;
use serde::Serialize;
use specta::Type;

use crate::Ctx;

#[derive(Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub ok: bool,
    pub version: String,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.query("meta.health", |t| {
        t(|_ctx, _: ()| Health {
            ok: true,
            version: env!("CARGO_PKG_VERSION").to_string(),
        })
    })
}
