const fs = require('fs');
const path = require('path');

// KIT_ORDER reconciled 2026-08-01 against Design/CLASR 260801.zip (a kit-
// registry audit, partly done in an earlier session): kits 29/31/35/36/38/46
// bumped to their current versions (reference-only fixes except 31 and 46,
// which drop a Turkish-language command path that contradicted CORE
// v1.9.0's English-only lock), kit 14 replaced with a reconciled snapshot,
// and 5 kit files removed that had been in the live prompt by mistake (kit
// 22, retired; INPUT_VALIDATION/OUTPUT_LANGUAGE/OUTPUT_SCOPE/
// SESSION_CONTINUITY kits, which belong to a different sibling product).
// See inline comments below for per-kit detail.

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

const KIT_ORDER = [
  // Tier 1 — Core structure (mandatory)
  '01_CLASR_MASTER_SECTION_KIT_v1_2.txt',
  '02_CLASR_SECTION_DEPTH_KIT_v1_2.txt',
  '03_CLASR_UNIFIED_OUTPUT_KIT_v1_3.txt',
  '04_CLASR_Q1_GATE_KIT_v1_0.txt',
  '05_CLASR_Q2_GATE_KIT_v1_0.txt',
  '06_CLASR_Q3_GATE_KIT_v1_0.txt',

  // Tier 2 — Governance (mandatory)
  '07_CLASR_Q_VARIANT_ADDENDUM_v1_0.txt',
  '08_CLASR_AUTO_Q_DETECTION_KIT_v1_0.txt',
  '09_CLASR_CALIBRATION_DEEP_KIT_v1_5.txt',
  '12a_CLASR_LENS_BRIDGE_CORE_v3_0.txt',
  '12b_CLASR_LENS_BRIDGE_COLLISION_v3_0.txt',
  '14_CLASR_VERSION_FREEZE_v3_2_RECONCILED.txt',
  '17_CLASR_PARTIAL_INPUT_KIT_v1_1.txt',
  '18_CLASR_REVISION_ROUND_KIT_v1_0.txt',
  '31_CLASR_OUTPUT_MODE_KIT_v1_5.txt',
  // INPUT_VALIDATION_KIT / OUTPUT_LANGUAGE_KIT / OUTPUT_SCOPE_KIT /
  // SESSION_CONTINUITY_KIT removed 2026-08-01: a kit-registry reconciliation
  // (Design/CLASR 260801.zip, 14_CLASR_VERSION_FREEZE_v3_2_RECONCILED's own
  // correction note) traced these four to a sibling product (V-CLASR
  // GLOBAL), not this project — they don't appear anywhere in
  // 00_CLASR_INSTALLATION_GUIDE_v4_13's own Tier 2 manifest (independently
  // verified against that file). They'd been in the live system prompt by
  // mistake.

  // Tier 3 — Extensions (kits 10–39)
  '10_CLASR_VERBAL_LENS_KIT_v1_1.txt',
  '11_CLASR_LENS_EXT_KITS_v1_0.txt',
  '13_CLASR_STRUCTURAL_QA_KITS_v1_0.txt',
  '15_CLASR_SILENCE_LENS_KIT_v1_0.txt',
  '16_CLASR_ORIENTATION_LENS_KIT_v1_0.txt',
  '19_CLASR_INTEGRITY_SIGNAL_KIT_v1_0.txt',
  '20_CLASR_CITATION_BEHAVIOR_KIT_v1_0.txt',
  '21_CLASR_ABSTRACT_BODY_COHERENCE_KIT_v1_0.txt',
  // 22_EN_REPLICATION_SIGNAL_KIT removed 2026-08-01: retired, replaced by
  // kit 42 (per 00_CLASR_INSTALLATION_GUIDE_v4_13's own "FILES THAT MUST
  // NOT BE PRESENT" list) — it had been left in KIT_ORDER by mistake and
  // was actively part of the live system prompt.
  '23_CLASR_CONTRIBUTION_FRAMING_KIT_v1_0.txt',
  '24_CLASR_DISCUSSION_SCOPE_DRIFT_KIT_v1_1.txt',
  '25_CLASR_ARGUMENT_SYMMETRY_KIT_v1_1.txt',
  '26_CLASR_NEGATIVE_RESULT_VISIBILITY_KIT_v1_0.txt',
  '27_CLASR_INTERDISCIPLINARY_TENSION_KIT_v1_0.txt',
  '28_CLASR_READER_MODEL_KIT_v1_0.txt',
  '29_CLASR_DESK_REJECT_SIGNAL_KIT_v1_1.txt',
  '30_CLASR_ARGUMENT_CHAIN_KIT_v1_0.txt',
  '32_CLASR_ARGUMENT_LOAD_KIT_v1_0.txt',
  '33_CLASR_CONCEPT_EVIDENCE_BRIDGE_KIT_v1_0.txt',
  '34_CLASR_CONCLUSION_INTEGRITY_KIT_v1_0.txt',
  '35_CLASR_OVERREACH_SIGNAL_KIT_v1_1.txt',
  '36_CLASR_UNCERTAINTY_VISIBILITY_KIT_v1_1.txt',
  '37_CLASR_HEDGING_CALIBRATION_KIT_v1_0.txt',
  '38_CLASR_JOURNAL_SENSITIVITY_KIT_v1_1.txt',
  '39_CLASR_METHODOLOGICAL_RHETORIC_KIT_v1_0.txt',

  // Tier 4 — Extended kits v1.9.0 (kits 40–57)
  '40_CLASR_ARGUMENT_INTEGRITY_KIT_v1_2.txt',
  '41_CLASR_FIGURE_TABLE_INTEGRITY_KIT_v1_1.txt',
  '42_CLASR_REPRODUCIBILITY_OPEN_SCIENCE_KIT_v1_2.txt',
  '42b_CLASR_REPRODUCIBILITY_FIELD_TYPE_SEVERITY_PATCH_v1_0.txt',
  '43_CLASR_SOURCE_INTEGRITY_KIT_v1_1.txt',
  '44_CLASR_ACTION_PRIORITY_BLOCK_KIT_v1_7.txt',
  '45_CLASR_REPORTING_STANDARD_KIT_v1_0.txt',
  '46_CLASR_GOLD_STANDARD_KIT_v1_1.txt',
  '47_CLASR_EPISTEMIC_FRAME_KIT_v1_0.txt',
  '48_CLASR_CONCEPT_LIFECYCLE_KIT_v1_0.txt',
  '49_CLASR_METHODOLOGICAL_VERBAL_RISK_KIT_v1_0.txt',
  '50_CLASR_CROSS_CONSISTENCY_KIT_v1_0.txt',
  '51_CLASR_CITATION_INTEGRITY_MODULE_M17_v1_0.txt',
  '52_CLASR_EXECUTIVE_SUMMARY_BLOCK_v1_0_2.txt',
  '53_CLASR_LAYER_CONVERGENCE_KIT_v1_0.txt',
  '54_CLASR_REPORT_MODE_KIT_v1_0_2.txt',
  '55_CLASR_HTML_REPORT_KIT_v1_1.txt',
  '57_CLASR_BETA_SIGNAL_KIT_v1_1.txt',

  // BETA manager kits
  'BETA-MANAGER_CALIBRATION-KIT_v1_2.txt',
  'BETA-MANAGER_CLASR-PROFILE-KIT_v1_2_.txt',
  'CLASR_BETA_ACCUMULATION_v1_6.txt',
];

