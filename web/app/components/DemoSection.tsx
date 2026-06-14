'use client';
import { useState } from 'react';
import Link from 'next/link';

type Sev = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
type MonoColor = 'teal' | 'orange' | 'red' | 'muted';

type DemoLine =
  | { t: 'head'; text: string }
  | { t: 'rule' }
  | { t: 'tag'; sev: Sev; text: string }
  | { t: 'mono'; text: string; c?: MonoColor }
  | { t: 'row'; label: string; risk: boolean; note?: string }
  | { t: 'text'; text: string }
  | { t: 'note'; text: string };

const SEV_COLORS: Record<Sev, { bg: string; border: string; text: string }> = {
  CRITICAL: { bg: '#cd0015', border: '#cd0015', text: '#fff' },
  MAJOR:    { bg: '#fce5e7', border: '#cd0015', text: '#cd0015' },
  MINOR:    { bg: '#fff7ec', border: '#2b555b', text: '#2b555b' },
  INFO:     { bg: 'rgba(43,85,91,0.08)', border: '#2b555b', text: '#2b555b' },
};

const DEMO_DATA: { id: number; label: string; lines: DemoLine[] }[] = [
  {
    id: 1, label: 'Structural Review',
    lines: [
      { t: 'tag', sev: 'MAJOR', text: 'Aim–Result Gap — Hypothesis 3 (group moderation effect) stated in Introduction §1.4; absent from Results entirely; no explanation of omission' },
      { t: 'tag', sev: 'MAJOR', text: 'Structural Disproportion — Discussion: 2,847 words / Methods: 612 words (4.6× ratio); interpretation weight grossly exceeds procedural transparency' },
      { t: 'tag', sev: 'MINOR', text: 'Abstract — past tense applied to ongoing data collection: "participants were recruited" conflicts with Methods §2.1 noting active recruitment at time of writing' },
      { t: 'tag', sev: 'MINOR', text: 'Conclusion — introduces 3 paragraphs of policy implications; no policy variable was collected in the study design' },
      { t: 'rule' },
      { t: 'note', text: '4 signals mapped. Contribution framing: adequate. Structural balance: flagged.' },
    ],
  },
  {
    id: 2, label: 'Methodological Visibility',
    lines: [
      { t: 'tag', sev: 'CRITICAL', text: 'N:k ratio violation — 14 predictors entered in multiple regression; n=47 participants (N:k = 3.4:1); minimum 10:1 required; all reported coefficients are statistically unstable' },
      { t: 'tag', sev: 'MAJOR', text: 'Sampling — convenience sample, single university, single faculty; no diversity declared; generalizability asserted without scope boundary' },
      { t: 'tag', sev: 'MAJOR', text: 'Replication profile — Pre-registration: ABSENT · Data: ABSENT · Code: ABSENT · Reporting standard: ABSENT' },
      { t: 'tag', sev: 'MINOR', text: 'Effect size reporting — partial η² cited without confidence intervals; effect magnitude is uninterpretable in isolation' },
      { t: 'rule' },
      { t: 'note', text: 'Reviewability signal: low. Closed replication profile. Regression outputs unstable.' },
    ],
  },
  {
    id: 3, label: 'Reference Check',
    lines: [
      { t: 'tag', sev: 'MINOR', text: 'Missing from list — "Zimmerman (2002)" cited at pp. 4, 7, 11 — not found in reference list' },
      { t: 'tag', sev: 'MINOR', text: 'Year mismatch — in-text: "Pintrich & DeGroot (1990)" → reference list: "Pintrich & DeGroot (1992)"' },
      { t: 'rule' },
      { t: 'tag', sev: 'INFO', text: 'ELEVATED SELF-CITATION DENSITY — first author cited 9/38 times (23.7%); 5 consecutive self-citations in Methods rationale' },
      { t: 'tag', sev: 'INFO', text: 'CONFIRMATORY CITATION PATTERN — 38/38 citations support manuscript position; contrastive literature not engaged' },
      { t: 'rule' },
      { t: 'note', text: '2 structural errors, 2 pattern signals. No contrastive literature engaged.' },
    ],
  },
  {
    id: 4, label: 'Inconsistency Detection',
    lines: [
      { t: 'tag', sev: 'CRITICAL', text: 'Statistical impossibility — Table 3: β = .36, 95% CI [.45, .76] — beta coefficient lies outside its own confidence interval; mathematically impossible' },
      { t: 'tag', sev: 'MAJOR', text: 'Sample size drift — Abstract: n=312 | Methods p.5: n=309 | Table 2 footnote: n=307 — three values, no attrition explanation' },
      { t: 'tag', sev: 'MAJOR', text: 'Significance mismatch — text p.9: "p < .001 for Strategy × GPA"; Table 3, same relationship: p = .038' },
      { t: 'tag', sev: 'MINOR', text: 'Results ↔ Discussion — CAUSAL DRIFT: correlational findings (r = .54) reframed as "strategies drive academic success"' },
      { t: 'rule' },
      { t: 'note', text: 'Consistency profile: severely flagged.' },
    ],
  },
  {
    id: 5, label: 'Red Flags',
    lines: [
      { t: 'tag', sev: 'CRITICAL', text: 'Statistical impossibility — Table 3: β = .36, 95% CI [.45, .76]; beta outside its own CI is mathematically impossible' },
      { t: 'tag', sev: 'CRITICAL', text: 'Analytical instability — 14 predictors, n=47 (N:k = 3.4:1); multiple regression coefficients are statistically unreliable' },
      { t: 'tag', sev: 'MAJOR', text: 'Effect size mislabeling — r = .71 described as "small effect"; Cohen convention: r ≥ .50 = large' },
      { t: 'tag', sev: 'MAJOR', text: 'Language — "conclusively demonstrates causal mechanism" unsupported by a cross-sectional design' },
      { t: 'rule' },
      { t: 'note', text: 'Risk profile: HIGH. Resolve statistical errors before any Q1 submission.' },
    ],
  },
  {
    id: 6, label: 'Argument Chain',
    lines: [
      { t: 'text', text: 'Central claim: Self-regulated learning strategies causally improve academic achievement in university students.' },
      { t: 'rule' },
      { t: 'mono', text: 'T1  Framing → Methods       SUSTAINED ✓', c: 'teal' },
      { t: 'mono', text: 'T2  Methods → Results       SUSTAINED ✓', c: 'teal' },
      { t: 'mono', text: 'T3  Results → Discussion    DRIFTED ⚠  CAUSAL DRIFT + SCALE DRIFT', c: 'orange' },
      { t: 'mono', text: 'T4  Discussion → Conclusion  EXPANDED ⚠  CLAIM SUBSTITUTION — UNRESOLVED', c: 'orange' },
      { t: 'rule' },
      { t: 'note', text: 'Chain profile: partially intact. Critical break: T3 + T4.' },
    ],
  },
  {
    id: 7, label: 'Desk-Reject Risk',
    lines: [
      { t: 'row', label: 'Scope–Journal Fit', risk: false },
      { t: 'row', label: 'Abstract Posture', risk: true, note: 'causal language; cross-sectional design' },
      { t: 'row', label: 'Structural Completeness', risk: true, note: 'Hypothesis 3 stated, never addressed' },
      { t: 'row', label: 'Language Posture', risk: true, note: '"conclusively demonstrates causal mechanism"' },
      { t: 'row', label: 'Integrity & Transparency', risk: true, note: 'β/CI impossibility; no COI; closed data' },
      { t: 'rule' },
      { t: 'note', text: 'Co-occurrence: high. Four active risk zones; beta/CI impossibility alone meets desk-reject threshold at journals with statistical review.' },
    ],
  },
  {
    id: 8, label: 'Final Integrated Review',
    lines: [
      { t: 'tag', sev: 'CRITICAL', text: 'Statistical validity — Two fatal errors: beta outside its own CI and N:k = 3.4:1 regression instability.' },
      { t: 'tag', sev: 'CRITICAL', text: 'Causal integrity — Cross-sectional findings are repeatedly written as causal proof.' },
      { t: 'tag', sev: 'MAJOR', text: 'Internal consistency — Three sample sizes appear without attrition explanation, obscuring the primary analysis population.' },
      { t: 'rule' },
      { t: 'note', text: 'This is a signal map. Submission decision remains yours.' },
    ],
  },
];

