const express = require('express');
const multer = require('multer');
const { extractText } = require('../services/fileParser');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { analyzeManuscript } = require('../services/claude');
const { supabase } = require('../middleware/auth');

const PLAN_CREDITS = {
  'free': 5, 'basic': 40, 'pro': 150,
  'trial-pack': 1, 'researcher': 5, 'professional': 12, 'enterprise': 9999,
};

async function atomicConsumeCredit(userId) {
  const { data: sub, error: subErr } = await supabase
    .from('user_subscriptions')
    .select('plan, lifetime_count, monthly_count, period_start')
    .eq('user_id', userId)
    .single();
  if (subErr || !sub) return { ok: false, reason: 'no_subscription' };
  const plan = sub.plan || 'free';
  const limit = PLAN_CREDITS[plan] ?? 0;
  const isMonthly = !['free', 'trial-pack', 'gift'].includes(plan);
  if (isMonthly) {
    const s = new Date(sub.period_start); const n = new Date();
    if (s.getMonth() !== n.getMonth() || s.getFullYear() !== n.getFullYear()) {
      await supabase.from('user_subscriptions')
        .update({ monthly_count: 0, period_start: n.toISOString() }).eq('user_id', userId);
    }
  }
  const { data: consumed, error: rpcErr } = await supabase.rpc('check_and_consume_credit', {
    p_user_id: userId, p_limit: limit, p_is_monthly: isMonthly,
  });
  if (rpcErr) throw new Error(`Credit check failed: ${rpcErr.message}`);
  if (!consumed) return { ok: false, reason: isMonthly ? 'monthly_limit_reached' : 'free_limit_reached', plan, limit };
  return { ok: true, plan };
}

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'docx', 'txt'];
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, DOCX, or TXT files are supported'));
  },
});

const analyzeSchema = z.object({
  q_variant: z.enum(['Q1', 'Q2', 'Q3']).optional(),
  mode: z.enum(['R1', 'R2', 'revision', 'resubmission', 'summary']).optional(),
});

// Multer error handler
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// POST /analyze
router.post('/', requireAuth, handleUpload, async (req, res, next) => {
  try {
    // Atomic credit check — prevents race conditions from concurrent requests
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

    const parsed = analyzeSchema.safeParse({
      q_variant: req.body.q_variant,
      mode: req.body.mode,
    });

    const testKey = process.env.CLASR_TEST_KEY;
    const isTestMode = testKey && req.headers['x-clasr-test'] === testKey;

    const result = isTestMode
      ? { report: '▸ CLASR-EN ANALYSIS\n\n[SECTION: Mock]\n\nTest mode - no API call made.', usage: {} }
      : await analyzeManuscript({
          manuscriptText,
          qVariant: parsed.success ? parsed.data.q_variant : null,
          mode: parsed.success ? parsed.data.mode : null,
        });

    // Save to DB
    const analysisId = uuidv4();
    const { error: insertErr } = await supabase.from('analyses').insert({
      id: analysisId,
      user_id: req.user.id,
      input_length: manuscriptText.length,
      q_variant: parsed.success ? parsed.data.q_variant : null,
      mode: parsed.success ? parsed.data.mode : null,
      report: result.report,
      filename: req.file?.originalname || null,
    });
    if (insertErr) console.error('[clasr] insert error:', insertErr.message);

    res.json({
      id: analysisId,
      report: result.report,
    });
  } catch (err) { next(err); }
});

// GET /analyze/history
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('id, filename, q_variant, mode, input_length, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET /analyze/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('id, filename, q_variant, mode, report, input_length, created_at')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Analysis not found' });
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
