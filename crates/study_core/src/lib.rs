use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;
use unicode_normalization::UnicodeNormalization;

const DAY: i64 = 86_400_000;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Review {
    pub state: String,
    pub interval: f64,
    pub ease: f64,
    pub reviews: u32,
    pub successes: u32,
    pub failures: u32,
    pub lapses: u32,
    pub due: i64,
    pub last_review: i64,
}
impl Default for Review {
    fn default() -> Self {
        Self {
            state: "new".into(),
            interval: 0.0,
            ease: 2.5,
            reviews: 0,
            successes: 0,
            failures: 0,
            lapses: 0,
            due: 0,
            last_review: 0,
        }
    }
}

pub fn normalize(s: &str, punctuation: bool) -> String {
    let s: String = s.nfkc().flat_map(char::to_lowercase).collect();
    let s = s.split_whitespace().collect::<Vec<_>>().join(" ");
    if punctuation {
        s.trim_matches(|c: char| ".,!?;:\"“”".contains(c))
            .trim()
            .into()
    } else {
        s
    }
}
fn strings(v: &Value) -> Vec<String> {
    if let Some(a) = v.as_array() {
        a.iter()
            .filter_map(Value::as_str)
            .map(str::to_owned)
            .collect()
    } else {
        v.as_str().map(|s| vec![s.to_owned()]).unwrap_or_default()
    }
}
pub fn blanks(front: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut rest = front;
    while let Some(i) = rest.find('[') {
        rest = &rest[i + 1..];
        if let Some(j) = rest.find(']') {
            if !rest[..j].trim().is_empty() {
                out.push(rest[..j].trim().into());
            }
            rest = &rest[j + 1..];
        } else {
            break;
        }
    }
    out
}
pub fn evaluate(card: &Value, response: &Value) -> bool {
    let kind = card["type"].as_str().unwrap_or("qa");
    let punct = card["ignorePunctuation"].as_bool().unwrap_or(true);
    let actual = strings(response);
    let expected = if kind == "cloze" {
        blanks(card["front"].as_str().unwrap_or(""))
    } else {
        strings(&card["answer"])
    };
    if actual.is_empty() || expected.is_empty() {
        return false;
    }
    if kind == "qa" || kind == "image" {
        let mut acceptable = expected;
        acceptable.extend(strings(&card["alternatives"]));
        return actual.len() == 1
            && acceptable
                .iter()
                .any(|e| normalize(e, punct) == normalize(&actual[0], punct));
    }
    if kind == "multi" {
        let a: BTreeSet<_> = actual.iter().map(|s| normalize(s, punct)).collect();
        let e: BTreeSet<_> = expected.iter().map(|s| normalize(s, punct)).collect();
        return a.len() == actual.len() && a == e;
    }
    actual.len() == expected.len()
        && actual
            .iter()
            .zip(&expected)
            .all(|(a, e)| normalize(a, punct) == normalize(e, punct))
}

