use std::pin::Pin;

use futures::Stream;
use serde::{Deserialize, Serialize};
use specta::Type;
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub role: Role,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Delta {
    Token { text: String },
    Done,
    Error { message: String },
}

#[derive(Debug, Error)]
pub enum AIError {
    #[error("http: {0}")]
    Http(#[from] reqwest::Error),
    #[error("not configured: {0}")]
    NotConfigured(&'static str),
    #[error("api: {0}")]
    Api(String),
    #[error("parse: {0}")]
    Parse(String),
}

pub type DeltaStream = Pin<Box<dyn Stream<Item = Result<Delta, AIError>> + Send>>;

pub trait AIProvider: Send + Sync {
    fn stream(&self, messages: Vec<Message>) -> DeltaStream;
    fn is_configured(&self) -> bool;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AIProviderKind {
    Claude,
    Ollama,
}

/// Pick the provider based on env (`AI_PROVIDER`, `ANTHROPIC_API_KEY`, `OLLAMA_URL`).
pub fn from_env() -> Box<dyn AIProvider> {
    let kind = std::env::var("AI_PROVIDER")
        .ok()
        .as_deref()
        .map(str::to_ascii_lowercase);
    match kind.as_deref() {
        Some("ollama") => Box::new(crate::ollama::OllamaProvider::from_env()),
        _ => Box::new(crate::claude::ClaudeProvider::from_env()),
    }
}
