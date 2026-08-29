'use strict';

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { supabase, requireAuth, createAuthFlowClient } = require('../middleware/auth');

// Isolated DB client for read operations — avoids any auth session state from the shared client
const dbReadClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);
const { analyzeManuscript, reformatReport, reformatReportAuthorJson, reformatReportReviewerJson, reformatReportEditorJson } = require('../services/claude');
const { exportReportAsPdf, exportReportAsDocx, exportReportAsTxt, exportFilename } = require('../services/reportExport');
const { extractText } = require('../services/fileParser');
const { runConsistent } = require('../services/clasr-engine/consistency');
const { atomicConsumeCredit } = require('../services/credits');
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

// version: 'v1' (prose pipeline, dashboard/reading/) or 'v2' (JSON hybrid
// pipeline, dashboard/reading-v2/ — internal test page, not linked from the
// live UI yet). Only affects which report page /api/processing/:jobId points
// completed jobs at.
function createJob(userId, version = 'v1') {
  const jobId = uuidv4();
  jobs.set(jobId, { jobId, userId, version, status: 'processing', readingId: null, error: null, createdAt: Date.now() });
  return jobId;
}

function updateJob(jobId, patch) {
  const job = jobs.get(jobId);
  if (job) jobs.set(jobId, { ...job, ...patch });
}

// Shared tail for "the report was generated but nothing was persisted" —
// keeps the user-facing message identical across every insert-failure path
// instead of three independently-typed copies that could drift apart.
function failJobUnsaved(jobId) {
  updateJob(jobId, { status: 'failed', error: 'Your report was generated but could not be saved. Please try again.' });
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
  const { data, error } = await dbReadClient
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
  return { ok: true, plan, isMonthly };
}

// Mirrors checkAndConsumeCredit's increment in reverse — used when a credit
// was consumed for a reading but the reading's row then failed to save, so
// the user isn't charged a credit for a report they never received.
async function refundCredit(userId, isMonthly) {
  const { error } = await supabase.rpc('refund_credit', { p_user_id: userId, p_is_monthly: isMonthly });
  if (error) console.error('[api] refund_credit RPC failed:', error.message, '— user', userId, 'was not refunded');
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

    const { data: session } = await createAuthFlowClient().auth.signInWithPassword({
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

    const { data, error } = await createAuthFlowClient().auth.signInWithPassword({
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
    const { data, error } = await createAuthFlowClient().auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Invalid or expired refresh token' });
    res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at });
  } catch (err) { next(err); }
});

