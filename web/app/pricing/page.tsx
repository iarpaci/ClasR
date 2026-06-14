'use client';
import Link from 'next/link';
import { useState } from 'react';
import { isLoggedIn } from '@/lib/auth';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

type PlanKey = 'trial-pack' | 'regular' | 'professional' | 'enterprise';

const PLANS: Array<{
  key: PlanKey;
  name: string;
  price: string;
  meta: string;
  badge?: string;
  features: string[];
  trialNote?: string;
  isEnterprise?: boolean;
}> = [
  {
    key: 'trial-pack',
    name: 'Trial Pack',
    price: '$25',
    meta: 'one-time payment',
    features: ['5 articles', 'All 8 analysis sections', 'PDF · DOCX · TXT export', 'Analysis history'],
    trialNote: '* $25 is fully credited to upgrade within 30 days.',
  },
  {
    key: 'regular',
    name: 'Regular',
    price: '$49',
    meta: 'per month or $490/year',
    badge: 'Most Preferred',
    features: ['25 articles', 'All 8 analysis sections', 'PDF · DOCX · TXT export', 'Analysis history'],
  },
  {
    key: 'professional',
    name: 'Professional',
    price: '$79',
    meta: 'per month or $790/year',
    features: ['60 articles', 'All 8 analysis sections', 'PDF · DOCX · TXT export', 'Analysis history'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Contact Us',
    meta: 'custom pricing',
    features: ['Custom volume', 'All 8 analysis sections', 'PDF · DOCX · TXT export', 'Analysis history'],
    isEnterprise: true,
  },
];

const FAQS = [
  { q: 'What counts as one analysis?', a: 'Each PDF or DOCX paper you submit counts as one analysis, regardless of length. All 8 CLASR sections are generated in full for every submission.' },
  { q: 'Do unused articles carry over?', a: 'Monthly plans reset at the start of each billing cycle. Unused analyses do not carry over. The Trial Pack is valid for 30 days from purchase.' },
  { q: 'Can I upgrade or downgrade my plan?', a: 'Yes, you can change your plan at any time. Changes take effect at the start of your next billing cycle. Trial Pack holders can upgrade within 30 days and have the $25 credited in full.' },
  { q: 'What file formats are supported?', a: 'CLASR accepts PDF and DOCX inputs. Outputs are available as PDF, DOCX, and TXT for all plans.' },
  { q: 'Is annual billing charged upfront?', a: 'Yes. Annual plans are billed as a single payment at the start of the year, saving approximately 17% compared to monthly billing.' },
  { q: 'What languages are supported?', a: 'CLASR is currently optimised for English language academic papers. Support for additional languages is on the roadmap.' },
];

export default function PricingPage() {
  const [selected, setSelected] = useState<PlanKey | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGetStarted() {
    if (!selected) return;
    if (selected === 'enterprise') { window.location.href = '/contact'; return; }
    if (!isLoggedIn()) { window.location.href = '/register'; return; }
    setLoading(true);
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* noop */ } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main className="v9-pricing-page">
        <img className="v9-pricing-icon" src="/brand-pattern-sage.svg" alt="" />
        <h1 className="v9-pricing-title">CHOOSE YOUR PLAN</h1>

        <div className="v9-plan-grid" role="group" aria-label="Pricing plans">
          {PLANS.map(plan => (
            <article
              key={plan.key}
              className={`v9-plan-card${selected === plan.key ? ' is-selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={selected === plan.key}
              onClick={() => setSelected(plan.key)}
              onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? setSelected(plan.key) : null}
            >
              {plan.badge && <span className="v9-plan-badge">{plan.badge}</span>}
              <h2>{plan.name}</h2>
              <p className="v9-plan-price">{plan.price}</p>
              <p className="v9-plan-meta">{plan.meta}</p>
              <ul>
                {plan.features.map(f => <li key={f}>&bull; {f}</li>)}
              </ul>
              {plan.trialNote && (
                <p className="v9-trial-note">
                  <span>* $25</span> is fully credited to upgrade within <span>30 days.</span>
                </p>
              )}
            </article>
          ))}
        </div>

        <div className="v9-pricing-action">
          <button
            onClick={handleGetStarted}
            disabled={!selected || loading}
            className="v9-btn v9-btn--primary v9-btn--pill"
            style={{ minWidth: 156, minHeight: 40, opacity: !selected ? 0.45 : 1, cursor: !selected ? 'default' : 'pointer' }}
          >
            {loading ? 'Loading...' : (selected === 'enterprise' ? 'CONTACT US' : 'GET STARTED')}
          </button>
        </div>

        <section id="institutions" className="v9-institution-box">
          <div>
            <strong>For institutions</strong>
            <h2>Running a lab, department, or journal?</h2>
            <p>Enterprise plans include volume discounts, team dashboards, custom onboarding, and priority support. Designed for research groups and editorial offices that need consistent, high-volume analysis at scale.</p>
          </div>
          <Link href="/contact" className="v9-btn v9-btn--pill" style={{ background: '#e0e6d4', borderColor: '#2b555b', whiteSpace: 'nowrap' }}>CONTACT US</Link>
        </section>

        <section id="faq" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="v9-faq-title">FAQ</h2>
          <div className="v9-faq-grid">
            {FAQS.map(({ q, a }) => (
              <article key={q} className="v9-faq-card">
                <h3>{q}</h3>
                <p>{a}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
