'use client';
import { useState } from 'react';
import Link from 'next/link';

const C    = '#2b555b';
const CREAM = '#fff7ec';
const SAGE  = '#e0e6d4';
const MIST  = '#b6c1bb';
const PAD   = 'clamp(24px, 5.5vw, 80px)';

const NAV_ITEMS = [
  {
    label: 'Features', href: '/features',
    menu: [
      { title: 'Signal Mapping',        desc: 'Behavioral signal reports across 9 sections',         href: '/features' },
      { title: 'Argument Chain',        desc: 'Track the central claim from framing to conclusion',  href: '/features#argument-chain' },
      { title: 'Desk-Reject Profile',   desc: 'See editorial risk patterns before an editor does',   href: '/features#desk-reject' },
      { title: 'Q-Variant Calibration', desc: 'Adjust sensitivity for Q1, Q2, or Q3 targets',       href: '/features#q-calibration' },
      { title: 'Output Modes',          desc: 'Author, Reviewer, or Advisor reading formats',        href: '/features#output-modes' },
    ],
  },
  {
    label: 'Resources', href: '#',
    menu: [
      { title: 'Signal Architecture',   desc: 'Reading perspectives, study types, and Q-profiles',  href: '/resources/signal-architecture' },
      { title: 'How It Works',          desc: 'A walkthrough of the full reading process',           href: '/how-it-works' },
      { title: 'FAQ',                   desc: 'Common questions about CLASR',                        href: '/faq' },
    ],
  },
  {
    label: 'Pricing', href: '/pricing',
    menu: [
      { title: 'Plans',                 desc: 'Individual and team pricing options',                 href: '/pricing' },
      { title: 'For Institutions',      desc: 'University and research group licensing',             href: '/pricing#institutions' },
      { title: 'FAQ',                   desc: 'Billing and subscription questions',                  href: '/pricing#faq' },
    ],
  },
  {
    label: 'Company', href: '/about',
    menu: [
      { title: 'About',                 desc: 'The team and mission behind CLASR',                  href: '/about' },
      { title: 'Contact',               desc: 'Get in touch with us',                               href: '/contact' },
      { title: 'Privacy Policy',        desc: 'How we handle your data',                            href: '/privacy' },
    ],
  },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const inner: React.CSSProperties = {
    width: `min(1440px, 100%)`,
    margin: '0 auto',
    padding: `0 ${PAD}`,
  };

  return (
    <header className="site-header" style={{ position: 'relative', zIndex: 10, background: CREAM, borderBottom: `1px solid ${C}` }}>
      <div style={{ ...inner, minHeight: 58, display: 'grid', gridTemplateColumns: '140px 1fr auto', alignItems: 'center', gap: 28 }}>

        <Link href="/" aria-label="CLASR home">
          <img src="/logo-primary.svg" alt="CLASR" style={{ width: 96, height: 'auto', display: 'block' }} />
        </Link>

        <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 'clamp(36px, 6vw, 76px)', fontSize: 14, fontWeight: 500 }}>
          {NAV_ITEMS.map(item => (
            <div key={item.label} className="group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <a
                href={item.href}
                className="v9-nav-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 34, padding: '6px 8px', color: C, textDecoration: 'none' }}
              >
                {item.label}
                <span style={{ width: 7, height: 7, display: 'inline-block', borderRight: `1.5px solid ${C}`, borderBottom: `1.5px solid ${C}`, transform: 'rotate(45deg) translateY(-2px)', opacity: 0.85 }} />
              </a>
              <div
                className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
                style={{ position: 'absolute', top: '100%', left: 0, zIndex: 40, width: 260, paddingTop: 8, transition: 'opacity 140ms ease' }}
              >
                <div style={{ padding: 8, borderRadius: 8, border: `1px solid rgba(43,85,91,0.12)`, background: SAGE, boxShadow: '0 12px 28px rgba(43,85,91,0.13)', display: 'grid', gap: 0 }}>
                  {item.menu.map(m => (
                    <Link
                      key={m.title}
                      href={m.href}
                      className="v9-nav-menu-link"
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: C, lineHeight: 1.2 }}>{m.title}</span>
                      <span style={{ fontSize: 11.5, color: C, opacity: 0.6, lineHeight: 1.4 }}>{m.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/login"
            className="hidden md:inline-flex btn btn--small"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="btn btn--primary btn--small"
          >
            Register
          </Link>
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            style={{ width: 42, height: 42, border: `1px solid ${C}`, borderRadius: 999, background: 'transparent', position: 'relative', cursor: 'pointer' }}
          >
            <span style={{ position: 'absolute', left: 12, right: 12, height: 2, background: C, top: 14 }} />
            <span style={{ position: 'absolute', left: 12, right: 12, height: 2, background: C, top: 20 }} />
            <span style={{ position: 'absolute', left: 12, right: 12, height: 2, background: C, top: 26 }} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{ borderTop: `1px solid ${MIST}`, padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 4, background: CREAM }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.label} href={item.href} style={{ padding: '10px 0', fontSize: 14, fontWeight: 500, color: C, textDecoration: 'none', borderBottom: `1px solid ${MIST}` }} onClick={() => setMobileOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/login"    style={{ padding: '10px 0', fontSize: 14, color: C, textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>Log In</Link>
          <Link href="/register" className="btn btn--primary" style={{ marginTop: 8, width: '100%' }} onClick={() => setMobileOpen(false)}>Register</Link>
        </div>
      )}
    </header>
  );
}
