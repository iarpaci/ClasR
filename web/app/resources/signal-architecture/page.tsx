import type { Metadata } from 'next';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Signal Architecture — CLASR',
  description: 'Three perspectives. Two reading architectures. One signal language. Reading perspectives, study types, and Q-profiles.',
  openGraph: { title: 'Signal Architecture — CLASR', description: 'The full CLASR signal architecture: perspectives, study types, and Q-profiles.' },
};

export default function SignalArchitecturePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main>
        <div className="v9-cp-page">

          <div className="v9-cp-hero">
            <span className="v9-cp-hero__label">Resources</span>
            <h1 className="v9-cp-hero__title">Signal Architecture</h1>
            <p className="v9-cp-hero__sub">Three perspectives. Two reading architectures. One signal language.</p>
          </div>

          <div className="v9-sa-table">

            <div className="v9-sa-row">
              <span className="v9-sa-row__label">Reading Perspectives</span>
              <div className="v9-sa-row__items">
                <div className="v9-sa-item">
                  <strong>Author</strong>
                  <p>Signals presented with plain-language explanations and likely reviewer concerns. Signal labels always remain visible.</p>
                </div>
                <div className="v9-sa-item">
                  <strong>Reviewer</strong>
                  <p>No commentary. Labels and section locations only. Maximum signal density, minimum text.</p>
                </div>
                <div className="v9-sa-item">
                  <strong>Advisor</strong>
                  <p>Signals numbered by global priority with one-sentence academic contextualization. Technical depth preserved.</p>
                </div>
              </div>
            </div>

            <div className="v9-sa-row">
              <span className="v9-sa-row__label">Study Types</span>
              <div className="v9-sa-row__items">
                <div className="v9-sa-item">
                  <strong>Quantitative</strong>
                  <p>Empirical, quantitative, mixed-method, and data-driven research. Focuses on claim behavior, methodological visibility, evidence alignment, uncertainty management, and structural integrity.</p>
                </div>
                <div className="v9-sa-item">
                  <strong>Qualitative</strong>
                  <p>Qualitative, theoretical, conceptual, critical, and interdisciplinary research. Focuses on conceptual behavior, epistemic framing, discursive construction, normative positioning, and interpretive argument structure.</p>
                </div>
              </div>
            </div>

            <div className="v9-sa-row">
              <span className="v9-sa-row__label">Q-Profiles</span>
              <div className="v9-sa-row__items">
                <div className="v9-cp-q-chips">
                  {[
                    { tag: 'Q1',   desc: <><strong>Upper Tier &middot; Strict</strong> &mdash; Maximum sensitivity. All methodological, epistemic, and argumentative gaps explicitly surfaced.</> },
                    { tag: 'Q2',   desc: <><strong>Robust &middot; Balanced</strong> &mdash; Conditional flexibility. Bounded interpretations allowed. Scale transitions marked rather than suppressed.</> },
                    { tag: 'Q3',   desc: <><strong>Accessible &middot; Flexible</strong> &mdash; Narrative tolerance. Broader framing allowed when marked by scope language.</> },
                    { tag: 'Auto', desc: <><strong>Estimated</strong> &mdash; CLASR estimates the most appropriate calibration from the manuscript&rsquo;s own signals.</> },
                  ].map(chip => (
                    <div key={chip.tag} className="v9-cp-q-chip">
                      <span className="v9-cp-q-chip__tag">{chip.tag}</span>
                      <span className="v9-cp-q-chip__desc">{chip.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="v9-sa-row">
              <span className="v9-sa-row__label">Output</span>
              <div className="v9-sa-row__items">
                <div className="v9-sa-item" style={{ maxWidth: 520 }}>
                  <p>Regardless of configuration, CLASR produces the same type of output: labeled, traceable, and non-decisional behavioral signals. It does not evaluate, score, or predict outcomes.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
