use forex_core::TimeFrame;

/// Chunk size in seconds for the *backfill* job runner. Picked just under the Yahoo
/// per-timeframe window so a single fetch never overflows.
pub fn backfill_chunk_seconds(tf: TimeFrame) -> i64 {
    match tf {
        TimeFrame::M1 => 5 * 86_400,         // 5 days (window=7d)
        TimeFrame::M5 => 30 * 86_400,        // 30 days (window=60d)
        TimeFrame::M15 => 30 * 86_400,
        TimeFrame::H1 => 180 * 86_400,       // 180 days (window=730d)
        TimeFrame::H4 => 365 * 86_400,
        TimeFrame::D1 => 1825 * 86_400,      // 5 years
        TimeFrame::W1 => 3650 * 86_400,      // 10 years
    }
}

/// How far back from `now` Yahoo will still serve data for this timeframe.
pub fn yahoo_window_seconds(tf: TimeFrame) -> i64 {
    match tf {
        TimeFrame::M1 => 7 * 86_400,
        TimeFrame::M5 | TimeFrame::M15 => 60 * 86_400,
        TimeFrame::H1 | TimeFrame::H4 => 730 * 86_400,
        TimeFrame::D1 | TimeFrame::W1 => i64::MAX / 2,
    }
}

pub fn total_chunks(start: i64, end: i64, chunk: i64) -> i64 {
    if chunk <= 0 || end <= start {
        return 0;
    }
    let span = end - start;
    (span + chunk - 1) / chunk
}