function renderLine(line: DemoLine, idx: number) {
  const P = '#2b555b';
  switch (line.t) {
    case 'rule':
      return <div key={idx} style={{ borderTop: '1px solid #d8d0c0', margin: '8px 0' }} />;
    case 'tag': {
      const s = SEV_COLORS[line.sev];
      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 2, background: s.bg, border: `1px solid ${s.border}`, color: s.text, flexShrink: 0, marginTop: 2, lineHeight: 1.4 }}>{line.sev}</span>
          <p style={{ margin: 0, fontSize: 12, color: P, lineHeight: 1.5 }}>{line.text}</p>
        </div>
      );
    }
    case 'mono': {
      const c = line.c === 'orange' ? '#c45a00' : line.c === 'red' ? '#cd0015' : line.c === 'muted' ? '#888' : P;
      return <p key={idx} style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: c, lineHeight: 1.6 }}>{line.text}</p>;
    }
    case 'row':
      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 12, color: P, opacity: 0.7 }}>{line.label}</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: line.risk ? '#cd0015' : P }}>{line.risk ? 'RISK' : '—'}</span>
            {line.note && <span style={{ fontSize: 10, color: P, opacity: 0.5, marginLeft: 8 }}>{line.note}</span>}
          </div>
        </div>
      );
    case 'text':
      return <p key={idx} style={{ margin: 0, fontSize: 12, color: P, lineHeight: 1.5 }}>{line.text}</p>;
    case 'note':
      return <p key={idx} style={{ margin: 0, fontSize: 11, color: P, opacity: 0.6, fontStyle: 'italic' }}>{line.text}</p>;
    default:
      return null;
  }
}

