'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { chatApi, subscriptionApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { Suspense } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  filename?: string;
}

function ChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [convId, setConvId] = useState<string | null>(null);
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    subscriptionApi.status().then(r => setSub(r.data)).catch(() => {});

    // Load existing conversation if id param present
    const id = params.get('id');
    if (id) {
      setConvId(id);
      chatApi.getConversation(id).then(r => {
        setMessages(r.data.map((m: any) => ({ role: m.role, content: m.content, filename: m.filename })));
      }).catch(() => {});
    }
  }, [router, params]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const limitReached = sub && sub.used >= sub.limit;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (loading || limitReached) return;
    if (!prompt.trim() && !file) { setError('Enter a prompt or attach a file'); return; }
    setError('');

    const userMsg: Message = { role: 'user', content: prompt.trim() || `[File: ${file?.name}]`, filename: file?.name };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setFile(null);
    setLoading(true);

    try {
      const fd = new FormData();
      if (prompt.trim()) fd.append('prompt', prompt.trim());
      if (file) fd.append('file', file);
      if (convId) fd.append('conversation_id', convId);

      const { data } = await chatApi.sendMessage(fd);
      setConvId(data.conversation_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      setSub((s: any) => s ? { ...s, used: s.used + 1 } : s);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'free_limit_reached' || code === 'monthly_limit_reached') router.push('/pricing');
      else setError(err?.response?.data?.error || 'Something went wrong');
      setMessages(prev => prev.slice(0, -1)); // remove optimistic user msg
    } finally {
      setLoading(false);
    }
  }

  function renderMessage(content: string) {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('▸ SECTION') || line.startsWith('▸ ARGUMENT')) {
        return <p key={i} className="text-blue-400 font-bold mt-4 mb-1">{line}</p>;
      }
      if (line.match(/^[━═]{3,}/)) return <hr key={i} className="border-gray-700 my-2" />;
      if (line.trim() === '') return <div key={i} className="h-1" />;
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="text-sm leading-relaxed text-gray-300" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">←</Link>
          <span className="text-white font-black tracking-widest">CLASR</span>
          <span className="text-gray-600 text-xs">Chat</span>
        </div>
        <div className="flex items-center gap-2">
          {sub && (
            <span className="text-xs text-gray-500">{sub.used}/{sub.limit} used</span>
          )}
          <button onClick={() => { setMessages([]); setConvId(null); }}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 bg-gray-800 rounded-lg">
            New Chat
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📄</p>
            <p className="text-gray-400 font-semibold">CLASR-EN Chat</p>
            <p className="text-gray-600 text-sm mt-2 max-w-sm mx-auto">
              Type a prompt, paste manuscript text, or attach a .docx file. Ask follow-up questions in the same conversation.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Run a Q1 analysis on this abstract:',
                'What does SCOPE DRIFT signal mean?',
                'Compare Q1 and Q2 thresholds for this paper:',
                'Run a revision round reading (R1):',
              ].map(s => (
                <button key={s} onClick={() => setPrompt(s)}
                  className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white text-sm'
                : 'bg-gray-900 border border-gray-800'
            }`}>
              {msg.filename && (
                <p className="text-xs opacity-70 mb-1">📄 {msg.filename}</p>
              )}
              {msg.role === 'user'
                ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                : renderMessage(msg.content)
              }
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          {limitReached && (
            <div className="flex items-center justify-between bg-amber-950 border border-amber-800 rounded-xl px-4 py-2 mb-3">
              <p className="text-amber-300 text-sm">Limit reached</p>
              <Link href="/pricing" className="text-sm text-amber-400 font-semibold hover:underline">Upgrade →</Link>
            </div>
          )}
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          {file && (
            <div className="flex items-center gap-2 mb-2 bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-300">📄 {file.name}</span>
              <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-400 ml-auto text-xs">✕</button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2">
            <input type="file" ref={fileRef} accept=".docx,.txt" onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="shrink-0 p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl transition-colors"
              title="Attach file">
              📎
            </button>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
              placeholder="Type a prompt or paste text... (Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            <button type="submit" disabled={loading || limitReached || (!prompt.trim() && !file)}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-5 rounded-xl transition-colors font-semibold">
              {loading ? '⏳' : '↑'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}
