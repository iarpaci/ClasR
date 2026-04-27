'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { analyzeApi, subscriptionApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

const Q_VARIANTS = [
  { key: '', label: 'AUTO-Q', desc: 'System detects target quartile' },
  { key: 'Q1', label: 'Q1', desc: 'Maximum restraint' },
  { key: 'Q2', label: 'Q2', desc: 'Controlled flexibility' },
  { key: 'Q3', label: 'Q3', desc: 'Narrative register' },
];

const MODES = [
  { key: '', label: 'Standard' },
  { key: 'R1', label: 'R1 Revision' },
  { key: 'R2', label: 'R2 Revision' },
  { key: 'summary', label: 'Summary' },
];

export default function AnalyzePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [qVariant, setQVariant] = useState('');
  const [mode, setMode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    subscriptionApi.status().then(r => setSub(r.data)).catch(() => {});
  }, [router]);

  const limitReached = sub && sub.used >= sub.limit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || limitReached) return;
    if (tab === 'file' && !file) { setError('Please select a file'); return; }
    if (tab === 'text' && !text.trim()) { setError('Please enter text'); return; }
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      if (tab === 'file' && file) fd.append('file', file);
      else fd.append('text', text.trim());
      if (qVariant) fd.append('q_variant', qVariant);
      if (mode) fd.append('mode', mode);
      const { data } = await analyzeApi.submit(fd);
      router.push(`/report/${data.id}`);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'free_limit_reached' || code === 'monthly_limit_reached') router.push('/pricing');
      else setError(err?.response?.data?.error || 'Analysis failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Dashboard</Link>
        <h1 className="text-xl font-black tracking-widest text-white">CLASR</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-white mb-1">New Analysis</h2>
        <p className="text-gray-500 text-sm mb-8">Upload your manuscript and receive a structured signal report.</p>

        {limitReached && (
          <div className="bg-amber-950 border border-amber-800 rounded-xl p-4 mb-6 flex items-center justify-between">
            <p className="text-amber-300 text-sm">Analysis limit reached for your plan.</p>
            <Link href="/pricing" className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">Upgrade</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input tabs */}
          <div className="flex gap-2 bg-gray-900 rounded-xl p-1 border border-gray-800 w-fit">
            {(['file', 'text'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                {t === 'file' ? 'Upload File' : 'Paste Text'}
              </button>
            ))}
          </div>

          {/* File drop */}
          {tab === 'file' && (
            <div onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-2xl p-12 text-center cursor-pointer transition-colors">
              <input ref={fileRef} type="file" accept=".docx,.txt" onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} className="hidden" />
              {file ? (
                <div>
                  <p className="text-3xl mb-2">📄</p>
                  <p className="text-white font-semibold">{file.name}</p>
                  <p className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="text-xs text-gray-600 hover:text-red-400 mt-2">Remove</button>
                </div>
              ) : (
                <div>
                  <p className="text-4xl mb-3">📂</p>
                  <p className="text-gray-300 font-medium">Drop file here or click to browse</p>
                  <p className="text-gray-600 text-sm mt-1">.docx and .txt · Max 10 MB</p>
                </div>
              )}
            </div>
          )}

          {tab === 'text' && (
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Paste your manuscript text here..."
              className="w-full h-64 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-100 placeholder-gray-600 text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-500" />
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Q-Variant</label>
              <div className="flex flex-col gap-1">
                {Q_VARIANTS.map(q => (
                  <button key={q.key} type="button" onClick={() => setQVariant(q.key)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${qVariant === q.key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    <span className="font-semibold">{q.label}</span>
                    <span className="text-xs ml-2 opacity-70">{q.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Mode</label>
              <div className="flex flex-col gap-1">
                {MODES.map(m => (
                  <button key={m.key} type="button" onClick={() => setMode(m.key)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${mode === m.key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-950 px-3 py-2 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading || limitReached || (tab === 'file' ? !file : !text.trim())}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold py-4 rounded-xl transition-colors">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Analyzing... (1–2 minutes)
              </span>
            ) : 'Run Analysis'}
          </button>
        </form>
      </main>
    </div>
  );
}
