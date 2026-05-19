const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

const KIT_ORDER = [
  // Tier 1 — Core (mandatory)
  '01_EN_MASTER_SECTION_KIT_v1_0.txt',
  '02_EN_SECTION-DEPTH_KIT_v1_0.txt',
  '03_EN_UNIFIED-OUTPUT_KIT_v1_1.txt',
  '04_EN_Q1-GATE_KIT_v1_0.txt',
  '05_EN_Q2-GATE_KIT_v1_0.txt',
  '06_EN_Q3-GATE_KIT_v1_0.txt',
  // Tier 2 — Governance (mandatory)
  '07_EN_Q-VARIANT_ADDENDUM_v1_0.txt',
  '08_EN_AUTO-Q_DETECTION_KIT_v1_0.txt',
  '09_EN_CALIBRATION-DEEP_KIT_v1_2.txt',
  '12a_EN_LENS-BRIDGE-CORE_v2_0.txt',
  '12b_EN_LENS-BRIDGE-COLLISION_v2_0.txt',
  '14_EN_VERSION_FREEZE_v2_2.txt',
  '17_EN_PARTIAL_INPUT_KIT_v1_0.txt',
  '18_EN_REVISION_ROUND_KIT_v1_0.txt',
  '31_EN_OUTPUT_MODE_KIT_v1_0.txt',
  'INPUT_VALIDATION_KIT_v1_0.txt',
  'OUTPUT_LANGUAGE_KIT_v1_0.txt',
  'OUTPUT_SCOPE_KIT_v1_0.txt',
  'SESSION_CONTINUITY_KIT_v1_0.txt',
  // Tier 3 — Extensions (removable)
  '10_EN_VERBAL_LENS_KIT_v1_0.txt',
  '11_EN_LENS-EXT_KITS_v1_0.txt',
  '13_EN_STRUCTURAL_QA_KITS_v1_0.txt',
  '15_EN_SILENCE_LENS_KIT_v1_0.txt',
  '16_EN_ORIENTATION_LENS_KIT_v1_0.txt',
  '19_EN_INTEGRITY_SIGNAL_KIT_v1_0.txt',
  '20_EN_CITATION_BEHAVIOR_KIT_v1_0.txt',
  '21_EN_ABSTRACT_BODY_COHERENCE_KIT_v1_0.txt',
  '22_EN_REPLICATION_SIGNAL_KIT_v1_0.txt',
  '23_EN_CONTRIBUTION_FRAMING_KIT_v1_0.txt',
  '24_EN_DISCUSSION_SCOPE_DRIFT_KIT_v1_1.txt',
  '25_EN_ARGUMENT_SYMMETRY_KIT_v1_1.txt',
  '26_EN_NEGATIVE_RESULT_VISIBILITY_KIT_v1_0.txt',
  '27_EN_INTERDISCIPLINARY_TENSION_KIT_v1_0.txt',
  '28_EN_READER_MODEL_KIT_v1_0.txt',
  '29_EN_DESK_REJECT_SIGNAL_KIT_v1_0.txt',
  '30_EN_ARGUMENT_CHAIN_KIT_v1_0.txt',
  '32_EN_ARGUMENT_LOAD_KIT_v1_0.txt',
  '33_EN_CONCEPT_EVIDENCE_BRIDGE_KIT_v1_0.txt',
  '34_EN_CONCLUSION_INTEGRITY_KIT_v1_0.txt',
  '35_EN_OVERREACH_SIGNAL_KIT_v1_0.txt',
  '36_EN_UNCERTAINTY_VISIBILITY_KIT_v1_0.txt',
  '37_EN_HEDGING_CALIBRATION_KIT_v1_0.txt',
  '38_EN_JOURNAL_SENSITIVITY_KIT_v1_0.txt',
  '39_EN_METHODOLOGICAL_RHETORIC_KIT_v1_0.txt',
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

module.exports = { assembleSystemPrompt };
