'use strict';

/**
 * Categorical resolution — Kits 29, 35, 03 §8b.
 *
 * "OPTION A" (2026-07-26, chosen deliberately over rewriting scorer.js).
 * CORE v1.9.0 forbids "composite quality scores... or any summarizing
 * metric that collapses signal complexity into a single number" —
 * scorer.js's raw_score/risk_band is exactly that, and it is NOT being
 * removed. Auditing a parallel Python implementation of the same
 * kit-derivation problem revealed that its own "categorical resolution"
 * layer doesn't replace an arithmetic total-score function at all — CLASR's
 * kits never define one. Kit 03 §8b's integrated_posture() is a ceiling of
 * exactly THREE already-computed profile dimensions (overreach pattern,
 * desk-reject zone co-occurrence, reproducibility risk), not an aggregate
 * over the full signal set. Replacing risk_band's derivation with that
 * ceiling was considered and rejected for now: two of the three inputs
 * (desk-reject zones, overreach pattern) have thin signal coverage in this
 * taxonomy today (see DESK_REJECT_ZONE_SIGNALS's documented gaps in
 * taxonomy.js), so deriving the headline risk_band from their ceiling right
 * now would produce something that LOOKS more CORE-compliant while being
 * LESS informative than the existing arithmetic score. So: this file adds
 * the three categorical layers as new report fields, additive to
 * raw_score/risk_band, not a replacement for them. Revisit the replacement
 * once desk-reject and overreach have fuller signal coverage.
 */

const { DESK_REJECT_ZONE_SIGNALS, OVERREACH_SIGNALS, REPRODUCIBILITY_CRITICAL_SIGNALS } = require('./taxonomy');

// ---------------------------------------------------------------------------
// Kit 29 §4 — desk-reject zone map. Count of active zones, no score.
// ---------------------------------------------------------------------------
const DESK_REJECT_ZONES = Object.keys(DESK_REJECT_ZONE_SIGNALS);

/**
 * @param {string[]} presentSignalIds - every signal_id in the final report
 *   (scored_signals), not just PAS-eligible ones.
 * @param {number} totalKitSignals - Kit 29 §10: needs >= 2 kit signals
 *   present anywhere in the report for co-occurrence mapping to run at all.
 */
function deskRejectProfile(presentSignalIds, totalKitSignals) {
  const present = new Set(presentSignalIds);
  const zones = {};
  for (const zone of DESK_REJECT_ZONES) {
    zones[zone] = DESK_REJECT_ZONE_SIGNALS[zone].some((sid) => present.has(sid));
  }
  const activeCount = Object.values(zones).filter(Boolean).length;

  if (totalKitSignals < 2) {
    return {
      zones, activeCount, cooccurrence: 'NOT_PRODUCED', produced: false,
      note: '[Desk-reject synthesis: insufficient signal density]',
    };
  }
  const cooccurrence = activeCount >= 3 ? 'HIGH' : activeCount === 2 ? 'MODERATE' : activeCount === 1 ? 'LOW' : 'NONE';
  return { zones, activeCount, cooccurrence, produced: true, note: '' };
}

// ---------------------------------------------------------------------------
// Kit 35 §4 — overreach aggregate pattern.
// ---------------------------------------------------------------------------
const SEVERITY_MAGNITUDE_ORDER = { 1: 0, 2: 1, 3: 1, 4: 2 }; // -> MINOR/MODERATE/MAJOR rank
const MAGNITUDE_LABEL = ['MINOR', 'MODERATE', 'MAJOR'];

/**
 * @param {Array<{signal_id: string, severity: number, section: string}>} scoredSignals
 *   scorer.js's scored_signals array (or any subset) — filtered internally
 *   to the 8 kit-35 overreach types.
 */
function overreachPattern(scoredSignals) {
  const instances = scoredSignals.filter((s) => OVERREACH_SIGNALS.includes(s.signal_id));
  if (!instances.length) {
    return { pattern: 'NONE', instances: 0, types: [], highestSeverity: '—', sections: [] };
  }
  const types = [...new Set(instances.map((s) => s.signal_id))].sort();
  const sections = [...new Set(instances.map((s) => s.section))].sort();
  const highestRank = Math.max(...instances.map((s) => SEVERITY_MAGNITUDE_ORDER[s.severity] ?? 0));
  const highestSeverity = MAGNITUDE_LABEL[highestRank];

  let pattern;
  if (instances.length >= 3 && types.length >= 2 && sections.length >= 2) pattern = 'SYSTEMATIC';
  else if (instances.length >= 2) pattern = 'COMPOUND';
  else pattern = 'ISOLATED';

  return { pattern, instances: instances.length, types, highestSeverity, sections };
}

// ---------------------------------------------------------------------------
// Kit 42 §4 — reproducibility risk from CRITICAL-tier module presence.
// Approximation documented in taxonomy.js: PARTIAL vs ABSENT isn't
// distinguished in this taxonomy, so any hit is treated as ABSENT (the
// more severe case) for this specific resolution — a real PARTIAL would
// be read as more alarming here than Kit 42's own rules intend.
// ---------------------------------------------------------------------------
function reproducibilityRisk(presentSignalIds) {
  const present = new Set(presentSignalIds);
  const absentCount = REPRODUCIBILITY_CRITICAL_SIGNALS.filter((sid) => present.has(sid)).length;
  if (absentCount === 0) return 'LOW';
  if (absentCount === 1) return 'HIGH';
  if (absentCount === 2) return 'HIGH'; // Kit 42 §4: "escalated by Compound Risk Rule" — same label, flagged via compound flag elsewhere, not a distinct rank here
  return 'CRITICAL'; // 3 or more
}

// ---------------------------------------------------------------------------
// Kit 03 §8b — INTEGRATED RISK POSTURE. Ceiling, never averaged, never softened.
// ---------------------------------------------------------------------------
const POSTURE_RANK = {
  NONE: 0, ISOLATED: 1, COMPOUND: 2, SYSTEMATIC: 3, // overreach pattern
  LOW: 0, MODERATE: 2, HIGH: 3, // desk-reject cooccurrence
  MEDIUM: 2, CRITICAL: 3, // reproducibility risk
};
const RANK_TO_POSTURE = { 0: 'LOW', 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' };

/**
 * 'Resolution is always the ceiling of the three inputs — never averaged,
 * never softened.' A null/undefined dimension is not assessable and is
 * skipped; `partial` is raised instead of substituting a default.
 * @param {string|null} [overreach] one of overreachPattern().pattern
 * @param {string|null} [deskReject] one of deskRejectProfile().cooccurrence
 * @param {string|null} [reproducibility] one of reproducibilityRisk()
 */
function integratedPosture(overreach, deskReject, reproducibility) {
  const given = { overreach, deskReject, reproducibility };
  const present = Object.fromEntries(
    Object.entries(given).filter(([, v]) => v != null && v !== 'NOT_PRODUCED' && v !== 'NONE')
  );
  if (!Object.keys(present).length) return { level: 'LOW', inputs: {}, partial: true };
  const ceiling = Math.max(...Object.values(present).map((v) => POSTURE_RANK[v] ?? 0));
  return {
    level: RANK_TO_POSTURE[ceiling],
    inputs: present,
    partial: Object.keys(present).length < 3,
  };
}

module.exports = {
  deskRejectProfile,
  overreachPattern,
  reproducibilityRisk,
  integratedPosture,
  DESK_REJECT_ZONES,
};
