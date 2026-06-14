'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import AuthPageShell from '@/app/components/AuthPageShell';
import FormInput from '@/app/components/FormInput';
import ErrorMessage from '@/app/components/ErrorMessage';

function ResetContent() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace('#', ''));
    const t = params.get('access_token');
    if (t) setToken(t); else setError('Invalid or expired reset link.');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to reset password');
    } finally { setLoading(false); }
  }

  if (done) return (
    <div className="text-center space-y-3">
      <div className="w-14 h-14 mx-auto rounded-full bg-sage flex items-center justify-center">
        <svg width="26" height="26" fill="none" stroke="#2B555B" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-[#1A1A1A] font-semibold">Password updated</p>
      <p className="text-muted text-sm">Redirecting to log in...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-[#1A1A1A]">Set New Password</h2>
      <ErrorMessage message={error} />
      <div>
        <FormInput label="New Password:" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required minLength={8} />
        <p className="text-xs text-muted mt-1">Minimum 8 characters</p>
      </div>
      <FormInput label="Confirm Password:" type="password" value={confirm}
        onChange={e => setConfirm(e.target.value)} required minLength={8} />
      <button type="submit" disabled={loading || !token}
        className="w-full bg-teal hover:bg-teal-dark disabled:opacity-50 text-cream font-semibold py-3 rounded-full transition-colors text-sm">
        {loading ? 'Saving...' : 'Update Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<p className="text-muted text-sm">Loading...</p>}>
        <ResetContent />
      </Suspense>
    </AuthPageShell>
  );
}
