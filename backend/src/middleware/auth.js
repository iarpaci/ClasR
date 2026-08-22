const { createClient } = require('@supabase/supabase-js');

// Service-role client for DB queries — never used for auth.getUser(userJWT)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Separate client used only for JWT validation to avoid session contamination
const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// signInWithPassword/refreshSession/signInWithOAuth mutate the calling
// client's internal session, which then silently overrides that client's
// Authorization header on every later .from()/.rpc() call — swapping the
// service-role identity for whichever user last signed in. A fresh, one-shot
// client per call keeps that mutation from ever touching `supabase` (used
// everywhere else for service-role DB access).
function createAuthFlowClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
}

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const token = auth.slice(7);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = data.user;
  next();
}

module.exports = { requireAuth, supabase, createAuthFlowClient };
