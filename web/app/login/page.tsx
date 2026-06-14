'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { useRedirectIfLoggedIn } from '@/app/hooks/useRequireAuth';

export default function LoginPage() {
  const router = useRouter();
  useRedirectIfLoggedIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      saveSession(data.access_token, data.refresh_token);
      router.replace('/analyze');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  }

  return (
    <div className="v9-auth-page">
      <Link href="/" className="v9-auth-back">← Back to home</Link>

      <main className="v9-auth-shell" aria-labelledby="login-title">
        <img className="v9-auth-logo" src="/logo-primary.svg" alt="CLASR" />
        <p id="login-title">Start mapping manuscripts in under a minute.</p>

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
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <button className="v9-auth-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Log In'}
            </button>
          </form>
        </div>

        <p className="v9-auth-switch">
          Don&rsquo;t have an account?{' '}
          <Link href="/register">Create account</Link>
        </p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.55 }}>
          <Link href="/forgot-password" style={{ color: '#2b555b' }}>Forgot your password?</Link>
        </p>
      </main>
    </div>
  );
}
