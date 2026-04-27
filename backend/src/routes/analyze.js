const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { requireSubscription, incrementUsage } = require('../middleware/subscription');
const { analyzeManuscript } = require('../services/claude');
const { supabase } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['docx', 'txt'].includes(ext)) return cb(null, true);
    cb(new Error('Only .docx and .txt files are allowed'));
  },
});

const analyzeSchema = z.object({
  q_variant: z.enum(['Q1', 'Q2', 'Q3']).optional(),
  mode: z.enum(['R1', 'R2', 'revision', 'resubmission', 'summary']).optional(),
});

// POST /analyze
router.post('/', requireAuth, upload.single('file'), requireSubscription, async (req, res, next) => {
  try {
    let manuscriptText = '';

    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        manuscriptText = result.value;
      } else {
        manuscriptText = req.file.buffer.toString('utf-8');
      }
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

    const result = await analyzeManuscript({
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

    const { error: incrErr } = await supabase.rpc(
      req.userSub?.plan === 'free' ? 'increment_lifetime_count' : 'increment_monthly_count',
      { p_user_id: req.user.id }
    );
    if (incrErr) console.error('[clasr] increment error:', incrErr.message);

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
