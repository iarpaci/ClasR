'use strict';

/**
 * Stability layer + measurement.
 *
 * Two things live here, and they are different:
 *
 *   runConsistent()   -> PRODUCTION. Runs the extraction N times and keeps
 *                        only signals that survive a frequency threshold.
 *                        This is what actually reduces run-to-run variance;
 *                        temperature=0 does not, because inference is not
 *                        bitwise deterministic (batching, kernel scheduling,
 *                        floating-point order).
 *
 *   measureStability() -> DIAGNOSTIC. Produces the number CLASR is currently
 *                        missing: how much does the pipeline disagree with
 *                        itself? Run this BEFORE relying on a change to get
 *                        a baseline, then after, on the same manuscripts.
 *                        Without it you cannot tell improvement from relief.
 */

const { extract } = require('./extractor');
const { score } = require('./scorer');
const { verifySignals } = require('./verify');
const priority = require('./priority');
const resolution = require('./resolution');

// A signal must appear in at least this fraction of runs to enter the report.
const CONSENSUS_THRESHOLD = 0.60;

// Lowered from the Python reference's 5 to control per-analysis API cost;
// override via { runs } on either call below.
const DEFAULT_RUNS = 3;

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1.0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = new Set([...a, ...b]).size;
  return inter / union;
}

async function singlePass(text, model) {
  const outcome = await extract(text, model ? { model } : {});
  if (!outcome.extraction) return { result: null, rejected: 0, usage: outcome.usage };
  const { kept, rejected } = verifySignals(outcome.extraction.signals, text);
  return {
    result: { kept, gap: outcome.extraction.noApplicableSignal },
    rejected: rejected.length,
    usage: outcome.usage,
  };
}

