import type { Metadata } from 'next';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'How It Works — CLASR',
  description: 'Upload a manuscript. Receive a signal map. CLASR reads through your selected configuration: reader perspective, study type, and Q-profile.',
  openGraph: { title: 'How It Works — CLASR', description: 'A walkthrough of the full CLASR reading process.' },
};

export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main>
        <div className="v9-cp-page">

          <div className="v9-cp-hero">
            <span className="v9-cp-hero__label">Resources</span>
            <h1 className="v9-cp-hero__title">How It Works</h1>
            <p className="v9-cp-hero__sub">Upload a manuscript. Receive a signal map. CLASR reads the manuscript through the selected configuration: reader perspective, study type, and Q-profile.</p>
          </div>

          <div className="v9-hiw-list">
            {[
              {
                n: '1',
                title: 'Choose a reading perspective',
                body: 'Author — plain-language explanations and likely reviewer concerns. Reviewer — compact signal labels and section locations. Advisor — prioritized signals with academic contextualization.',
              },
              {
                n: '2',
                title: 'Select the study type',
                body: 'Quantitative — empirical, data-driven, mixed-method research. Qualitative — theoretical, conceptual, critical, interpretive research.',
              },
              {
                n: '3',
                title: 'Set the Q-profile',
                body: 'Q1 (strictest), Q2 (balanced), Q3 (flexible), or Auto — CLASR estimates the profile from the manuscript’s own signals.',
              },
              {
                n: '4',
                title: 'Receive the signal report',
                body: 'CLASR returns a labeled, traceable, non-decisional signal report. It does not score, rewrite, judge, or predict outcomes. It shows how the manuscript behaves.',
              },
            ].map(step => (
              <div key={step.n} className="v9-hiw-item">
                <span className="v9-hiw-item__num">{step.n}</span>
                <div className="v9-hiw-item__body">
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
