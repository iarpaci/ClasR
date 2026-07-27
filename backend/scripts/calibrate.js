'use strict';

/**
 * Calibration harness for backend/src/services/clasr-engine/scorer.js.
 *
 * scorer.js's base_severity and BAND_THRESHOLDS are placeholders. Calibration
 * method (trialfiles/README.md §3, from the Python reference this was ported
 * from): take 15-20 real past manuscripts, write down the risk band a human
 * would actually assign to each, run this engine on all of them, and adjust
 * BAND_THRESHOLDS until the two agree. This script does the "run + compare"
 * half; the band judgments themselves have to come from a human — that's the
 * part of the file's own header comment that calls this "CLASR's real IP".
 *
 * Usage:
 *   cd backend
 *   node scripts/calibrate.js [path/to/cases.json] [--runs=N]
 *
 * cases.json defaults to scripts/calibration-cases.json (see
 * scripts/calibration-cases.example.json for the format). Each case:
 *   { "id": "short label", "file": "absolute path to .docx/.pdf/.txt",
 *     "humanBand": "LOW" | "MEDIUM" | "ELEVATED" | "HIGH" }
 * "file" can be replaced with "text" (inline manuscript text) for quick cases.
 *
 * --runs=N (default 1): passed straight to runConsistent(). Keep at 1 while
 * iterating on thresholds to control cost; bump to 3+ for a final check once
 * thresholds look right, since band assignment is itself sensitive to
 * self-consistency.
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config();

const { extractText } = require('../src/services/fileParser');
const { runConsistent } = require('../src/services/clasr-engine/consistency');
const { BAND_THRESHOLDS } = require('../src/services/clasr-engine/scorer');

const BANDS = ['LOW', 'MEDIUM', 'ELEVATED', 'HIGH'];

function parseArgs(argv) {
  let casesPath = path.join(__dirname, 'calibration-cases.json');
  let runs = 1;
  for (const arg of argv) {
    if (arg.startsWith('--runs=')) runs = Number(arg.slice('--runs='.length)) || 1;
    else if (!arg.startsWith('--')) casesPath = path.resolve(arg);
  }
  return { casesPath, runs };
}

async function loadManuscriptText(caseDef) {
  if (caseDef.text) return String(caseDef.text);
  if (caseDef.file) {
    const buffer = fs.readFileSync(caseDef.file);
    return extractText(buffer, path.basename(caseDef.file));
  }
  throw new Error(`case "${caseDef.id}" has neither "file" nor "text"`);
}

function pad(str, len) {
  str = String(str);
  return str + ' '.repeat(Math.max(0, len - str.length));
}

async function main() {
  const { casesPath, runs } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(casesPath)) {
    console.error(`No cases file at ${casesPath}.`);
    console.error('Copy scripts/calibration-cases.example.json to scripts/calibration-cases.json and fill it in, or pass a path explicitly.');
    process.exit(1);
  }

  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  for (const c of cases) {
    if (!BANDS.includes(c.humanBand)) {
      console.error(`case "${c.id}": humanBand must be one of ${BANDS.join(', ')}, got ${JSON.stringify(c.humanBand)}`);
      process.exit(1);
    }
  }

  console.log(`Running ${cases.length} case(s) at runs=${runs}. This calls the real API — expect real cost and ~${runs === 1 ? '~90s' : `${runs}x~90s`} per case.\n`);

  const results = [];
  for (const c of cases) {
    process.stdout.write(`[${c.id}] extracting + running... `);
    try {
      const text = await loadManuscriptText(c);
      const t0 = Date.now();
      const report = await runConsistent(text, { runs });
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      results.push({
        id: c.id,
        humanBand: c.humanBand,
        predictedBand: report.risk_band,
        rawScore: report.raw_score,
        signals: report.scored_signals.length,
      });
      console.log(`done (${elapsed}s) — predicted ${report.risk_band}, human ${c.humanBand}`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.push({ id: c.id, humanBand: c.humanBand, predictedBand: 'ERROR', rawScore: null, signals: null, error: err.message });
    }
  }

  console.log('\n--- RESULTS (sorted by raw_score) ---');
  const sorted = [...results].filter((r) => r.rawScore !== null).sort((a, b) => a.rawScore - b.rawScore);
  console.log(pad('id', 24) + pad('human', 10) + pad('predicted', 10) + pad('raw_score', 10) + 'signals');
  for (const r of sorted) {
    const mark = r.humanBand === r.predictedBand ? '  ' : '<<';
    console.log(pad(r.id, 24) + pad(r.humanBand, 10) + pad(r.predictedBand, 10) + pad(r.rawScore, 10) + `${r.signals} ${mark}`);
  }
  const errored = results.filter((r) => r.rawScore === null);
  if (errored.length) {
    console.log('\n--- ERRORS ---');
    for (const r of errored) console.log(`${r.id}: ${r.error}`);
  }

  const agree = sorted.filter((r) => r.humanBand === r.predictedBand).length;
  console.log(`\nAgreement: ${agree}/${sorted.length} (${sorted.length ? ((agree / sorted.length) * 100).toFixed(0) : 0}%)`);

  console.log('\n--- raw_score range per human-assigned band (use this to place BAND_THRESHOLDS cuts) ---');
  for (const band of BANDS) {
    const scores = sorted.filter((r) => r.humanBand === band).map((r) => r.rawScore);
    if (!scores.length) { console.log(`${pad(band, 10)} (no cases)`); continue; }
    const min = Math.min(...scores), max = Math.max(...scores);
    const mean = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    console.log(`${pad(band, 10)} n=${scores.length}  min=${min}  max=${max}  mean=${mean}`);
  }

  console.log('\nCurrent BAND_THRESHOLDS (backend/src/services/clasr-engine/scorer.js):');
  for (const [cut, band] of BAND_THRESHOLDS) console.log(`  ${pad(band, 10)} score >= ${cut}`);

  const mismatches = sorted.filter((r) => r.humanBand !== r.predictedBand);
  if (mismatches.length) {
    console.log(`\n${mismatches.length} case(s) disagree ("<<" above) — inspect those raw_score values against the ranges printed for the band you actually assigned, then edit BAND_THRESHOLDS and re-run.`);
  } else if (sorted.length) {
    console.log('\nAll cases agree with the current thresholds.');
  }
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
