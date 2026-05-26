use std::time::Duration;

use forex_core::{Candle, TimeFrame};
use serde::Deserialize;
use thiserror::Error;
use tracing::{debug, warn};

const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)";
const DEFAULT_BASE_URL: &str = "https://query1.finance.yahoo.com";

#[derive(Debug, Error)]
pub enum YahooError {
    #[error("http request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("yahoo error: {0}")]
    Api(String),
    #[error("retries exhausted (last status {0})")]
    RetriesExhausted(u16),
}

#[derive(Debug, Clone)]
pub struct YahooClient {
    http: reqwest::Client,
    base_url: String,
}

impl YahooClient {
    pub fn new() -> Result<Self, YahooError> {
        let http = reqwest::Client::builder()
            .user_agent(USER_AGENT)
            .gzip(true)
            .timeout(Duration::from_secs(30))
            .build()?;
        Ok(Self {
            http,
            base_url: DEFAULT_BASE_URL.to_string(),
        })
    }

    pub fn with_base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into();
        self
    }

    /// Fetch candles for `[period1, period2]` (epoch seconds) at `timeframe` resolution.
    /// Retries 429 with exponential backoff (2/4 seconds).
    pub async fn fetch_candles(
        &self,
        yahoo_symbol: &str,
        timeframe: TimeFrame,
        period1: i64,
        period2: i64,
    ) -> Result<FetchResult, YahooError> {
        let url = format!(
            "{}/v8/finance/chart/{}?interval={}&period1={}&period2={}",
            self.base_url,
            urlencoding(yahoo_symbol),
            timeframe.yahoo_interval(),
            period1,
            period2,
        );
        debug!(target: "forex_ingestor::yahoo", "GET {url}");

        let mut last_status = 0u16;
        for attempt in 0..3 {
            let resp = self.http.get(&url).send().await?;
            last_status = resp.status().as_u16();
            if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS && attempt < 2 {
                let backoff = Duration::from_secs(2 * (attempt as u64 + 1));
                warn!(target: "forex_ingestor::yahoo", "429 received, backoff {backoff:?}");
                tokio::time::sleep(backoff).await;
                continue;
            }
            if !resp.status().is_success() {
                return Err(YahooError::Api(format!(
                    "yahoo returned status {}",
                    resp.status()
                )));
            }
            let body = resp.json::<YahooChartResponse>().await?;
            return parse_response(body);
        }
        Err(YahooError::RetriesExhausted(last_status))
    }
}

#[derive(Debug, Clone)]
pub struct FetchResult {
    pub candles: Vec<Candle>,
    pub regular_market_price: f64,
    pub previous_close: f64,
}

#[derive(Debug, Deserialize)]
struct YahooChartResponse {
    chart: YahooChartContainer,
}

#[derive(Debug, Deserialize)]
struct YahooChartContainer {
    result: Option<Vec<YahooChartResult>>,
    error: Option<YahooErrorBody>,
}

#[derive(Debug, Deserialize)]
struct YahooErrorBody {
    description: String,
}

#[derive(Debug, Deserialize)]
struct YahooChartResult {
    meta: YahooMeta,
    timestamp: Option<Vec<i64>>,
    indicators: YahooIndicators,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct YahooMeta {
    #[serde(default)]
    regular_market_price: f64,
    #[serde(default)]
    previous_close: f64,
}

#[derive(Debug, Deserialize)]
struct YahooIndicators {
    quote: Vec<YahooQuote>,
}

#[derive(Debug, Deserialize)]
struct YahooQuote {
    open: Vec<Option<f64>>,
    high: Vec<Option<f64>>,
    low: Vec<Option<f64>>,
    close: Vec<Option<f64>>,
}

fn parse_response(body: YahooChartResponse) -> Result<FetchResult, YahooError> {
    if let Some(err) = body.chart.error {
        return Err(YahooError::Api(err.description));
    }
    let result = body
        .chart
        .result
        .and_then(|mut v| v.pop())
        .ok_or_else(|| YahooError::Api("empty result".into()))?;

    let regular_market_price = result.meta.regular_market_price;
    let previous_close = result.meta.previous_close;

    let timestamps = match result.timestamp {
        Some(ts) => ts,
        None => {
            return Ok(FetchResult {
                candles: Vec::new(),
                regular_market_price,
                previous_close,
            });
        }
    };
    let quote = result
        .indicators
        .quote
        .into_iter()
        .next()
        .ok_or_else(|| YahooError::Api("missing quote series".into()))?;

    let mut candles = Vec::with_capacity(timestamps.len());
    for (i, t) in timestamps.into_iter().enumerate() {
        let o = quote.open.get(i).copied().flatten();
        let h = quote.high.get(i).copied().flatten();
        let l = quote.low.get(i).copied().flatten();
        let c = quote.close.get(i).copied().flatten();
        if let (Some(o), Some(h), Some(l), Some(c)) = (o, h, l, c) {
            candles.push(Candle { time: t, open: o, high: h, low: l, close: c });
        }
    }

    Ok(FetchResult { candles, regular_market_price, previous_close })
}

fn urlencoding(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}
