const express = require('express');
const multer = require('multer');
const { extractText } = require('../services/fileParser');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { requireSubscription, incrementUsage } = require('../middleware/subscription');
const { analyzeManuscript } = require('../services/claude');
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

// POST /chat/message
router.post('/message', requireAuth, handleUpload, requireSubscription, async (req, res, next) => {
  try {
    const { prompt, text, conversation_id } = req.body;
    if (!prompt?.trim() && !text?.trim() && !req.file) {
      return res.status(400).json({ error: 'prompt, text or file is required' });
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
      userMessage = userMessage
        ? `${userMessage}\n\n---\n\n${fileText}`
        : fileText;
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
      history = data || [];
    }

    // Call Claude with full CLASR-EN system prompt
    const systemPrompt = assembleSystemPrompt();
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    const assistantMessage = response.content[0].text;

    // Save messages
    await supabase.from('chat_messages').insert([
      { conversation_id: convId, user_id: req.user.id, role: 'user', content: userMessage, filename: req.file?.originalname || null },
      { conversation_id: convId, user_id: req.user.id, role: 'assistant', content: assistantMessage },
    ]);

    await incrementUsage(req.user.id, req.userSub.plan);

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
