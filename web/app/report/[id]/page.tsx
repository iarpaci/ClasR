'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { analyzeApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

export default function ReportPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    analyzeApi.get(id)
      .then(r => setReport(r.data))
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function handleCopy() {
    navigator.clipboard.writeText(report?.report || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderReport(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('◈ SECTION')) return (
        <h3 key={i} className="text-blue-400 font-bold text-base mt-6 mb-2 border-b border-gray-800 pb-1">{line}</h3>
      );
      if (line.startsWith('◈ ARGUMENT DENSITY')) return (
        <h3 key={i} className="text-emerald-400 font-bold text-base mt-6 mb-2 border-b border-gray-800 pb-1">{line}</h3>
      );
      if (line.match(/^[━═─]{3,}/)) return <hr key={i} className="border-gray-800 my-3" />;
      if (line.startsWith('[AUTO-Q')) return (
        <p key={i} className="text-amber-400 text-sm bg-amber-950 px-3 py-1.5 rounded-lg my-2">{line}</p>
      );
      if (line.match(/^(CLASR-EN|Q-Profile|Mode):/)) return (
        <p key={i} className="text-gray-400 text-sm">{line}</p>
      );
      if (line.trim() === '') return <div key={i} className="h-2" />;
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
      return <p key={i} className="text-gray-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500">Loading report...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-950 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Dashboard</Link>
          <span className="text-white font-black tracking-widest">CLASR</span>
        </div>
        <div className="flex items-center gap-3">
          {report?.q_variant && (
            <span className="px-2 py-1 bg-blue-950 text-blue-300 text-xs rounded-lg font-mono">{report.q_variant}</span>
          )}
          {report?.mode && (
            <span className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-lg">{report.mode}</span>
          )}
          <button onClick={handleCopy}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <Link href="/analyze" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            New Analysis
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-4">
          <p className="text-gray-500 text-sm">{report?.filename || 'Pasted text'} · {new Date(report?.created_at).toLocaleDateString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-0.5">
          {report?.report ? renderReport(report.report) : <p className="text-gray-500">No report content.</p>}
        </div>
      </main>
    </div>
  );
}
