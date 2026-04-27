const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

const KIT_ORDER = [
  '01_EN_MASTER_SECTION_KIT_v1_0.txt',
  '02_EN_SECTION-DEPTH_KIT_v1_0.txt',
  '03_EN_UNIFIED-OUTPUT_KIT_v1_0.txt',
  '04_EN_Q1-GATE_KIT_v1_0.txt',
  '05_EN_Q2-GATE_KIT_v1_0.txt',
  '06_EN_Q3-GATE_KIT_v1_0.txt',
  '07_EN_Q-VARIANT_ADDENDUM_v1_0.txt',
  '08_EN_AUTO-Q_DETECTION_KIT_v1_0.txt',
  '09_EN_CALIBRATION-DEEP_KIT_v1_1.txt',
  '10_EN_VERBAL_LENS_KIT_v1_0.txt',
  '11_EN_LENS-EXT_KITS_v1_0.txt',
  '12_EN_LENS-BRIDGE_KIT_v1_4.txt',
  '13_EN_STRUCTURAL_QA_KITS_v1_0.txt',
  '14_EN_VERSION_FREEZE_v1_5.txt',
  '15_EN_SILENCE_LENS_KIT_v1_0.txt',
  '16_EN_ORIENTATION_LENS_KIT_v1_0.txt',
  '17_EN_PARTIAL_INPUT_KIT_v1_0.txt',
  '18_EN_REVISION_ROUND_KIT_v1_0.txt',
  '19_EN_INTEGRITY_SIGNAL_KIT_v1_0.txt',
  '20_EN_CITATION_BEHAVIOR_KIT_v1_0.txt',
  '21_EN_ABSTRACT_BODY_COHERENCE_KIT_v1_0.txt',
  '22_EN_REPLICATION_SIGNAL_KIT_v1_0.txt',
  '23_EN_CONTRIBUTION_FRAMING_KIT_v1_0.txt',
  '24_EN_DISCUSSION_SCOPE_DRIFT_KIT_v1_0.txt',
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
