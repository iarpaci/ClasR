'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import AuthPageShell from '@/app/components/AuthPageShell';
import FormInput from '@/app/components/FormInput';
import ErrorMessage from '@/app/components/ErrorMessage';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      if (err?.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')) {
        setError('Cannot reach server. Check your connection.');
      } else if (err?.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err?.message || 'Something went wrong');
      }
    } finally { setLoading(false); }
  }

  return (
    <AuthPageShell>
      {sent ? (
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-sage flex items-center justify-center">
            <svg width="26" height="26" fill="none" stroke="#2B555B" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[#1A1A1A] font-semibold">Check your email</p>
          <p className="text-muted text-sm">A reset link was sent to <strong>{email}</strong></p>
          <Link href="/login" className="block text-teal hover:underline text-sm mt-4">← Back to log in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Reset Password</h2>
          <p className="text-muted text-sm">Enter your email and we'll send a reset link.</p>
          <ErrorMessage message={error} />
          <FormInput label="Email:" type="email" value={email}
            onChange={e => setEmail(e.target.value)} required />
          <button type="submit" disabled={loading}
            className="w-full bg-teal hover:bg-teal-dark disabled:opacity-50 text-cream font-semibold py-3 rounded-full transition-colors text-sm">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <Link href="/login" className="block text-center text-sm text-muted hover:text-teal transition-colors">
            ← Back to log in
          </Link>
        </form>
      )}
    </AuthPageShell>
  );
}
