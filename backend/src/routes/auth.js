const express = require('express');
const { z } = require('zod');
const { supabase } = require('../middleware/auth');
const { requireAuth } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/email');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { email, password } = parsed.data;
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
    });
    if (error) return res.status(400).json({ error: 'Registration failed. Please try again.' });
    sendWelcomeEmail(data.user.email).catch(() => {});
    res.status(201).json({ user_id: data.user.id, email: data.user.email });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Email and password required' });
    const { email, password } = parsed.data;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(), password,
    });
    if (error) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Invalid or expired refresh token' });
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (err) { next(err); }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
    await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${process.env.WEB_URL}/reset-password`,
    });
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { access_token, new_password } = req.body;
    if (!access_token || !new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'access_token and new_password (min 8 chars) required' });
    }
    await supabase.auth.setSession({ access_token, refresh_token: access_token });
    const { error } = await supabase.auth.updateUser({ password: new_password });
    if (error) return res.status(400).json({ error: 'Failed to reset password' });
    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res) => {
  const { getUserPlan } = require('../middleware/subscription');
  const sub = await getUserPlan(req.user.id);
  res.json({ id: req.user.id, email: req.user.email, plan: sub.plan });
});

router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    await supabase.from('chat_messages').delete().eq('user_id', userId);
    await supabase.from('analyses').delete().eq('user_id', userId);
    await supabase.from('user_subscriptions').delete().eq('user_id', userId);
    await supabase.auth.admin.deleteUser(userId);
    res.json({ message: 'Account deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
