'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn } from '@/lib/auth';
import DemoSection from './components/DemoSection';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';

const C   = '#2b555b';
const CREAM = '#fff7ec';
const SAGE  = '#e0e6d4';
const MIST  = '#b6c1bb';
const PAD   = 'clamp(24px, 5.5vw, 80px)';

type ReadingRole = 'Author' | 'Reviewer' | 'Advisor';
type StudyType  = 'Quantitative' | 'Qualitative';
type QProfile   = 'Q1' | 'Q2' | 'Q3' | 'Auto';

function RolePill({ label, active, onClick, dashed }: { label: string; active: boolean; onClick: () => void; dashed?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px',
        border: `1px ${dashed ? 'dashed' : 'solid'} ${active ? C : MIST}`,
        borderRadius: 999,
        background: active ? SAGE : 'transparent',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        color: C,
        cursor: 'pointer',
        opacity: dashed && !active ? 0.6 : 1,
        transition: 'background 150ms, border-color 150ms',
      }}
    >
      {label}
    </button>
  );
}

function AnnotationCircle() {
  return (
    <img
      aria-hidden="true"
      src="/annotation-circle.svg"
      alt=""
      style={{ position: 'absolute', left: '0.04em', top: '-0.47em', width: '3.7em', height: 'auto', maxWidth: 'none', zIndex: -1, opacity: 0.92 }}
    />
  );
}

