const Sentry = process.env.SENTRY_DSN ? require('@sentry/node') : null;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const analyzeRoutes = require('./routes/analyze');
const analyzeV2Routes = require('./routes/analyze-v2');
const chatRoutes = require('./routes/chat');
const subscriptionRoutes = require('./routes/subscription');
const apiRoutes = require('./routes/api');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = [
      'http://localhost:3000', 'http://localhost:3001', 'http://localhost:8029',
      'https://clasr-static.vercel.app', 'https://clasr.ai', 'https://www.clasr.ai',
    ];
    if (allowed.includes(origin)) return cb(null, true);
    if (process.env.WEB_URL && (origin === process.env.WEB_URL || origin === process.env.WEB_URL.replace('://', '://www.'))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'combined'));

// Raw body parser for Paddle webhook — must run BEFORE express.json() consumes the stream
app.use('/subscription/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '100kb' }));

// Rate limiting
const isDev = process.env.NODE_ENV !== 'production';
const jsonRateHandler = (req, res) => res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false, handler: jsonRateHandler });
const analyzeLimiter = rateLimit({ windowMs: 60 * 1000, max: isDev ? 50 : 5, standardHeaders: true, legacyHeaders: false, handler: jsonRateHandler });

app.use(globalLimiter);
// Mounted before /analyze so it isn't shadowed by analyzeRoutes' GET /:id route.
app.use('/analyze/v2', analyzeLimiter, analyzeV2Routes);
app.use('/analyze', analyzeLimiter, analyzeRoutes);
app.use('/chat', analyzeLimiter, chatRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/api', globalLimiter, apiRoutes);

app.get('/', (req, res) => res.json({ name: 'CLASR API', version: '1.0.0', status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Error handler
app.use((err, req, res, next) => {
  if (Sentry) Sentry.captureException(err);
  if (process.env.NODE_ENV === 'production') {
    console.error(err.message, err.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
  console.error(err);
  res.status(500).json({ error: err.message });
});

const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[clasr] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[clasr] Backend running on port ${PORT}`));
