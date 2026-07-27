'use strict';

/**
 * PRIORITY ACTION SIGNALS selection — Kit 44 v1.7.
 *
 * Ported from a parallel Python implementation of the same kit-derivation
 * problem (see taxonomy.js's SCHEMA-SIZE ISSUE note for the audit that
 * surfaced it). Phase 14 of this taxonomy's port correctly identified that
 * Kit 44 contributes zero new taxonomy entries — it selects and ranks
 * signals other kits already produced — but never built the selection
 * logic itself. This file is that logic.
 *
 * Kit 44 v1.7, applied in the order it specifies:
 *   §1.C  negative selection      binds BEFORE the cascade
 *         C1 FUTURE_CLAIM exclusion (inert here — see FUTURE_CLAIM_LABEL)
 *         C2 CROSS_TABLE_NUMERICAL_ANOMALY auto-elevation to Tier 2 (inert
 *            here — see the same note)
 *         C3 ASSUMPTION_VALIDITY_SCOPE_MISMATCH elevation to Tier 2
 *   §5    evidence sufficiency    no locatable evidence -> not PAS-eligible
 *         (in practice this never fires here: verify.js already drops any
 *         signal whose quote didn't locate before this module ever sees it)
 *   §1.A  tier cascade            Tier N exhausted before Tier N+1
 *   §1.B  intra-tier tiebreaker   inference type -> section -> confidence
 *                                 -> alphabetical (last resort)
 *   §1    caps                    max 5; min 3 but never pad
 *
 * Given the same verified signal set and the same manuscript-level
 * condition flags, the block is byte-identical every time.
 *
 * FUTURE_CLAIM_LABEL / cross-table conditions. Kit 44 Rule C1 references a
 * signal type (FUTURE_CLAIM_EVIDENCE_BRIDGE_WEAK) and Rule C2 references
 * CROSS_TABLE_NUMERICAL_ANOMALY — taxonomy.js's Phase 14 note documents
 * both as searched for across every kit read in this project and not
 * found; the Python reference independently hit the same wall (it
 * hardcodes the same label string with no registry entry backing it
 * either — cross-validating that the gap is real, not a miss on either
 * side). Both rules are implemented as inert no-ops here: correct if either
 * signal is ever added to the taxonomy, harmless while it isn't.
 */

const { sectionOf, pasTierOf } = require('./taxonomy');
const { InferenceType } = require('./schema');

const MAX_SLOTS = 5;
const MIN_SLOTS = 3;

// Kit 44 v1.7 §4 / CORE v1.9.0.
const CONFIDENCE_CEILING = {
  [InferenceType.OBSERVATION]: 0.90,
  [InferenceType.QUANTITATIVE]: 0.85,
  [InferenceType.INTERPRETIVE]: 0.75,
};

// Kit 44 v1.7 §1.B step 1 — Observation > Quantitative > Interpretive.
const INFERENCE_RANK = {
  [InferenceType.OBSERVATION]: 0,
  [InferenceType.QUANTITATIVE]: 1,
  [InferenceType.INTERPRETIVE]: 2,
};

// Kit 44 v1.7 §1.B step 2 — "SECTION 0 > SECTION 1 > ... > SECTION 10."
const SECTION_ORDER = {
  SECTION_0_MACRO_FRAME: 0,
  SECTION_1_AIM_SCOPE: 1,
  SECTION_2_CONCEPTUAL: 2,
  SECTION_3_METHODOLOGICAL: 3,
  SECTION_4_ARGUMENTATION: 4,
  SECTION_5_NUMERICAL_SPATIAL: 5,
  SECTION_6_LANGUAGE_HEDGING: 6,
  SECTION_7_STRUCTURAL_INTEGRITY: 7,
  SECTION_8_LIMITS_UNCERTAINTIES: 8,
  SECTION_9_FIGURE_TABLE_INTEGRITY: 9,
  SECTION_10_REPRODUCIBILITY: 10,
};

