'use strict';

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { supabase, requireAuth } = require('../middleware/auth');
const { analyzeManuscript } = require('../services/claude');
const { extractText } = require('../services/fileParser');
const {
  sendWelcomeEmail,
  sendReportReadyEmail,
  sendLimitReachedEmail,
  sendContactEmail,
  sendEnterpriseEmail,
  sendLegalRequestEmail,
} = require('../services/email');

const router = express.Router();

// ── In-memory job queue ────────────────────────────────────────────────────
const jobs = new Map();

function createJob(userId) {
  const jobId = uuidv4();
  jobs.set(jobId, { jobId, userId, status: 'processing', readingId: null, error: null, createdAt: Date.now() });
  return jobId;
}

function updateJob(jobId, patch) {
  const job = jobs.get(jobId);
  if (job) jobs.set(jobId, { ...job, ...patch });
}

// Clean up jobs older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 30 * 60 * 1000);

// ── Plans config ────────────────────────────────────────────────────────────
const PLANS = [
  { id: 'trial-pack',    label: 'Trial Pack',    price: 25,   billing: 'one-time', creditsPerPeriod: 1,   periodType: 'total'   },
  { id: 'researcher',    label: 'Researcher',    monthlyPrice: 59,  annualPrice: 590,  creditsPerPeriod: 5,   periodType: 'monthly' },
  { id: 'professional',  label: 'Professional',  monthlyPrice: 119, annualPrice: 1190, creditsPerPeriod: 12,  periodType: 'monthly' },
  { id: 'enterprise',    label: 'Enterprise',    price: 0,    billing: 'custom',   creditsPerPeriod: 9999, periodType: 'monthly' },
];

const PLAN_CREDITS = {
  'free': 0, 'basic': 40, 'pro': 150,
  'trial-pack': 1, 'researcher': 5, 'professional': 12, 'enterprise': 9999,
};

function isNewMonth(periodStart) {
  const s = new Date(periodStart);
  const n = new Date();
  return s.getMonth() !== n.getMonth() || s.getFullYear() !== n.getFullYear();
}

async function getUserSub(userId) {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) {
    const { error: insertErr } = await supabase.from('user_subscriptions').insert({
      user_id: userId, plan: 'free',
      lifetime_count: 0, monthly_count: 0, chat_count: 0,
      period_start: new Date().toISOString(),
    });
    if (insertErr) {
      await supabase.from('user_subscriptions').insert({
        user_id: userId, plan: 'free',
        lifetime_count: 0, monthly_count: 0,
        period_start: new Date().toISOString(),
      });
    }
    return { plan: 'free', lifetime_count: 0, monthly_count: 0, period_start: new Date().toISOString() };
  }
  return data;
}

async function checkAndConsumeCredit(userId) {
  const sub = await getUserSub(userId);
  const plan = sub.plan;
  const limit = PLAN_CREDITS[plan] ?? 0;
  const isMonthly = !['free', 'trial-pack', 'gift'].includes(plan);

  if (isMonthly && isNewMonth(sub.period_start)) {
    await supabase.from('user_subscriptions')
      .update({ monthly_count: 0, period_start: new Date().toISOString() })
      .eq('user_id', userId);
  }

  // Atomic check-and-increment via DB function to prevent race conditions
  const { data: consumed, error: rpcError } = await supabase.rpc('check_and_consume_credit', {
    p_user_id: userId,
    p_limit: limit,
    p_is_monthly: isMonthly,
  });

  if (rpcError) throw new Error(`Credit check failed: ${rpcError.message}`);

  if (!consumed) {
    const reason = isMonthly ? 'monthly_limit_reached' : 'lifetime_limit_reached';
    return { ok: false, reason, plan, limit };
  }
  return { ok: true, plan };
}

// ── File upload ────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'docx', 'txt'];
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, DOCX, or TXT files are supported'));
  },
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: `Upload error: ${err.message}` });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

