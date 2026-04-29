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

const FUNCTIONS = [
  {
    id: 1,
    label: 'Structural Review',
    desc: 'IMRaD flow, organization, contribution visibility, first-screening signals',
    minPlan: 'basic',
    prompt: `You are ClasR. Read the manuscript and report ONLY structural signals where problems exist. Skip any area that is clearly adequate. Do not translate, rewrite, or make publication decisions.

REPORTING RULE: Each finding = 1–2 sentences. Name the signal, its location, and why it matters. If a section below has no issues, omit it entirely — do not write "no issues found."

Report only detected problems under these headings (omit any with no findings):
- Macro-Structural Signal
- IMRaD / Section Organization Issues
- Structural Balance Problems
- Contribution / Originality Visibility Gaps
- Missing, Redundant, or Overloaded Sections
- APA Surface / Readability Issues
- First-Screening Risk Signals
- Uncertainties

End with a one-sentence overall structural signal summary.`,
  },
  {
    id: 2,
    label: 'Methodological Visibility',
    desc: 'Data, sampling, measurement, analysis, validity, reproducibility signals',
    minPlan: 'basic',
    prompt: `You are ClasR. Read the manuscript and report ONLY methodological visibility gaps — areas where the method, data, analysis, or reproducibility is unclear, missing, or insufficient. Skip anything that is adequately reported. Do not translate, rewrite, or make publication decisions.

REPORTING RULE: Each finding = 1–2 sentences. Name the gap, its location, and the reviewability risk. Omit any heading below with no findings.

Report only detected gaps under these headings:
- Research Design / Empirical Logic Gaps
- Data, Sample, Variable, or Measurement Gaps
- Analytical Procedure / Model Visibility Gaps
- Validity, Reliability, Robustness, or Sensitivity Gaps
- Ethics, Transparency, or Reproducibility Gaps
- Table / Figure / Model Use Issues
- Uncertainties

End with a one-sentence methodological visibility signal summary.`,
  },
  {
    id: 3,
    label: 'Reference Check',
    desc: 'Citation–reference matching, missing entries, year mismatches, literature use',
    minPlan: 'free',
    prompt: `You are ClasR. Read the manuscript and report ONLY reference and citation problems. Do NOT list references that appear correct. Do not verify external sources, invent references, or make publication decisions.

REPORTING RULE: Each finding = one line with the citation/entry and the specific problem. Omit any heading below with no findings.

Report only detected problems under these headings:
- In-Text Citations Missing from Reference List (list each)
- Reference List Entries Not Cited in Text (list each)
- Author or Year Mismatches (list each: in-text vs. list)
- Same-Year Citation Problems (missing a/b labels, etc.)
- Incomplete or Duplicate Reference Entries (list each with missing field)
- Formatting / APA Inconsistencies (only substantive ones)
- Undercited or Unsupported Key Claims
- Literature Use Issues (decorative, gap not grounded, discussion not reconnected)

End with a one-sentence reference signal summary.`,
  },
  {
    id: 4,
    label: 'Inconsistency Detection',
    desc: 'Contradictions, aim–method–results–conclusion mismatches, evidence-boundary issues',
    minPlan: 'free',
    prompt: `You are ClasR. Read the manuscript and report ONLY detected inconsistencies, mismatches, and evidence-boundary violations. Skip anything that is internally consistent. Do not translate, rewrite, or make publication decisions.

REPORTING RULE: Each finding = 1–2 sentences. State what conflicts with what, where, and the academic coherence risk. Classify each as: [CRITICAL] [MAJOR] [MODERATE] or [UNCERTAINTY]. Omit any heading below with no findings.

Report only detected problems under these headings:
- Abstract ↔ Main Text Mismatches
- Aim / RQ ↔ Method / Analysis Mismatches
- Method ↔ Results Mismatches
- Results ↔ Discussion / Conclusion Mismatches
- Table / Figure ↔ Text Mismatches
- Terminology or Variable Name Shifts
- Evidence-Boundary Violations (association → causation, local → universal, data → overclaim)
- Severity Signal Map (list each finding with its classification)

End with a one-sentence consistency signal summary.`,
  },
  {
    id: 5,
    label: 'Red Flags',
    desc: 'Critical academic risks, overclaims, desk-screening threats, credibility gaps',
    minPlan: 'free',
    prompt: `You are ClasR. Read the manuscript and report ONLY significant academic risk signals. Skip anything that does not rise to a notable risk level. Do not translate, rewrite, or make publication decisions.

REPORTING RULE: Each finding = 1–2 sentences. State the signal, its location, and the credibility or screening risk. Classify each as: [CRITICAL] [MAJOR] [MODERATE] or [UNCERTAINTY]. Omit any heading below with no findings.

Report only detected risks under these headings:
- Research Framing / Contribution / Originality Risks
- Methodological Red Flags
- Analytical / Results Red Flags
- Conclusion / Evidence-Boundary Red Flags
- Language Risks (overclaiming, certainty escalation, impact inflation)
- Ethics / Transparency / Reproducibility Red Flags
- Severity Signal Map (list each finding with its classification)

End with a one-sentence overall risk signal summary.`,
  },
  {
    id: 6,
    label: 'Final Integrated Review',
    desc: 'One-paragraph Q1-style humanized reviewer report integrating all signals',
    minPlan: 'pro',
    prompt: `You are ClasR. Produce a Q1-style academic signal report. Do not translate, accept, reject, or recommend revision.

Section 1 — Final Integrated Review
One paragraph only. No bullet points, numbered lists, or em dashes. Plain professional English. Cover: contribution visibility, methodological transparency, analytical rigor, internal consistency, literature integration, evidence-boundary control, and Q1-readiness signals. Balanced and cautious tone. Do not state a publication decision.

Section 2 — Critical Sentence Corrections
List only sentences with critical academic problems (overclaim, unsupported causality, APA 7.1 violation, translation-like phrasing). For each:
1. Original sentence
2. Problem signal (one line)
3. Corrected sentence (concise, restrained, APA-compatible)

If no critical corrections are needed, write: "No critical sentence-level corrections detected."`,
  },
];

