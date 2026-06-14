import type { Metadata } from 'next';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'FAQ — CLASR',
  description: 'Common questions about CLASR, signal reports, Q-profiles, plans, and privacy.',
  openGraph: { title: 'FAQ — CLASR', description: 'Common questions about CLASR.' },
};

const FAQS = [
  { q: 'What is CLASR?',                     a: 'CLASR is an academic manuscript signal-reading system. It analyzes how a manuscript behaves and produces a structured behavioral signal report.' },
  { q: 'Does CLASR evaluate my manuscript?', a: 'No. CLASR does not evaluate quality, assign scores, rank manuscripts, or issue recommendations.' },
  { q: 'Does CLASR predict acceptance or rejection?', a: 'No. CLASR does not predict editorial decisions, acceptance rates, or publication outcomes.' },
  { q: 'What does CLASR analyze?',           a: 'Depending on the manuscript type, CLASR analyzes signals related to claim behavior, methodological visibility, argument structure, uncertainty management, conceptual behavior, epistemic framing, discursive construction, and normative positioning.' },
  { q: 'What types of manuscripts can CLASR read?', a: 'CLASR supports both quantitative and qualitative academic manuscripts, including empirical, theoretical, conceptual, critical, interdisciplinary, and mixed-method research.' },
  { q: 'What are Q-Profiles?',               a: 'Q-Profiles adjust signal sensitivity. Q1 applies the strictest calibration. Q2 applies balanced calibration. Q3 applies broader calibration. Auto estimates the most appropriate profile from the manuscript.' },
  { q: 'What are Author, Reviewer, and Advisor modes?', a: 'These modes change how signals are presented. The signal analysis remains the same; only the reporting format changes.' },
  { q: 'Does CLASR rewrite or edit manuscripts?', a: 'No. CLASR does not rewrite, edit, paraphrase, or generate manuscript content.' },
  { q: 'Does CLASR replace peer review?',    a: 'No. CLASR is a reading system, not a peer-review system. It surfaces behavioral signals and returns interpretation to the user.' },
  { q: 'What is a signal?',                  a: 'A signal is a labeled and traceable observation about the behavior of a manuscript. Signals describe patterns; they do not carry judgments or recommendations.' },
  { q: 'What do I receive after analysis?',  a: 'You receive a structured signal report containing labeled observations, section-level findings, and behavioral patterns identified throughout the manuscript.' },
];

export default function FaqPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main>
        <div className="v9-cp-page">

          <div className="v9-cp-hero">
            <span className="v9-cp-hero__label">Resources</span>
            <h1 className="v9-cp-hero__title">FAQ</h1>
            <p className="v9-cp-hero__sub">Common questions about CLASR.</p>
          </div>

          <div className="v9-faq-grid">
            {FAQS.map(({ q, a }) => (
              <article key={q} className="v9-faq-card">
                <h3>{q}</h3>
                <p>{a}</p>
              </article>
            ))}
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
