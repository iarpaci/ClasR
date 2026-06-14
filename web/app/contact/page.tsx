import type { Metadata } from 'next';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Contact — CLASR',
  description: 'Questions, feedback, support requests, and collaboration notes all start here.',
  openGraph: { title: 'Contact — CLASR', description: 'Tell us what you need from CLASR.' },
};

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main>
        <section className="v9-contact-page v9-contact-page--general" aria-labelledby="contact-title">
          <div className="v9-contact-intro">
            <p className="v9-cp-section__label" style={{ marginBottom: 12, fontSize: 13 }}>Contact</p>
            <h1 id="contact-title">Tell us what you need from CLASR.</h1>
            <p className="v9-contact-lede">Questions, feedback, support requests, and collaboration notes all start here. The CLASR team will make sure your message reaches the right place.</p>

            <div className="v9-contact-route-list" aria-label="Contact routes">
              <a href="mailto:hello@clasr.ai">
                <span>General</span>
                <strong>hello@clasr.ai</strong>
              </a>
              <a href="mailto:support@clasr.ai">
                <span>Support</span>
                <strong>support@clasr.ai</strong>
              </a>
              <a href="mailto:enterprise@clasr.ai">
                <span>Enterprise</span>
                <strong>Plan a team or API setup</strong>
              </a>
            </div>
          </div>

          <form className="v9-contact-form-card" action="mailto:hello@clasr.ai" method="post" encType="text/plain">
            <div>
              <h2>Send a message</h2>
              <p>Use this for general questions, product feedback, account help, or collaboration ideas.</p>
            </div>

            <div className="v9-contact-form-grid">
              <label>
                <span>First name</span>
                <input type="text" name="first-name" placeholder="Jane" autoComplete="given-name" />
              </label>
              <label>
                <span>Last name</span>
                <input type="text" name="last-name" placeholder="Doe" autoComplete="family-name" />
              </label>
            </div>

            <label>
              <span>Email</span>
              <input type="email" name="email" placeholder="jane.doe@university.edu" autoComplete="email" />
            </label>

            <label>
              <span>Topic</span>
              <select name="topic">
                <option value="">Choose a topic...</option>
                <option>General question</option>
                <option>Product feedback</option>
                <option>Account or billing support</option>
                <option>Academic collaboration</option>
                <option>Press or partnership</option>
              </select>
            </label>

            <label>
              <span>You are a</span>
              <select name="role">
                <option value="">Select your role...</option>
                <option>Author</option>
                <option>Advisor</option>
                <option>Reviewer</option>
                <option>Journal editor</option>
                <option>Institution lead</option>
                <option>Platform or API partner</option>
              </select>
            </label>

            <label>
              <span>Your message</span>
              <textarea name="message" rows={5} placeholder="What would you like to ask or share with CLASR?" />
            </label>

            <button className="v9-contact-submit" type="submit">Send message</button>

            <div className="v9-contact-direct">
              <span>or reach us directly</span>
              <a href="mailto:hello@clasr.ai">hello@clasr.ai</a>
            </div>
          </form>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
