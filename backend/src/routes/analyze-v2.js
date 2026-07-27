const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');
const { extractText } = require('../services/fileParser');
const { atomicConsumeCredit } = require('../services/credits');
const { supabase } = require('../middleware/auth');
const { runConsistent } = require('../services/clasr-engine/consistency');

const router = express.Router();

const analyzeV2Schema = z.object({
  runs: z.coerce.number().int().min(1).max(5).optional(),
});

// Mock report used when CLASR_TEST_KEY test mode is active — mirrors the
// shape of a real runConsistent() report without spending API credits.
function mockReport() {
  return {
    risk_band: 'LOW',
    raw_score: 0,
    scored_signals: [],
    applied_rules: [],
    dropped_unverifiable: 0,
    taxonomy_gap_flagged: false,
    stability: { runs: 0, note: 'test mode - no API call made' },
  };
}

// POST /analyze/v2 — hybrid architecture pipeline: LLM extracts signals only;
// citation verification, deterministic scoring, and self-consistency all run
// in code. See backend/src/services/clasr-engine/.
router.post('/', requireAuth, handleUpload, async (req, res, next) => {
  try {
    const credit = await atomicConsumeCredit(req.user.id);
    if (!credit.ok) {
      return res.status(403).json({ error: credit.reason, plan: credit.plan, limit: credit.limit });
    }

    let manuscriptText = '';
    if (req.file) {
      manuscriptText = await extractText(req.file.buffer, req.file.originalname);
    } else if (req.body.text) {
      manuscriptText = String(req.body.text);
    } else {
      return res.status(400).json({ error: 'File or text is required' });
    }

    manuscriptText = manuscriptText.trim();
    if (!manuscriptText) return res.status(400).json({ error: 'Document appears to be empty' });
    if (manuscriptText.length > 80000) {
      return res.status(400).json({ error: 'Document too long (max 80,000 characters)' });
    }

    const parsed = analyzeV2Schema.safeParse({ runs: req.body.runs });
    const runs = parsed.success ? parsed.data.runs : undefined;

    const testKey = process.env.CLASR_TEST_KEY;
    const isTestMode = testKey && req.headers['x-clasr-test'] === testKey;

    const report = isTestMode
      ? mockReport()
      : await runConsistent(manuscriptText, runs ? { runs } : {});

    const analysisId = uuidv4();
    const { error: insertErr } = await supabase.from('analyses').insert({
      id: analysisId,
      user_id: req.user.id,
      input_length: manuscriptText.length,
      report: JSON.stringify(report),
      filename: req.file?.originalname || null,
    });
    if (insertErr) console.error('[clasr-v2] insert error:', insertErr.message);

    res.json({ id: analysisId, report });
  } catch (err) { next(err); }
});

module.exports = router;
