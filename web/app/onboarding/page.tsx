'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn } from '@/lib/auth';
import { authApi } from '@/lib/api';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';

const ROLES = [
  { id: 'author',   label: 'Author',   desc: "I'm preparing my own manuscripts." },
  { id: 'advisor',  label: 'Advisor',  desc: "I'm reviewing student or team manuscripts." },
  { id: 'reviewer', label: 'Reviewer', desc: "I'm reading manuscripts as a peer reviewer." },
];

const Q_TIERS = ['Q1 · Top-tier', 'Q2 · Solid', 'Q3 · Accessible'];
const WORK_TYPES = ['Quantitative', 'Qualitative', 'Mixed Methods', 'Theoretical'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [qtier, setQtier] = useState('Q1 · Top-tier');
  const [workType, setWorkType] = useState('Quantitative');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    authApi.me().then(r => {
      const email = r.data?.email || '';
      const n = email.split('@')[0] || 'there';
      setName(n.charAt(0).toUpperCase() + n.slice(1));
    }).catch(() => {});
  }, [router]);

  function handleFinish() {
    localStorage.setItem('clasr_role', role || 'author');
    localStorage.setItem('clasr_q_tier', qtier.split(' ')[0]);
    localStorage.setItem('clasr_work_type', workType);
    localStorage.setItem('clasr_onboarded', '1');
    router.replace('/analyze');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff7ec', color: '#2b555b', fontFamily: 'var(--font-sans)' }}>
      <SiteHeader />

      <main className="v9-app-main v9-centered-flow" aria-labelledby="flow-title">
        <img className="v9-submark" src="/brand-pattern-sage.svg" alt="" />
        <h1 id="flow-title" className="v9-flow-title">Welcome to CLASR{name ? `, ${name}` : ''}.</h1>
        <p className="v9-flow-subtitle">Let&rsquo;s set up your reading preferences.</p>
        <p className="v9-flow-note">You can change these anytime.</p>

        {step === 1 && (
          <>
            <section className="v9-flow-panel" aria-label="Role selection">
              <p className="v9-flow-panel__step">Step 1 of 2</p>
              <h2>This helps us calibrate how CLASR reads for you.</h2>
              <div className="v9-role-list">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    className={`v9-select-card${role === r.id ? ' is-selected' : ''}`}
                    type="button"
                    onClick={() => { setRole(r.id); setStep(2); }}
                  >
                    <strong>{r.label}</strong>
                    <span>{r.desc}</span>
                  </button>
                ))}
              </div>
              <div className="v9-flow-action">
                <Link className="v9-btn v9-btn--primary v9-btn--pill" href="#" onClick={e => { e.preventDefault(); setRole('author'); setStep(2); }}>
                  Continue
                </Link>
              </div>
            </section>
            <p className="v9-flow-skip">
              <a href="#" onClick={e => { e.preventDefault(); setRole('author'); setStep(2); }}>Skip this step</a>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <section className="v9-flow-panel" aria-label="Q-tier and work type selection">
              <p className="v9-flow-panel__step">Step 2 of 2</p>

              <div className="v9-flow-question">
                <h2>What journal tier do you usually target?</h2>
                <div className="v9-flow-pills" role="group" aria-label="Journal tier">
                  {Q_TIERS.map(t => (
                    <button
                      key={t}
                      className={`v9-flow-pill${qtier === t ? ' is-active' : ''}`}
                      type="button"
                      onClick={() => setQtier(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>

              <div className="v9-flow-question">
                <h2>What is the nature of your work?</h2>
                <div className="v9-flow-pills" role="group" aria-label="Work type">
                  {WORK_TYPES.map(w => (
                    <button
                      key={w}
                      className={`v9-flow-pill${workType === w ? ' is-active' : ''}`}
                      type="button"
                      onClick={() => setWorkType(w)}
                    >{w}</button>
                  ))}
                </div>
              </div>
            </section>
            <div className="v9-flow-action">
              <button className="v9-btn v9-btn--primary v9-btn--pill" onClick={handleFinish} style={{ minWidth: 140 }}>
                GET STARTED
              </button>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
