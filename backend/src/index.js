require('dotenv').config();
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const analyzeRoutes = require('./routes/analyze');
const chatRoutes = require('./routes/chat');
const subscriptionRoutes = require('./routes/subscription');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [undefined, null, 'http://localhost:3000', 'http://localhost:3001'];
    if (!origin || allowed.includes(origin)) return cb(null, true);
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (process.env.WEB_URL && origin === process.env.WEB_URL) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'combined'));

// Webhook route must use raw body — register BEFORE express.json()
app.use('/subscription/webhook', subscriptionRoutes);

app.use(express.json({ limit: '100kb' }));

// Rate limiting
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const isDev = process.env.NODE_ENV !== 'production';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 200 : 10, standardHeaders: true, legacyHeaders: false });
const analyzeLimiter = rateLimit({ windowMs: 60 * 1000, max: isDev ? 50 : 5, standardHeaders: true, legacyHeaders: false });

app.use(globalLimiter);
app.use('/auth', authLimiter, authRoutes);
app.use('/analyze', analyzeLimiter, analyzeRoutes);
app.use('/chat', analyzeLimiter, chatRoutes);
app.use('/subscription', subscriptionRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Error handler
app.use((err, req, res, next) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  if (process.env.NODE_ENV === 'production') {
    console.error(err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[clasr] Backend running on port ${PORT}`));