/// Documented SM-2-inspired scheduler, not FSRS. Intervals are in days.
pub fn schedule(mut r: Review, rating: u8, now: i64) -> Result<Review, String> {
    if !(1..=4).contains(&rating)
        || now < 0
        || !r.interval.is_finite()
        || !r.ease.is_finite()
        || r.interval < 0.0
        || r.reviews >= 1_000_000
    {
        return Err("Invalid review input".into());
    }
    r.ease = r.ease.clamp(1.3, 3.0);
    let fresh = r.state == "new" || r.state == "learning" || r.state == "relearning";
    if rating == 1 {
        if r.state == "reviewing" {
            r.lapses += 1;
        }
        r.state = if r.reviews == 0 {
            "learning"
        } else {
            "relearning"
        }
        .into();
        r.interval = 1.0 / 1440.0;
        r.ease = (r.ease - 0.2).max(1.3);
        r.failures += 1;
    } else {
        r.successes += 1;
        r.interval = if fresh {
            match rating {
                2 => 10.0 / 1440.0,
                3 => 1.0,
                _ => 4.0,
            }
        } else {
            match rating {
                2 => (r.interval * 1.2).max(1.0),
                3 => (r.interval * r.ease).max(3.0),
                _ => (r.interval * r.ease * 1.3).max(4.0),
            }
        }
        .min(3650.0);
        if rating == 2 {
            r.ease = (r.ease - 0.15).max(1.3);
        }
        if rating == 4 {
            r.ease = (r.ease + 0.15).min(3.0);
        }
        r.state = if r.interval < 1.0 {
            "learning"
        } else {
            "reviewing"
        }
        .into();
    }
    r.reviews += 1;
    r.last_review = now;
    r.due = now.saturating_add((r.interval * DAY as f64).round() as i64);
    Ok(r)
}
pub fn manila_day(ms: i64) -> i64 {
    (ms + 8 * 3_600_000).div_euclid(DAY)
}
pub fn streak(days: &[i64], today: i64) -> (u32, u32) {
    let days: BTreeSet<i64> = days.iter().copied().filter(|d| *d <= today).collect();
    let mut current = 0;
    let mut d = if days.contains(&today) {
        today
    } else {
        today - 1
    };
    while days.contains(&d) {
        current += 1;
        d -= 1;
    }
    let (mut longest, mut run, mut prev) = (0, 0, i64::MIN);
    for day in days {
        run = if day == prev.saturating_add(1) {
            run + 1
        } else {
            1
        };
        longest = longest.max(run);
        prev = day;
    }
    (current, longest)
}
pub fn mastery(r: &Review) -> u32 {
    if r.reviews == 0 {
        return 0;
    }
    let accuracy = r.successes as f64 / r.reviews as f64;
    ((r.interval.max(0.0).ln_1p() / 31.0_f64.ln() * 100.0).min(100.0) * accuracy).round() as u32
}
pub fn level(xp: u64) -> Value {
    let mut level = 1_u64;
    let mut start = 0;
    while level < 10000 && xp >= start + level * 100 {
        start += level * 100;
        level += 1;
    }
    json!({"level":level,"inLevel":xp-start,"needed":level*100,"total":xp})
}
pub fn answer_xp(correct: bool, difficult: bool, already_awarded: bool) -> u32 {
    if !correct || already_awarded {
        0
    } else if difficult {
        15
    } else {
        10
    }
}
pub fn transition(
    cursor: usize,
    length: usize,
    wrong: bool,
    occurrences: usize,
    practice: bool,
) -> Value {
    let repeat = wrong && occurrences < 3 && !practice;
    let total = length + usize::from(repeat);
    json!({"cursor":(cursor+1).min(total),"append":repeat,"finished":cursor+1>=total})
}
fn dispatch(v: &Value) -> Result<Value, String> {
    match v["action"].as_str().unwrap_or("") {
        "evaluate" => Ok(json!({"correct":evaluate(&v["card"],&v["response"])})),
        "schedule" => {
            let r = serde_json::from_value(v["review"].clone()).map_err(|e| e.to_string())?;
            let rating = v["rating"]
                .as_u64()
                .filter(|n| *n <= 4)
                .ok_or("Invalid rating")? as u8;
            Ok(serde_json::to_value(schedule(
                r,
                rating,
                v["now"].as_i64().ok_or("Invalid time")?,
            )?)
            .unwrap())
        }
        "xp" => Ok(
            json!({"xp":answer_xp(v["correct"].as_bool().unwrap_or(false),v["difficult"].as_bool().unwrap_or(false),v["alreadyAwarded"].as_bool().unwrap_or(false))}),
        ),
        "level" => Ok(level(v["xp"].as_u64().unwrap_or(0))),
        "streak" => {
            let days: Vec<i64> = v["days"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .filter_map(Value::as_i64)
                .collect();
            let (a, b) = streak(&days, v["today"].as_i64().unwrap_or(0));
            Ok(json!({"current":a,"longest":b}))
        }
        "mastery" => Ok(
            json!({"mastery":mastery(&serde_json::from_value(v["review"].clone()).map_err(|e|e.to_string())?)}),
        ),
        "day" => Ok(json!({"day":manila_day(v["now"].as_i64().unwrap_or(0))})),
        "transition" => Ok(transition(
            v["cursor"].as_u64().unwrap_or(0) as usize,
            v["length"].as_u64().unwrap_or(0) as usize,
            v["wrong"].as_bool().unwrap_or(false),
            v["occurrences"].as_u64().unwrap_or(0) as usize,
            v["practice"].as_bool().unwrap_or(false),
        )),
        "validate" => {
            let valid = !v["card"]["front"].as_str().unwrap_or("").trim().is_empty()
                && if v["card"]["type"] == "cloze" {
                    !blanks(v["card"]["front"].as_str().unwrap_or("")).is_empty()
                } else {
                    !strings(&v["card"]["answer"]).is_empty()
                };
            Ok(json!({"valid":valid}))
        }
        _ => Err("Unknown engine action".into()),
    }
}
pub fn run_json(input: &str) -> String {
    let result = serde_json::from_str(input)
        .map_err(|e| e.to_string())
        .and_then(|v| dispatch(&v));
    match result {
        Ok(v) => v.to_string(),
        Err(e) => json!({"error":e}).to_string(),
    }
}

// A single-threaded, synchronous JSON ABI keeps the domain engine independent
// of browser/Worker APIs. The only unsafe operations are this bounded FFI
// boundary; callers must use alloc/dealloc with the exact returned lengths.
#[cfg(target_arch = "wasm32")]
mod abi {
    use std::cell::RefCell;
    thread_local! { static OUTPUT: RefCell<Vec<u8>> = const {RefCell::new(Vec::new())}; }
    #[no_mangle]
    pub extern "C" fn alloc(len: usize) -> *mut u8 {
        let mut buf = vec![0_u8; len].into_boxed_slice();
        let ptr = buf.as_mut_ptr();
        std::mem::forget(buf);
        ptr
    }
    #[no_mangle]
    pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
        drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
    }
    #[no_mangle]
    pub unsafe extern "C" fn run(ptr: *const u8, len: usize) -> *const u8 {
        let input = std::slice::from_raw_parts(ptr, len);
        let result = match std::str::from_utf8(input) {
            Ok(s) => super::run_json(s),
            Err(_) => "{\"error\":\"Invalid UTF-8\"}".into(),
        };
        OUTPUT.with(|o| {
            let mut o = o.borrow_mut();
            *o = result.into_bytes();
            o.as_ptr()
        })
    }
    #[no_mangle]
    pub extern "C" fn result_len() -> usize {
        OUTPUT.with(|o| o.borrow().len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_answer() {
        assert!(evaluate(
            &json!({"front":"Capital?","answer":["Manila"]}),
            &json!([" manila. "])
        ));
    }
    #[test]
    fn unrelated() {
        assert!(!evaluate(&json!({"answer":["Manila"]}), &json!(["Mali"])));
    }
    #[test]
    fn alternatives() {
        assert!(evaluate(
            &json!({"answer":["water"],"alternatives":["H2O"]}),
            &json!(["h2o"])
        ));
    }
    #[test]
    fn math_punctuation() {
        assert!(!evaluate(&json!({"answer":["-2"]}), &json!(["2"])));
    }
    #[test]
    fn accents_preserved() {
        assert!(!evaluate(&json!({"answer":["niño"]}), &json!(["nino"])));
    }
    #[test]
    fn unicode() {
        assert_eq!(normalize("Ｅnergy", true), "energy");
    }
    #[test]
    fn multiple_select() {
        assert!(evaluate(
            &json!({"type":"multi","answer":["a","b"]}),
            &json!(["b", "a"])
        ));
    }
    #[test]
    fn multiple_select_partial() {
        assert!(!evaluate(
            &json!({"type":"multi","answer":["a","b"]}),
            &json!(["a"])
        ));
    }
    #[test]
    fn duplicate_selection() {
        assert!(!evaluate(
            &json!({"type":"multi","answer":["a"]}),
            &json!(["a", "a"])
        ));
    }
    #[test]
    fn order_matters() {
        assert!(!evaluate(
            &json!({"type":"ordering","answer":["a","b"]}),
            &json!(["b", "a"])
        ));
    }
    #[test]
    fn cloze_multiple() {
        assert!(evaluate(
            &json!({"type":"cloze","front":"[Manila] is in the [Philippines]."}),
            &json!(["manila", "philippines"])
        ));
    }
    #[test]
    fn empty_not_correct() {
        assert!(!evaluate(&json!({"answer":[]}), &json!([])));
    }
    #[test]
    fn good_new() {
        let r = schedule(Review::default(), 3, 100).unwrap();
        assert_eq!(r.due, DAY + 100);
        assert_eq!(r.state, "reviewing");
    }
    #[test]
    fn interval_grows() {
        let a = schedule(Review::default(), 3, 0).unwrap();
        let b = schedule(a, 3, DAY).unwrap();
        assert!(b.interval >= 3.0);
    }
    #[test]
    fn wrong_soon() {
        let r = schedule(Review::default(), 1, 100).unwrap();
        assert_eq!(r.due, 60_100);
        assert_eq!(r.failures, 1);
    }
    #[test]
    fn lapse() {
        let a = schedule(Review::default(), 3, 0).unwrap();
        let b = schedule(a, 1, DAY).unwrap();
        assert_eq!(b.lapses, 1);
        assert_eq!(b.state, "relearning");
    }
    #[test]
    fn ease_floor() {
        let mut r = Review::default();
        for _ in 0..50 {
            r = schedule(r, 1, 0).unwrap();
        }
        assert_eq!(r.ease, 1.3);
    }
    #[test]
    fn easy_longer() {
        assert!(
            schedule(Review::default(), 4, 0).unwrap().interval
                > schedule(Review::default(), 3, 0).unwrap().interval
        );
    }
    #[test]
    fn invalid_rating() {
        assert!(schedule(Review::default(), 0, 0).is_err());
    }
    #[test]
    fn invalid_interval() {
        let r = Review {
            interval: -1.0,
            ..Default::default()
        };
        assert!(schedule(r, 3, 0).is_err());
    }
    #[test]
    fn reward() {
        assert_eq!(answer_xp(true, false, false), 10);
        assert_eq!(answer_xp(true, true, false), 15);
    }
    #[test]
    fn no_duplicate_reward() {
        assert_eq!(answer_xp(true, true, true), 0);
    }
    #[test]
    fn wrong_no_reward() {
        assert_eq!(answer_xp(false, false, false), 0);
    }
    #[test]
    fn level_boundary() {
        assert_eq!(level(99)["level"], 1);
        assert_eq!(level(100)["level"], 2);
        assert_eq!(level(300)["level"], 3);
    }
    #[test]
    fn streak_deduplicates() {
        assert_eq!(streak(&[1, 1, 2, 3], 3), (3, 3));
    }
    #[test]
    fn missed_day() {
        assert_eq!(streak(&[1, 2, 3], 5), (0, 3));
    }
    #[test]
    fn yesterday_still_active() {
        assert_eq!(streak(&[1, 2, 3], 4), (3, 3));
    }
    #[test]
    fn future_ignored() {
        assert_eq!(streak(&[10, 11], 9), (0, 0));
    }
    #[test]
    fn midnight_manila() {
        assert_eq!(manila_day(57_599_999), 0);
        assert_eq!(manila_day(57_600_000), 1);
    }
    #[test]
    fn session_retry() {
        assert_eq!(transition(0, 1, true, 1, false)["finished"], false);
        assert_eq!(transition(0, 1, true, 1, false)["append"], true);
    }
    #[test]
    fn retry_bounded() {
        assert_eq!(transition(2, 3, true, 3, false)["append"], false);
    }
    #[test]
    fn session_done() {
        assert_eq!(transition(2, 3, false, 1, false)["finished"], true);
    }
    #[test]
    fn practice_no_retry() {
        assert_eq!(transition(0, 1, true, 1, true)["finished"], true);
    }
    #[test]
    fn mastery_new() {
        assert_eq!(mastery(&Review::default()), 0);
    }
    #[test]
    fn invalid_json() {
        assert!(run_json("nope").contains("error"));
    }
}
