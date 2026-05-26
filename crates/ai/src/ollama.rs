use async_stream::try_stream;
use futures::StreamExt;
use serde::{Deserialize, Serialize};

use crate::provider::{AIError, AIProvider, Delta, DeltaStream, Message, Role};

pub struct OllamaProvider {
    base_url: String,
    model: String,
    http: reqwest::Client,
}

impl OllamaProvider {
    pub fn from_env() -> Self {
        let base_url = std::env::var("OLLAMA_URL")
            .unwrap_or_else(|_| "http://localhost:11434".to_string())
            .trim_end_matches('/')
            .to_string();
        let model = std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "plutus".to_string());
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .expect("reqwest client");
        Self { base_url, model, http }
    }
}

#[derive(Serialize)]
struct WireMessage<'a> {
    role: &'a str,
    content: &'a str,
}

fn role_str(r: Role) -> &'static str {
    match r {
        Role::System => "system",
        Role::User => "user",
        Role::Assistant => "assistant",
    }
}

#[derive(Deserialize)]
struct OllamaChunk {
    #[serde(default)]
    message: Option<OllamaMessage>,
    #[serde(default)]
    done: bool,
}

#[derive(Deserialize)]
struct OllamaMessage {
    #[serde(default)]
    content: String,
}

impl AIProvider for OllamaProvider {
    fn stream(&self, messages: Vec<Message>) -> DeltaStream {
        let url = format!("{}/api/chat", self.base_url);
        let model = self.model.clone();
        let http = self.http.clone();
        let wire: Vec<_> = messages
            .iter()
            .map(|m| WireMessage { role: role_str(m.role), content: m.content.as_str() })
            .collect();
        let body = serde_json::json!({
            "model": model,
            "messages": wire,
            "stream": true,
        });

        Box::pin(try_stream! {
            let resp = http
                .post(&url)
                .json(&body)
                .send()
                .await?;
            if !resp.status().is_success() {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                Err(AIError::Api(format!("status {status}: {text}")))?;
                return;
            }
            let mut stream = resp.bytes_stream();
            let mut buf = String::new();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk?;
                buf.push_str(&String::from_utf8_lossy(&chunk));
                while let Some(idx) = buf.find('\n') {
                    let line = buf[..idx].to_string();
                    buf.drain(..idx + 1);
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }
                    let parsed: OllamaChunk = match serde_json::from_str(trimmed) {
                        Ok(v) => v,
                        Err(e) => Err(AIError::Parse(e.to_string()))?,
                    };
                    if let Some(m) = parsed.message {
                        if !m.content.is_empty() {
                            yield Delta::Token { text: m.content };
                        }
                    }
                    if parsed.done {
                        yield Delta::Done;
                        return;
                    }
                }
            }
            yield Delta::Done;
        })
    }

    fn is_configured(&self) -> bool {
        !self.base_url.is_empty()
    }
}