// ── GET /api/auth/google/start ─────────────────────────────────────────────
router.get('/auth/google/start', async (_req, res, next) => {
  try {
    const { data, error } = await createAuthFlowClient().auth.signInWithOAuth({
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

// ── POST /api/account/history/disable ───────────────────────────────────────
// Permanently deletes every saved reading for this account. Destructive and
// irreversible, so it re-verifies the caller's password (a fresh
// signInWithPassword, not just the bearer token) before touching any data —
// a stolen/left-open session alone must not be enough to trigger this.
router.post('/account/history/disable', requireAuth, async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const { error: authError } = await createAuthFlowClient().auth.signInWithPassword({
      email: req.user.email, password,
    });
    if (authError) return res.status(401).json({ error: 'Incorrect password' });

    const { error: deleteError } = await supabase
      .from('analyses')
      .delete()
      .eq('user_id', req.user.id);
    if (deleteError) return res.status(500).json({ error: 'Failed to delete reading history. Please try again.' });

    res.json({ success: true });
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
    const mode = data.output_mode || 'author';
    res.json({
      id: data.id,
      title: data.filename || 'Untitled manuscript',
      mode,
      studyType: data.study_type || 'quantitative',
      qProfile: data.q_variant || 'Q1',
      severity: { critical: data.critical_count || 0, major: data.major_count || 0, minor: data.minor_count || 0 },
      report: data.report,
      // Structured Author/Reviewer/Editor Mode render (2026-08-24, extended
      // 2026-08-28 twice) — present only once mode_reports.<mode> has been
      // populated (initial generation or a later GET /readings/:id/mode/:mode
      // call); the frontend prefers this over parsing `report` as text when
      // it's present. "advisor" is the DB/route key for what the UI now
      // calls Editor Mode — see claude.js's EDITOR_JSON_SCHEMA comment.
      reportJson: ['author', 'reviewer', 'advisor'].includes(mode) ? (data.mode_reports?.[mode] || null) : null,
      createdAt: data.created_at,
    });
  } catch (err) { next(err); }
});

// ── GET /api/readings/:id/mode/:mode ────────────────────────────────────────
// Serves an Author/Signal/Advisor Mode view of an existing reading, deriving
// it from the reading's mode-agnostic main_report on first request (cheap
// reformat-only call — see claude.js's reformatReport()) and caching the
// result in mode_reports so later requests for the same mode are free.
// Readings created before the 2026-08-23 two-phase migration have no
// main_report and can't serve a different mode than the one they were
// generated with — reported as 409, not 500, since it's an expected state
// for old rows, not a bug.
const MODE_ALIASES = { author: 'author', reviewer: 'reviewer', signal: 'reviewer', advisor: 'advisor' };
router.get('/readings/:id/mode/:mode', requireAuth, async (req, res, next) => {
  try {
    const mode = MODE_ALIASES[String(req.params.mode || '').toLowerCase()];
    if (!mode) return res.status(400).json({ error: 'Unknown mode. Use author, reviewer, or advisor.' });

    const { data, error } = await supabase
      .from('analyses')
      .select('main_report, mode_reports')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Reading not found' });

    const cached = data.mode_reports?.[mode];
    if (cached) return res.json({ mode, report: cached, cached: true });

    if (!data.main_report) {
      return res.status(409).json({ error: 'This reading was created before mode switching was available and cannot be reformatted.' });
    }

    let reportOut;
    if (mode === 'author') {
      const reformatted = await reformatReportAuthorJson({ mainReport: data.main_report });
      if (!reformatted.report) return res.status(502).json({ error: 'Could not generate this mode. Please try again.' });
      reportOut = reformatted.report;
    } else if (mode === 'reviewer') {
      const reformatted = await reformatReportReviewerJson({ mainReport: data.main_report });
      if (!reformatted.report) return res.status(502).json({ error: 'Could not generate this mode. Please try again.' });
      reportOut = reformatted.report;
    } else if (mode === 'advisor') {
      const reformatted = await reformatReportEditorJson({ mainReport: data.main_report });
      if (!reformatted.report) return res.status(502).json({ error: 'Could not generate this mode. Please try again.' });
      reportOut = reformatted.report;
    } else {
      const reformatted = await reformatReport({ mainReport: data.main_report, outputMode: mode });
      reportOut = reformatted.report;
    }

    const nextModeReports = { ...(data.mode_reports || {}), [mode]: reportOut };
    const { error: updateErr } = await supabase
      .from('analyses')
      .update({ mode_reports: nextModeReports })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (updateErr) console.error('[api] failed to cache mode_reports for reading', req.params.id, ':', updateErr.message);

    res.json({ mode, report: reportOut, cached: false });
  } catch (err) { next(err); }
});

// ── GET /api/readings/:id/export/:format ────────────────────────────────────
// Server-rendered PDF (headless Chromium)/DOCX/TXT, replacing the client-side
// window.print()/browser-side docx generation (2026-08-29) -- PDF this way is
// always light-mode, paginated, and has selectable text regardless of the
// viewer's OS print dialog or theme. Exports whichever mode is passed via
// ?mode=, defaulting to the reading's own output_mode; only ever reads an
// already-cached mode_reports entry -- never triggers a new Anthropic call,
// so exporting never spends a credit or costs latency beyond rendering.
const EXPORT_FORMATS = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain; charset=utf-8' };
router.get('/readings/:id/export/:format', requireAuth, async (req, res, next) => {
  try {
    const format = String(req.params.format || '').toLowerCase();
    if (!EXPORT_FORMATS[format]) return res.status(400).json({ error: 'Unsupported export format. Use pdf, docx, or txt.' });

    const { data, error } = await supabase
      .from('analyses')
      .select('filename, output_mode, mode_reports')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Reading not found' });

    const mode = MODE_ALIASES[String(req.query.mode || data.output_mode || 'author').toLowerCase()] || 'author';
    const report = data.mode_reports?.[mode];
    if (!report) return res.status(409).json({ error: 'This mode has not been generated for this reading yet.' });

    const fallbackTitle = data.filename || 'Clasr Signal Report';
    let body;
    if (format === 'pdf') body = await exportReportAsPdf(report, mode, fallbackTitle);
    else if (format === 'docx') body = await exportReportAsDocx(report, mode, fallbackTitle);
    else body = exportReportAsTxt(report, mode, fallbackTitle);

    res.setHeader('Content-Type', EXPORT_FORMATS[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(report, mode, fallbackTitle, format)}"`);
    res.send(body);
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

        // Two-phase generation (2026-08-23): the expensive full-detection
        // call produces one mode-agnostic "main report"; the mode the user
        // actually sees is derived from it via a much cheaper reformat-only
        // call (~56K-char prompt vs. ~693K for the full assembly). This is
        // what lets mode switching later be near-free instead of re-running
        // the whole analysis per mode.
        const result = await analyzeManuscript({
          manuscriptText,
          qVariant: qVariant !== 'Auto' ? qVariant : null,
        });
        const mainReport = result.report;

        // Author/Reviewer/Editor Mode (2026-08-24, extended 2026-08-28
        // twice): the live report page now renders a structured JSON shape
        // (see claude.js's reformatReportAuthorJson/reformatReportReviewerJson/
        // reformatReportEditorJson), not labeled text -- eliminates the whole
        // class of "parser guessed the section boundary wrong" bugs that
        // came up repeatedly building the text-based renderer. "advisor" is
        // the DB/route key for what the UI calls Editor Mode.
        const JSON_REFORMAT_FNS = {
          author: reformatReportAuthorJson,
          reviewer: reformatReportReviewerJson,
          advisor: reformatReportEditorJson,
        };
        let reportText = mainReport;
        let modeReportsSeed = {};
        try {
          if (JSON_REFORMAT_FNS[outputMode]) {
            const reformatted = await JSON_REFORMAT_FNS[outputMode]({ mainReport });
            if (reformatted.report) {
              reportText = JSON.stringify(reformatted.report);
              modeReportsSeed = { [outputMode]: reformatted.report };
            } else {
              console.error(`[api] JSON reformat for mode "${outputMode}" returned unparseable JSON, falling back to main report`);
            }
          } else {
            const reformatted = await reformatReport({ mainReport, outputMode });
            reportText = reformatted.report;
            modeReportsSeed = { [outputMode]: reformatted.report };
          }
        } catch (reformatErr) {
          // The expensive analysis already succeeded — don't fail the whole
          // job over the cheap reformat step. Fall back to the mode-agnostic
          // main report rather than losing the reading entirely.
          console.error('[api] reformat step failed, falling back to main report:', reformatErr.message);
        }

        const critical = (mainReport.match(/\[CRITICAL\]/gi) || []).length;
        const major    = (mainReport.match(/\[MAJOR\]/gi)    || []).length;
        const minor    = (mainReport.match(/\[MINOR\]/gi)    || []).length;

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
          main_report: mainReport,
          mode_reports: modeReportsSeed,
        });
        if (insertErr) {
          console.error('[api] analyses insert error (full columns):', insertErr.message, insertErr.details || '');
          // Fall back to basic columns in case the newer columns don't exist yet
          const { error: fallbackErr } = await supabase.from('analyses').insert(baseInsert);
          if (fallbackErr) {
            console.error('[api] analyses insert error (fallback columns):', fallbackErr.message, fallbackErr.details || '');
            // Neither insert persisted the row — never report success with a
            // readingId nothing actually saved under. Surface a real failure
            // instead of a job that "completes" into a 404, and give back the
            // credit consumed for a reading the user never received.
            failJobUnsaved(jobId);
            refundCredit(req.user.id, creditCheck.isMonthly).catch(() => {});
            return;
          }
          // Fallback succeeded, so the reading itself is safe, but this run
          // silently dropped output_mode/study_type/severity counts — that
          // only happens if the DB schema is missing columns the code expects.
          // Warn so schema drift doesn't stay invisible just because the
          // reading itself didn't fail.
          console.warn('[api] analyses row saved via fallback (basic columns only) for reading', readingId, '— check for missing DB columns');
        }

        updateJob(jobId, { status: 'complete', readingId });

        sendReportReadyEmail(req.user.email, readingId, outputMode).catch(() => {});
      } catch (err) {
        console.error('[api] processing error:', err.message);
        updateJob(jobId, { status: 'failed', error: 'Analysis failed. Please try again.' });
        refundCredit(req.user.id, creditCheck.isMonthly).catch(() => {});
      }
    })();

    res.status(202).json({ jobId, status: 'processing', estimatedMinutes: '10–20', processingUrl: `/dashboard/processing/?job=${jobId}` });
  } catch (err) { next(err); }
});

