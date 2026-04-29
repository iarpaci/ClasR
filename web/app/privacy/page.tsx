import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-xl font-black tracking-widest text-white">CLASR</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12 prose prose-invert prose-sm">
        <h2 className="text-2xl font-bold text-white mb-2">Privacy Policy</h2>
        <p className="text-gray-500 text-xs mb-8">Last updated: April 2025</p>

        <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
          <section>
            <h3 className="text-white font-semibold mb-2">1. What We Collect</h3>
            <p>When you create an account, we collect your email address and a hashed password. When you use CLASR, we process the manuscript text you submit in order to generate your analysis report. We do not store your manuscript text permanently — it is used only to produce the report and is not retained after the session.</p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">2. How We Use Your Data</h3>
            <p>Your email address is used to authenticate your account, send transactional emails (welcome message, password reset), and notify you of service-related matters. We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">3. Payment Processing</h3>
            <p>Payments are processed by Stripe, Inc. CLASR does not store your credit card details. Stripe's handling of your payment data is governed by <a href="https://stripe.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener">Stripe's Privacy Policy</a>.</p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">4. Data Storage</h3>
            <p>Account data is stored on Supabase servers located in the European Union. Analysis history is retained for your account so you can access previous reports. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">5. Cookies</h3>
            <p>CLASR uses only functional cookies necessary to keep you logged in. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">6. Your Rights</h3>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights or to close your account, contact us at <span className="text-blue-400">support@clasr.com</span>.</p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">7. KVKK (Turkey)</h3>
            <p>Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında işlenmektedir. Veri sorumlusu olarak, kişisel verilerinizin güvenliğini sağlamak için gerekli teknik ve idari tedbirleri almaktayız. Verilerinize erişim, düzeltme veya silinmesini talep etmek için yukarıdaki e-posta adresinden bize ulaşabilirsiniz.</p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">8. Changes</h3>
            <p>We may update this policy from time to time. Continued use of CLASR after changes constitutes acceptance of the updated policy.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
