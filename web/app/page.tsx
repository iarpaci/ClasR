'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn } from '@/lib/auth';
import DemoSection from './components/DemoSection';
import SiteHeader from './components/SiteHeader';

const C   = '#2b555b';
const CREAM = '#fff7ec';
const SAGE  = '#e0e6d4';
const MIST  = '#b6c1bb';
const PAD   = 'clamp(24px, 5.5vw, 80px)';

const FOOTER_COLS = [
  { title: 'Features', links: [
    { label: 'Signal Mapping',        href: '/features' },
    { label: 'Argument Chain',        href: '/features#argument-chain' },
    { label: 'Desk-Reject Profile',   href: '/features#desk-reject' },
    { label: 'Q-Variant Calibration', href: '/features#q-calibration' },
    { label: 'Output Modes',          href: '/features#output-modes' },
  ]},
  { title: 'Resources', links: [
    { label: 'Signal Architecture',   href: '/resources/signal-architecture' },
    { label: 'How It Works',          href: '/how-it-works' },
    { label: 'FAQ',                   href: '/faq' },
  ]},
  { title: 'Pricing', links: [
    { label: 'Plans',                 href: '/pricing' },
    { label: 'For Institutions',      href: '/pricing#institutions' },
    { label: 'FAQ',                   href: '/pricing#faq' },
  ]},
  { title: 'Company', links: [
    { label: 'About',                 href: '/about' },
    { label: 'Contact',               href: '/contact' },
    { label: 'Privacy Policy',        href: '/privacy' },
  ]},
];

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

  const inner: React.CSSProperties = {
    width: `min(1440px, 100%)`,
    margin: '0 auto',
    padding: `0 ${PAD}`,
  };

  return (
    <div style={{ background: CREAM, color: C, minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ─────────────────────────────── */}
      <SiteHeader />

      {/* ── Hero ─────────────────────────────── */}
      <section style={{ padding: '56px 0 10px', textAlign: 'center' }}>
        <div style={{ width: `min(1280px, calc(100% - ${PAD} * 2))`, margin: '0 auto' }}>
          <p style={{ margin: '0 0 28px', fontWeight: 500, fontSize: 14 }}>Manuscript Signal Layer</p>
          <h1 style={{ width: 'min(690px, 100%)', margin: '0 auto', fontFamily: 'var(--font-serif)', fontSize: 'clamp(48px, 5.6vw, 64px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: 0 }}>
            <span style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}>
              &ldquo;READ
              <AnnotationCircle />
            </span>
            {' '}BEFORE<br />
            YOU&rsquo;RE{' '}
            <span style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}>
              READ
              <AnnotationUnderline src="/annotation-underline.svg" />
            </span>
            .&rdquo;
          </h1>
          <p style={{ maxWidth: 630, margin: '28px auto 0', fontSize: 17, lineHeight: 1.35 }}>
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
            &mdash; CLASR Signal Architecture
          </cite>
        </p>
      </blockquote>

      {/* ── Signal Report ─────────────────────── */}
      <DemoSection />

      {/* ── What CLASR does / doesn't ─────────── */}
      <section style={{ padding: '22px 0 88px' }}>
        <div style={{ width: `min(1280px, calc(100% - ${PAD} * 2))`, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '0.16em', fontSize: 36, fontWeight: 500, lineHeight: 1, fontFamily: 'var(--font-sans)' }}>
            What CLASR
            <img src="/annotation-underline-does.svg" alt="does" style={{ display: 'inline-block', objectFit: 'contain', transform: 'translateY(-0.02em)', width: 102 }} />
            and
            <img src="/annotation-underline-doesnt.svg" alt="doesn&rsquo;t" style={{ display: 'inline-block', objectFit: 'contain', transform: 'translateY(0.08em)', width: 154 }} />
            .
          </h2>
          <div className="v9-pillar-grid">
            {[
              { title: 'No scores,', sub: 'no decision.', body: ['Only structured', 'visibility before', 'judgment begins.'] },
              { title: 'Behavior,',  sub: 'not rewrite.', body: ['CLASR reads',     'how the text',     'makes claims.'] },
              { title: 'Visibility,',sub: 'not verdict.', body: ['Traceable signals','for authors,',     'reviewers, advisors.'] },
            ].map(c => (
              <article key={c.title} style={{ width: 228, height: 300, padding: '58px 44px 38px', background: SAGE, border: `1px solid rgba(43,85,91,0.16)`, borderRadius: 2 }}>
                <h3 style={{ margin: '0 0 68px', fontWeight: 500, lineHeight: 1.03, fontFamily: 'var(--font-sans)' }}>
                  <span style={{ fontSize: 30 }}>{c.title}</span><br />
                  <small style={{ display: 'inline-block', fontSize: 22, fontWeight: 500, whiteSpace: 'nowrap' }}>{c.sub}</small>
                </h3>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 400, lineHeight: 1.18 }}>
                  {c.body.map((line, i) => <span key={i}>{line}<br /></span>)}
                </p>
              </article>
            ))}
          </div>
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
      <footer id="company" style={{ background: '#dbe4ce', borderTop: `1px solid ${MIST}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: 'min(1440px, 100%)', margin: '0 auto', padding: `0 ${PAD}`, paddingTop: 52, paddingBottom: 28 }}>

          {/* Top: logo + nav cols */}
          <div className="v9-footer-top">
            <div>
              <Link href="/" aria-label="CLASR home">
                <img src="/logo-primary.svg" alt="CLASR" style={{ width: 100, height: 'auto', display: 'block' }} />
              </Link>
              <p style={{ margin: '18px 0 0', fontSize: 13, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap', opacity: 0.55 }}>
                Manuscript Signal Layer
              </p>
            </div>
            <div className="v9-footer-cols">
              {FOOTER_COLS.map(col => (
                <div key={col.title}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, lineHeight: 1 }}>{col.title}</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
                    {col.links.map(l => (
                      <li key={l.label}>
                        <Link href={l.href} className="v9-footer-link">{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="v9-footer-bottom">
            <span style={{ fontSize: 13 }}>&copy; 2026 CLASR</span>
            <Link href="/terms"   style={{ color: C, textDecoration: 'none', fontSize: 13 }}>Terms of Service</Link>
            <Link href="/privacy" style={{ color: C, textDecoration: 'none', fontSize: 13 }}>Privacy Policy</Link>
            <div className="v9-footer-bottom-spacer" />
            <ul className="v9-footer-social-list">
              {[
                { href: '#', label: 'Instagram', src: '/social-instagram.svg' },
                { href: '#', label: 'LinkedIn',  src: '/social-linkedin.svg' },
                { href: '#', label: 'X',         src: '/social-x.svg' },
                { href: '#', label: 'Github',    src: '/social-github.svg' },
              ].map(s => (
                <li key={s.label}>
                  <a href={s.href} aria-label={s.label} className="v9-footer-social">
                    <img src={s.src} alt="" style={{ width: 25, height: 25 }} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <img src="/brand-pattern-petrol.svg" alt="" aria-hidden="true"
          style={{ position: 'absolute', right: 30, bottom: 42, width: 48, height: 'auto', opacity: 0.22, pointerEvents: 'none' }} />
      </footer>
    </div>
  );
}