// ── GET /api/session ────────────────────────────────────────────────────────
router.get('/session', requireAuth, async (req, res) => {
  const sub = await getUserSub(req.user.id);
  const meta = req.user.user_metadata || {};
  const oauthNameParts = (meta.name || meta.full_name || '').split(' ').filter(Boolean);
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: meta.firstName || meta.given_name || oauthNameParts[0] || '',
      lastName: meta.lastName || meta.family_name || oauthNameParts.slice(1).join(' ') || '',
      institution: meta.institution || '',
      plan: sub.plan,
      creditsLeft: (() => {
        const limit = PLAN_CREDITS[sub.plan] || 0;
        const isMonthly = !['free', 'trial-pack', 'gift'].includes(sub.plan);
        const used = isMonthly ? (sub.monthly_count || 0) : (sub.lifetime_count || 0);
        return Math.max(0, limit - used);
      })(),
    },
  });
});

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, institution } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { firstName: firstName || '', lastName: lastName || '', institution: institution || '' },
    });
    if (error) {
      if (error.message?.includes('already')) return res.status(409).json({ error: 'An account with this email already exists' });
      return res.status(400).json({ error: 'Registration failed. Please try again.' });
    }

    const { data: session } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(), password,
    });

    sendWelcomeEmail(data.user.email, firstName || '').catch(() => {});

    res.status(201).json({
      authenticated: true,
      access_token: session?.session?.access_token || null,
      refresh_token: session?.session?.refresh_token || null,
      user: { id: data.user.id, email: data.user.email, firstName, lastName, plan: 'free' },
      nextUrl: '/onboarding/role/',
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(), password,
    });
    if (error || !data?.session) return res.status(401).json({ error: 'Invalid email or password' });

    const sub = await getUserSub(data.user.id);
    res.json({
      authenticated: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata?.firstName || data.user.user_metadata?.given_name || '',
        lastName: data.user.user_metadata?.lastName || data.user.user_metadata?.family_name || '',
        plan: sub.plan,
      },
      nextUrl: '/dashboard/',
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/auth/logout', async (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (token) await supabase.auth.admin.signOut(token).catch(() => {});
  res.json({ authenticated: false, nextUrl: '/login/' });
});

// ── POST /api/auth/forgot-password ─────────────────────────────────────────
router.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const redirectTo = `${process.env.WEB_URL || 'https://clasr.ai'}/reset-password`;
    await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), { redirectTo });
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
});

// ── POST /api/auth/reset-password ──────────────────────────────────────────
router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const { access_token, new_password } = req.body || {};
    if (!access_token || !new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const { data: { user }, error } = await supabase.auth.getUser(access_token);
    if (error || !user) return res.status(400).json({ error: 'Reset link is invalid or expired.' });
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password: new_password });
    if (updateErr) return res.status(400).json({ error: 'Failed to reset password. Please try again.' });
    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

// ── POST /api/auth/refresh ──────────────────────────────────────────────────
router.post('/auth/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Invalid or expired refresh token' });
    res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at });
  } catch (err) { next(err); }
});

// ── GET /api/auth/google/start ─────────────────────────────────────────────
router.get('/auth/google/start', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://clasr.ai/callback/',
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) return res.status(500).json({ error: 'Google OAuth not configured' });
    res.redirect(data.url);
  } catch (err) { next(err); }
});

// ── GET /api/plans ──────────────────────────────────────────────────────────
router.get('/plans', (_req, res) => res.json({ plans: PLANS }));

// ── GET /api/readings ───────────────────────────────────────────────────────
router.get('/readings', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json({
      readings: (data || []).map(r => ({
        id: r.id,
        title: r.filename || 'Untitled manuscript',
        mode: r.output_mode || 'author',
        studyType: r.study_type || 'quantitative',
        qProfile: r.q_variant || 'Q1',
        severity: { critical: r.critical_count || 0, major: r.major_count || 0, minor: r.minor_count || 0 },
        reportUrl: `/dashboard/reading/?id=${r.id}`,
        createdAt: r.created_at,
      })),
    });
  } catch (err) { next(err); }
});

