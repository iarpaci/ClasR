'use strict';

/**
 * The deterministic engine. No model call happens in this file.
 *
 * Given the same set of verified signals, this produces byte-identical
 * output every time — the property the LLM can never give you and the
 * property a TTO or publisher is actually buying.
 *
 * >>> THE NUMBERS BELOW ARE PLACEHOLDERS. They encode editorial judgement
 * >>> that only the user can make. This file is where CLASR's real IP lives.
 * >>> Calibration method: trialfiles/README.md §3.
 */

const { baseSeverityOf, sectionOf } = require('./taxonomy');
const { EvidenceBasis } = require('./schema');

// How much we trust a finding depending on how the model reached it.
// INFERRED findings are the least stable across runs, so they're discounted.
const BASIS_WEIGHT = {
  [EvidenceBasis.EXPLICIT_STATEMENT]: 1.00,
  [EvidenceBasis.EXPLICIT_ABSENCE]: 0.90,
  [EvidenceBasis.INFERRED]: 0.60,
};

// An exactly-located quote is worth more than a fuzzily-located one.
// 'anchored' and 'scanned' replaced the old single 'fuzzy' method
// (2026-07-26, verify.js's anchored fuzzy matching) — anchored positioning
// is a stronger signal than a blind stride hit, so it sits between exact
// and scanned rather than sharing scanned's weight.
const METHOD_WEIGHT = { exact: 1.00, anchored: 0.90, scanned: 0.80 };

// Co-occurrence rules: signal pairs that compound each other. This is where
// a rule like "X + Y together => x1.25" belongs — expressed as a rule, in
// code, reviewable and testable.
//
// Empty while taxonomy.js covers only Kit 40 (SECTION 4, A1-A5). Kit 40's
// own "HARD LIMITS" section is explicit: "Does not cascade severity — only
// context tags cascade." So no A1-A5 cross-axis pair belongs here — adding
// one would contradict the source kit's design. Once later phases add
// signals from other sections, real cross-section cooccurrence rules can
// go here (e.g. a SECTION 3 methodological-absence signal compounding with
// a SECTION 4 argument signal), calibrated per trialfiles/README.md §3.
const COOCCURRENCE_RULES = [];

// Weighted-score cut points -> risk band. Ordered highest cut first; the
// first entry whose cut the score clears wins. STALE placeholders — held
// over unchanged since the per-section rank decay in computeRawScore()
// (2026-07-30, see its comment) is itself unvalidated. Do not tune these
// until a real scripts/calibrate.js --runs=3 run against that formula
// exists; fitting these to old data would just be fitting noise.
const BAND_THRESHOLDS = [
  [12.0, 'HIGH'],
  [7.0, 'ELEVATED'],
  [3.0, 'MEDIUM'],
  [0.0, 'LOW'],
];

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * SEVERITY WEIGHTING — linear (2026-07-30). Three different global
 * aggregation shapes were tried against the 17-case human-judged calibration
 * set: (1) flat linear sum, (2) rank-discounted harmonic decay, (3) squared
 * ("quadratic") severity. All three landed at the *same* ~24-31% band
 * agreement even with consensus-filtered (runs=3) extraction, and (3)
 * actually inverted the LOW/HIGH mean raw_score ordering. Three structurally
 * different per-signal formulas converging on the same failure rate is
 * evidence the bottleneck wasn't the per-signal severity curve at all.
 */
function severityWeight(severity) {
  return severity;
}

