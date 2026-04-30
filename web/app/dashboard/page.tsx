'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, chatApi, subscriptionApi } from '@/lib/api';
import { isLoggedIn, logout } from '@/lib/auth';

const PLAN_LABELS: Record<string, string> = { free: 'Free', basic: 'Basic', pro: 'Pro' };
const PLAN_COLORS: Record<string, string> = { free: 'text-gray-400', basic: 'text-blue-400', pro: 'text-emerald-400' };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    Promise.all([authApi.me(), subscriptionApi.status(), chatApi.conversations()])
      .then(([u, s, h]) => { setUser(u.data); setSub(s.data); setHistory(h.data || []); })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;

  const usedPct = sub ? Math.min(100, Math.round((sub.used / sub.limit) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-widest text-white">CLASR</h1>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${PLAN_COLORS[sub?.plan] || 'text-gray-400'}`}>
            {PLAN_LABELS[sub?.plan] || 'Free'}
          </span>
          <Link href="/settings" className="text-gray-500 hover:text-gray-300 text-sm">Settings</Link>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 text-sm">Sign out</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Usage card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <p className="text-white font-semibold mt-0.5">
                {sub?.used ?? 0} / {sub?.limit ?? 5} analyses used
                <span className="text-gray-500 text-sm ml-2">
                  {sub?.plan === 'free' ? '(lifetime)' : '(this month)'}
                </span>
              </p>
            </div>
            {sub?.plan !== 'pro' && (
              <Link href="/pricing" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Upgrade
              </Link>
            )}
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
          </div>
        </div>

        {/* New analysis CTA */}
        <Link href="/analyze"
          className="block bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 text-center transition-colors">
          <p className="text-2xl mb-1">📄</p>
          <p className="font-bold text-lg">New Analysis</p>
          <p className="text-blue-200 text-sm mt-1">Upload manuscript · type prompt · ask follow-ups</p>
        </Link>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">Recent Analyses</h2>
            <div className="space-y-2">
              {history.map((a: any) => (
                <Link key={a.id} href={`/analyze?conv=${a.id}`}
                  className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl px-4 py-3 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{a.preview || 'Conversation'}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-gray-600 text-sm ml-3 shrink-0">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-8">No analyses yet. Upload your first manuscript above.</p>
        )}
      </main>
    </div>
  );
}
