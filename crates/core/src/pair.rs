use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy)]
pub struct PairConfig {
    pub id: &'static str,
    pub display_name: &'static str,
    pub yahoo_symbol: &'static str,
    pub decimals: u8,
}

pub const PAIRS: &[PairConfig] = &[
    PairConfig { id: "USD_JPY", display_name: "USD/JPY", yahoo_symbol: "USDJPY=X", decimals: 3 },
    PairConfig { id: "EUR_USD", display_name: "EUR/USD", yahoo_symbol: "EURUSD=X", decimals: 5 },
    PairConfig { id: "EUR_JPY", display_name: "EUR/JPY", yahoo_symbol: "EURJPY=X", decimals: 3 },
    PairConfig { id: "USD_CAD", display_name: "USD/CAD", yahoo_symbol: "USDCAD=X", decimals: 5 },
    PairConfig { id: "CAD_JPY", display_name: "CAD/JPY", yahoo_symbol: "CADJPY=X", decimals: 3 },
    PairConfig { id: "AUD_USD", display_name: "AUD/USD", yahoo_symbol: "AUDUSD=X", decimals: 5 },
    PairConfig { id: "AUD_JPY", display_name: "AUD/JPY", yahoo_symbol: "AUDJPY=X", decimals: 3 },
    PairConfig { id: "NZD_USD", display_name: "NZD/USD", yahoo_symbol: "NZDUSD=X", decimals: 5 },
    PairConfig { id: "NZD_JPY", display_name: "NZD/JPY", yahoo_symbol: "NZDJPY=X", decimals: 3 },
];

pub fn pair_by_id(id: &str) -> Option<&'static PairConfig> {
    PAIRS.iter().find(|p| p.id == id)
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct PairId(pub String);

#[derive(Debug, thiserror::Error)]
#[error("unknown pair id: {0}")]
pub struct InvalidPair(pub String);

impl PairId {
    pub fn new(id: impl Into<String>) -> Result<Self, InvalidPair> {
        let id = id.into();
        if pair_by_id(&id).is_some() {
            Ok(Self(id))
        } else {
            Err(InvalidPair(id))
        }
    }

    pub fn config(&self) -> &'static PairConfig {
        pair_by_id(&self.0).expect("PairId always wraps a valid pair id")
    }
}

impl std::fmt::Display for PairId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
