import type { Metadata } from 'next';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'About — CLASR',
  description: 'CLASR reads academic manuscripts differently. Not what the manuscript says. How it behaves.',
  openGraph: { title: 'About — CLASR', description: 'Not what the manuscript says. How it behaves.' },
};

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main>
        <div className="v9-cp-page">

          <div className="v9-cp-hero">
            <span className="v9-cp-hero__label">Company</span>
            <h1 className="v9-cp-hero__title">About CLASR</h1>
            <p className="v9-cp-hero__sub">Not what the manuscript says. How it behaves.</p>
          </div>

          <div className="v9-cp-section v9-about-story">
            <div className="v9-about-story__intro">
              <span className="v9-cp-section__label">About CLASR</span>
              <h2 className="v9-about-story__title">Not what the manuscript says. How it behaves.</h2>
              <div className="v9-cp-section__body">
                <p>CLASR reads academic manuscripts differently. It doesn&rsquo;t grade them, rewrite them, or predict whether they&rsquo;ll be accepted.</p>
                <p>It looks at how a manuscript behaves.</p>
              </div>
            </div>

            <div className="v9-about-behavior-grid" aria-label="Manuscript behavior patterns CLASR makes visible">
              {[
                { n: '01', h: 'Claims and evidence', p: 'Whether the manuscript’s claims stay matched to the evidence it actually shows.' },
                { n: '02', h: 'Method visibility',   p: 'Whether the method is clear enough for another reader to understand and reproduce.' },
                { n: '03', h: 'Honest uncertainty',  p: 'Whether limitations, boundaries, and uncertainty are handled with care.' },
                { n: '04', h: 'Argument continuity', p: 'Whether the abstract, introduction, findings, and conclusion keep the same promise.' },
              ].map(card => (
                <article key={card.n} className="v9-about-behavior-card">
                  <span className="v9-about-behavior-card__num">{card.n}</span>
                  <h3>{card.h}</h3>
                  <p>{card.p}</p>
                </article>
              ))}
            </div>

            <div className="v9-about-signal-panel">
              <p>A reviewer rarely rejects a paper over a single sentence. They notice patterns. CLASR makes these patterns visible before submission, before peer review, before judgment.</p>
              <p>The system reads at the level of behavior: how strongly the manuscript speaks, how clearly it shows its method, how it handles uncertainty, and whether its argument stays intact from introduction to conclusion.</p>
              <p>It produces a labeled signal report: not a score, not a verdict, just visibility.</p>
            </div>

            <div className="v9-about-principles">
              <div>
                <span className="v9-cp-section__label">Built for</span>
                <p>Quantitative and structured academic manuscripts, with calibration for Q1, Q2, and Q3 journal targets.</p>
              </div>
              <div>
                <span className="v9-cp-section__label">Reading modes</span>
                <p>Authors, advisors, and reviewers can each read the same manuscript through the lens they need.</p>
              </div>
              <div>
                <span className="v9-cp-section__label">Human final</span>
                <p>CLASR is not a peer reviewer. It does not decide. Human judgment remains final.</p>
              </div>
            </div>

            <p className="v9-about-closing">CLASR exists to make that judgment easier.</p>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
