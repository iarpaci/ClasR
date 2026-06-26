'use strict';

const express = require('express');
const router = express.Router();

// Stripe removed — Paddle integration pending
// All checkout/portal is now handled via /api/checkout/intent

router.get('/status', (req, res) => res.status(501).json({ error: 'Use /api/billing/status' }));
router.post('/checkout', (req, res) => res.status(501).json({ error: 'Use /api/checkout/intent' }));
router.post('/portal', (req, res) => res.status(501).json({ error: 'Not implemented' }));
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => res.json({ received: true }));

module.exports = router;
