'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { chatApi, subscriptionApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  filename?: string;
}

const QUICK_PROMPTS = [
  { label: 'Q1 Analysis', prompt: 'Run a full Q1 analysis' },
  { label: 'Q2 Analysis', prompt: 'Run a full Q2 analysis' },
  { label: 'Q3 Analysis', prompt: 'Run a full Q3 analysis' },
  { label: 'R1 Revision', prompt: 'Run a revision round analysis (R1)' },
  { label: 'Summary', prompt: 'Run a summary report' },
];

export default function AnalyzePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [convId, setConvId] = useState<string | null>(null);
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    subscriptionApi.status().then(r => setSub(r.data)).catch(() => {});
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [prompt]);

  const limitReached = sub && sub.used >= sub.limit;

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading || limitReached) return;
    if (!prompt.trim() && !file) { setError('Enter a prompt or attach a file'); return; }
    setError('');

    const userMsg: Message = {
      role: 'user',
      content: prompt.trim() || `[File: ${file?.name}]`,
      filename: file?.name,
    };
    setMessages(prev => [...prev, userMsg]);
    const sentPrompt = prompt;
    const sentFile = file;
    setPrompt('');
    setFile(null);
    setLoading(true);

    try {
      const fd = new FormData();
      if (sentPrompt.trim()) fd.append('prompt', sentPrompt.trim());
      if (sentFile) fd.append('file', sentFile);
      if (convId) fd.append('conversation_id', convId);

      const { data } = await chatApi.sendMessage(fd);
      setConvId(data.conversation_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      setSub((s: any) => s ? { ...s, used: s.used + 1 } : s);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'free_limit_reached' || code === 'monthly_limit_reached') router.push('/pricing');
      else setError(err?.response?.data?.error || 'Something went wrong');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function renderAssistant(content: string) {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('▸ SECTION') || line.startsWith('▸ ARGUMENT')) {
        return <p key={i} className="text-blue-400 font-bold text-sm mt-5 mb-1 border-b border-gray-800 pb-1">{line}</p>;
      }
      if (line.match(/^[━═─]{3,}/)) return <hr key={i} className="border-gray-700 my-3" />;
      if (line.startsWith('[AUTO-Q') || line.startsWith('[CONTRIBUTION') || line.startsWith('[SCOPE DRIFT') ||
          line.startsWith('[CITATION') || line.startsWith('[REPLICATION') || line.startsWith('[ORIENTATION') ||
          line.startsWith('[INTEGRITY') || line.startsWith('[COHERENCE') || line.startsWith('[SILENCE')) {
        return <p key={i} className="text-amber-400 text-xs bg-amber-950/50 px-3 py-1.5 rounded-lg my-1.5">{line}</p>;
      }
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
      return <p key={i} className="text-sm leading-relaxed text-gray-300" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave(e: React.DragEvent) { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.docx') || f.name.endsWith('.pdf') || f.name.endsWith('.txt'))) setFile(f);
    else if (f) setError('Only .docx, .pdf and .txt files are supported');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col"
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-blue-950/90 border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-5xl mb-4">📄</p>
            <p className="text-blue-300 text-xl font-bold">Drop your file here</p>
            <p className="text-blue-400 text-sm mt-1">.docx or .txt</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">←</Link>
          <span className="text-white font-black tracking-widest text-lg">CLASR</span>
        </div>
        <div className="flex items-center gap-3">
          {sub && (
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">
              {sub.used}/{sub.limit}
              <span className="text-gray-600 ml-1">{sub.plan === 'free' ? 'lifetime' : '/mo'}</span>
            </span>
          )}
          {sub?.plan !== 'pro' && (
            <Link href="/pricing" className="text-xs text-blue-400 hover:underline">Upgrade</Link>
          )}
          <button onClick={() => { setMessages([]); setConvId(null); setPrompt(''); setFile(null); }}
            className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            New
          </button>
          <Link href="/settings" className="text-gray-500 hover:text-gray-300 text-sm">⚙</Link>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-8">
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="w-full max-w-lg border-2 border-dashed border-gray-700 hover:border-blue-500 bg-gray-900/50 hover:bg-gray-900 rounded-2xl p-10 cursor-pointer transition-all text-center group"
              >
                <p className="text-4xl mb-3 group-hover:scale-110 transition-transform inline-block">📂</p>
                <p className="text-gray-300 font-semibold">Drop manuscript here or click to browse</p>
                <p className="text-gray-600 text-sm mt-1">.docx · .pdf · .txt · Max 10 MB</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 w-full max-w-lg">
                <hr className="flex-1 border-gray-800" />
                <span className="text-gray-700 text-xs">or run a quick action</span>
                <hr className="flex-1 border-gray-800" />
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {QUICK_PROMPTS.map(q => (
                  <button key={q.label} onClick={() => { setPrompt(q.prompt); textareaRef.current?.focus(); }}
                    className="text-sm text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-xl transition-all">
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-xl bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3">
                  {msg.filename && <p className="text-xs opacity-70 mb-1">📄 {msg.filename}</p>}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="max-w-2xl w-full bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-5 py-4">
                  {renderAssistant(msg.content)}
                  <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                  <span className="text-gray-600 text-xs ml-2">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-800 bg-gray-950 px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          {limitReached && (
            <div className="flex items-center justify-between bg-amber-950 border border-amber-800 rounded-xl px-4 py-2 mb-3">
              <p className="text-amber-300 text-sm">Analysis limit reached</p>
              <Link href="/pricing" className="text-sm font-semibold text-amber-400 hover:underline">Upgrade →</Link>
            </div>
          )}
          {error && <p className="text-red-400 text-sm mb-2 bg-red-950 px-3 py-2 rounded-lg">{error}</p>}
          {file && (
            <div className="flex items-center gap-2 mb-2 bg-gray-800 rounded-xl px-3 py-2">
              <span className="text-sm text-gray-300">📄 {file.name}</span>
              <span className="text-gray-600 text-xs ml-1">({(file.size / 1024).toFixed(0)} KB)</span>
              <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-400 ml-auto text-xs px-1">✕</button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <input ref={fileRef} type="file" accept=".docx,.pdf,.txt" onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              title="Attach .docx or .txt"
              className="shrink-0 p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-xl transition-colors text-lg">
              📎
            </button>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a prompt, paste text, or attach a file... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm resize-none focus:outline-none transition-colors"
            />
            <button type="submit"
              disabled={loading || limitReached || (!prompt.trim() && !file)}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white w-12 h-12 rounded-xl transition-colors flex items-center justify-center text-xl font-bold">
              {loading ? '⏳' : '↑'}
            </button>
          </form>
          <p className="text-center text-gray-700 text-xs mt-2">CLASR-EN · 24 signal kits · SECTION 0–8</p>
        </div>
      </div>
    </div>
  );
}
