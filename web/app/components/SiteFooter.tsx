import Link from 'next/link';

const C    = '#2b555b';
const CREAM = '#fff7ec';
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

const SOCIAL = [
  { href: '#', label: 'Instagram', icon: '/social-instagram.svg' },
  { href: '#', label: 'LinkedIn',  icon: '/social-linkedin.svg'  },
  { href: '#', label: 'X',         icon: '/social-x.svg'         },
  { href: '#', label: 'Github',    icon: '/social-github.svg'    },
];

export default function SiteFooter() {
  const inner: React.CSSProperties = {
    width: `min(1440px, 100%)`,
    margin: '0 auto',
    padding: `0 ${PAD}`,
  };

  return (
    <footer style={{ position: 'relative', background: '#dbe4ce', borderTop: `1px solid ${MIST}`, overflow: 'hidden' }}>
      <div style={{ ...inner, paddingTop: 52, paddingBottom: 28 }}>

        {/* Top: logo column + 4 nav columns */}
        <div className="v9-footer-top">

          {/* Brand */}
          <div>
            <Link href="/" aria-label="CLASR home">
              <img src="/logo-primary.svg" alt="CLASR" style={{ width: 100, height: 'auto', display: 'block' }} />
            </Link>
            <p style={{ margin: '18px 0 0', fontSize: 13, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap', opacity: 0.55 }}>
              Manuscript Signal Layer
            </p>
          </div>

          {/* Nav columns */}
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

        {/* Bottom bar: copyright · terms · privacy · social */}
        <div className="v9-footer-bottom">
          <span>© 2026 CLASR</span>
          <Link href="/terms"   style={{ color: C, textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/privacy" style={{ color: C, textDecoration: 'none' }}>Privacy Policy</Link>
          <div className="v9-footer-bottom-spacer" />
          <ul className="v9-footer-social-list">
            {SOCIAL.map(s => (
              <li key={s.label}>
                <a href={s.href} aria-label={s.label} className="v9-footer-social">
                  <img src={s.icon} alt="" style={{ width: 25, height: 25 }} />
                </a>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <img src="/brand-pattern-petrol.svg" alt="" aria-hidden="true"
        style={{ position: 'absolute', right: 30, bottom: 42, width: 48, height: 'auto', opacity: 0.22, pointerEvents: 'none' }} />
    </footer>
  );
}