// ── GET /api/readings/:id ───────────────────────────────────────────────────
router.get('/readings/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Reading not found' });
    res.json({
      id: data.id,
      title: data.filename || 'Untitled manuscript',
      mode: data.output_mode || 'author',
      studyType: data.study_type || 'quantitative',
      qProfile: data.q_variant || 'Q1',
      severity: { critical: data.critical_count || 0, major: data.major_count || 0, minor: data.minor_count || 0 },
      report: data.report,
      createdAt: data.created_at,
    });
  } catch (err) { next(err); }
});

// ── POST /api/readings/start ────────────────────────────────────────────────
router.post('/readings/start', requireAuth, handleUpload, async (req, res, next) => {
  try {
    if (!req.file && !req.body.text) {
      return res.status(400).json({ error: 'A manuscript file (PDF/DOCX/TXT) is required' });
    }

    const creditCheck = await checkAndConsumeCredit(req.user.id);
    if (!creditCheck.ok) {
      sendLimitReachedEmail(req.user.email, creditCheck.plan).catch(() => {});
      return res.status(403).json({ error: creditCheck.reason, plan: creditCheck.plan, upgradeUrl: '/dashboard/pricing/' });
    }

    const outputMode = (req.body.mode || 'author').toLowerCase();
    const qVariant = (['Q1', 'Q2', 'Q3', 'Auto'].includes(req.body.qProfile) ? req.body.qProfile : 'Auto');
    const VALID_STUDY_TYPES = ['quantitative', 'qualitative', 'mixed', 'review', 'theoretical', 'case-study', 'other'];
    const studyType = VALID_STUDY_TYPES.includes(req.body.studyType) ? req.body.studyType : 'quantitative';
    const filename = req.file?.originalname || 'paste.txt';

    const jobId = createJob(req.user.id);

    // Process asynchronously
    (async () => {
      try {
        let manuscriptText = req.file
          ? await extractText(req.file.buffer, filename)
          : String(req.body.text || '');

        manuscriptText = manuscriptText.trim();
        if (!manuscriptText) throw new Error('Document appears to be empty');
        if (manuscriptText.length > 80000) throw new Error('Document too long (max ~80,000 characters / ~60 pages)');

        const result = await analyzeManuscript({
          manuscriptText,
          qVariant: qVariant !== 'Auto' ? qVariant : null,
          outputMode,
        });

        const reportText = result.report;
        const critical = (reportText.match(/\[CRITICAL\]/gi) || []).length;
        const major    = (reportText.match(/\[MAJOR\]/gi)    || []).length;
        const minor    = (reportText.match(/\[MINOR\]/gi)    || []).length;

        const readingId = uuidv4();
        const baseInsert = {
          id: readingId,
          user_id: req.user.id,
          filename,
          q_variant: qVariant !== 'Auto' ? qVariant : null,
          input_length: manuscriptText.length,
          report: reportText,
        };
        const { error: insertErr } = await supabase.from('analyses').insert({
          ...baseInsert,
          output_mode: outputMode,
          study_type: studyType,
          critical_count: critical,
          major_count: major,
          minor_count: minor,
        });
        if (insertErr) {
          // Fall back to basic columns if new columns don't exist yet
          await supabase.from('analyses').insert(baseInsert);
        }

        updateJob(jobId, { status: 'complete', readingId });

        sendReportReadyEmail(req.user.email, readingId, outputMode).catch(() => {});
      } catch (err) {
        console.error('[api] processing error:', err.message);
        updateJob(jobId, { status: 'failed', error: 'Analysis failed. Please try again.' });
      }
    })();

    res.status(202).json({ jobId, status: 'processing', estimatedMinutes: '5–15', processingUrl: `/dashboard/processing/?job=${jobId}` });
  } catch (err) { next(err); }
});

// ── GET /api/processing/:jobId ──────────────────────────────────────────────
router.get('/processing/:jobId', requireAuth, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Processing job not found' });
  if (job.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const elapsed = Date.now() - job.createdAt;
  const progress = job.status === 'complete' ? 100
    : job.status === 'failed' ? 0
    : Math.min(90, 5 + Math.floor(elapsed / 1000));

  res.json({
    job: {
      jobId: job.jobId,
      status: job.status,
      progress,
      readingId: job.readingId || null,
      reportUrl: job.readingId ? `/dashboard/reading/?id=${job.readingId}` : null,
      error: job.error || null,
    },
  });
});

