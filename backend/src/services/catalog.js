// Paddle live price ids -> what they grant. Verified against the Paddle API on
// 2026-10-04 (all tax_mode "internal" = tax included). Env vars from the old
// catalog (PADDLE_PRICE_*) are still honoured for legacy subscriptions.
const CATALOG = {
  // One-time packs: add to purchased_readings
  'pri_01m2pwhj8gjj6djrxync9d3dgm': { kind: 'pack', id: 'reading-1', readings: 1 },
  'pri_01m2pwnqtp3azqcce6zd3r0ew1': { kind: 'pack', id: 'reading-3', readings: 3 },
  'pri_01m2pwx3x6sc71k9s2x23m5eyh': { kind: 'pack', id: 'reading-10', readings: 10 },
  // Monthly subscriptions: set the plan
  'pri_01kwwh5epwyphhpce1nw23d30z': { kind: 'plan', id: 'starter' },
  'pri_01kwwh4cwhwpgvp02mhne8cxe9': { kind: 'plan', id: 'professional' },
  'pri_01kwwh3aqyw7yxzpty9536hx9q': { kind: 'plan', id: 'advanced' },
};

function lookupPrice(priceId) {
  if (!priceId) return null;
  if (CATALOG[priceId]) return CATALOG[priceId];
  const legacy = {
    [process.env.PADDLE_PRICE_TRIAL_PACK]: { kind: 'legacy-pack', id: 'trial-pack' },
    [process.env.PADDLE_PRICE_RESEARCHER_MONTHLY]: { kind: 'plan', id: 'researcher' },
    [process.env.PADDLE_PRICE_RESEARCHER_ANNUAL]: { kind: 'plan', id: 'researcher' },
    [process.env.PADDLE_PRICE_PROFESSIONAL_MONTHLY]: { kind: 'plan', id: 'professional' },
    [process.env.PADDLE_PRICE_PROFESSIONAL_ANNUAL]: { kind: 'plan', id: 'professional' },
  };
  delete legacy.undefined;
  return legacy[priceId] || null;
}

module.exports = { CATALOG, lookupPrice };
