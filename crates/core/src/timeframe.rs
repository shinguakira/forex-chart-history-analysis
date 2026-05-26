use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
pub enum TimeFrame {
    #[serde(rename = "1")]
    M1,
    #[serde(rename = "5")]
    M5,
    #[serde(rename = "15")]
    M15,
    #[serde(rename = "60")]
    H1,
    #[serde(rename = "240")]
    H4,
    #[serde(rename = "D")]
    D1,
    #[serde(rename = "W")]
    W1,
}

impl TimeFrame {
    pub const ALL: &'static [TimeFrame] = &[
        TimeFrame::M1,
        TimeFrame::M5,
        TimeFrame::M15,
        TimeFrame::H1,
        TimeFrame::H4,
        TimeFrame::D1,
        TimeFrame::W1,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            TimeFrame::M1 => "1",
            TimeFrame::M5 => "5",
            TimeFrame::M15 => "15",
            TimeFrame::H1 => "60",
            TimeFrame::H4 => "240",
            TimeFrame::D1 => "D",
            TimeFrame::W1 => "W",
        }
    }

    pub fn yahoo_interval(self) -> &'static str {
        match self {
            TimeFrame::M1 => "1m",
            TimeFrame::M5 => "5m",
            TimeFrame::M15 => "15m",
            TimeFrame::H1 => "60m",
            TimeFrame::H4 => "240m",
            TimeFrame::D1 => "1d",
            TimeFrame::W1 => "1wk",
        }
    }

    pub fn bar_seconds(self) -> i64 {
        match self {
            TimeFrame::M1 => 60,
            TimeFrame::M5 => 300,
            TimeFrame::M15 => 900,
            TimeFrame::H1 => 3_600,
            TimeFrame::H4 => 14_400,
            TimeFrame::D1 => 86_400,
            TimeFrame::W1 => 604_800,
        }
    }
}

impl std::fmt::Display for TimeFrame {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, thiserror::Error)]
#[error("invalid timeframe: {0}")]
pub struct InvalidTimeFrame(pub String);

impl std::str::FromStr for TimeFrame {
    type Err = InvalidTimeFrame;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "1" => TimeFrame::M1,
            "5" => TimeFrame::M5,
            "15" => TimeFrame::M15,
            "60" => TimeFrame::H1,
            "240" => TimeFrame::H4,
            "D" => TimeFrame::D1,
            "W" => TimeFrame::W1,
            other => return Err(InvalidTimeFrame(other.to_string())),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn timeframe_serializes_to_legacy_string() {
        let json = serde_json::to_string(&TimeFrame::M15).unwrap();
        assert_eq!(json, r#""15""#);
        let json = serde_json::to_string(&TimeFrame::D1).unwrap();
        assert_eq!(json, r#""D""#);
    }

    #[test]
    fn timeframe_roundtrip() {
        for tf in TimeFrame::ALL {
            let json = serde_json::to_string(tf).unwrap();
            let back: TimeFrame = serde_json::from_str(&json).unwrap();
            assert_eq!(*tf, back);
        }
    }
}