// ── GET /api/billing/status ─────────────────────────────────────────────────
router.get('/billing/status', requireAuth, async (req, res, next) => {
  try {
    const sub = await getUserSub(req.user.id);
    const limit = PLAN_CREDITS[sub.plan] || 0;
    const isMonthly = !['free', 'trial-pack', 'gift'].includes(sub.plan);
    const used = isMonthly ? (sub.monthly_count || 0) : (sub.lifetime_count || 0);

    res.json({
      plan: sub.plan,
      creditsLeft: Math.max(0, limit - used),
      creditsTotal: limit,
      creditsUsed: used,
      periodType: isMonthly ? 'monthly' : 'total',
      paddleSubscriptionId: sub.paddle_subscription_id || null,
      paddleStatus: sub.paddle_status || null,
      portalReady: false,
    });
  } catch (err) { next(err); }
});

// ── POST /api/checkout/intent ───────────────────────────────────────────────
router.post('/checkout/intent', requireAuth, async (req, res) => {
  const { plan = 'trial-pack', billing = 'monthly' } = req.body || {};

  const PRICES = {
    'trial-pack':           process.env.PADDLE_PRICE_TRIAL_PACK,
    'researcher-monthly':   process.env.PADDLE_PRICE_RESEARCHER_MONTHLY,
    'researcher-annual':    process.env.PADDLE_PRICE_RESEARCHER_ANNUAL,
    'professional-monthly': process.env.PADDLE_PRICE_PROFESSIONAL_MONTHLY,
    'professional-annual':  process.env.PADDLE_PRICE_PROFESSIONAL_ANNUAL,
  };

  const key = plan === 'trial-pack' ? 'trial-pack' : `${plan}-${billing}`;
  const priceId = PRICES[key];
  const paddleToken = process.env.PADDLE_CLIENT_TOKEN;

  if (!priceId || !paddleToken) {
    return res.status(503).json({
      checkoutReady: false,
      error: 'Payment is not yet available. Contact hello@clasr.ai to purchase.',
      contactUrl: '/contact/',
    });
  }

  res.json({
    checkoutReady: true,
    priceId,
    paddleToken,
    plan,
    billing,
    userId: req.user.id,
  });
});

// ── POST /api/gift-code/apply ───────────────────────────────────────────────
router.post('/gift-code/apply', requireAuth, async (req, res) => {
  res.status(501).json({ applied: false, message: 'Gift code validation is not yet available.' });
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many requests. Please try again later.' }),
});

// ── POST /api/contact ───────────────────────────────────────────────────────
router.post('/contact', contactLimiter, async (req, res, next) => {
  try {
    const { firstName, lastName, email, message, topic } = req.body || {};
    if (!email || !message) return res.status(400).json({ error: 'Email and message are required' });
    await sendContactEmail({ firstName, lastName, email, message, topic }).catch(() => {});
    res.status(202).json({ received: true, messageId: uuidv4() });
  } catch (err) { next(err); }
});

// ── POST /api/enterprise-contact ────────────────────────────────────────────
router.post('/enterprise-contact', contactLimiter, async (req, res, next) => {
  try {
    const { institution, email, expectedVolume, message } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });
    await sendEnterpriseEmail({ institution, email, expectedVolume, message }).catch(() => {});
    res.status(202).json({ received: true, requestId: uuidv4() });
  } catch (err) { next(err); }
});

// ── POST /api/legal/request-access ──────────────────────────────────────────
router.post('/legal/request-access', contactLimiter, async (req, res, next) => {
  try {
    const { document, email } = req.body || {};
    await sendLegalRequestEmail({ document, email }).catch(() => {});
    res.status(202).json({ received: true, requestId: uuidv4(), document });
  } catch (err) { next(err); }
});

module.exports = router;
