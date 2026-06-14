'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { analyzeApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import ClasrLogo from '@/app/components/ClasrLogo';

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
      .catch(() => router.replace('/analyze'))
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
        <h3 key={i} className="text-teal font-serif font-bold text-base mt-6 mb-2 border-b border-cream-border pb-1">{line}</h3>
      );
      if (line.startsWith('◈ ARGUMENT DENSITY')) return (
        <h3 key={i} className="text-teal-mid font-serif font-bold text-base mt-6 mb-2 border-b border-cream-border pb-1">{line}</h3>
      );
      if (line.match(/^[━═─]{3,}/)) return <hr key={i} className="border-cream-border my-3" />;
      if (line.startsWith('[AUTO-Q')) return (
        <p key={i} className="text-teal text-sm bg-sage px-3 py-1.5 rounded-sm my-2 font-mono">{line}</p>
      );
      if (line.match(/^(CLASR-EN|Q-Profile|Mode):/)) return (
        <p key={i} className="text-muted text-sm font-mono">{line}</p>
      );
      if (line.trim() === '') return <div key={i} className="h-2" />;
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1A1A1A]">$1</strong>');
      return <p key={i} className="text-muted text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="text-muted text-sm">Loading report...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-border px-6 py-4 flex items-center justify-between sticky top-0 bg-cream z-10">
        <div className="flex items-center gap-4">
          <Link href="/analyze" className="text-muted hover:text-teal text-sm transition-colors">← Back</Link>
          <Link href="/"><ClasrLogo scale={0.42} /></Link>
        </div>
        <div className="flex items-center gap-3">
          {report?.q_variant && (
            <span className="px-2 py-1 bg-sage border border-sage-dark text-teal text-xs rounded-sm font-mono">{report.q_variant}</span>
          )}
          {report?.mode && (
            <span className="px-2 py-1 bg-parchment border border-cream-border text-muted text-xs rounded-sm">{report.mode}</span>
          )}
          <button onClick={handleCopy}
            className="px-3 py-1.5 bg-parchment hover:bg-cream-dark border border-cream-border text-muted text-sm rounded-sm transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <Link href="/analyze" className="px-3 py-1.5 bg-teal hover:bg-teal-dark text-cream text-sm font-semibold rounded-sm transition-colors">
            New Analysis
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-4">
          <p className="text-muted text-sm">{report?.filename || 'Pasted text'} · {new Date(report?.created_at).toLocaleDateString()}</p>
        </div>
        <div className="bg-parchment border border-mist rounded-sm p-6 space-y-0.5">
          {report?.report ? renderReport(report.report) : <p className="text-muted text-sm">No report content.</p>}
        </div>
      </main>
    </div>
  );
}