function AnnotationUnderline({ src, widthEm = '3.75' }: { src: string; widthEm?: string }) {
  return (
    <img
      aria-hidden="true"
      src={src}
      alt=""
      style={{ position: 'absolute', left: '-0.32em', bottom: '-0.14em', width: `${widthEm}em`, height: 'auto', maxWidth: 'none', opacity: 0.9 }}
    />
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [role,  setRole]  = useState<ReadingRole>('Author');
  const [study, setStudy] = useState<StudyType>('Quantitative');
  const [qp,    setQp]    = useState<QProfile>('Q1');

  useEffect(() => {
    if (isLoggedIn()) router.replace('/analyze');
  }, [router]);

  return (
    <div style={{ background: CREAM, color: C, minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ─────────────────────────────── */}
      <SiteHeader />

      {/* ── Hero ─────────────────────────────── */}
      <section style={{ padding: '56px 0 10px', textAlign: 'center' }}>
        <div style={{ width: `min(1280px, calc(100% - ${PAD} * 2))`, margin: '0 auto' }}>
          <p className="hero-eyebrow">Manuscript Signal Layer</p>
          <h1 style={{ width: 'min(690px, 100%)', margin: '0 auto', fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 7vw, 86px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: 0 }}>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
              <span style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}>
                &ldquo;READ
                <AnnotationCircle />
              </span>
              {' '}BEFORE
            </span>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
              YOU&rsquo;RE{' '}
              <span style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}>
                READ
                <AnnotationUnderline src="/annotation-underline.svg" />
              </span>
              .&rdquo;
            </span>
          </h1>
          <p style={{ maxWidth: 760, margin: '30px auto 0', fontSize: 'clamp(17px, 1.2vw, 22px)', fontWeight: 500, lineHeight: 1.28 }}>
            Academic manuscripts carry signals before they receive decisions.<br />
            CLASR makes those signals visible.
          </p>

          {/* Upload card */}
          <div style={{ width: 'min(760px, 100%)', margin: '44px auto 0' }}>
            <div className="v9-hero-card">

              {/* Left: config */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, padding: 22, borderRight: `1px solid ${MIST}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.45, textAlign: 'center' }}>Reading as</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {(['Author', 'Reviewer', 'Advisor'] as ReadingRole[]).map(r => (
                      <RolePill key={r} label={r} active={role === r} onClick={() => setRole(r)} />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.45, textAlign: 'center' }}>Study type</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {(['Quantitative', 'Qualitative'] as StudyType[]).map(s => (
                      <RolePill key={s} label={s} active={study === s} onClick={() => setStudy(s)} />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.45, textAlign: 'center' }}>Q-profile</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {(['Q1', 'Q2', 'Q3'] as QProfile[]).map(q => (
                      <RolePill key={q} label={q} active={qp === q} onClick={() => setQp(q)} />
                    ))}
                    <RolePill label="Auto" active={qp === 'Auto'} onClick={() => setQp('Auto')} dashed />
                  </div>
                </div>
              </div>

              {/* Middle: drop zone */}
              <label
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 10, padding: '22px 16px', background: 'rgba(43,85,91,0.02)', borderRight: `1px solid ${MIST}`, transition: 'background 180ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(43,85,91,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(43,85,91,0.02)')}
              >
                <input type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={() => router.push('/register')} />
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: MIST }}>
                  <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 18h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Drop manuscript here</p>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.5 }}>PDF or DOCX &middot; <u>browse</u></p>
              </label>

              {/* Right: CTA */}
              <Link
                href="/register"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '22px 26px', background: SAGE, color: C, textDecoration: 'none', fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, lineHeight: 1.2, textAlign: 'center', whiteSpace: 'nowrap', transition: 'background 180ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#cdd6c0')}
                onMouseLeave={e => (e.currentTarget.style.background = SAGE)}
              >
                Start Signal<br />Reading
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote ─────────────────────────────── */}
      <blockquote style={{ width: '100%', margin: 0, padding: `72px ${PAD}`, textAlign: 'center', border: 0, display: 'block' }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 'clamp(14px, 1.4vw, 17px)', fontStyle: 'italic', lineHeight: 1.5, fontWeight: 400 }}>
          &ldquo;Manuscripts are not only read for what they claim, but for how they claim.&rdquo;<br />
          <cite style={{ fontStyle: 'normal', fontWeight: 400, letterSpacing: '0.02em', opacity: 0.45, textTransform: 'uppercase', fontSize: 'inherit' }}>
            &mdash; from the Clasr white paper
          </cite>
        </p>
      </blockquote>

      {/* ── How It Works ──────────────────────── */}
      <section id="how-it-works" className="landing-hiw container">
        <div className="landing-hiw__head">
          <p className="section-eyebrow">HOW IT WORKS</p>
          <h2>Five reading layers from upload to report.</h2>
        </div>
        <div className="hiw-list">
          {[
            { num: '1', title: 'Intake', body: 'Clasr accepts English academic manuscripts, identifies manuscript zones, and treats any embedded instructions as manuscript content, not commands.' },
            { num: '2', title: 'Detection and routing', body: 'The system detects field, Q-profile, input completeness, revision-round status, reader mode, and requested report scope.' },
            { num: '3', title: 'Signal extraction', body: 'Clasr checks argument integrity, figure and table behavior, reproducibility patterns, source behavior, coherence, and drift.' },
            { num: '4', title: 'Calibration and collision management', body: 'Signals are filtered through the active Q-gate and field profile, then resolved using signal hierarchy rules.' },
            { num: '5', title: 'Assembly and presentation', body: 'The final report is assembled in a consistent order, with priority signals first.' },
          ].map(item => (
            <div key={item.num} className="hiw-item">
              <span className="hiw-item__num">{item.num}</span>
              <div className="hiw-item__body">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="landing-hiw-note">
          <span className="landing-hiw-note__label">What the user sees</span>
          <h2 className="landing-hiw-note__title">A structured report, not a decision.</h2>
          <p>The report identifies the Q tier, field profile, section coverage, limits and uncertainties, and reproducibility profile. What it does not show is a score, verdict, acceptance prediction, or recommendation.</p>
        </div>
      </section>

      {/* ── Signal Report ─────────────────────── */}
      <DemoSection />

      {/* ── What CLASR does / doesn't ─────────── */}
      <section className="pillars container">
        <h2 className="section-title section-title--mixed">
          What CLASR
          <img className="word-art word-art--does" src="/annotation-underline-does.svg" alt="does" />
          and
          <img className="word-art word-art--doesnt" src="/annotation-underline-doesnt.svg" alt="doesn&rsquo;t" />
          .
        </h2>
        <div className="pillar-grid">
          {[
            { title: 'No scores,', sub: 'no decision.', body: 'Only structured visibility before judgment begins.' },
            { title: 'Behavior,',  sub: 'not rewrite.', body: 'CLASR reads how the text makes claims.' },
            { title: 'Visibility,',sub: 'not verdict.', body: 'Traceable signals for authors, reviewers, advisors.' },
          ].map(c => (
            <article key={c.title} className="pillar-card">
              <h3>
                <span>{c.title}</span><br />
                <small>{c.sub}</small>
              </h3>
              <p>{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Q-Variant Calibration ─────────────── */}
      <section className="landing-q container">
        <div className="landing-q__copy">
          <p className="section-eyebrow">Q-Variant Calibration</p>
          <h2>Different journal targets need different signal sensitivity.</h2>
          <p>Clasr adjusts how strictly it reads the same manuscript based on Q-profile and field context.</p>
        </div>
        <div className="landing-q__chips">
          <span><strong>Q1</strong> strict</span>
          <span><strong>Q2</strong> balanced</span>
          <span><strong>Q3</strong> flexible</span>
          <span><strong>Auto</strong> detected</span>
        </div>
      </section>

      {/* ── Output Modes ──────────────────────── */}
      <section className="landing-q landing-q--modes container">
        <div className="landing-q__copy">
          <p className="section-eyebrow">Output Modes</p>
          <h2>One detection engine.<br />Three audiences.</h2>
          <p>The signal layer stays consistent while the report format adapts to the reader.</p>
        </div>
        <div className="landing-q__chips landing-q__chips--three">
          <span><strong>Author</strong> plain language</span>
          <span><strong>Reviewer</strong> dense labels</span>
          <span><strong>Advisor</strong> priority first</span>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────── */}
      <div style={{ marginBottom: 80, padding: '48px 32px', textAlign: 'center', background: CREAM }}>
        <p style={{ width: 'min(680px, 100%)', margin: '0 auto 12px' }}>
          <strong>We don&rsquo;t train AI models on your manuscripts. Ever.</strong>
        </p>
        <p style={{ width: 'min(680px, 100%)', margin: '0 auto' }}>
          Your work stays private. Manuscripts are processed only to provide CLASR&rsquo;s reading and analysis features.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 24 }}>
          <Link href="/terms"   style={{ color: C, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 4 }}>Terms of Service</Link>
          <Link href="/privacy" style={{ color: C, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 4 }}>Privacy Policy</Link>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────── */}
      <SiteFooter />
    </div>
  );
}
