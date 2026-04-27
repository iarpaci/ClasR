'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

function ResetContent() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const t = params.get('access_token');
    if (t) setToken(t);
    else setError('Invalid or expired reset link.');
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
      <p className="text-3xl">✅</p>
      <p className="text-white font-semibold">Password updated</p>
      <p className="text-gray-400 text-sm">Redirecting to sign in...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Set New Password</h2>
      {error && <p className="text-red-400 text-sm bg-red-950 px-3 py-2 rounded-lg">{error}</p>}
      <div>
        <label className="block text-sm text-gray-400 mb-1">New Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
      </div>
      <button type="submit" disabled={loading || !token}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
        {loading ? 'Saving...' : 'Update Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-widest text-white">CLASR</h1>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <Suspense fallback={<p className="text-gray-500 text-sm">Loading...</p>}>
            <ResetContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