function emptyUsageTotals() {
  return { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
}

function addUsage(totals, usage) {
  if (!usage) return;
  totals.input_tokens += usage.input_tokens || 0;
  totals.output_tokens += usage.output_tokens || 0;
  totals.cache_read_input_tokens += usage.cache_read_input_tokens || 0;
  totals.cache_creation_input_tokens += usage.cache_creation_input_tokens || 0;
}

/**
 * @param {string} manuscriptText
 * @param {{ runs?: number, model?: string }} [opts]
 */
async function measureStability(manuscriptText, opts = {}) {
  const runs = opts.runs || DEFAULT_RUNS;
  const model = opts.model || null;

  const signalSets = [];
  const bands = [];
  let rejectedTotal = 0, keptTotal = 0, failed = 0;

  for (let i = 0; i < runs; i++) {
    const { result, rejected } = await singlePass(manuscriptText, model);
    if (!result) { failed += 1; continue; }
    const { kept, gap } = result;
    rejectedTotal += rejected;
    keptTotal += kept.length;
    signalSets.push(new Set(kept.map((vs) => vs.signal.signal_id)));
    bands.push(score(kept, rejected, gap).risk_band);
  }

  const pairs = [];
  for (let i = 0; i < signalSets.length; i++) {
    for (let j = i + 1; j < signalSets.length; j++) {
      pairs.push(jaccard(signalSets[i], signalSets[j]));
    }
  }

  const counts = new Map();
  for (const set of signalSets) for (const s of set) counts.set(s, (counts.get(s) || 0) + 1);
  const n = signalSets.length;

  const bandCounts = new Map();
  for (const b of bands) bandCounts.set(b, (bandCounts.get(b) || 0) + 1);
  const bandAgreement = bands.length
    ? round4(Math.max(...bandCounts.values()) / bands.length)
    : 0.0;

  const unstableSignals = {};
  for (const [sid, c] of counts) {
    if (c > 0 && c < n) unstableSignals[sid] = c;
  }

  const report = {
    runs: n,
    mean_pairwise_jaccard: pairs.length ? round4(pairs.reduce((a, b) => a + b, 0) / pairs.length) : 1.0,
    min_pairwise_jaccard: pairs.length ? round4(Math.min(...pairs)) : 1.0,
    band_agreement: bandAgreement,
    unstable_signals: unstableSignals,
    quote_rejection_rate: (rejectedTotal + keptTotal) > 0
      ? round4(rejectedTotal / (rejectedTotal + keptTotal))
      : 0.0,
    failed_runs: failed,
  };

  report.verdict = function verdict() {
    if (this.mean_pairwise_jaccard >= 0.90 && this.band_agreement >= 0.90) return 'SHIPPABLE';
    if (this.mean_pairwise_jaccard >= 0.75) return 'BORDERLINE — inspect unstable_signals';
    return 'NOT SHIPPABLE — signal detection is not reproducible';
  };

  return report;
}

/**
 * Production path: N extractions, consensus filter, then deterministic
 * scoring.
 * @param {string} manuscriptText
 * @param {{ runs?: number, model?: string }} [opts]
 */
async function runConsistent(manuscriptText, opts = {}) {
  const runs = opts.runs || DEFAULT_RUNS;
  const model = opts.model || null;

  const perRun = [];
  let rejectedTotal = 0, gaps = 0, successful = 0;
  const usageTotals = emptyUsageTotals();

  for (let i = 0; i < runs; i++) {
    const { result, rejected, usage } = await singlePass(manuscriptText, model);
    addUsage(usageTotals, usage);
    if (!result) continue;
    const { kept, gap } = result;
    successful += 1;
    rejectedTotal += rejected;
    gaps += gap ? 1 : 0;
    perRun.push(kept);
  }

  if (successful === 0) {
    throw new Error('every extraction pass failed; check API errors');
  }

  const counts = new Map();
  for (const kept of perRun) {
    for (const vs of kept) {
      const sid = vs.signal.signal_id;
      counts.set(sid, (counts.get(sid) || 0) + 1);
    }
  }
  const consensus = new Set(
    [...counts.entries()].filter(([, c]) => c / successful >= CONSENSUS_THRESHOLD).map(([s]) => s)
  );

  // Keep one representative per surviving signal: prefer an exactly-located
  // quote so the report cites the strongest available evidence.
  const best = new Map();
  for (const kept of perRun) {
    for (const vs of kept) {
      const sid = vs.signal.signal_id;
      if (!consensus.has(sid)) continue;
      const incumbent = best.get(sid);
      if (!incumbent || (vs.verification.method === 'exact' && incumbent.verification.method !== 'exact')) {
        best.set(sid, vs);
      }
    }
  }

  const bestSignals = [...best.values()];
  const report = score(bestSignals, rejectedTotal, gaps > successful / 2);
  report.usage = usageTotals;
  report.stability = {
    runs: successful,
    consensus_threshold: CONSENSUS_THRESHOLD,
    signal_run_counts: Object.fromEntries(counts),
    dropped_below_consensus: [...counts.keys()].filter((s) => !consensus.has(s)).sort(),
  };

  // Kit 44 v1.7 PAS block — see priority.js.
  const { eligible, excluded } = priority.buildCandidates(bestSignals);
  const pas = priority.select(eligible, excluded);
  report.priority_action_signals = {
    entries: pas.entries,
    excluded_count: pas.excluded.length,
    note: pas.note,
  };
  report.priority_action_signals_text = priority.render(pas);

  // Categorical resolution layer (kits 29, 35, 42, 03 §8b) — see
  // resolution.js's header for why this is additive to raw_score/risk_band
  // rather than a replacement ("Option A").
  const presentIds = report.scored_signals.map((s) => s.signal_id);
  const deskReject = resolution.deskRejectProfile(presentIds, report.scored_signals.length);
  const overreach = resolution.overreachPattern(report.scored_signals);
  const reproRisk = resolution.reproducibilityRisk(presentIds);
  report.desk_reject_profile = deskReject;
  report.overreach_pattern = overreach;
  report.reproducibility_risk = reproRisk;
  report.integrated_posture = resolution.integratedPosture(
    overreach.pattern,
    deskReject.produced ? deskReject.cooccurrence : null,
    reproRisk
  );

  return report;
}

module.exports = { measureStability, runConsistent, jaccard, CONSENSUS_THRESHOLD, DEFAULT_RUNS };
