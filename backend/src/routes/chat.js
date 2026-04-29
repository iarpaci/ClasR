const express = require('express');
const multer = require('multer');
const { extractText } = require('../services/fileParser');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { getUserPlan, PLANS, incrementUsage, incrementChatUsage } = require('../middleware/subscription');
const { supabase } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');
const { assembleSystemPrompt } = require('../services/kitAssembler');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['docx', 'pdf', 'txt'].includes(ext)) return cb(null, true);
    cb(new Error('Only .docx, .pdf and .txt files are supported'));
  },
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

function isNewMonth(periodStart) {
  const start = new Date(periodStart);
  const now = new Date();
  return start.getMonth() !== now.getMonth() || start.getFullYear() !== now.getFullYear();
}

// POST /chat/message
router.post('/message', requireAuth, handleUpload, async (req, res, next) => {
  try {
    const { prompt, text, conversation_id, is_function_call } = req.body;
    const isFunctionCall = is_function_call === 'true';

    if (!prompt?.trim() && !text?.trim() && !req.file) {
      return res.status(400).json({ error: 'prompt, text or file is required' });
    }

    // Access control: function calls use analyze counter, manual chat uses chat counter
    const sub = await getUserPlan(req.user.id);
    const plan = PLANS[sub.plan] || PLANS.free;

    if (isFunctionCall) {
      if (sub.plan === 'free') {
        if (sub.lifetime_count >= plan.limit) {
          return res.status(403).json({ error: 'free_limit_reached', plan: 'free', limit: plan.limit });
        }
      } else {
        if (isNewMonth(sub.period_start)) {
          await supabase.from('user_subscriptions')
            .update({ monthly_count: 0, chat_count: 0, period_start: new Date().toISOString() })
            .eq('user_id', sub.user_id || req.user.id);
          sub.monthly_count = 0;
          sub.chat_count = 0;
        }
        if (sub.monthly_count >= plan.limit) {
          return res.status(403).json({ error: 'monthly_limit_reached', plan: sub.plan, limit: plan.limit });
        }
      }
    } else {
      // Manual chat
      if (plan.chat_limit === 0) {
        return res.status(403).json({ error: 'chat_not_available', plan: sub.plan });
      }
      if (isNewMonth(sub.period_start)) {
        await supabase.from('user_subscriptions')
          .update({ monthly_count: 0, chat_count: 0, period_start: new Date().toISOString() })
          .eq('user_id', req.user.id);
        sub.monthly_count = 0;
        sub.chat_count = 0;
      }
      if ((sub.chat_count || 0) >= plan.chat_limit) {
        return res.status(403).json({ error: 'chat_limit_reached', plan: sub.plan, limit: plan.chat_limit });
      }
    }

    // Extract file text if uploaded
    let fileText = '';
    if (req.file) {
      fileText = await extractText(req.file.buffer, req.file.originalname);
    } else if (text?.trim()) {
      fileText = text.trim();
    }

    // Build user message
    let userMessage = prompt?.trim() || '';
    if (fileText) {
      userMessage = userMessage ? `${userMessage}\n\n---\n\n${fileText}` : fileText;
    }

    if (userMessage.length > 150000) {
      return res.status(400).json({ error: 'Input too long (max 150,000 characters)' });
    }

    // Load conversation history
    const convId = conversation_id || uuidv4();
    let history = [];
    if (conversation_id) {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: true })
        .limit(20);
      const rows = data || [];
      history = rows.length > 8 ? [rows[0], ...rows.slice(-6)] : rows;
    }

    // Test mock mode — avoids real Claude calls during acceptance tests
    const testKey = process.env.CLASR_TEST_KEY;
    const isTestMode = testKey && req.headers['x-clasr-test'] === testKey;

    let assistantMessage;
    if (isTestMode) {
      assistantMessage = '▸ CLASR-EN ANALYSIS\n\n[SECTION: Overview]\n\nNo issues detected in this submission.';
    } else {
      // Call Claude with full CLASR-EN system prompt
      const systemPrompt = assembleSystemPrompt();
      const messages = [
        ...history.map((m, i) => {
          if (i === 0 && m.role === 'user') {
            return { role: 'user', content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }] };
          }
          return { role: m.role, content: m.content };
        }),
        { role: 'user', content: userMessage },
      ];

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        temperature: 0.2,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages,
      });

      assistantMessage = response.content[0].text;
      const u = response.usage;
      console.log(`[clasr] tokens: in=${u.input_tokens} out=${u.output_tokens} cache_write=${u.cache_creation_input_tokens||0} cache_read=${u.cache_read_input_tokens||0}`);
    }

    await supabase.from('chat_messages').insert([
      { conversation_id: convId, user_id: req.user.id, role: 'user', content: userMessage, filename: req.file?.originalname || null },
      { conversation_id: convId, user_id: req.user.id, role: 'assistant', content: assistantMessage },
    ]);

    if (isFunctionCall) {
      await incrementUsage(req.user.id, sub.plan);
    } else {
      await incrementChatUsage(req.user.id);
    }

    res.json({ conversation_id: convId, message: assistantMessage });
  } catch (err) { next(err); }
});

// GET /chat/conversations
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('conversation_id, content, created_at')
      .eq('user_id', req.user.id)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const seen = new Set();
    const convs = [];
    for (const row of data || []) {
      if (!seen.has(row.conversation_id)) {
        seen.add(row.conversation_id);
        convs.push({ id: row.conversation_id, preview: row.content.slice(0, 80), created_at: row.created_at });
      }
    }
    res.json(convs);
  } catch (err) { next(err); }
});

// GET /chat/conversations/:id
router.get('/conversations/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, filename, created_at')
      .eq('conversation_id', req.params.id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

module.exports = router;
