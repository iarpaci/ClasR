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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

const FUNCTIONS = [
  {
    id: 1,
    label: 'Structural Review',
    desc: 'IMRaD flow, organization, contribution visibility, first-screening signals',
    minPlan: 'basic',
    prompt: `Run STRUCTURAL REVIEW on the attached manuscript.

Output rule: report ONLY signals where a problem exists. Skip clean areas entirely. Each finding = 1–2 sentences: signal name, location, academic risk. Omit any heading with no findings.

▸ IMRaD / Section Organization
▸ Structural Balance
▸ Contribution & Originality Visibility
▸ Missing / Redundant / Overloaded Sections
▸ APA Surface & Readability
▸ First-Screening Risk Signals
▸ Uncertainties

Close with one summary sentence.`,
  },
  {
    id: 2,
    label: 'Methodological Visibility',
    desc: 'Data, sampling, measurement, analysis, validity, reproducibility signals',
    minPlan: 'basic',
    prompt: `Run METHODOLOGICAL VISIBILITY on the attached manuscript.

Output rule: report ONLY gaps where method, data, analysis, or reproducibility is unclear or insufficient. Skip adequately reported areas. Each finding = 1–2 sentences: gap name, location, reviewability risk. Omit any heading with no findings.

▸ Research Design & Empirical Logic
▸ Data, Sample, Variables & Measurement
▸ Analytical Procedures & Model Visibility
▸ Validity, Reliability, Robustness & Sensitivity
▸ Ethics, Transparency & Reproducibility
▸ Table / Figure / Model Use
▸ Uncertainties

Close with one summary sentence.`,
  },
  {
    id: 3,
    label: 'Reference Check',
    desc: 'Citation–reference matching, missing entries, year mismatches, literature use',
    minPlan: 'free',
    prompt: `Run REFERENCE CHECK on the attached manuscript.

STRICT OUTPUT RULE: Report ONLY confirmed problems. If a citation or entry is present and correct — do NOT write about it at all. No "present; no problem", no "checked — OK", no verification notes. Silence = correct. Only broken items appear in output. Each problem = one line: identifier + specific problem. Omit any heading with zero findings.

▸ In-Text Citations Missing from Reference List
▸ Reference List Entries Not Cited in Text
▸ Author / Year Mismatches (show: in-text → list)
▸ Same-Year Citation Problems (missing a/b labels)
▸ Incomplete or Duplicate Entries (show missing field)
▸ APA Formatting Inconsistencies (substantive only)
▸ Undercited or Unsupported Key Claims
▸ Literature Use Issues (decorative citations, gap not grounded, discussion not reconnected)

Close with one summary sentence.`,
  },
  {
    id: 4,
    label: 'Inconsistency Detection',
    desc: 'Contradictions, aim–method–results–conclusion mismatches, evidence-boundary issues',
    minPlan: 'free',
    prompt: `Run INCONSISTENCY DETECTION on the attached manuscript.

Output rule: report ONLY detected mismatches and evidence-boundary violations. Skip consistent areas. Each finding = 1–2 sentences: what conflicts with what, where, coherence risk. Tag each: [CRITICAL] [MAJOR] [MODERATE] [UNCERTAINTY]. Omit any heading with no findings.

▸ Abstract ↔ Main Text
▸ Aim / RQ ↔ Method / Analysis
▸ Method ↔ Results
▸ Results ↔ Discussion / Conclusion
▸ Table / Figure ↔ Text
▸ Terminology / Variable Name Shifts
▸ Evidence-Boundary Violations (causality, scale, overclaim)
▸ Severity Signal Map

Close with one summary sentence.`,
  },
  {
    id: 5,
    label: 'Red Flags',
    desc: 'Critical academic risks, overclaims, desk-screening threats, credibility gaps',
    minPlan: 'free',
    prompt: `Run RED FLAG DETECTION on the attached manuscript.

Output rule: report ONLY significant risk signals. Skip anything below notable risk threshold. Each finding = 1–2 sentences: signal, location, credibility / screening risk. Tag each: [CRITICAL] [MAJOR] [MODERATE] [UNCERTAINTY]. Omit any heading with no findings.

▸ Research Framing / Contribution / Originality Risks
▸ Methodological Red Flags
▸ Analytical & Results Red Flags
▸ Conclusion & Evidence-Boundary Red Flags
▸ Language Risks (overclaiming, certainty escalation, impact inflation)
▸ Ethics / Transparency / Reproducibility Red Flags
▸ Severity Signal Map

Close with one summary sentence.`,
  },
  {
    id: 6,
    label: 'Final Integrated Review',
    desc: 'One-paragraph Q1-style humanized reviewer report integrating all signals',
    minPlan: 'pro',
    prompt: `Run FINAL INTEGRATED REVIEW on the attached manuscript.

Section 1 — Integrated Review
One paragraph. No lists, no em dashes. Professional English. Cover: contribution visibility, methodological transparency, analytical rigor, internal consistency, literature integration, evidence-boundary control, Q1-readiness signals. Cautious tone. No publication decision.

Section 2 — Critical Sentence Corrections
Only sentences with critical problems (overclaim, unsupported causality, APA 7.1 violation, translation-like phrasing). Format each as:
• Original: [sentence]
• Problem: [one line]
• Corrected: [revised sentence]

If none: "No critical sentence-level corrections detected."`,
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
  const [lastSession, setLastSession] = useState<{ id: string; preview: string } | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    subscriptionApi.status().then(r => setSub(r.data)).catch(() => {});
    chatApi.conversations().then(r => {
      const last = r.data?.[0];
      if (last) setLastSession({ id: last.id, preview: last.preview });
      else if (!localStorage.getItem('clasr_onboarded')) setShowOnboarding(true);
    }).catch(() => {
      if (!localStorage.getItem('clasr_onboarded')) setShowOnboarding(true);
    });
  }, [router]);

  async function handleResume() {
    if (!lastSession) return;
    setResumeLoading(true);
    try {
      const { data } = await chatApi.getConversation(lastSession.id);
      const msgs: Message[] = (data || []).map((m: any) => ({
        role: m.role,
        content: m.content,
        filename: m.filename,
      }));
      setMessages(msgs);
      setConvId(lastSession.id);
      setLastSession(null);
    } catch { } finally { setResumeLoading(false); }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [prompt]);

  const limitReached = sub && sub.used >= sub.limit;
  const userPlan = sub?.plan || 'free';

  async function sendMessage(overridePrompt?: string, overrideFile?: File | null, displayLabel?: string, isFunctionCall = false) {
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
      fd.append('is_function_call', isFunctionCall ? 'true' : 'false');
      if (finalFile) fd.append('file', finalFile);
      if (convId) fd.append('conversation_id', convId);

      const { data } = await chatApi.sendMessage(fd);
      setConvId(data.conversation_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      if (isFunctionCall) {
        setSub((s: any) => s ? { ...s, used: s.used + 1 } : s);
      } else {
        setSub((s: any) => s ? { ...s, chat_used: (s.chat_used || 0) + 1 } : s);
      }
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'free_limit_reached' || code === 'monthly_limit_reached') router.push('/pricing');
      else if (code === 'chat_limit_reached') setError(`Chat limit reached (${sub?.chat_limit}/mo). Upgrade to Pro for more.`);
      else if (code === 'chat_not_available') setError('Chat is not available on the free plan.');
      else setError(err?.response?.data?.error || 'Something went wrong');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (armedFn) {
      if (!file && !convId) { fileRef.current?.click(); return; }
      sendMessage(armedFn.prompt + (prompt.trim() ? '\n\n' + prompt.trim() : ''), undefined, armedFn.label, true);
    } else {
      sendMessage(prompt, undefined, undefined, false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleFunctionClick(fn: typeof FUNCTIONS[0]) {
    if (!canAccess(userPlan, fn.minPlan)) { router.push('/pricing'); return; }
    if (armedFn?.id === fn.id) { setArmedFn(null); return; }
    if (file) {
      sendMessage(fn.prompt, file, fn.label, true);
    } else if (convId) {
      sendMessage(fn.prompt, null, fn.label, true);
    } else {
      // No file, no conversation — arm and open file picker
      setArmedFn(fn);
      fileRef.current?.click();
    }
  }

  function handleFileSelect(f: File | null) {
    if (!f) return;
    if (!['docx', 'pdf', 'txt'].includes(f.name.split('.').pop()?.toLowerCase() || '')) {
      setError('Only .docx, .pdf and .txt files are supported'); return;
    }
    if (armedFn) {
      sendMessage(armedFn.prompt, f, armedFn.label, true);
    } else {
      setFile(f);
    }
  }

  function renderAssistant(content: string) {
    const SEV = {
      CRITICAL:    { border: 'border-l-red-500',    bg: 'bg-red-950/30',    badge: 'bg-red-600',    text: 'text-red-200'    },
      MAJOR:       { border: 'border-l-orange-500', bg: 'bg-orange-950/30', badge: 'bg-orange-600', text: 'text-orange-200' },
      MODERATE:    { border: 'border-l-yellow-500', bg: 'bg-yellow-950/30', badge: 'bg-yellow-600', text: 'text-yellow-200' },
      UNCERTAINTY: { border: 'border-l-gray-600',   bg: 'bg-gray-800/40',   badge: 'bg-gray-600',   text: 'text-gray-300'  },
    } as const;

    function inlineBold(text: string) {
      return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    }

    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();

      // Empty line
      if (!line) { nodes.push(<div key={i} className="h-3" />); continue; }

      // Horizontal rule
      if (line.match(/^[━═─]{3,}/)) {
        nodes.push(<hr key={i} className="border-gray-800 my-3" />);
        continue;
      }

      // Section heading: ▸ or ## or "1. TITLE"
      if (line.startsWith('▸') || line.match(/^#{1,3}\s/) || line.match(/^\d+\.\s+[A-Z]/)) {
        const text = line.replace(/^▸\s*/, '').replace(/^#{1,3}\s*/, '');
        nodes.push(
          <div key={i} className="flex items-center gap-2.5 mt-7 mb-2.5">
            <div className="w-[3px] h-5 bg-blue-500 rounded-full shrink-0" />
            <p className="text-blue-300 font-semibold text-sm">{text}</p>
          </div>
        );
        continue;
      }

      // Severity finding: [CRITICAL] / [MAJOR] / [MODERATE] / [UNCERTAINTY]
      const sevKey = line.includes('[CRITICAL]') || /^CRITICAL[:\s]/i.test(line) ? 'CRITICAL'
        : line.includes('[MAJOR]') || /^MAJOR[:\s]/i.test(line) ? 'MAJOR'
        : line.includes('[MODERATE]') || /^MODERATE[:\s]/i.test(line) ? 'MODERATE'
        : line.includes('[UNCERTAINTY]') || /^UNCERTAINTY[:\s]/i.test(line) ? 'UNCERTAINTY'
        : null;

      if (sevKey) {
        const s = SEV[sevKey];
        const body = line
          .replace(/\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/gi, '')
          .replace(/^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]*/i, '')
          .trim();
        nodes.push(
          <div key={i} className={`flex gap-3 items-start border-l-4 rounded-r-lg px-3 py-2.5 my-1.5 ${s.border} ${s.bg}`}>
            <span className={`${s.badge} text-white text-[10px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 tracking-wide`}>
              {sevKey}
            </span>
            <p className={`text-sm leading-relaxed ${s.text}`}
              dangerouslySetInnerHTML={{ __html: inlineBold(body) }} />
          </div>
        );
        continue;
      }

      // Bullet: "- " or "• "
      if (line.match(/^[-•]\s+/)) {
        const text = line.replace(/^[-•]\s+/, '');
        nodes.push(
          <div key={i} className="flex gap-2.5 items-start my-1 ml-1">
            <span className="text-blue-500 mt-[5px] shrink-0 text-[8px]">●</span>
            <p className="text-sm text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: inlineBold(text) }} />
          </div>
        );
        continue;
      }

      // Reference finding: → ↔ ⚠ or citation pattern
      if (line.match(/[→↔⚠]/) || line.match(/^[A-Z][a-z]+.+\(\d{4}\)/)) {
        nodes.push(
          <div key={i} className="flex gap-2.5 items-start bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2 my-1">
            <span className="text-amber-500 shrink-0 mt-0.5 text-xs">⚠</span>
            <p className="text-amber-200/80 text-sm leading-relaxed">{line.replace(/^⚠\s*/, '')}</p>
          </div>
        );
        continue;
      }

      // Bold-only line ("**Summary:**")
      if (line.match(/^\*\*[^*]+\*\*[:\s]*$/)) {
        const text = line.replace(/\*\*/g, '');
        nodes.push(<p key={i} className="text-gray-200 font-semibold text-sm mt-4 mb-1">{text}</p>);
        continue;
      }

      // Summary sentence (last non-empty line, ends with period)
      const remaining = lines.slice(i + 1).filter(l => l.trim());
      if (remaining.length === 0 && line.endsWith('.') && !line.startsWith('-')) {
        nodes.push(
          <div key={i} className="mt-5 pt-3 border-t border-gray-800">
            <p className="text-gray-400 text-sm italic leading-relaxed">{line}</p>
          </div>
        );
        continue;
      }

      // Default paragraph
      nodes.push(
        <p key={i} className="text-sm text-gray-400 leading-relaxed my-0.5"
          dangerouslySetInnerHTML={{ __html: inlineBold(raw) }} />
      );
    }

    return nodes;
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
              {showOnboarding && (
                <div className="w-full max-w-3xl bg-blue-950/60 border border-blue-700/50 rounded-2xl px-6 py-5">
                  <p className="text-blue-300 font-semibold text-sm mb-3">Welcome to CLASR</p>
                  <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                    <li>Click a <span className="text-white font-medium">review function</span> below</li>
                    <li>Drop or attach your manuscript <span className="text-gray-500">(.docx · .pdf · .txt)</span></li>
                    <li>Read the report — <span className="text-white font-medium">only real problems</span> are shown</li>
                    <li>Click another function to run more analyses on the <span className="text-white font-medium">same document</span></li>
                  </ol>
                  <button onClick={() => { setShowOnboarding(false); localStorage.setItem('clasr_onboarded', '1'); }}
                    className="mt-4 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition-colors">
                    Got it
                  </button>
                </div>
              )}

              {lastSession && (
                <div className="w-full max-w-3xl flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Last session</p>
                    <p className="text-sm text-gray-300 truncate">{lastSession.preview}</p>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button onClick={handleResume} disabled={resumeLoading}
                      className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                      {resumeLoading ? 'Loading…' : 'Continue'}
                    </button>
                    <button onClick={() => setLastSession(null)}
                      className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5">✕</button>
                  </div>
                </div>
              )}
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
                  <div className="mt-3 pt-3 border-t border-gray-800 flex gap-3">
                    <CopyButton text={msg.content} />
                    <button onClick={() => {
                      const blob = new Blob([msg.content], { type: 'text/plain' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `clasr-report-${i + 1}.txt`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      Download .txt
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

          {userPlan === 'free' && messages.length > 0 ? (
            <div className="text-center py-3 text-gray-500 text-xs border border-gray-800 rounded-xl bg-gray-900">
              Chat is available on Basic and Pro plans.{' '}
              <Link href="/pricing" className="text-blue-400 hover:underline">Upgrade</Link>
            </div>
          ) : (
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
          )}
          {userPlan === 'basic' && sub?.chat_limit > 0 && (
            <p className="text-center text-gray-700 text-xs mt-1">
              Chat: {sub.chat_used ?? 0}/{sub.chat_limit} used this month
            </p>
          )}
          <p className="text-center text-gray-700 text-xs mt-2">CLASR-EN · 24 signal kits · SECTION 0–8</p>
        </div>
      </div>
    </div>
  );
}