/**
 * PER-SECTION RANK DECAY (2026-07-30, UNVALIDATED — see below).
 *
 * A taxonomy.js audit (backend's severity distribution across all 264 signal
 * types) found the real driver of the four failed calibration runs: severity
 * itself barely varies inside the sections that produce most hits.
 * SECTION_9_FIGURE_TABLE_INTEGRITY (41 signal types) has ZERO types below
 * severity 3 — every single Section-9 signal is MAJOR or CRITICAL.
 * SECTION_10_REPRODUCIBILITY is 88% severity 3-4, SECTION_4_ARGUMENTATION is
 * 82%. So no per-signal severity transform (linear, squared, decayed by
 * global rank) can discriminate within those sections — severity there is
 * nearly a constant, and raw_score ends up tracking how many signals a
 * section produces, which tracks manuscript SHAPE (a paper with more tables
 * draws more Section-9 hits, a paper with more explicit claims draws more
 * Section-4 hits) more than true risk.
 *
 * Fix: dampen repeated hits WITHIN a single section (not globally — that's
 * what over-corrected in the rejected harmonic-decay attempt, which erased
 * genuine cross-section volume signal by discounting the WHOLE report's
 * ranking, section boundaries included). Scoping the same harmonic decay
 * (1/(rank+1)) to only fire between signals that share a section keeps it
 * from touching cross-section volume at all: a manuscript with issues
 * spread across several sections still accumulates each section's top hit
 * at full weight, while a single over-triggering section (e.g. ten
 * Section-9 figure hits on a table-heavy but otherwise sound paper) gets
 * throttled hard. A gentler sqrt(rank+1) decay was tried first and didn't
 * throttle enough — a synthetic sanity check (10 same-severity Section-9-only
 * hits vs. 3 genuinely cross-section severity-4 hits) still scored the
 * single-section case higher under sqrt decay; switching to harmonic decay
 * flips that, as intended (backend scratch test, 2026-07-30, not committed).
 *
 * UNVALIDATED against real data: Anthropic API credit balance ran out (see
 * runs=3 calibration run, 2026-07-30) before this could be tested against
 * the 17-case human-judged set. The synthetic check above only confirms the
 * formula does what it's designed to do on a toy example, not that it
 * predicts real editorial risk. Rerun scripts/calibrate.js --runs=3 once
 * credits are restored and re-tune BAND_THRESHOLDS off real output before
 * relying on this in production.
 */
function withinSectionDecay(rank) {
  return round4(1 / (rank + 1));
}

function computeRawScore(scored) {
  const bySection = new Map();
  for (const s of scored) {
    if (!bySection.has(s.section)) bySection.set(s.section, []);
    bySection.get(s.section).push(s);
  }
  for (const group of bySection.values()) {
    group.sort((a, b) => b.contribution - a.contribution);
    group.forEach((s, rank) => {
      s.section_rank_decay = withinSectionDecay(rank);
    });
  }
  return scored.reduce((sum, s) => sum + s.contribution * s.section_rank_decay, 0);
}

/**
 * @param {Array<{signal: object, verification: object}>} verified
 * @param {number} [droppedCount]
 * @param {boolean} [taxonomyGap]
 */
function score(verified, droppedCount = 0, taxonomyGap = false) {
  const scored = [];

  for (const vs of verified) {
    const sid = vs.signal.signal_id;
    const severity = baseSeverityOf(sid);
    const weight = (BASIS_WEIGHT[vs.signal.basis] ?? 0) * (METHOD_WEIGHT[vs.verification.method] ?? 0);
    scored.push({
      signal_id: sid,
      section: sectionOf(sid),
      severity,
      weight: round4(weight),
      // Per-signal contribution before section-rank decay is applied in
      // computeRawScore(). `severity` itself stays 0-4 for display.
      contribution: round4(severityWeight(severity) * weight),
      evidence_quote: vs.signal.evidence_quote,
      basis: vs.signal.basis,
      verification_method: vs.verification.method,
    });
  }

  let total = computeRawScore(scored);
  const present = new Set(scored.map((s) => s.signal_id));

  const applied = [];
  for (const rule of COOCCURRENCE_RULES) {
    let subset = true;
    for (const sid of rule.combo) {
      if (!present.has(sid)) { subset = false; break; }
    }
    if (subset) {
      total *= rule.multiplier;
      applied.push(rule.rationale);
    }
  }

  total = round4(total);
  const band = BAND_THRESHOLDS.find(([cut]) => total >= cut)[1];

  // Deterministic ordering so two identical inputs serialise identically.
  scored.sort((a, b) => (b.contribution - a.contribution) || a.signal_id.localeCompare(b.signal_id));

  return {
    risk_band: band,
    raw_score: total,
    scored_signals: scored,
    applied_rules: applied,
    dropped_unverifiable: droppedCount,
    taxonomy_gap_flagged: taxonomyGap,
    stability: null, // populated by consistency.js
  };
}

module.exports = { score, computeRawScore, severityWeight, BASIS_WEIGHT, METHOD_WEIGHT, COOCCURRENCE_RULES, BAND_THRESHOLDS };
