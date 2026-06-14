import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy — CLASR',
  description: 'How CLASR collects, uses, stores, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main>
        <div className="v9-cp-page">

          <div className="v9-cp-hero">
            <span className="v9-cp-hero__label">Legal</span>
            <h1 className="v9-cp-hero__title">Privacy Policy</h1>
            <p className="v9-cp-hero__sub">Effective June 6, 2026 · Last updated June 6, 2026 · Version 2.0</p>
          </div>

          <div className="v9-legal-layout">
            <aside className="v9-legal-toc" aria-label="Privacy sections">
              <a href="#section-1">Introduction</a>
              <a href="#section-3">Data collected</a>
              <a href="#section-5">Retention</a>
              <a href="#section-6">Transfers</a>
              <a href="#section-8">Your rights</a>
              <a href="#section-11">Cookies</a>
              <a href="#section-14">Contact</a>
            </aside>

            <article className="v9-legal-document">

              <div className="v9-legal-section" id="section-1">
                <h2>1. Introduction</h2>
                <p>This Privacy Policy describes how CLASR (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) collects, uses, stores, and protects information about you when you use the CLASR academic manuscript signal-reading service available at clasr.ai (the &quot;Service&quot;).</p>
                <h3>Geographic availability</h3>
                <p>The Service is currently available to users in: United States, Canada, United Kingdom, EU/EEA, Switzerland, Australia, New Zealand, Singapore, Hong Kong, Japan, and selected other jurisdictions. <strong>The Service is not available to residents of the Republic of Türkiye.</strong></p>
                <h3>Our core privacy commitment</h3>
                <p>We have designed CLASR with a fundamental commitment to data minimization: <strong>we do not permanently store the content of your manuscripts.</strong></p>
                <p>If you have questions about this Privacy Policy, contact us at: <a href="mailto:hello@clasr.ai">hello@clasr.ai</a></p>
              </div>

              <div className="v9-legal-section" id="section-2">
                <h2>2. Who is responsible for your data</h2>
                <p>CLASR acts as the <strong>data controller</strong> for account-related personal data, and as a <strong>data processor</strong> for manuscript content that passes through our system temporarily.</p>
                <p>Our sub-processor for AI processing is <strong>Anthropic, PBC</strong> (United States), which operates the AI model that generates signal reports. Anthropic processes manuscript content under a Data Processing Agreement and does not retain it beyond the processing window. See our <Link href="/subprocessors">sub-processor list</Link> for all sub-processors.</p>
              </div>

              <div className="v9-legal-section" id="section-3">
                <h2>3. What information we collect</h2>
                <h3>3.1 Account information</h3>
                <p>When you create an account: your name, email address, a hashed password (never stored in readable form), country of residence, and optionally institutional affiliation and academic role.</p>
                <p>Payments are processed by <strong>Paddle.com Market Limited</strong> as Merchant of Record. <strong>We do not see, store, or have access to your credit card details.</strong> We receive from Paddle only: confirmation of payment, transaction reference numbers, billing country, and the email address you provided.</p>
                <h3>3.2 Manuscript content</h3>
                <p>When you upload a manuscript: it is transmitted over an encrypted connection, immediately forwarded to Anthropic for analysis, the signal report is returned to your account, and <strong>the manuscript content is deleted from our systems immediately after processing is complete.</strong></p>
                <p>Manuscript content is <strong>not used to train AI models</strong> and is <strong>not viewed by any human employee or contractor</strong> of CLASR in the ordinary course of business.</p>
                <h3>3.3 Generated signal reports</h3>
                <p>Signal reports are stored temporarily so you can view, download, and revisit them. The default retention period is <strong>7 days from generation</strong>, after which reports are automatically and permanently deleted. You may delete any report manually at any time.</p>
                <h3>3.4 Technical and usage information</h3>
                <p>We collect limited technical information: IP address (for security and geographic eligibility), browser type, device type, operating system, pages visited, date/time of access, and approximate geographic location (country and city level) derived from IP. We do not track you across other websites or use device fingerprints for advertising.</p>
                <h3>3.5 Communications with us</h3>
                <p>If you contact us, we retain those communications and any information you choose to provide.</p>
              </div>

              <div className="v9-legal-section" id="section-4">
                <h2>4. Why we collect this information (legal basis)</h2>
                <div className="v9-legal-table-wrap">
                  <table className="v9-legal-table">
                    <tbody>
                      <tr><th>Purpose</th><th>Legal basis</th></tr>
                      <tr><td>Providing you the Service you signed up for</td><td>Performance of contract (Art. 6(1)(b) GDPR)</td></tr>
                      <tr><td>Processing payments</td><td>Performance of contract (Art. 6(1)(b) GDPR)</td></tr>
                      <tr><td>Authenticating your account and preventing fraud</td><td>Legitimate interest (Art. 6(1)(f) GDPR)</td></tr>
                      <tr><td>Sending essential service notifications</td><td>Legitimate interest (Art. 6(1)(f) GDPR)</td></tr>
                      <tr><td>Transferring manuscript content to Anthropic (USA)</td><td>Standard Contractual Clauses + Art. 6(1)(b) GDPR</td></tr>
                      <tr><td>Sending marketing communications</td><td>Consent (Art. 6(1)(a) GDPR) — withdrawable at any time</td></tr>
                      <tr><td>Compliance with legal obligations</td><td>Legal obligation (Art. 6(1)(c) GDPR)</td></tr>
                      <tr><td>Verifying geographic eligibility</td><td>Legitimate interest (Art. 6(1)(f) GDPR)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="v9-legal-section" id="section-5">
                <h2>5. How long we keep your data</h2>
                <div className="v9-legal-table-wrap">
                  <table className="v9-legal-table">
                    <tbody>
                      <tr><th>Data category</th><th>Retention period</th></tr>
                      <tr><td>Manuscript content</td><td>Not retained — deleted immediately after processing</td></tr>
                      <tr><td>Signal reports</td><td>Maximum 7 days, or until you delete manually</td></tr>
                      <tr><td>Account information</td><td>Until you delete your account</td></tr>
                      <tr><td>Payment records</td><td>As required by applicable tax law (typically 5–10 years)</td></tr>
                      <tr><td>Communications with support</td><td>Up to 3 years after last interaction</td></tr>
                      <tr><td>Technical logs</td><td>Up to 90 days</td></tr>
                      <tr><td>Backups</td><td>Up to 30 days (rolling)</td></tr>
                      <tr><td>Marketing data</td><td>Until you withdraw consent or unsubscribe</td></tr>
                    </tbody>
                  </table>
                </div>
                <p>When you delete your account, we delete your personal account data within 30 days, except where retention is required by law.</p>
              </div>

              <div className="v9-legal-section" id="section-6">
                <h2>6. International data transfers</h2>
                <p>Your manuscript content is transferred to <strong>Anthropic in the United States</strong> for the brief processing window.</p>
                <p>For EU/EEA/UK/Swiss users: this transfer occurs under the European Commission&apos;s <strong>Standard Contractual Clauses (SCCs)</strong> (2021/914), supplemented by Anthropic&apos;s contractual commitment not to use content to train AI models, strict data deletion practices, and encryption in transit and at rest.</p>
              </div>

              <div className="v9-legal-section" id="section-7">
                <h2>7. With whom we share your data</h2>
                <p><strong>We do not sell your personal data.</strong> We do not share data with advertisers, data brokers, or marketing aggregators.</p>
                <div className="v9-legal-table-wrap">
                  <table className="v9-legal-table">
                    <tbody>
                      <tr><th>Sub-processor</th><th>Purpose</th><th>Location</th></tr>
                      <tr><td>Anthropic, PBC</td><td>AI processing of manuscript content</td><td>United States</td></tr>
                      <tr><td>Paddle.com Market Limited</td><td>Payment processing as Merchant of Record</td><td>United Kingdom</td></tr>
                      <tr><td>Hosting infrastructure provider</td><td>Server infrastructure</td><td>United States / EU</td></tr>
                      <tr><td>Transactional email provider</td><td>Email delivery</td><td>United States / EU</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="v9-legal-section" id="section-8">
                <h2>8. Your rights</h2>
                <h3>8.1 Universal rights</h3>
                <ul>
                  <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
                  <li><strong>Correction</strong> — Ask us to correct inaccurate or incomplete data</li>
                  <li><strong>Deletion</strong> — Request deletion of your personal data</li>
                  <li><strong>Restriction</strong> — Ask us to limit how we process your data</li>
                  <li><strong>Portability</strong> — Receive your data in a machine-readable format (JSON or CSV)</li>
                  <li><strong>Withdraw consent</strong> — Withdraw any consent you previously gave</li>
                  <li><strong>Lodge a complaint</strong> — File a complaint with your local data protection authority</li>
                </ul>
                <h3>8.2 Additional rights for California users (CCPA/CPRA)</h3>
                <p>Right to know, delete, opt out of sale (we don&apos;t sell personal information), correct, and limit use of sensitive personal information. Right of non-discrimination for exercising any of these rights.</p>
                <h3>8.3 How to exercise your rights</h3>
                <p>Contact us at <a href="mailto:hello@clasr.ai">hello@clasr.ai</a>. We respond within 30 days for most requests (45 days for complex requests, with notice). No fee for legitimate requests.</p>
              </div>

              <div className="v9-legal-section" id="section-9">
                <h2>9. Data security</h2>
                <p>All data transmission uses TLS 1.2+ encryption. Passwords are stored using bcrypt. Manuscript content is never written to persistent storage on our infrastructure. Signal reports are encrypted at rest.</p>
                <p>In the event of a personal data breach, we will notify the relevant data protection authority within 72 hours and affected users without undue delay.</p>
              </div>

              <div className="v9-legal-section" id="section-10">
                <h2>10. Children&apos;s privacy</h2>
                <p>CLASR is intended for adult academic users. The Service is not directed at children under 16. If we learn we have inadvertently collected such data, we will delete it promptly. Contact <a href="mailto:hello@clasr.ai">hello@clasr.ai</a> if you have concerns.</p>
              </div>

              <div className="v9-legal-section" id="section-11">
                <h2>11. Cookies</h2>
                <p>We use cookies and similar technologies.</p>
                <div className="v9-legal-table-wrap">
                  <table className="v9-legal-table">
                    <tbody>
                      <tr><th>Cookie type</th><th>Purpose</th><th>Required?</th></tr>
                      <tr><td>Essential</td><td>Session management, authentication, security</td><td>Yes</td></tr>
                      <tr><td>Functional</td><td>Remember your preferences (output mode)</td><td>Optional</td></tr>
                      <tr><td>Analytics</td><td>Privacy-respecting usage analytics (no cross-site tracking)</td><td>Optional, with consent</td></tr>
                    </tbody>
                  </table>
                </div>
                <p>We do not use third-party advertising cookies or cross-site tracking.</p>
              </div>

              <div className="v9-legal-section" id="section-12">
                <h2>12. Automated decision-making</h2>
                <p>CLASR uses AI to generate signal reports. <strong>This is not automated decision-making in the legal sense</strong> because signal reports do not produce decisions (accept, reject, score) and do not produce legally significant effects on you. CLASR is explicitly designed as a non-decisional system.</p>
              </div>

              <div className="v9-legal-section" id="section-13">
                <h2>13. Changes to this Privacy Policy</h2>
                <p>When we make material changes, we will update the &quot;Last updated&quot; date, notify you by email if changes significantly affect your rights, and provide at least 30 days&apos; advance notice.</p>
              </div>

              <div className="v9-legal-section" id="section-14">
                <h2>14. Contact us</h2>
                <p><strong>Email:</strong> <a href="mailto:hello@clasr.ai">hello@clasr.ai</a></p>
                <p>For users in the EU or UK, you have the right to lodge a complaint with your local data protection authority:</p>
                <ul>
                  <li>EU: Your local DPA (full list at edpb.europa.eu)</li>
                  <li>UK: Information Commissioner&apos;s Office — ico.org.uk</li>
                  <li>California: California Privacy Protection Agency — cppa.ca.gov</li>
                  <li>Canada: Office of the Privacy Commissioner — priv.gc.ca</li>
                  <li>Australia: Office of the Australian Information Commissioner — oaic.gov.au</li>
                </ul>
              </div>

            </article>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
