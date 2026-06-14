'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { useRedirectIfLoggedIn } from '@/app/hooks/useRequireAuth';

export default function RegisterPage() {
  const router = useRouter();
  useRedirectIfLoggedIn();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [consentTerms,    setConsentTerms]    = useState(false);
  const [consentPrivacy,  setConsentPrivacy]  = useState(false);
  const [consentTransfer, setConsentTransfer] = useState(false);
  const [consentGeo,      setConsentGeo]      = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const allRequired = consentTerms && consentPrivacy && consentTransfer && consentGeo;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRequired) { setError('Please accept all required agreements to continue.'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.register(email, password);
      const { data } = await authApi.login(email, password);
      saveSession(data.access_token, data.refresh_token);
      router.replace('/onboarding');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="v9-auth-page">
      <Link href="/" className="v9-auth-back">← Back to home</Link>

      <main className="v9-auth-shell" aria-labelledby="register-title">
        <img className="v9-auth-logo" src="/logo-primary.svg" alt="CLASR" />
        <p id="register-title">Start mapping manuscripts in under a minute.</p>

        <div className="v9-auth-card">
          <a className="v9-auth-btn" href="#">Continue with <strong>&nbsp;Google</strong></a>
          <a className="v9-auth-btn" href="#">Continue with <strong>&nbsp;ORCID</strong></a>
          <div className="v9-auth-divider">OR</div>

          <form onSubmit={handleSubmit}>
            {error && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#cd0015', background: '#fce5e7', padding: '8px 12px' }}>{error}</p>
            )}
            <label className="v9-auth-field">
              <span>Email:</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="jane.doe@university.edu" />
            </label>
            <label className="v9-auth-field">
              <span>Password:</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
            </label>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {[
                { id: 'ct', val: consentTerms,    set: setConsentTerms,    req: true,  label: <>I have read and agree to the <Link href="/terms" target="_blank" style={{ fontWeight: 600, color: '#2b555b' }}>Terms of Service</Link>. <span style={{ color: '#cd0015', fontSize: 10 }}>Required</span></> },
                { id: 'cp', val: consentPrivacy,  set: setConsentPrivacy,  req: true,  label: <>I have read the <Link href="/privacy" target="_blank" style={{ fontWeight: 600, color: '#2b555b' }}>Privacy Policy</Link>. <span style={{ color: '#cd0015', fontSize: 10 }}>Required</span></> },
                { id: 'cx', val: consentTransfer, set: setConsentTransfer, req: true,  label: <>I consent to manuscript content transfer to Anthropic, PBC for signal report generation. <span style={{ color: '#cd0015', fontSize: 10 }}>Required</span></> },
                { id: 'cg', val: consentGeo,      set: setConsentGeo,      req: true,  label: <>I confirm I am eligible to use the Service in my country of residence. <span style={{ color: '#cd0015', fontSize: 10 }}>Required</span></> },
              ].map(c => (
                <div key={c.id} className="v9-terms-row">
                  <input
                    type="checkbox"
                    id={c.id}
                    checked={c.val}
                    onChange={e => c.set(e.target.checked)}
                    required={c.req}
                  />
                  <label htmlFor={c.id}>{c.label}</label>
                </div>
              ))}
            </div>

            <button className="v9-auth-primary" type="submit" disabled={loading || !allRequired}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="v9-auth-switch">
          Already have an account?{' '}
          <Link href="/login">Log in</Link>
        </p>
      </main>
    </div>
  );
}