const C = '#2b555b';
const CREAM = '#fff7ec';
const SAGE = '#e0e6d4';
const MIST = '#b6c1bb';

export default function DemoSection() {
  const [selected, setSelected] = useState(0);
  const fn = DEMO_DATA[selected];

  return (
    <section id="signal-report" style={{ padding: '80px 24px 100px', background: CREAM }}>
      <div className="v9-signal-layout">

        {/* ── Left: intro ───────────────────────── */}
        <div style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C }}>SIGNAL REPORT</p>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 52px)', lineHeight: 1.05, fontWeight: 700, color: C }}>
            See what<br />CLASR sees.
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: C, opacity: 0.75, maxWidth: 280 }}>
            47 signals mapped across 9 sections. Non-decisional. Traceable. Yours.
          </p>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 42, padding: '12px 28px', border: `1px solid ${C}`, borderRadius: 999, background: C, color: CREAM, fontWeight: 500, textDecoration: 'none', fontSize: 15 }}>
            Start Signal Reading
          </Link>
        </div>

        {/* ── Right: window ───────────────────────── */}
        <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.18)', background: CREAM }}>

          {/* Window chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: SAGE, borderBottom: `1px solid ${MIST}` }}>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <span style={{ display: 'block', width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ display: 'block', width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
              <span style={{ display: 'block', width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
            </div>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, color: C, letterSpacing: '0.04em', marginRight: 42 }}>
              CLASR &mdash; Signal Report
            </span>
          </div>

          {/* Signal summary */}
          <div className="v9-signal-summary">
            <div style={{ border: `1px solid ${MIST}`, background: CREAM, padding: '16px 18px' }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, color: C, opacity: 0.5 }}>Demo manuscript</span>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: C }}>
                Self-Regulated Learning Strategies and Academic Achievement: A Cross-Sectional Study
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: C, opacity: 0.6 }}>n=312 · Educational Psychology · Q2 target journal</p>
            </div>
            <div style={{ border: `1px solid ${MIST}`, background: CREAM, padding: '16px 18px' }}>
              <span style={{ display: 'block', fontSize: 12, marginBottom: 8, color: C }}>Integrated risk posture</span>
              <strong style={{ display: 'block', fontSize: 22, fontWeight: 700, color: '#cd0015', marginBottom: 8 }}>HIGH</strong>
              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4, color: C, opacity: 0.7 }}>
                Critical statistical errors, causal drift, and closed replication profile detected before submission.
              </p>
            </div>
            <div style={{ border: `1px solid ${MIST}`, background: CREAM, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
              {[{ n: '2', label: 'critical', red: true }, { n: '5', label: 'major' }, { n: '4', label: 'minor' }].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: 20, fontWeight: 700, color: m.red ? '#cd0015' : C }}>{m.n}</strong>
                  <span style={{ fontSize: 11, color: C, opacity: 0.6 }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs + panels */}
          <div style={{ border: `1px solid ${MIST}`, background: SAGE }}>
            <div className="v9-signal-tabs" style={{ borderBottom: `1px solid ${MIST}` }}>
              {DEMO_DATA.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setSelected(i)}
                  style={{
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: selected === i ? 600 : 500,
                    color: C,
                    background: selected === i ? CREAM : 'transparent',
                    border: 'none',
                    borderRight: `1px solid ${MIST}`,
                    borderBottom: selected === i ? `2px solid ${C}` : '2px solid transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 120ms',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div key={selected} style={{ padding: '16px 20px', background: CREAM, minHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fn.lines.map((line, i) => renderLine(line, i))}
            </div>
            <p style={{ margin: 0, padding: '10px 20px 14px', fontSize: 11, color: C, opacity: 0.5, fontStyle: 'italic', background: CREAM, borderTop: `1px solid ${MIST}` }}>
              Demo output. Real analysis varies by manuscript content and selected Q-tier.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