const PLAN_ORDER = ['free', 'basic', 'pro'];
function canAccess(userPlan: string, minPlan: string) {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minPlan);
}

const PLAN_BADGE: Record<string, string> = {
  free: 'Free',
  basic: 'Basic+',
  pro: 'Pro',
};

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
  const [armedFn, setArmedFn] = useState<typeof FUNCTIONS[0] | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    subscriptionApi.status().then(r => setSub(r.data)).catch(() => {});
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [prompt]);

  const limitReached = sub && sub.used >= sub.limit;
  const userPlan = sub?.plan || 'free';

  async function sendMessage(overridePrompt?: string, overrideFile?: File | null, displayLabel?: string) {
    if (loading || limitReached) return;
    const finalPrompt = overridePrompt ?? prompt;
    const finalFile = overrideFile !== undefined ? overrideFile : file;
    if (!finalPrompt.trim() && !finalFile) { setError('Enter a prompt or attach a file'); return; }
    setError('');

    const userMsg: Message = {
      role: 'user',
      content: displayLabel
        ? (prompt.trim() ? `${displayLabel}\n${prompt.trim()}` : displayLabel)
        : (finalPrompt.trim() || `[File: ${finalFile?.name}]`),
      filename: finalFile?.name,
    };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setFile(null);
    setArmedFn(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('prompt', finalPrompt.trim());
      if (finalFile) fd.append('file', finalFile);
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

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (armedFn) {
      sendMessage(armedFn.prompt + (prompt.trim() ? '\n\n' + prompt.trim() : ''), undefined, armedFn.label);
    } else {
      sendMessage(prompt);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleFunctionClick(fn: typeof FUNCTIONS[0]) {
    if (!canAccess(userPlan, fn.minPlan)) { router.push('/pricing'); return; }
    if (armedFn?.id === fn.id) { setArmedFn(null); return; }
    setArmedFn(fn);
    if (file) {
      sendMessage(fn.prompt, file, fn.label);
    } else {
      fileRef.current?.click();
    }
  }

  function handleFileSelect(f: File | null) {
    if (!f) return;
    if (!['docx', 'pdf', 'txt'].includes(f.name.split('.').pop()?.toLowerCase() || '')) {
      setError('Only .docx, .pdf and .txt files are supported'); return;
    }
    if (armedFn) {
      sendMessage(armedFn.prompt, f, armedFn.label);
    } else {
      setFile(f);
    }
  }

  function renderAssistant(content: string) {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('▸ SECTION') || line.startsWith('▸ ARGUMENT'))
        return <p key={i} className="text-blue-400 font-bold text-sm mt-5 mb-1 border-b border-gray-800 pb-1">{line}</p>;
      if (line.match(/^[━═─]{3,}/)) return <hr key={i} className="border-gray-700 my-3" />;
      if (line.startsWith('[AUTO-Q') || line.startsWith('[CONTRIBUTION') || line.startsWith('[SCOPE DRIFT') ||
          line.startsWith('[CITATION') || line.startsWith('[REPLICATION') || line.startsWith('[ORIENTATION') ||
          line.startsWith('[INTEGRITY') || line.startsWith('[COHERENCE') || line.startsWith('[SILENCE'))
        return <p key={i} className="text-amber-400 text-xs bg-amber-950/50 px-3 py-1.5 rounded-lg my-1.5">{line}</p>;
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
    if (f) handleFileSelect(f);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col"
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

      {dragging && (
        <div className="fixed inset-0 z-50 bg-blue-950/90 border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-5xl mb-4">📄</p>
            <p className="text-blue-300 text-xl font-bold">
              {armedFn ? `Run ${armedFn.label}` : 'Drop your manuscript here'}
            </p>
            <p className="text-blue-400 text-sm mt-1">.docx · .pdf · .txt</p>
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
          <button onClick={() => { setMessages([]); setConvId(null); setPrompt(''); setFile(null); setArmedFn(null); }}
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
            <div className="flex flex-col items-center py-6 gap-6">
              <div className="text-center">
                <p className="text-gray-500 text-sm">Select a review function, then drop your manuscript</p>
              </div>

              {/* 6 Function cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl">
                {FUNCTIONS.map(fn => {
                  const locked = !canAccess(userPlan, fn.minPlan);
                  const armed = armedFn?.id === fn.id;
                  return (
                    <button
                      key={fn.id}
                      onClick={() => handleFunctionClick(fn)}
                      className={`relative text-left rounded-2xl p-4 border transition-all group
                        ${armed
                          ? 'bg-blue-900/60 border-blue-500 shadow-lg shadow-blue-950'
                          : locked
                            ? 'bg-gray-900/40 border-gray-800 opacity-60 cursor-pointer'
                            : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800/80'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${armed ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                          {fn.id.toString().padStart(2, '0')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${fn.minPlan === 'free' ? 'bg-emerald-950 text-emerald-400' :
                            fn.minPlan === 'basic' ? 'bg-blue-950 text-blue-400' :
                            'bg-purple-950 text-purple-400'}`}>
                          {PLAN_BADGE[fn.minPlan]}
                        </span>
                      </div>
                      <p className={`font-semibold text-sm mb-1 ${armed ? 'text-blue-200' : 'text-gray-200'}`}>
                        {fn.label}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">{fn.desc}</p>
                      {locked && (
                        <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-gray-950/50">
                          <span className="text-gray-400 text-xs bg-gray-800 px-3 py-1 rounded-full">🔒 Upgrade to unlock</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className={`w-full max-w-3xl border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all text-center group
                  ${armedFn
                    ? 'border-blue-500 bg-blue-950/30 hover:bg-blue-950/50'
                    : 'border-gray-700 bg-gray-900/50 hover:border-blue-500 hover:bg-gray-900'
                  }`}
              >
                <p className="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">📂</p>
                <p className={`font-semibold text-sm ${armedFn ? 'text-blue-300' : 'text-gray-300'}`}>
                  {armedFn ? `Drop manuscript to run ${armedFn.label}` : 'Drop manuscript here or click to browse'}
                </p>
                <p className="text-gray-600 text-xs mt-1">.docx · .pdf · .txt · Max 10 MB</p>
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

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                  <span className="text-gray-600 text-xs ml-2">Analyzing…</span>
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
          {/* Armed function badge */}
          {armedFn && messages.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-blue-300 bg-blue-950 border border-blue-800 px-3 py-1 rounded-full flex items-center gap-2">
                <span>{armedFn.label}</span>
                <button onClick={() => setArmedFn(null)} className="text-blue-500 hover:text-blue-300">✕</button>
              </span>
              <span className="text-xs text-gray-600">armed — attach a file or send</span>
            </div>
          )}
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

          {/* Function quick-select (compact, in chat state) */}
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {FUNCTIONS.map(fn => {
                const locked = !canAccess(userPlan, fn.minPlan);
                const armed = armedFn?.id === fn.id;
                return (
                  <button key={fn.id} onClick={() => handleFunctionClick(fn)}
                    className={`text-xs px-3 py-1 rounded-lg border transition-all
                      ${armed ? 'bg-blue-600 border-blue-500 text-white' :
                        locked ? 'bg-gray-900 border-gray-800 text-gray-600' :
                        'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                    {locked ? '🔒 ' : ''}{fn.label}
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <input ref={fileRef} type="file" accept=".docx,.pdf,.txt"
              onChange={e => handleFileSelect(e.target.files?.[0] || null)} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              title="Attach .docx, .pdf or .txt"
              className="shrink-0 p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-xl transition-colors text-lg">
              📎
            </button>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={armedFn ? `Add context for ${armedFn.label} (optional)…` : 'Type a prompt, paste text, or attach a file…'}
              rows={1}
              className="flex-1 bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 text-sm resize-none focus:outline-none transition-colors"
            />
            <button type="submit"
              disabled={loading || limitReached || (!prompt.trim() && !file && !armedFn)}
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
