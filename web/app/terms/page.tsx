import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Terms of Service — CLASR',
  description: 'The terms governing your use of the CLASR academic manuscript signal-reading service.',
};

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main>
        <div className="v9-cp-page">

          <div className="v9-cp-hero">
            <span className="v9-cp-hero__label">Legal</span>
            <h1 className="v9-cp-hero__title">Terms of Service</h1>
            <p className="v9-cp-hero__sub">Effective June 6, 2026 · Last updated June 6, 2026 · Version 2.0</p>
          </div>

          <div className="v9-legal-layout">
            <aside className="v9-legal-toc" aria-label="Terms sections">
              <a href="#section-1">Acceptance</a>
              <a href="#section-2">Eligibility</a>
              <a href="#section-4">What CLASR is</a>
              <a href="#section-5">Pricing</a>
              <a href="#section-6">Acceptable use</a>
              <a href="#section-7">IP</a>
              <a href="#section-9">Disclaimers</a>
              <a href="#section-13">Governing law</a>
              <a href="#section-15">Contact</a>
            </aside>

            <article className="v9-legal-document">

              <div className="v9-legal-section" id="section-1">
                <h2>1. Acceptance of these Terms</h2>
                <p>These Terms of Service (&quot;Terms&quot;) form a binding agreement between you and CLASR regarding your use of the academic manuscript signal-reading service at clasr.ai. By creating an account, purchasing a Trial Pack, subscribing to a plan, or otherwise using the Service, <strong>you agree to these Terms.</strong></p>
              </div>

              <div className="v9-legal-section" id="section-2">
                <h2>2. Geographic availability and eligibility</h2>
                <h3>2.1 Where the Service is available</h3>
                <p>CLASR is available to users in: United States, Canada, United Kingdom, EU/EEA, Switzerland, Australia, New Zealand, Singapore, Hong Kong, Japan, and other jurisdictions as specifically announced on clasr.ai.</p>
                <h3>2.2 Türkiye exclusion</h3>
                <p><strong>The Service is not available to residents of the Republic of Türkiye.</strong> By creating an account you represent that you are not a resident of or located in the Republic of Türkiye.</p>
                <h3>2.3 Sanctions and embargoes</h3>
                <p>You may not use the Service if you are located in or a national of any country subject to comprehensive sanctions (currently including Cuba, Iran, North Korea, Syria, and the Crimea/Donetsk/Luhansk regions of Ukraine).</p>
                <h3>2.4 Age requirement</h3>
                <p>You must be at least 18 years old to use the Service. CLASR is intended for adult academic users.</p>
              </div>

              <div className="v9-legal-section" id="section-3">
                <h2>3. Account registration</h2>
                <p>You must provide accurate and current information when creating your account, maintain the security of your credentials, and use the Service for lawful academic and research purposes only. You are responsible for all activity that occurs under your account. Notify us immediately at <a href="mailto:hello@clasr.ai">hello@clasr.ai</a> if you become aware of unauthorized use.</p>
              </div>

              <div className="v9-legal-section" id="section-4">
                <h2>4. What CLASR is — and what it is not</h2>
                <p>CLASR is an academic manuscript reading system that produces structured signal reports based on behavioral patterns: how claims are constructed, how evidence is bounded, how arguments develop, and how uncertainty is acknowledged.</p>
                <p>CLASR is explicitly <strong>not</strong>: a peer-review automation system, a grading or scoring system, a decision-making system for manuscript acceptance or rejection, an editing service, a plagiarism detection system, a journal recommendation tool, or a substitute for expert academic judgment.</p>
                <p><strong>CLASR does not make decisions about your manuscripts.</strong> All judgments remain entirely with human academic readers. Signal reports are informational only — not evaluations of quality, predictions of outcome, or recommendations of action.</p>
              </div>

              <div className="v9-legal-section" id="section-5">
                <h2>5. Plans, pricing, and payment</h2>
                <h3>5.1 Plan structure</h3>
                <p>CLASR offers: <strong>Trial Pack</strong> (one-time, 5 analyses); <strong>Regular</strong> (monthly subscription); <strong>Professional</strong> (higher tier); and <strong>Enterprise</strong> (negotiated contracts). Current pricing is published at <Link href="/pricing">clasr.ai/pricing</Link>.</p>
                <h3>5.2 Payment</h3>
                <p>Payment processing is provided by <strong>Paddle.com Market Limited</strong> as our Merchant of Record. When you purchase, Paddle is the legal seller of record and handles payment processing, fraud prevention, and calculation, collection, and remittance of applicable sales tax, VAT, and GST. We do not accept payment instruments from financial institutions in countries where the Service is not available.</p>
                <h3>5.3 Recurring subscriptions</h3>
                <p>Monthly and annual subscriptions renew automatically unless you cancel before renewal. Cancellation takes effect at the end of the current paid period.</p>
                <h3>5.4 Price changes</h3>
                <p>We will notify you at least 30 days before a price change takes effect. If you do not accept the new price, you may cancel before it takes effect.</p>
                <h3>5.5 Refund policy</h3>
                <div className="v9-legal-table-wrap">
                  <table className="v9-legal-table">
                    <tbody>
                      <tr><th>Plan</th><th>Refund eligibility</th></tr>
                      <tr><td>Trial Pack</td><td>Refundable within 48 hours if the signal report failed to generate or contains a clear processing error</td></tr>
                      <tr><td>Regular / Professional monthly</td><td>No partial refunds for unused portion of a paid month; you can cancel future renewals at any time</td></tr>
                      <tr><td>Regular / Professional annual</td><td>Full refund within 14 days of initial purchase if used minimally (fewer than 3 analyses); no refunds after 14 days</td></tr>
                    </tbody>
                  </table>
                </div>
                <h3>5.6 EU consumer right of withdrawal</h3>
                <p>If you are a consumer in the EU, EEA, or UK, you have a statutory right to withdraw within 14 days. For Trial Pack and per-manuscript purchases, you expressly consent that the service begins immediately upon purchase and acknowledge that your right of withdrawal is lost once the signal report has been generated.</p>
                <h3>5.7 Vouchers</h3>
                <p>Voucher codes provide a specified number of free manuscript analyses. Vouchers cannot be combined, have no cash value, are not transferable once redeemed, and are subject to the same geographic eligibility requirements as paid plans.</p>
              </div>

              <div className="v9-legal-section" id="section-6">
                <h2>6. Acceptable use</h2>
                <p>You may use the Service to analyze academic manuscripts you authored, co-authored (with permission), or have explicit written permission to upload.</p>
                <p>You may not: upload manuscripts without authorization; misrepresent signal reports as peer reviews; resell or sublicense the Service; reverse-engineer CLASR&apos;s AI models or system architecture; use automated scrapers; create multiple accounts to evade limits; or circumvent geographic restrictions or sanctions.</p>
                <p><strong>You are solely responsible for the content of manuscripts you upload.</strong></p>
              </div>

              <div className="v9-legal-section" id="section-7">
                <h2>7. Intellectual property</h2>
                <h3>7.1 Your content</h3>
                <p>You retain all intellectual property rights in the manuscripts you upload. By uploading, you grant us a limited, temporary, non-exclusive, royalty-free license to process the manuscript solely for the purpose of generating the signal report. This license terminates when processing is complete and the manuscript is deleted.</p>
                <p>We do not use your manuscript content to train AI models or develop competing products.</p>
                <h3>7.2 Signal reports</h3>
                <p>Signal reports are provided to you for your use. You may share them as you wish, with the understanding that they are non-decisional and informational only.</p>
                <h3>7.3 Trademarks and feedback</h3>
                <p>&quot;CLASR&quot; and the CLASR logo are our trademarks. If you provide feedback or suggestions, we may use them to improve the Service without compensation.</p>
              </div>

              <div className="v9-legal-section" id="section-8">
                <h2>8. Service availability</h2>
                <p>We work to keep the Service available but do not guarantee continuous, error-free, or uninterrupted service. We may modify, add, or remove features at any time. Significant feature changes will be communicated with at least 30 days&apos; notice.</p>
              </div>

              <div className="v9-legal-section" id="section-9">
                <h2>9. Disclaimers and limitations</h2>
                <h3>9.1 Service provided &quot;as is&quot;</h3>
                <p>Except as required by applicable law, the Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranty of any kind, express or implied.</p>
                <h3>9.2 No guarantee of outcomes</h3>
                <p>We do not guarantee that signal reports will accurately reflect every relevant aspect of your manuscript or that following observations will result in publication acceptance. Signal reports are non-decisional informational outputs — not predictions, evaluations, or guarantees.</p>
                <h3>9.3 Limitation of liability</h3>
                <p>To the maximum extent permitted by applicable law: our total aggregate liability to you is limited to the greater of (a) the amount you paid us in the 12 months preceding the claim, or (b) USD $100. We are not liable for indirect, incidental, consequential, special, or punitive damages.</p>
                <p>Nothing in these Terms excludes liability for fraud, gross negligence, or death or personal injury caused by negligence.</p>
              </div>

              <div className="v9-legal-section" id="section-10">
                <h2>10. Manuscript confidentiality and signal report retention</h2>
                <p>Manuscript content is treated as confidential: not retained beyond the processing window, not viewed by CLASR employees in the ordinary course of business, not shared with third parties except Anthropic for report generation, and not used to train AI models.</p>
                <p>Signal reports are stored for a default of <strong>7 days from generation</strong>. We recommend downloading reports you wish to preserve.</p>
              </div>

              <div className="v9-legal-section" id="section-11">
                <h2>11. Account termination</h2>
                <p>You may close your account at any time through account settings or by emailing <a href="mailto:hello@clasr.ai">hello@clasr.ai</a>. Your account data is deleted within 30 days (except where required by law).</p>
                <p>We may suspend or terminate your account if you materially breach these Terms, engage in fraudulent activity, circumvent geographic restrictions, or become inactive for an extended period (typically 24 months — we will notify you before deletion).</p>
              </div>

              <div className="v9-legal-section" id="section-12">
                <h2>12. Modifications to these Terms</h2>
                <p>We may update these Terms from time to time. For material changes, we will notify you by email at least 30 days before changes take effect. Continued use after material changes take effect constitutes acceptance.</p>
              </div>

              <div className="v9-legal-section" id="section-13">
                <h2>13. Governing law and dispute resolution</h2>
                <p>These Terms are governed by applicable law, except where mandatory consumer protection laws of your country of residence apply (including EU consumer protection directives, UK Consumer Rights Act 2015, US state consumer protection laws, and Australian Consumer Law).</p>
                <p>Before initiating any legal action, you agree to first contact us at <a href="mailto:legal@clasr.ai">legal@clasr.ai</a> and make a good-faith effort to resolve the dispute informally for at least 60 days.</p>
                <p>EU users: the European Commission provides an Online Dispute Resolution platform at ec.europa.eu/consumers/odr.</p>
              </div>

              <div className="v9-legal-section" id="section-14">
                <h2>14. General provisions</h2>
                <p>These Terms, together with our <Link href="/privacy">Privacy Policy</Link>, constitute the entire agreement between you and us regarding the Service. If any provision is held invalid, the remaining provisions remain in full force and effect.</p>
              </div>

              <div className="v9-legal-section" id="section-15">
                <h2>15. Contact</h2>
                <p>General inquiries and support: <a href="mailto:hello@clasr.ai">hello@clasr.ai</a></p>
                <p>Legal matters: <a href="mailto:legal@clasr.ai">legal@clasr.ai</a></p>
              </div>

            </article>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