let _systemPrompt = null;

function assembleSystemPrompt() {
  if (_systemPrompt) return _systemPrompt;

  const core = fs.readFileSync(path.join(PROMPTS_DIR, 'core.txt'), 'utf-8');
  const kits = KIT_ORDER.map(file => {
    const filePath = path.join(PROMPTS_DIR, 'kits', file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[clasr] Kit file not found: ${file}`);
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  }).filter(Boolean);

  _systemPrompt = [core, ...kits].join('\n\n---\n\n');
  console.log(`[clasr] System prompt assembled: ${_systemPrompt.length} chars, ${kits.length} kits`);
  return _systemPrompt;
}

// Reformat-only prompt for turning an already-generated, mode-agnostic CLASR
// report into an Author/Signal/Advisor Mode view (kit 31) without re-running
// full detection. Kit 31 itself doesn't define section/structure conventions
// (it only formats what CORE + kit 03 already produced), so both are
// included -- everything else (kits 04-57, the actual detection kits) is
// deliberately left out since the input is already-complete signal output,
// not a manuscript to analyze. ~56K chars vs. ~693K for the full assembly.
const REFORMAT_KITS = [
  '03_CLASR_UNIFIED_OUTPUT_KIT_v1_3.txt',
  '31_CLASR_OUTPUT_MODE_KIT_v1_5.txt',
];

let _reformatPrompt = null;

function assembleReformatPrompt() {
  if (_reformatPrompt) return _reformatPrompt;

  const core = fs.readFileSync(path.join(PROMPTS_DIR, 'core.txt'), 'utf-8');
  const kits = REFORMAT_KITS.map(file => fs.readFileSync(path.join(PROMPTS_DIR, 'kits', file), 'utf-8'));

  _reformatPrompt = [core, ...kits].join('\n\n---\n\n');
  console.log(`[clasr] Reformat prompt assembled: ${_reformatPrompt.length} chars`);
  return _reformatPrompt;
}

module.exports = { assembleSystemPrompt, assembleReformatPrompt };
