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
// first entry whose cut the score clears wins. TODO calibrate against
// 15-20 historical CLASR reports.
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
      contribution: round4(severity * weight),
      evidence_quote: vs.signal.evidence_quote,
      basis: vs.signal.basis,
      verification_method: vs.verification.method,
    });
  }

  let total = scored.reduce((sum, s) => sum + s.contribution, 0);
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

module.exports = { score, BASIS_WEIGHT, METHOD_WEIGHT, COOCCURRENCE_RULES, BAND_THRESHOLDS };
