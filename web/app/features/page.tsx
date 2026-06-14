import type { Metadata } from 'next';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Features — CLASR',
  description: 'The full anatomy of CLASR — signal mapping, argument chain, desk-reject profile, Q-variant calibration, and output modes.',
  openGraph: { title: 'Features — CLASR', description: 'The full anatomy of CLASR: signal mapping, argument chain, desk-reject profile, Q-variant calibration.' },
};

export default function FeaturesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main>
        <div className="v9-cp-page">

          <div className="v9-cp-hero">
            <span className="v9-cp-hero__label">Signal-Reading System</span>
            <h1 className="v9-cp-hero__title">Not what the manuscript says. How it behaves.</h1>
            <p className="v9-cp-hero__sub">CLASR reads behavioral signals across academic manuscripts. Its output is not a summary, score, or verdict. It is a behavioral signal report: labeled, traceable, and non-decisional.</p>
          </div>

          {/* What CLASR reads */}
          <div className="v9-cp-section">
            <span className="v9-cp-section__label">What CLASR reads</span>
            <div className="v9-cp-two-col" style={{ marginTop: 28 }}>
              <div>
                <h3 className="v9-cp-col__title">Argument Chain</h3>
                <p className="v9-cp-col__body">Follows the manuscript&rsquo;s central claim across four transitions — framing through conclusion — showing whether it remains intact, drifts, expands, narrows, or breaks.</p>
              </div>
              <div>
                <h3 className="v9-cp-col__title">Desk-Reject Signal Profile</h3>
                <p className="v9-cp-col__body">Maps five editorial concern zones: scope fit, abstract posture, structural completeness, language posture, and integrity transparency — before submission.</p>
              </div>
              <div>
                <h3 className="v9-cp-col__title">Q-Gate Calibration</h3>
                <p className="v9-cp-col__body">The same manuscript read at different sensitivity levels: Q1 (strict), Q2 (balanced), or Q3 (flexible) — or estimated automatically from the manuscript&rsquo;s own signals.</p>
              </div>
              <div>
                <h3 className="v9-cp-col__title">Output Modes</h3>
                <p className="v9-cp-col__body">The same signals presented differently for authors, reviewers, and advisors. No new analysis is created — only the presentation frame changes.</p>
              </div>
            </div>
          </div>

          {/* Argument chain transitions */}
          <div id="argument-chain" className="v9-cp-section">
            <span className="v9-cp-section__label">Argument Chain Transitions</span>
            <div className="v9-cp-steps" style={{ marginTop: 28 }}>
              {[
                { n: 'T1', title: 'Framing → Methods',      body: 'Does the framing commit to methods that are present, proportionate, and described at appropriate depth?' },
                { n: 'T2', title: 'Methods → Findings',     body: 'Are the findings traceable to the methods described? Are gaps flagged or silently absorbed?' },
                { n: 'T3', title: 'Findings → Discussion',  body: 'Does the discussion stay within the scope of findings, or does it expand, contract, or shift register?' },
                { n: 'T4', title: 'Discussion → Conclusion', body: 'Does the conclusion reflect what the discussion actually established, or does the claim travel?' },
              ].map(step => (
                <div key={step.n} className="v9-cp-step">
                  <span className="v9-cp-step__num">{step.n}</span>
                  <div>
                    <h3 className="v9-cp-step__title">{step.title}</h3>
                    <p className="v9-cp-step__body">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signal architecture */}
          <div id="desk-reject" className="v9-cp-section">
            <span className="v9-cp-section__label">Signal Architecture</span>
            <h2 className="v9-cp-section__title">Three perspectives. Two reading architectures. One signal language.</h2>
            <p style={{ marginBottom: 28, fontSize: 15, lineHeight: 1.75, maxWidth: 680 }}>CLASR adapts its reading configuration to both the manuscript and the reader. Regardless of configuration, the output remains the same: labeled, traceable, and non-decisional behavioral signals.</p>
            <div id="output-modes" className="v9-cp-three-col">
              <div>
                <h3 className="v9-cp-col__title">Author</h3>
                <p className="v9-cp-col__body">Signals presented with plain-language explanations and likely reviewer concerns. The signal label always remains visible.</p>
              </div>
              <div>
                <h3 className="v9-cp-col__title">Reviewer</h3>
                <p className="v9-cp-col__body">No commentary. Only labels and section locations. Maximum signal density, minimum text.</p>
              </div>
              <div>
                <h3 className="v9-cp-col__title">Advisor</h3>
                <p className="v9-cp-col__body">Signals numbered by global priority with one-sentence academic contextualization. Technical depth preserved.</p>
              </div>
            </div>
          </div>

          {/* Q-Profile calibration */}
          <div id="q-calibration" className="v9-cp-section">
            <span className="v9-cp-section__label">Q-Profile Calibration</span>
            <h2 className="v9-cp-section__title">The same manuscript. Different sensitivity levels.</h2>
            <div className="v9-cp-q-chips" style={{ marginTop: 28 }}>
              {[
                { tag: 'Q1',   desc: <><strong>Upper Tier &middot; Strict</strong> &mdash; Maximum sensitivity. Claims held to the strictest proportionality standard. All methodological, epistemic, and argumentative gaps explicitly surfaced.</> },
                { tag: 'Q2',   desc: <><strong>Robust &middot; Balanced</strong> &mdash; Conditional flexibility. Bounded interpretations allowed. Scale transitions are marked rather than suppressed.</> },
                { tag: 'Q3',   desc: <><strong>Accessible &middot; Flexible</strong> &mdash; Narrative tolerance. Broader framing allowed when marked by scope language and kept within a conditional register.</> },
                { tag: 'Auto', desc: <><strong>Estimated Profile</strong> &mdash; CLASR estimates the most appropriate calibration from the manuscript&rsquo;s own behavioral signals.</> },
              ].map(chip => (
                <div key={chip.tag} className="v9-cp-q-chip">
                  <span className="v9-cp-q-chip__tag">{chip.tag}</span>
                  <span className="v9-cp-q-chip__desc">{chip.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
