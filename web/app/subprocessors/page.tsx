import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sub-processor List — CLASR',
  description: 'Third-party companies CLASR uses to operate the Service and how they handle your data.',
};

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-border px-6 py-4 flex items-center gap-4 bg-cream">
        <Link href="/" className="text-muted hover:text-teal text-sm transition-colors">← Back</Link>
        <h1 className="font-serif italic text-xl text-teal font-bold">CLASR</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="font-serif text-2xl font-bold text-teal mb-1">Sub-processor List</h2>
        <p className="text-muted text-xs mb-8">Effective date: pending legal review · Questions: <a href="mailto:hello@clasr.ai" className="text-teal underline">hello@clasr.ai</a></p>

        <div className="space-y-8 text-muted text-sm leading-relaxed">

          <section>
            <p>This page lists the third-party companies ("sub-processors") that CLASR uses to operate the Service. Under GDPR Article 28 and equivalent data protection regulations, we are required to be transparent about which third parties may process personal data on our behalf.</p>
            <p className="mt-2">Each sub-processor is bound by a Data Processing Agreement (DPA) with CLASR; provides contractual guarantees of data protection; and is required to maintain appropriate technical and organizational security measures.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-4">Current sub-processors</h3>
            <div className="space-y-6">

              <div className="border border-mist rounded-sm p-4">
                <h4 className="font-semibold text-teal mb-3">Anthropic, PBC</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Purpose</span>
                    <span>AI processing of manuscript content to generate signal reports</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Data processed</span>
                    <span>Manuscript content (text and structure), processed transiently and not retained</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Location</span>
                    <span>United States</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Safeguards</span>
                    <span>Standard Contractual Clauses (SCCs) + Data Processing Agreement</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Retention</span>
                    <span>Manuscript content not used to train models; processing-window retention only</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Privacy policy</span>
                    <span><a href="https://www.anthropic.com/privacy" className="text-teal underline" target="_blank" rel="noopener noreferrer">anthropic.com/privacy</a></span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Security info</span>
                    <span><a href="https://trust.anthropic.com" className="text-teal underline" target="_blank" rel="noopener noreferrer">trust.anthropic.com</a></span>
                  </div>
                </div>
                <p className="text-xs mt-3 text-muted">This is CLASR's most critical sub-processor. The AI analysis that produces every signal report is performed by Anthropic's Claude model. Manuscript content is transferred to Anthropic for analysis and is not retained by either party after processing.</p>
              </div>

              <div className="border border-mist rounded-sm p-4">
                <h4 className="font-semibold text-teal mb-3">Paddle.com Market Limited</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Purpose</span>
                    <span>Payment processing as Merchant of Record for all paid plans</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Legal role</span>
                    <span>Paddle is an <strong>independent data controller</strong> for payment data, not CLASR's processor</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Data processed</span>
                    <span>Payment instrument data, billing address, transaction history, fraud signals, tax-relevant data</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Location</span>
                    <span>United Kingdom (HQ), with global infrastructure</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Safeguards</span>
                    <span>PCI-DSS Level 1 certified; SCCs where applicable; subject to UK GDPR</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Privacy policy</span>
                    <span><a href="https://www.paddle.com/legal/privacy" className="text-teal underline" target="_blank" rel="noopener noreferrer">paddle.com/legal/privacy</a></span>
                  </div>
                </div>
                <p className="text-xs mt-3 text-muted">Paddle acts as our Merchant of Record — the legal seller to you. Paddle handles sales tax / VAT / GST collection and remittance globally, chargebacks, and fraud disputes. We never see or store your payment card details.</p>
              </div>

              <div className="border border-mist rounded-sm p-4">
                <h4 className="font-semibold text-teal mb-3">Infrastructure Provider <span className="font-normal text-muted">(TBD)</span></h4>
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Purpose</span>
                    <span>Server infrastructure, application hosting, database hosting</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Data processed</span>
                    <span>All Service data (account information, signal reports during retention window, technical logs)</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Safeguards</span>
                    <span>Standard Contractual Clauses + DPA</span>
                  </div>
                </div>
                <p className="text-xs mt-3 text-muted">Specific provider will be confirmed before public launch. This page will be updated accordingly.</p>
              </div>

              <div className="border border-mist rounded-sm p-4">
                <h4 className="font-semibold text-teal mb-3">Transactional Email Provider <span className="font-normal text-muted">(TBD)</span></h4>
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Purpose</span>
                    <span>Sending transactional emails (account verification, password reset, billing notifications)</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Data processed</span>
                    <span>Email address, recipient name, message content</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Safeguards</span>
                    <span>DPA + SCCs where applicable</span>
                  </div>
                </div>
              </div>

              <div className="border border-mist rounded-sm p-4">
                <h4 className="font-semibold text-teal mb-3">Analytics Provider <span className="font-normal text-muted">(TBD)</span></h4>
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Purpose</span>
                    <span>Privacy-respecting usage analytics (page views, feature usage at aggregate level)</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Data processed</span>
                    <span>Anonymized usage data, no personal identifiers, no cross-site tracking</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-medium">Safeguards</span>
                    <span>DPA + no personal data sharing</span>
                  </div>
                </div>
                <p className="text-xs mt-3 text-muted">We have specifically chosen not to use Google Analytics in its default configuration.</p>
              </div>

            </div>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Sub-processors we do NOT use</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Google Analytics (default configuration)</li>
              <li>Facebook Pixel / LinkedIn Insight Tag</li>
              <li>Advertising networks of any kind</li>
              <li>Data brokers</li>
              <li>AI training data brokers — we don't sell or contribute manuscript content to training datasets</li>
            </ul>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Sub-processor changes</h3>
            <p>We update this page at least 30 days before any new sub-processor begins processing personal data. Material changes are notified by email. You may object to a new sub-processor by contacting <a href="mailto:hello@clasr.ai" className="text-teal underline">hello@clasr.ai</a>.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Contact</h3>
            <p>For questions about our sub-processors: <a href="mailto:hello@clasr.ai" className="text-teal underline">hello@clasr.ai</a></p>
          </section>

        </div>
      </main>
    </div>
  );
}
