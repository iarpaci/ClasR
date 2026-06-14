import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — CLASR',
  description: 'How you may and may not use the CLASR academic manuscript signal-reading service.',
};

export default function AupPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-border px-6 py-4 flex items-center gap-4 bg-cream">
        <Link href="/" className="text-muted hover:text-teal text-sm transition-colors">← Back</Link>
        <h1 className="font-serif italic text-xl text-teal font-bold">CLASR</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="font-serif text-2xl font-bold text-teal mb-1">Acceptable Use Policy</h2>
        <p className="text-muted text-xs mb-8">Version 1.0 · Effective date: pending legal review</p>

        <div className="space-y-8 text-muted text-sm leading-relaxed">

          <section>
            <h3 className="text-teal font-semibold mb-2">1. Purpose of this policy</h3>
            <p>This Acceptable Use Policy ("AUP") describes how you may and may not use the CLASR service ("Service"). It supplements our <Link href="/terms" className="text-teal underline">Terms of Service</Link>. Violation of this AUP is a violation of our Terms of Service and may result in account suspension or termination.</p>
            <p className="mt-2">If you are unsure whether a planned use is acceptable, contact us at <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a> before proceeding.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">2. The spirit of acceptable use</h3>
            <p>CLASR exists to make academic manuscript behavior visible before formal evaluation occurs. It is built to serve:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Researchers preparing their own manuscripts</li>
              <li>Co-authors working together on manuscripts</li>
              <li>Advisors, supervisors, and writing instructors reviewing student work with permission</li>
              <li>Reviewers and editors evaluating manuscripts they have legitimate authority to review</li>
              <li>Research teams, labs, departments, and journals operating within their institutional remit</li>
            </ul>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">3. What you may do</h3>
            <p>You may use CLASR to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Analyze manuscripts you authored personally</li>
              <li>Analyze manuscripts you co-authored, where you have permission from co-authors</li>
              <li>Analyze manuscripts you have explicit written permission to upload</li>
              <li>Review manuscripts you have institutional authority to review (as an advisor, supervisor, peer reviewer, or editor)</li>
              <li>Use signal reports to revise, strengthen, or evaluate manuscripts before submission</li>
              <li>Share signal reports with your co-authors, advisors, or peers (as long as you also have rights to share the underlying manuscript)</li>
              <li>Discuss signal reports in academic writing about your own work</li>
              <li>Cite CLASR as a methodological tool in publications where appropriate</li>
            </ul>
            <p className="mt-3">For institutional users (with valid Custom / Enterprise contracts): you may also build workflows that incorporate CLASR signal reports into manuscript review processes, and use the Service through institutional accounts with appropriate access controls.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-3">4. What you may not do</h3>

            <div className="space-y-5">
              <div>
                <h4 className="font-medium text-teal mb-1">4.1 Unauthorized manuscript uploads</h4>
                <p>You may not upload manuscripts that you did not author and do not have permission to upload; that belong to colleagues, students, or collaborators without their consent; that you obtained from peer review processes under embargo for purposes other than legitimate review; or that are subject to non-disclosure agreements that prohibit sharing with third-party services.</p>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-1">4.2 Misrepresenting CLASR outputs</h4>
                <p>You may not present CLASR signal reports as peer reviews or human-authored evaluations; use signal reports to forge or simulate the work of human reviewers; submit signal reports as if they were your own analytical work without acknowledging the tool; or misrepresent the non-decisional nature of signal reports (e.g., claiming "CLASR rejected this manuscript").</p>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-1">4.3 Circumventing peer review or institutional processes</h4>
                <p>You may not use CLASR to bypass peer review requirements at your institution or target journal; submit CLASR-generated content as if it were original peer review; or use CLASR in ways that violate the policies of journals you submit to (always check journal AI policies).</p>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-1">4.4 Technical abuse</h4>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Attempt to reverse-engineer, decompile, or extract CLASR's underlying AI models</li>
                  <li>Attempt to extract CLASR's system prompts, kit instructions, or proprietary methodology</li>
                  <li>Use prompt injection techniques to manipulate CLASR's responses</li>
                  <li>Embed instructions in manuscripts intended to alter CLASR's behavior</li>
                  <li>Submit content designed to jailbreak, manipulate, or compromise CLASR's AI systems</li>
                  <li>Use automated tools, scrapers, or bots to access the Service beyond normal user behavior</li>
                  <li>Create multiple accounts to evade plan limits or restrictions</li>
                  <li>Share account credentials with others not authorized to use them</li>
                  <li>Reuse, redistribute, or resell signal reports as standalone products</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-1">4.5 Harmful, illegal, or abusive content</h4>
                <p>You may not upload manuscripts containing content that promotes violence or terrorism; constitutes child sexual abuse material (this will be reported to relevant authorities); infringes intellectual property rights; constitutes defamation, harassment, or discrimination; violates applicable export control or sanctions law; contains malicious code or malware disguised as manuscripts; or contains content you know to be false research, fabricated data, or fraudulent.</p>
                <p className="mt-2">CLASR is designed for academic manuscripts. Non-manuscript content (essays, business documents, creative writing, legal documents, medical records) is outside the intended scope.</p>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-1">4.6 Circumvention of geographic restrictions</h4>
                <p>The Service is not available in certain jurisdictions. You may not use VPNs, proxies, or other tools to circumvent geographic restrictions; provide false location information; use a payment method not associated with your true country of residence; or create accounts on behalf of users in restricted jurisdictions.</p>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-1">4.7 Commercial misuse</h4>
                <p>You may not resell CLASR signal reports as your own service; use CLASR as part of a product or service that competes with CLASR; use CLASR to provide manuscript evaluation services to third parties without our written permission; or use CLASR in a way that exceeds the scope of your plan.</p>
              </div>

              <div>
                <h4 className="font-medium text-teal mb-1">4.8 Privacy and ethics violations</h4>
                <p>You may not use CLASR to analyze manuscripts containing identifiable patient health information without appropriate ethical clearance; analyze manuscripts containing data from human subjects research where consent was not obtained for AI processing; or analyze manuscripts containing classified or government-restricted information.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">5. Special considerations for institutional users</h3>
            <p>If you use CLASR under an institutional license, additional rules apply: account access is limited to authorized personnel; use must comply with your institution's research ethics and AI policies; and aggregated usage data may be shared with institutional administrators under your contract.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">6. Reporting violations</h3>
            <p>If you become aware of misuse of CLASR — your own account compromised, or another user violating this AUP — contact us:</p>
            <p className="mt-2"><strong>Email:</strong> <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a> (mark subject line "ABUSE" or "SECURITY")</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">7. Consequences of violations</h3>
            <p>Violations may result in a warning; temporary account suspension; permanent account termination without refund; forfeiture of unused subscription periods or credits; reporting to relevant authorities (for illegal content, fraud, or serious abuse); or civil action where the violation causes damages.</p>
            <p className="mt-2">Minor first-time violations typically result in a warning. Some violations (CSAM, sanctions evasion, malicious code) result in immediate termination without warning.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">8. Investigations and cooperation</h3>
            <p>When we investigate suspected AUP violations, we may temporarily suspend your account, review account activity logs (we do not review manuscript content, which is deleted), and contact you for explanation. You will have an opportunity to explain before any permanent action, except in cases of serious or repeated abuse, illegal content, or where notice would prejudice an investigation.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">9. Changes to this policy</h3>
            <p>We may update this AUP from time to time. Material changes will be communicated by email and on clasr.ai/aup.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">10. Contact</h3>
            <p>
              General questions: <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a><br />
              Reporting violations: <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a> (subject: "ABUSE")<br />
              Security concerns: <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a> (subject: "SECURITY")
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
