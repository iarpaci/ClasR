import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security — CLASR',
  description: "CLASR's security practices: encryption, access controls, AI-specific protections, and incident response.",
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-border px-6 py-4 flex items-center gap-4 bg-cream">
        <Link href="/" className="text-muted hover:text-teal text-sm transition-colors">← Back</Link>
        <h1 className="font-serif italic text-xl text-teal font-bold">CLASR</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="font-serif text-2xl font-bold text-teal mb-1">Security</h2>
        <p className="text-muted text-xs mb-8">Last updated: pending legal review · Security questions: <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a> (subject: "SECURITY")</p>

        <div className="space-y-8 text-muted text-sm leading-relaxed">

          <section>
            <h3 className="text-teal font-semibold mb-2">Our security philosophy</h3>
            <p>CLASR is built around a simple principle: <strong>the best way to protect data is to not store it.</strong> Where we must process data — your manuscript content, briefly, to generate signal reports — we do so transparently, with strict controls, and delete it immediately afterward. Where we must retain data — your account, signal reports during their short retention window — we apply industry-standard security practices.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-3">Data we hold (and don't hold)</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-teal mb-1">What we don't hold</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Manuscript content</strong> is never persistently stored. It is transmitted to Anthropic, the signal report is generated, and the manuscript is deleted.</li>
                  <li><strong>Full credit card details</strong> are never stored or seen by CLASR. Payment processing is handled by Paddle as our Merchant of Record.</li>
                  <li><strong>Cross-site tracking data</strong>, advertising profiles, or third-party tracking cookies.</li>
                  <li><strong>Manuscript content for AI training</strong> — we never use your content to train AI models, and our processing partner is contractually prohibited from doing so.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-teal mb-1">What we do hold</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Account information — your name, email, hashed password, and account preferences</li>
                  <li>Signal reports — for the user-configured retention period (default 7 days)</li>
                  <li>Billing information — transaction records and payment identifiers (not card details)</li>
                  <li>Technical logs — for security monitoring, retained up to 90 days</li>
                  <li>Support communications — retained up to 3 years</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-3">Encryption</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-teal mb-1">In transit</h4>
                <p>All data transmission uses <strong>TLS 1.2 or higher</strong> (HTTPS). We support modern cipher suites and have disabled known-weak standards (TLS 1.0, TLS 1.1, RC4).</p>
              </div>
              <div>
                <h4 className="font-medium text-teal mb-1">At rest</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Passwords are stored using <strong>bcrypt</strong> (industry-standard one-way hashing). Even CLASR cannot decrypt your password.</li>
                  <li>Signal reports are encrypted at rest on our database storage.</li>
                  <li>Backups are encrypted at rest.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-3">Access controls</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-teal mb-1">Personnel access</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Access to production systems requires multi-factor authentication (MFA)</li>
                  <li>Access is granted on a least-privilege basis</li>
                  <li>All access is logged and reviewed periodically</li>
                  <li>Personnel with production access undergo security training and sign confidentiality agreements</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-teal mb-1">User account security</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Passwords must meet minimum complexity requirements</li>
                  <li>Two-factor authentication (2FA) is available for all users; we recommend enabling it</li>
                  <li>Failed login attempts trigger rate-limiting and account lockout after sustained failure</li>
                  <li>Sessions expire after a period of inactivity</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Infrastructure security</h3>
            <p>Production systems are protected by firewalls with deny-by-default rules, a Web Application Firewall (WAF), DDoS protection at the network edge, and internal network segmentation (the database is not directly internet-accessible).</p>
            <p className="mt-2">Operating system and dependency updates are applied promptly. Critical security patches are applied within 7 days of release.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-3">AI-specific security</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-teal mb-1">Prompt injection protection</h4>
                <p>Manuscript content is treated as <strong>data, not instructions</strong>. We isolate user-uploaded content from system prompts using structural separation in API requests, input sanitization at intake, output validation, and monitoring for anomalous outputs. We treat prompt injection as an ongoing threat and update our defenses as new techniques emerge.</p>
              </div>
              <div>
                <h4 className="font-medium text-teal mb-1">Model behavior boundaries</h4>
                <p>CLASR's AI system is configured to refuse requests to behave as a peer reviewer or make decisions; requests embedded in manuscripts that attempt to alter system behavior; and requests outside the scope of academic manuscript signal-reading.</p>
              </div>
              <div>
                <h4 className="font-medium text-teal mb-1">No training on user data</h4>
                <p>Anthropic is contractually prohibited from using CLASR's manuscript content to train AI models. This is enforced through commercial API terms, our Data Processing Agreement, and Anthropic's general policy for commercial customers.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-3">Security monitoring and incident response</h3>
            <p>We continuously monitor for authentication anomalies, unusual API access patterns, and security alerts from our infrastructure.</p>
            <p className="mt-2">If we detect or are notified of a security incident, we investigate immediately, contain it, assess impact on user data, remediate the cause, and notify affected users and authorities as required by law. For breaches involving personal data, we follow the <strong>72-hour notification requirement</strong> of GDPR and equivalent regulations.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Responsible disclosure</h3>
            <p>We welcome security research. If you discover a vulnerability in CLASR:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Report it to <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a> (subject: "SECURITY")</li>
              <li>We will acknowledge receipt within 24 hours</li>
              <li>We will investigate and provide a status update within 5 business days</li>
              <li>We commit to not pursuing legal action against good-faith researchers who don't access user data beyond demonstrating the vulnerability, don't disrupt service, and give us reasonable time to remediate</li>
            </ul>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Compliance</h3>
            <p>We currently maintain GDPR-compliant processing for EU/EEA users, UK GDPR-compliant processing for UK users, CCPA/CPRA-compliant disclosures for California users, and Data Processing Agreements with all sub-processors with Standard Contractual Clauses for international transfers.</p>
            <p className="mt-2">SOC 2 Type II certification is planned within 18–24 months of launch as our customer base grows.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Business continuity</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Daily encrypted backups, retained 30 days</li>
              <li>Recovery Time Objective (RTO): 4 hours for full service restoration</li>
              <li>Recovery Point Objective (RPO): 24 hours maximum data loss in worst case</li>
            </ul>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">What we ask of you</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use a strong, unique password for your CLASR account</li>
              <li>Enable two-factor authentication in your account settings</li>
              <li>Don't share your password with anyone</li>
              <li>Log out on shared or public computers</li>
              <li>Verify the URL before entering credentials (always clasr.ai, with the lock icon)</li>
              <li>Be skeptical of phishing emails — we will never ask for your password via email</li>
              <li>Report suspicious activity immediately to <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a> (subject: "SECURITY")</li>
            </ul>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Limitations</h3>
            <p>We are not certified to handle classified or government-restricted information. We are not a HIPAA-compliant Business Associate. We do not guarantee absolute security — no system is unbreachable. We are a small team at launch: our security maturity will grow over time.</p>
          </section>

          <section>
            <h3 className="text-teal font-semibold mb-2">Contact</h3>
            <p>
              Security incidents and vulnerabilities: <a href="mailto:legal@clasr.ai" className="text-teal underline">legal@clasr.ai</a> (subject: "SECURITY")<br />
              General questions: <a href="mailto:hello@clasr.ai" className="text-teal underline">hello@clasr.ai</a>
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