// ── POST /api/readings/start-v2 ─────────────────────────────────────────────
// Internal test route (2026-07-27): async job-queue wrapper around the
// hybrid-architecture JSON pipeline (/analyze/v2's runConsistent()), mirroring
// /readings/start's job-queue shape so the real processing/polling UI pattern
// can be validated before this is wired into the live "New reading" flow.
// Not linked from any live page — reached only by the internal test pages
// under dashboard/v2-preview/ and dashboard/reading-v2/. Uses
// services/credits.js's atomicConsumeCredit (same credit path /analyze/v2
// already uses) rather than this file's own checkAndConsumeCredit, so credit
// behavior here matches what's already been tested — note the two
// implementations disagree on the free-plan limit (0 here vs 5 in
// services/credits.js), a pre-existing inconsistency, not something this
// route introduces or resolves.
router.post('/readings/start-v2', requireAuth, handleUpload, async (req, res, next) => {
  try {
    if (!req.file && !req.body.text) {
      return res.status(400).json({ error: 'A manuscript file (PDF/DOCX/TXT) is required' });
    }

    const creditCheck = await atomicConsumeCredit(req.user.id);
    if (!creditCheck.ok) {
      return res.status(403).json({ error: creditCheck.reason, plan: creditCheck.plan, limit: creditCheck.limit });
    }

    const filename = req.file?.originalname || 'paste.txt';
    const runsRaw = Number(req.body.runs);
    const runs = Number.isInteger(runsRaw) && runsRaw >= 1 && runsRaw <= 5 ? runsRaw : undefined;

    const jobId = createJob(req.user.id, 'v2');

    (async () => {
      try {
        let manuscriptText = req.file
          ? await extractText(req.file.buffer, filename)
          : String(req.body.text || '');

        manuscriptText = manuscriptText.trim();
        if (!manuscriptText) throw new Error('Document appears to be empty');
        if (manuscriptText.length > 80000) throw new Error('Document too long (max ~80,000 characters / ~60 pages)');

        const report = await runConsistent(manuscriptText, runs ? { runs } : {});

        const severityCounts = { critical: 0, major: 0, minor: 0 };
        for (const s of report.scored_signals || []) {
          if (s.severity === 4) severityCounts.critical++;
          else if (s.severity === 3) severityCounts.major++;
          else if (s.severity === 2 || s.severity === 1) severityCounts.minor++;
        }

        const readingId = uuidv4();
        const { error: insertErr } = await supabase.from('analyses').insert({
          id: readingId,
          user_id: req.user.id,
          filename,
          input_length: manuscriptText.length,
          report: JSON.stringify(report),
          critical_count: severityCounts.critical,
          major_count: severityCounts.major,
          minor_count: severityCounts.minor,
        });
        if (insertErr) {
          console.error('[api] v2 insert error:', insertErr.message, insertErr.details || '');
          failJobUnsaved(jobId);
          refundCredit(req.user.id, creditCheck.isMonthly).catch(() => {});
          return;
        }

        updateJob(jobId, { status: 'complete', readingId });
      } catch (err) {
        console.error('[api] v2 processing error:', err.message);
        updateJob(jobId, { status: 'failed', error: 'Analysis failed. Please try again.' });
        refundCredit(req.user.id, creditCheck.isMonthly).catch(() => {});
      }
    })();

    res.status(202).json({ jobId, status: 'processing', estimatedMinutes: '2–5', processingUrl: `/dashboard/processing/?job=${jobId}` });
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

  const reportBase = job.version === 'v2' ? '/dashboard/reading-v2/' : '/dashboard/reading/';
  res.json({
    job: {
      jobId: job.jobId,
      status: job.status,
      progress,
      readingId: job.readingId || null,
      reportUrl: job.readingId ? `${reportBase}?id=${job.readingId}` : null,
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
