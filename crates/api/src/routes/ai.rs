use forex_ai::{Delta, Message};
use futures::StreamExt;
use rspc_legacy::RouterBuilder;
use serde::Deserialize;
use specta::Type;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::Ctx;

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StreamInput {
    pub messages: Vec<Message>,
}

pub fn mount(r: RouterBuilder<Ctx>) -> RouterBuilder<Ctx> {
    r.subscription("ai.stream", |t| {
        t(|ctx: Ctx, input: StreamInput| {
            // Bridge the !Sync provider stream through an mpsc channel so the
            // outer subscription stream becomes Sync (rspc-legacy requires it).
            let (tx, rx) = mpsc::channel::<Delta>(64);
            let provider = ctx.ai.clone();
            tokio::spawn(async move {
                let mut inner = provider.stream(input.messages);
                while let Some(item) = inner.next().await {
                    let msg = match item {
                        Ok(d) => d,
                        Err(e) => Delta::Error { message: e.to_string() },
                    };
                    let is_terminal = matches!(msg, Delta::Done | Delta::Error { .. });
                    if tx.send(msg).await.is_err() {
                        break;
                    }
                    if is_terminal {
                        break;
                    }
                }
            });
            ReceiverStream::new(rx)
        })
    })
    .query("ai.isConfigured", |t| {
        t(|ctx: Ctx, _: ()| async move { Ok::<bool, rspc_legacy::Error>(ctx.ai.is_configured()) })
    })
}
