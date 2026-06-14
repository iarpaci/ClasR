import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Policy — CLASR',
  description: 'How CLASR uses cookies and similar technologies on clasr.ai.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-border px-6 py-4 flex items-center gap-4 bg-cream">
        <Link href="/" className="text-muted hover:text-teal text-sm transition-colors">← Back</Link>
        <h1 className="font-serif italic text-xl text-teal font-bold">CLASR</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="font-serif text-2xl font-bold text-teal mb-1">Cookie Policy</h2>
        <p className="text-muted text-xs mb-8">Version 1.0 · Effective date: pending legal review</p>

        <div className="space-y-8 text-muted text-sm leading-relaxed">

          <section>
            <h3 className="text-teal font-semibold mb-2">1. What this policy covers</h3>
            <p>This Cookie Policy explains how CLASR uses cookies and similar technologies on clasr.ai. It supplements our <Link href="/privacy" className="text-teal underline">Privacy Policy</Link>.</p>
            <p className="mt-2">By using the Service, you agree to the use of essential cookies as described below. For non-essential cookies (functional and analytics), we ask for your consent through our cookie banner. Questions: <a href="mailto:hello@clasr.ai" className="text-teal underline">hello@clasr.ai</a>.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">2. What cookies are</h3>
            <p>Cookies are small text files that websites store on your device when you visit them. We also use <strong>similar technologies</strong> including:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Local storage</strong> — stores data in your browser without sending it to our servers</li>
              <li><strong>Session storage</strong> — stores data temporarily during your visit</li>
              <li><strong>Web beacons / pixels</strong> — small images used only in transactional emails</li>
            </ul>
            <p className="mt-2">For convenience, this policy refers to all of these collectively as "cookies."</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-3">3. Categories of cookies we use</h3>

            <div className="space-y-5">
              <div>
                <h4 className="font-medium text-teal mb-2">3.1 Essential cookies (required — cannot be disabled)</h4>
                <p className="mb-3">These cookies are necessary for the Service to function. Without them, you cannot log in and security protections cannot work. We do not require consent for them under most privacy laws.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-sage border-b border-mist">
                        <th className="text-left p-2 font-semibold text-teal">Cookie</th>
                        <th className="text-left p-2 font-semibold text-teal">Purpose</th>
                        <th className="text-left p-2 font-semibold text-teal">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-mist">
                        <td className="p-2 font-mono">clasr_session</td>
                        <td className="p-2">Maintains your login session</td>
                        <td className="p-2">Session</td>
                      </tr>
                      <tr className="border-b border-mist">
                        <td className="p-2 font-mono">clasr_csrf</td>
                        <td className="p-2">Prevents cross-site request forgery attacks</td>
                        <td className="p-2">Session</td>
                      </tr>
                      <tr className="border-b border-mist">
                        <td className="p-2 font-mono">clasr_auth</td>
                        <td className="p-2">Remembers that you are logged in</td>
                        <td className="p-2">30 days</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">clasr_locale</td>
                        <td className="p-2">Remembers your language preference</td>
                        <td className="p-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-2">3.2 Functional cookies (optional)</h4>
                <p className="mb-3">These cookies improve your experience by remembering your preferences. They are not strictly necessary for the Service to function.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-sage border-b border-mist">
                        <th className="text-left p-2 font-semibold text-teal">Cookie</th>
                        <th className="text-left p-2 font-semibold text-teal">Purpose</th>
                        <th className="text-left p-2 font-semibold text-teal">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-mist">
                        <td className="p-2 font-mono">clasr_output_mode</td>
                        <td className="p-2">Remembers your preferred output mode</td>
                        <td className="p-2">1 year</td>
                      </tr>
                      <tr className="border-b border-mist">
                        <td className="p-2 font-mono">clasr_qtier_default</td>
                        <td className="p-2">Remembers your preferred Q-tier setting</td>
                        <td className="p-2">1 year</td>
                      </tr>
                      <tr className="border-b border-mist">
                        <td className="p-2 font-mono">clasr_ui_prefs</td>
                        <td className="p-2">Remembers UI preferences</td>
                        <td className="p-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">clasr_consent</td>
                        <td className="p-2">Records your cookie consent choices</td>
                        <td className="p-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-2">3.3 Analytics cookies (optional)</h4>
                <p>These cookies help us understand how the Service is used so we can improve it. We use a privacy-respecting analytics approach: no cross-site tracking, no device fingerprinting, no advertising integration.</p>
                <p className="mt-2">We do <strong>not</strong> use Google Analytics (in its default configuration), Facebook Pixel, LinkedIn Insight Tag, advertising cookies of any kind, or cross-site tracking cookies.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">4. Third-party cookies</h3>
            <p>When you make a payment, Paddle (our Merchant of Record) may set cookies for fraud prevention and payment processing. These cookies are necessary for the payment to complete. See <a href="https://www.paddle.com/legal/cookie" className="text-teal underline" target="_blank" rel="noopener noreferrer">Paddle's cookie policy</a>.</p>
            <p className="mt-2">We do not embed third-party social media widgets, advertising tags, or tracking pixels that would set additional third-party cookies.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">5. Your choices</h3>
            <p>You have full control over non-essential cookies. When you first visit clasr.ai, you will see a cookie banner asking for your consent to functional and analytics cookies.</p>
            <p className="mt-2">Most browsers also allow you to see, delete, and block cookies. Note: blocking all cookies will likely break the Service, as essential cookies are required for login.</p>
            <p className="mt-2">We respect the <strong>Do Not Track (DNT)</strong> signal and the <strong>Global Privacy Control (GPC)</strong> signal. If GPC is enabled, we treat this as a valid opt-out request for the sale or sharing of personal information (though we note: we do not sell or share personal information for cross-context behavioral advertising regardless).</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">6. International transfers</h3>
            <p>If our cookie providers process cookie data outside your country of residence, this is covered by our overall <Link href="/privacy" className="text-teal underline">Privacy Policy</Link> section on international transfers.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">7. Changes to this Cookie Policy</h3>
            <p>We may update this Cookie Policy from time to time. Material changes will be communicated through the cookie banner or by email.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">8. Contact us</h3>
            <p>For questions about this Cookie Policy: <a href="mailto:hello@clasr.ai" className="text-teal underline">hello@clasr.ai</a></p>
          </section>

        </div>
      </main>
    </div>
  );
}
