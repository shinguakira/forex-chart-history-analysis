use std::time::{SystemTime, UNIX_EPOCH};

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time before epoch")
        .as_millis() as i64
}

pub fn now_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time before epoch")
        .as_secs() as i64
}

pub fn ms_to_seconds(ms: i64) -> i64 {
    ms / 1_000
}

pub fn seconds_to_ms(secs: i64) -> i64 {
    secs * 1_000
}