// Kit 44 v1.7 §1.C1 — exclusion threshold. See file header: inert until/
// unless this signal is added to the taxonomy.
const FUTURE_CLAIM_LABEL = 'FUTURE_CLAIM_EVIDENCE_BRIDGE_WEAK';
const FUTURE_CLAIM_CONF_FLOOR = 0.74;

/**
 * The model declares confidence; code caps it. A 0.98 declared on an
 * INTERPRETIVE finding becomes structurally impossible rather than
 * something a human reviewer has to catch.
 *
 * Also clamps to [0, 1] defensively — Structured Outputs rejects a JSON
 * Schema min/max constraint on a `number` field (confirmed live,
 * 2026-07-26: "properties maximum, minimum are not supported"), so
 * schema.js can't enforce the range itself; this is the only backstop.
 */
function enforceConfidenceCeiling(declared, inferenceType) {
  const clamped = Math.max(0, Math.min(1, Number(declared) || 0));
  const ceiling = CONFIDENCE_CEILING[inferenceType] ?? 0.75;
  const applied = Math.min(clamped, ceiling);
  return { declared: round2(clamped), applied: round2(applied), capped: applied < clamped };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function sortKey(cand) {
  return [
    INFERENCE_RANK[cand.inferenceType] ?? 9,
    SECTION_ORDER[cand.section] ?? 99,
    -cand.confidence.applied,
  ];
}

function compareCandidates(a, b) {
  const ka = sortKey(a), kb = sortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; // alphabetical, last resort
}

/**
 * Turns verified signals ({ signal, verification } from verify.js) into
 * tier-assigned PAS candidates.
 *
 * The manuscript-level condition sets (s10CriticalAbsent, etc.) are Kit
 * 44's negative-selection inputs — they are per-manuscript facts, not
 * something to guess from the signal alone, so they are accepted as
 * parameters rather than inferred here. None are currently wired up from
 * the extraction pipeline (that requires the categorical-resolution layer,
 * not yet built); omit them and every escalation rule simply doesn't fire,
 * leaving base tiers from taxonomy.js's PAS_TIERS in effect.
 *
 * @param {Array<{signal: object, verification: object}>} kept
 * @param {{
 *   s10CriticalAbsent?: Set<string>,
 *   compoundFlagActive?: boolean,
 *   crossTableConditions?: Set<string>,
 *   assumptionScopeConditions?: Set<string>,
 *   futureClaimFieldNormal?: Set<string>,
 * }} [opts]
 */
function buildCandidates(kept, opts = {}) {
  const s10CriticalAbsent = opts.s10CriticalAbsent || new Set();
  const compoundFlagActive = Boolean(opts.compoundFlagActive);
  const crossTableConditions = opts.crossTableConditions || new Set();
  const assumptionScopeConditions = opts.assumptionScopeConditions || new Set();
  const futureClaimFieldNormal = opts.futureClaimFieldNormal || new Set();

  const eligible = [];
  const excluded = [];

  for (const vs of kept) {
    const label = vs.signal.signal_id;
    const conf = enforceConfidenceCeiling(vs.signal.confidence, vs.signal.inference_type);
    const evidence = vs.signal.evidence_quote || '';

    let tier = pasTierOf(label);
    let elevatedFrom = null;

    // Kit 44 §1 Tier 1 — S10 CRITICAL ABSENT auto-escalation.
    if (s10CriticalAbsent.has(label)) tier = 1;

    // §1.C2 — multi-table Observation anomaly -> Tier 2 (inert, see header).
    if (crossTableConditions.has(label) && vs.signal.inference_type === InferenceType.OBSERVATION) {
      elevatedFrom = tier; tier = 2;
    }

    // §1.C3 — load-bearing assumption scope mismatch -> Tier 2.
    if (assumptionScopeConditions.has(label)) {
      elevatedFrom = tier; tier = 2;
    }

    const cand = {
      label,
      tier: tier ?? 99,
      section: sectionOf(label),
      inferenceType: vs.signal.inference_type,
      confidence: conf,
      evidence,
      inference: vs.signal.inference,
      elevatedFrom,
      exclusionReason: '',
    };

    // §5 — evidence sufficiency.
    if (!evidence) {
      excluded.push({ ...cand, exclusionReason: 'no locatable evidence (Kit 44 §5)' });
      continue;
    }

    // §1.C1 — FUTURE_CLAIM exclusion; BOTH conditions required (inert here).
    if (label === FUTURE_CLAIM_LABEL &&
        conf.applied < FUTURE_CLAIM_CONF_FLOOR &&
        futureClaimFieldNormal.has(label)) {
      excluded.push({
        ...cand,
        exclusionReason:
          `Kit 44 §1.C1 — confidence ${conf.applied} < ${FUTURE_CLAIM_CONF_FLOOR} ` +
          'and forward-looking claim is field-normal',
      });
      continue;
    }

    if (tier === null) {
      excluded.push({ ...cand, exclusionReason: 'no PAS tier assigned in registry' });
      continue;
    }

    eligible.push(cand);
  }

  if (compoundFlagActive) {
    eligible.push({
      label: 'COMPOUND_RISK_FLAG',
      tier: 1,
      section: 'SECTION_10_REPRODUCIBILITY',
      inferenceType: InferenceType.OBSERVATION,
      confidence: enforceConfidenceCeiling(0.90, InferenceType.OBSERVATION),
      evidence: 'SECTION 10 module status table',
      inference: 'Multiple reproducibility modules are simultaneously absent at post-modulation HIGH or CRITICAL severity.',
      elevatedFrom: null,
      exclusionReason: '',
    });
  }

  return { eligible, excluded };
}

/** Kit 44 §1.A tier cascade with §1.B tiebreaker inside each tier. */
function select(eligible, excluded = [], partialInput = false) {
  const tiers = [...new Set(eligible.map((c) => c.tier))].sort((a, b) => a - b);
  const chosen = [];

  for (const tier of tiers) {
    if (chosen.length >= MAX_SLOTS) break;
    const bucket = eligible.filter((c) => c.tier === tier).sort(compareCandidates);
    for (const cand of bucket) {
      if (chosen.length >= MAX_SLOTS) break;
      chosen.push(cand);
    }
  }

  // Structured-block signals count as one entry each (Kit 44 §1 general) —
  // dedup defensively even though callers shouldn't hand in duplicates.
  const seen = new Set();
  const deduped = [];
  for (const c of chosen) {
    if (seen.has(c.label)) continue;
    seen.add(c.label);
    deduped.push(c);
  }

  // Below MIN_SLOTS: list everything detected. Never pad (Kit 44 §1.A step 5).
  return {
    entries: deduped,
    excluded,
    partialInput,
    note: partialInput ? '[Partial input — coverage limited to available sections]' : '',
    isEmpty: deduped.length === 0,
  };
}

/** Kit 44 §2 output format. Card ends at Confidence — nothing after. */
function render(block) {
  const bar = '━'.repeat(34);
  const lines = [bar, 'PRIORITY ACTION SIGNALS'];
  if (block.note) lines.push(block.note);
  lines.push(bar);

  if (block.isEmpty) {
    lines.push('No high-priority signals detected.', bar);
    return lines.join('\n');
  }

  block.entries.forEach((c, i) => {
    lines.push(
      `[${i + 1}] ${c.label} — ${c.section}`,
      `    Evidence: ${c.evidence}`,
      `    Inference type: ${c.inferenceType}`,
      `    Inference: ${c.inference}`,
      `    Confidence: ${c.confidence.applied.toFixed(2)}`,
      ''
    );
  });
  lines.push(bar);
  return lines.join('\n');
}

module.exports = {
  MAX_SLOTS,
  MIN_SLOTS,
  CONFIDENCE_CEILING,
  INFERENCE_RANK,
  SECTION_ORDER,
  FUTURE_CLAIM_LABEL,
  FUTURE_CLAIM_CONF_FLOOR,
  enforceConfidenceCeiling,
  buildCandidates,
  select,
  render,
};
