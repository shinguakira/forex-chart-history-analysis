use forex_core::{BacktestRun, Note, PracticeTrade, Prediction, TimeFrame};

const NOTES: &str = include_str!("../../../frontend/data/notes.json");
const PREDICTIONS: &str = include_str!("../../../frontend/data/predictions.json");
const BACKTESTS: &str = include_str!("../../../frontend/data/backtests.json");
const PRACTICE: &str = include_str!("../../../frontend/data/practice-sessions.json");

#[test]
fn parses_notes_fixture() {
    let parsed: Vec<Note> = serde_json::from_str(NOTES).expect("parse notes");
    assert!(!parsed.is_empty(), "expected at least one note");
    let reserialized = serde_json::to_string(&parsed).unwrap();
    let reparsed: Vec<Note> = serde_json::from_str(&reserialized).unwrap();
    assert_eq!(reparsed.len(), parsed.len());
}

#[test]
fn parses_predictions_fixture() {
    let parsed: Vec<Prediction> = serde_json::from_str(PREDICTIONS).expect("parse predictions");
    assert!(!parsed.is_empty(), "expected at least one prediction");
}

#[test]
fn parses_backtests_fixture() {
    let parsed: Vec<BacktestRun> = serde_json::from_str(BACKTESTS).expect("parse backtests");
    assert!(!parsed.is_empty());
}

#[test]
fn parses_practice_fixture() {
    let parsed: Vec<PracticeTrade> = serde_json::from_str(PRACTICE).expect("parse practice");
    let _ = parsed;
}

#[test]
fn timeframe_legacy_strings() {
    let tf: TimeFrame = serde_json::from_str(r#""60""#).unwrap();
    assert_eq!(tf, TimeFrame::H1);
}
