'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { subscriptionApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    analyses: '3 analyses',
    note: 'lifetime total',
    features: ['Full SECTION 0–8 report', 'AUTO-Q detection', 'All 24 signal kits'],
    cta: 'Current plan',
    disabled: true,
  },
  {
    key: 'basic',
    name: 'Basic',
    price: '$—',
    period: 'month',
    analyses: '5 analyses',
    note: 'per month',
    features: ['Everything in Free', 'Monthly reset', 'Analysis history'],
    cta: 'Upgrade to Basic',
    price_key_monthly: 'basic_monthly',
    price_key_yearly: 'basic_yearly',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$—',
    period: 'month',
    analyses: '100 analyses',
    note: 'per month',
    features: ['Everything in Basic', 'Priority processing', 'Revision round mode'],
    cta: 'Upgrade to Pro',
    price_key_monthly: 'pro_monthly',
    price_key_yearly: 'pro_yearly',
    highlight: true,
  },
];

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      subscriptionApi.status().then(r => setCurrentPlan(r.data.plan)).catch(() => {});
    }
  }, []);

  async function handleCheckout(price_key: string) {
    if (!isLoggedIn()) { window.location.href = '/register'; return; }
    setLoading(true);
    try {
      const { data } = await subscriptionApi.checkout(price_key);
      window.location.href = data.url;
    } catch { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-xl font-black tracking-widest text-white">CLASR</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Simple Pricing</h2>
          <p className="text-gray-500">Start free. Upgrade when you need more analyses.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div key={plan.key}
              className={`rounded-2xl p-6 border ${plan.highlight ? 'bg-blue-950 border-blue-700' : 'bg-gray-900 border-gray-800'}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{plan.name}</p>
              <p className="text-3xl font-black text-white">{plan.price}</p>
              <p className="text-gray-500 text-sm">/{plan.period}</p>
              <div className={`my-4 pt-4 border-t ${plan.highlight ? 'border-blue-800' : 'border-gray-800'}`}>
                <p className="text-white font-bold">{plan.analyses}</p>
                <p className="text-gray-500 text-xs">{plan.note}</p>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-emerald-500 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan.disabled || currentPlan === plan.key ? (
                <button disabled className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-gray-500 cursor-not-allowed">
                  {currentPlan === plan.key ? 'Current plan' : plan.cta}
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.price_key_monthly!)}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.highlight ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                  {loading ? 'Loading...' : plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-gray-600 text-xs mt-8">Prices shown in USD. Payments processed by Stripe.</p>
      </main>
    </div>
  );
}
