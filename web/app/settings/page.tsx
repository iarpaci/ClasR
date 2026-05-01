'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, subscriptionApi, chatApi } from '@/lib/api';
import { isLoggedIn, logout } from '@/lib/auth';
import api from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);
  const [clearHistoryLoading, setClearHistoryLoading] = useState(false);
  const [clearHistoryDone, setClearHistoryDone] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    Promise.all([authApi.me(), subscriptionApi.status()])
      .then(([u, s]) => { setUser(u.data); setSub(s.data); })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handlePortal() {
    setLoading(true);
    setPortalError('');
    try {
      const { data } = await subscriptionApi.portal();
      window.location.href = data.url;
    } catch {
      setPortalError('Could not open billing portal. Contact support.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Dashboard</Link>
        <h1 className="text-xl font-black tracking-widest text-white">CLASR</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10 space-y-4">
        <h2 className="text-xl font-bold text-white mb-6">Settings</h2>

        {/* Account */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Account</p>
          <p className="text-white text-sm">{user?.email}</p>
        </div>

        {/* Subscription */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Subscription</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold capitalize">{sub?.plan || 'Free'} Plan</p>
              <p className="text-gray-500 text-sm mt-0.5">{sub?.used ?? 0} / {sub?.limit ?? 3} analyses used</p>
            </div>
            {sub?.stripe_status === 'active' ? (
              <button onClick={handlePortal} disabled={loading}
                className="text-sm text-blue-400 hover:underline">
                {loading ? 'Loading...' : 'Manage subscription'}
              </button>
            ) : sub?.plan === 'free' ? (
              <Link href="/pricing" className="text-sm text-blue-400 hover:underline">Upgrade</Link>
            ) : null}
          </div>
          {portalError && <p className="text-red-400 text-xs mt-2">{portalError}</p>}
        </div>

        {/* Sign out */}
        <button onClick={logout}
          className="w-full bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 font-semibold py-3 rounded-xl transition-colors text-sm">
          Sign Out
        </button>

        {/* Clear history */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Analysis History</p>
          {clearHistoryDone ? (
            <p className="text-sm text-emerald-400">History cleared.</p>
          ) : !clearHistoryConfirm ? (
            <button onClick={() => setClearHistoryConfirm(true)}
              className="text-sm text-gray-400 hover:text-red-400 hover:underline transition-colors">
              Delete all analysis history
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-400">All conversation history will be permanently deleted.</p>
              <div className="flex gap-3">
                <button onClick={async () => {
                  setClearHistoryLoading(true);
                  try { await chatApi.clearHistory(); setClearHistoryDone(true); } catch {}
                  setClearHistoryLoading(false);
                  setClearHistoryConfirm(false);
                }} disabled={clearHistoryLoading}
                  className="text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors">
                  {clearHistoryLoading ? 'Deleting…' : 'Yes, delete history'}
                </button>
                <button onClick={() => setClearHistoryConfirm(false)}
                  className="text-sm text-gray-400 hover:text-gray-200 px-4 py-2">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete account */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Danger Zone</p>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-400 hover:underline">
              Delete account and all data
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-400">This will permanently delete your account, analyses, and all data. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await api.delete('/auth/account');
                    logout();
                  } catch { setDeleteLoading(false); setDeleteConfirm(false); }
                }} disabled={deleteLoading}
                  className="text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors">
                  {deleteLoading ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button onClick={() => setDeleteConfirm(false)}
                  className="text-sm text-gray-400 hover:text-gray-200 px-4 py-2">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
