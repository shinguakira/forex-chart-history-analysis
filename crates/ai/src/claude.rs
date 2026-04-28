use async_stream::try_stream;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::provider::{AIError, AIProvider, Delta, DeltaStream, Message, Role};

const ENDPOINT: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

pub struct ClaudeProvider {
    api_key: Option<String>,
    model: String,
    http: reqwest::Client,
}

impl ClaudeProvider {
    pub fn from_env() -> Self {
        let api_key = std::env::var("ANTHROPIC_API_KEY").ok();
        let model = std::env::var("ANTHROPIC_MODEL")
            .unwrap_or_else(|_| "claude-sonnet-4-20250514".to_string());
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .expect("reqwest client");
        Self { api_key, model, http }
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
struct SseEvent {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    delta: Option<DeltaPayload>,
}

#[derive(Deserialize)]
struct DeltaPayload {
    #[serde(default)]
    text: Option<String>,
}

impl AIProvider for ClaudeProvider {
    fn stream(&self, messages: Vec<Message>) -> DeltaStream {
        let api_key = match &self.api_key {
            Some(k) if !k.is_empty() => k.clone(),
            _ => {
                return Box::pin(async_stream::stream! {
                    yield Err::<Delta, AIError>(AIError::NotConfigured("ANTHROPIC_API_KEY"))
                });
            }
        };
        let model = self.model.clone();
        let http = self.http.clone();

        // Anthropic API expects `system` separated from `messages`.
        let system_text = messages
            .iter()
            .filter(|m| m.role == Role::System)
            .map(|m| m.content.as_str())
            .collect::<Vec<_>>()
            .join("\n\n");
        let chat: Vec<_> = messages
            .iter()
            .filter(|m| m.role != Role::System)
            .map(|m| WireMessage {
                role: role_str(m.role),
                content: m.content.as_str(),
            })
            .collect();
        let body = json!({
            "model": model,
            "max_tokens": 4096,
            "stream": true,
            "system": system_text,
            "messages": chat,
        });

        Box::pin(try_stream! {
            let resp = http
                .post(ENDPOINT)
                .header("x-api-key", &api_key)
                .header("anthropic-version", ANTHROPIC_VERSION)
                .header("content-type", "application/json")
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
                while let Some(idx) = buf.find("\n\n") {
                    let event_block = buf[..idx].to_string();
                    buf.drain(..idx + 2);
                    for line in event_block.lines() {
                        if let Some(payload) = line.strip_prefix("data: ") {
                            let payload = payload.trim();
                            if payload.is_empty() || payload == "[DONE]" {
                                continue;
                            }
                            let event: SseEvent = match serde_json::from_str(payload) {
                                Ok(v) => v,
                                Err(_) => continue,
                            };
                            match event.kind.as_str() {
                                "content_block_delta" => {
                                    if let Some(text) =
                                        event.delta.as_ref().and_then(|d| d.text.clone())
                                    {
                                        yield Delta::Token { text };
                                    }
                                }
                                "message_stop" => {
                                    yield Delta::Done;
                                    return;
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
            yield Delta::Done;
        })
    }

    fn is_configured(&self) -> bool {
        self.api_key.as_deref().map(|s| !s.is_empty()).unwrap_or(false)
    }
}
