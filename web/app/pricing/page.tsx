'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { subscriptionApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

type Billing = 'monthly' | 'yearly';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    monthly_price: '$0',
    yearly_price: '$0',
    period: 'forever',
    analyses: '3 analyses',
    note: 'lifetime total',
    features: ['Full SECTION 0–8 report', 'AUTO-Q detection', 'All 24 signal kits', 'PDF · DOCX · TXT'],
    disabled: true,
  },
  {
    key: 'basic',
    name: 'Basic',
    monthly_price: '$9.99',
    yearly_price: '$6.67',
    yearly_total: '$79.99/yr',
    period: 'month',
    analyses: '5 analyses',
    note: 'per month',
    features: ['Everything in Free', 'Monthly reset', 'Analysis history', 'Chat follow-ups'],
    price_key_monthly: 'basic_monthly',
    price_key_yearly: 'basic_yearly',
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly_price: '$24.99',
    yearly_price: '$16.67',
    yearly_total: '$199.99/yr',
    period: 'month',
    analyses: '100 analyses',
    note: 'per month',
    features: ['Everything in Basic', 'Q1/Q2/Q3 targeting', 'Revision round mode', 'Priority processing'],
    price_key_monthly: 'pro_monthly',
    price_key_yearly: 'pro_yearly',
    highlight: true,
  },
];

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState('');
  const [billing, setBilling] = useState<Billing>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn()) {
      subscriptionApi.status().then(r => setCurrentPlan(r.data.plan)).catch(() => {});
    }
  }, []);

  async function handleCheckout(price_key: string) {
    if (!isLoggedIn()) { window.location.href = '/register'; return; }
    setLoading(price_key);
    try {
      const { data } = await subscriptionApi.checkout(price_key);
      window.location.href = data.url;
    } catch { setLoading(null); }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-xl font-black tracking-widest text-white">CLASR</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">Choose Your Plan</h2>
          <p className="text-gray-500 mb-8">Start free. Upgrade when you need more analyses.</p>

          {/* Billing toggle */}
          <div className="inline-flex bg-gray-900 border border-gray-700 rounded-xl p-1 gap-1">
            <button onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              Monthly
            </button>
            <button onClick={() => setBilling('yearly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${billing === 'yearly' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              Yearly <span className="text-emerald-400 text-xs ml-1">−33%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const price = billing === 'yearly' && plan.yearly_price ? plan.yearly_price : plan.monthly_price;
            const priceKey = billing === 'yearly' ? plan.price_key_yearly : plan.price_key_monthly;
            const isCurrent = currentPlan === plan.key;

            return (
              <div key={plan.key}
                className={`rounded-2xl p-6 border flex flex-col ${plan.highlight ? 'bg-blue-950 border-blue-700 relative' : 'bg-gray-900 border-gray-800'}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{price}</span>
                    {price !== '$0' && <span className="text-gray-500 text-sm mb-1">/{plan.period}</span>}
                  </div>
                  {billing === 'yearly' && plan.yearly_total && (
                    <p className="text-emerald-400 text-xs mt-1">Billed as {plan.yearly_total}</p>
                  )}
                  <div className={`mt-3 pt-3 border-t ${plan.highlight ? 'border-blue-800' : 'border-gray-800'}`}>
                    <p className="text-white font-bold">{plan.analyses}</p>
                    <p className="text-gray-500 text-xs">{plan.note}</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span> {f}
                    </li>
                  ))}
                </ul>

                {plan.disabled || isCurrent ? (
                  <button disabled
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-800 text-gray-500 cursor-not-allowed">
                    {isCurrent ? 'Current plan' : 'Free forever'}
                  </button>
                ) : (
                  <button
                    onClick={() => priceKey && handleCheckout(priceKey)}
                    disabled={loading === priceKey}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                      plan.highlight
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    } disabled:opacity-50`}>
                    {loading === priceKey ? 'Loading...' : `Get ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-600 text-xs mt-10">
          Prices in USD · Secure payment via Stripe · Cancel anytime
        </p>
      </main>
    </div>
  );
}
