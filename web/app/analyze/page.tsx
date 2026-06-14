'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { chatApi, subscriptionApi, authApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { generateDocx } from '@/lib/generateDocx';
import { FUNCTIONS, canAccess } from '@/lib/functions';
import ClasrLogo from '@/app/components/ClasrLogo';
import { parseSeverityKey, isSeverityMarker } from '@/lib/severity';
import { downloadText, downloadDocx } from '@/lib/downloadFile';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  filename?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-xs text-muted hover:text-teal transition-colors">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function preprocessContent(raw: string): string {
  let s = raw.replace(/\n{3,}/g, '\n\n').replace(/^[ \t]+$/gm, '');
  s = s.replace(/▸\s*Severity Signal Map[^\n]*\n([\s\S]*?)(?=\n▸|\n#{1,3} |$)/gi, '');
  const lines = s.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('▸') || /^#{1,3}\s/.test(line)) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() ?? '';
      if (!next || next.startsWith('▸') || /^#{1,3}\s/.test(next)) continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}

function printAsPdf(content: string, index: number) {
  content = preprocessContent(content);
  const SEV: Record<string, { badge: string; bg: string; text: string }> = {
    CRITICAL:    { badge: '#8B2020', bg: 'rgba(139,32,32,0.07)',   text: '#5C1515' },
    MAJOR:       { badge: '#8A4A10', bg: 'rgba(138,74,16,0.07)',   text: '#5C2F08' },
    MODERATE:    { badge: '#705B0E', bg: 'rgba(112,91,14,0.07)',   text: '#473A09' },
    UNCERTAINTY: { badge: '#4A6068', bg: 'rgba(182,193,187,0.30)', text: '#2b555b' },
  };
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bold = (s: string) => esc(s).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  const isSevMarker = (l: string) =>
    /\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/i.test(l) ||
    /^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]/i.test(l);
  const lines = content.split('\n');
  let html = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { html += '<div style="height:5px"></div>'; continue; }
    if (line.match(/^[━═─\-]{3,}$/) && !line.match(/[a-zA-Z]/)) {
      html += '<hr style="border:none;border-top:1px solid #E2E8F0;margin:10px 0">'; continue;
    }
    if (line.startsWith('▸') || line.match(/^#{1,3}\s/)) {
      const text = line.startsWith('▸') ? line.slice(1).trimStart() : line.replace(/^#{1,3}\s*/, '').trim();
      html += `<div style="background:#134340;color:#fff;padding:9px 16px;font-size:11.5px;font-weight:700;letter-spacing:0.06em;margin:22px 0 10px;-webkit-print-color-adjust:exact;print-color-adjust:exact">▸ ${esc(text)}</div>`;
      continue;
    }
    const sevKey = line.includes('[CRITICAL]') || /^CRITICAL[:\s]/i.test(line) ? 'CRITICAL'
      : line.includes('[MAJOR]') || /^MAJOR[:\s]/i.test(line) ? 'MAJOR'
      : line.includes('[MODERATE]') || /^MODERATE[:\s]/i.test(line) ? 'MODERATE'
      : line.includes('[UNCERTAINTY]') || /^UNCERTAINTY[:\s]/i.test(line) ? 'UNCERTAINTY'
      : null;
    if (sevKey) {
      const c = SEV[sevKey];
      let body = line.replace(/\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/gi, '').replace(/^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]*/i, '').trim();
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() || '';
      if (next && !isSevMarker(next) && !next.startsWith('▸') && !next.match(/^#{1,3}\s/)) { body += ' ' + next; i = j; }
      html += `<div style="display:flex;margin:6px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <div style="min-width:110px;background:${c.badge};color:#fff;font-size:10px;font-weight:700;text-align:center;padding:9px 10px;display:flex;align-items:center;justify-content:center;letter-spacing:0.07em;line-height:1.3;flex-shrink:0">${sevKey}</div>
        <div style="flex:1;background:${c.bg};padding:9px 14px;font-size:12px;color:${c.text};line-height:1.55">${bold(body)}</div>
      </div>`;
      continue;
    }
    if (line.match(/^[-•]\s+/)) {
      const text = line.replace(/^[-•]\s+/, '');
      html += `<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0 4px 8px"><span style="color:#1B5C58;font-size:7px;margin-top:5px;flex-shrink:0">●</span><span style="font-size:12px;color:#374151;line-height:1.55">${bold(text)}</span></div>`;
      continue;
    }
    const remaining = lines.slice(i + 1).filter(l => l.trim());
    if (remaining.length === 0 && line.endsWith('.') && !line.startsWith('-')) {
      html += `<div style="margin-top:14px;padding-top:10px;border-top:1px solid #E2E8F0"><p style="margin:0;font-size:12px;color:#64748B;font-style:italic;line-height:1.55">${bold(line)}</p></div>`;
      continue;
    }
    html += `<p style="margin:3px 0;font-size:12px;color:#374151;line-height:1.6">${bold(line)}</p>`;
  }
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>CLASR Report ${index}</title><style>*{box-sizing:border-box}body{background:#fff;color:#1E293B;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:36px 44px 72px}.page{max-width:720px;margin:0 auto}@media print{body{padding:0}@page{margin:1.5cm;size:A4}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}</style></head><body><div class="page"><div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px;border-bottom:2.5px solid #134340;margin-bottom:22px"><div><span style="font-size:15px;font-weight:900;color:#134340;letter-spacing:0.12em">CLASR</span><span style="font-size:11px;color:#64748B;margin-left:10px;letter-spacing:0.04em">ACADEMIC READING SIGNAL REPORT</span></div><span style="font-size:11px;color:#64748B">Report ${index} · ${today}</span></div>${html}<div style="margin-top:36px;padding-top:8px;border-top:1px solid #CBD5E1;text-align:center;font-size:10px;color:#94A3B8;font-style:italic">This report is an academic reading signal. Decisions, evaluation, and publication responsibility rest with the user.</div></div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
  win.document.close();
}

// ─── Signal count parser ──────────────────────────────────────────────────────

const SECTION_LABELS = [
  { key: 'S0', label: 'S0 Macro Frame', pattern: /▸\s*(?:SECTION\s*0|MACRO\s*FRAME)/i },
  { key: 'S1', label: 'S1 Aim & Scope', pattern: /▸\s*(?:SECTION\s*1|AIM\s*&?\s*SCOPE)/i },
  { key: 'S2', label: 'S2 Conceptual Framework', pattern: /▸\s*(?:SECTION\s*2|CONCEPTUAL|THEORETICAL\s*FRAMEWORK)/i },
  { key: 'S3', label: 'S3 Methodological', pattern: /▸\s*(?:SECTION\s*3|METHODOLOGICAL)/i },
  { key: 'S4', label: 'S4 Argumentation', pattern: /▸\s*(?:SECTION\s*4|ARGUMENTATION)/i },
  { key: 'S5', label: 'S5 Numerical / Spatial', pattern: /▸\s*(?:SECTION\s*5|NUMERICAL|SPATIAL)/i },
  { key: 'S6', label: 'S6 Language', pattern: /▸\s*(?:SECTION\s*6|LANGUAGE|HEDGING)/i },
  { key: 'S7', label: 'S7 Structure', pattern: /▸\s*(?:SECTION\s*7|STRUCTURAL\s*INTEGRITY)/i },
  { key: 'S8', label: 'S8 Limits', pattern: /▸\s*(?:SECTION\s*8|LIMITS|UNCERTAINTIES)/i },
];

function parseSignalCounts(content: string) {
  const SEV_RE = /\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]|^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]/gim;
  const results: { key: string; label: string; signals: number }[] = [];
  const headingPositions: { idx: number; key: string; label: string }[] = [];
  const lines = content.split('\n');
  let charPos = 0;
  for (const line of lines) {
    for (const sec of SECTION_LABELS) {
      if (sec.pattern.test(line)) {
        headingPositions.push({ idx: charPos, key: sec.key, label: sec.label });
        break;
      }
    }
    charPos += line.length + 1;
  }
  for (let i = 0; i < headingPositions.length; i++) {
    const start = headingPositions[i].idx;
    const end = headingPositions[i + 1]?.idx ?? content.length;
    const chunk = content.slice(start, end);
    const matches = chunk.match(SEV_RE);
    results.push({ key: headingPositions[i].key, label: headingPositions[i].label, signals: matches?.length ?? 0 });
  }
  return results;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [conversations, setConversations] = useState<{ id: string; preview: string }[]>([]);
  const [currentFilename, setCurrentFilename] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [qtier, setQtierState] = useState('Q2');
  const [role, setRoleState] = useState('author');

  function setQtier(q: string) { setQtierState(q); localStorage.setItem('clasr_q_tier', q); }
  function setRole(r: string) { setRoleState(r); localStorage.setItem('clasr_role', r); }

  const hour = typeof window !== 'undefined' ? new Date().getHours() : 12;
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    subscriptionApi.status().then(r => setSub(r.data)).catch(() => {});
    authApi.me().then(r => {
      const email = r.data?.email || '';
      setUserName(email.split('@')[0] || '');
    }).catch(() => {});
    if (typeof window !== 'undefined') {
      const savedQ = localStorage.getItem('clasr_q_tier');
      const savedRole = localStorage.getItem('clasr_role');
      if (savedQ) setQtierState(savedQ);
      if (savedRole) setRoleState(savedRole);
    }
    const convParam = new URLSearchParams(window.location.search).get('conv');
    if (convParam) {
      chatApi.getConversation(convParam).then(({ data }) => {
        setMessages((data || []).map((m: any) => ({ role: m.role, content: m.content, filename: m.filename })));
        setConvId(convParam);
      }).catch(() => {});
    } else {
      chatApi.conversations().then(r => {
        const convs = r.data || [];
        setConversations(convs);
        const last = convs[0];
        if (last) setLastSession({ id: last.id, preview: last.preview });
      }).catch(() => {});
    }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [prompt]);

  const limitReached = sub && sub.used >= sub.limit;
  const userPlan = sub?.plan || 'free';
  const lastAssistantMsg = useMemo(() => messages.filter(m => m.role === 'assistant').at(-1), [messages]);
  const signalCounts = useMemo(() => lastAssistantMsg ? parseSignalCounts(lastAssistantMsg.content) : [], [lastAssistantMsg]);
  const totalSignals = useMemo(() => signalCounts.reduce((s, c) => s + c.signals, 0), [signalCounts]);
  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  }, [messages]);

  async function handleResume() {
    if (!lastSession) return;
    setResumeLoading(true);
    try {
      const { data } = await chatApi.getConversation(lastSession.id);
      setMessages((data || []).map((m: any) => ({ role: m.role, content: m.content, filename: m.filename })));
      setConvId(lastSession.id);
      setLastSession(null);
    } catch {} finally { setResumeLoading(false); }
  }

  async function sendMessage(overridePrompt?: string, overrideFile?: File | null, displayLabel?: string, isFunctionCall = false) {
    if (loading || limitReached) return;
    const finalPrompt = overridePrompt ?? prompt;
    const finalFile = overrideFile !== undefined ? overrideFile : file;
    if (!finalPrompt.trim() && !finalFile) { setError('Enter a prompt or attach a file'); return; }
    setError('');
    const userMsg: Message = {
      role: 'user',
      content: displayLabel ? (prompt.trim() ? `${displayLabel}\n${prompt.trim()}` : displayLabel) : (finalPrompt.trim() || `[File: ${finalFile?.name}]`),
      filename: finalFile?.name,
    };
    setMessages(prev => [...prev, userMsg]);
    if (finalFile?.name) setCurrentFilename(finalFile.name);
    setPrompt(''); setFile(null); setArmedFn(null); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('prompt', finalPrompt.trim());
      fd.append('is_function_call', isFunctionCall ? 'true' : 'false');
      if (finalFile) fd.append('file', finalFile);
      if (convId) fd.append('conversation_id', convId);
      const { data } = await chatApi.sendMessage(fd);
      setConvId(data.conversation_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      if (isFunctionCall) setSub((s: any) => s ? { ...s, used: s.used + 1 } : s);
      else setSub((s: any) => s ? { ...s, chat_used: (s.chat_used || 0) + 1 } : s);
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'free_limit_reached' || code === 'monthly_limit_reached') router.push('/pricing');
      else if (code === 'chat_limit_reached') setError(`Chat limit reached (${sub?.chat_limit}/mo). Upgrade to Pro for more.`);
      else if (code === 'chat_not_available') setError('Chat is not available on the free plan.');
      else setError(err?.response?.data?.error || 'Something went wrong');
      setMessages(prev => prev.slice(0, -1));
    } finally { setLoading(false); }
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
    if (file) sendMessage(fn.prompt, file, fn.label, true);
    else if (convId) sendMessage(fn.prompt, null, fn.label, true);
    else { setArmedFn(fn); fileRef.current?.click(); }
  }

  function handleFileSelect(f: File | null) {
    if (!f) return;
    if (!['docx', 'pdf', 'txt'].includes(f.name.split('.').pop()?.toLowerCase() || '')) {
      setError('Only .docx, .pdf and .txt files are supported'); return;
    }
    if (armedFn) sendMessage(armedFn.prompt, f, armedFn.label, true);
    else setFile(f);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave(e: React.DragEvent) { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }
  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]); }

  function clearSession() {
    setMessages([]); setConvId(null); setPrompt(''); setFile(null); setArmedFn(null); setCurrentFilename('');
  }

  // ─── Render assistant ──────────────────────────────────────────────────────

  function renderAssistant(content: string, msgIndex: number) {
    content = preprocessContent(content);
    const SEV: Record<string, { border: string; bgStyle: React.CSSProperties; badge: string; text: string }> = {
      CRITICAL:    { border: 'border-l-[#8B2020]', bgStyle: { background: 'rgba(139,32,32,0.07)' },   badge: 'bg-[#8B2020]', text: 'text-[#5C1515]' },
      MAJOR:       { border: 'border-l-[#8A4A10]', bgStyle: { background: 'rgba(138,74,16,0.07)' },   badge: 'bg-[#8A4A10]', text: 'text-[#5C2F08]' },
      MODERATE:    { border: 'border-l-[#705B0E]', bgStyle: { background: 'rgba(112,91,14,0.07)' },   badge: 'bg-[#705B0E]', text: 'text-[#473A09]' },
      UNCERTAINTY: { border: 'border-l-[#b6c1bb]', bgStyle: { background: 'rgba(182,193,187,0.35)' }, badge: 'bg-[#4A6068]', text: 'text-[#2b555b]' },
    };

    function inlineBold(text: string) {
      return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1A1A1A] font-semibold">$1</strong>');
    }

    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let sectionIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();
      if (!line) { nodes.push(<div key={i} className="h-2" />); continue; }
      if (line.match(/^[━═─\-]{3,}$/) && !line.match(/[a-zA-Z]/)) {
        nodes.push(<hr key={i} className="border-cream-border my-3" />); continue;
      }
      if (line.startsWith('▸') || line.match(/^#{1,3}\s/) || line.match(/^\d+\.\s+[A-Z]/)) {
        const text = line.startsWith('▸') ? line.slice(1).trimStart() : line.replace(/^#{1,3}\s*/, '').trim();
        const anchorId = `msg-${msgIndex}-section-${sectionIdx++}`;
        nodes.push(
          <div key={i} id={anchorId} className="flex items-center gap-2.5 mt-7 mb-2.5">
            <div className="w-[3px] h-5 bg-teal rounded-full shrink-0" />
            <p className="text-teal font-semibold text-sm">{text}</p>
          </div>
        );
        continue;
      }
      const sevKey = parseSeverityKey(line);
      if (sevKey) {
        const s = SEV[sevKey];
        let body = line.replace(/\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/gi, '').replace(/^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]*/i, '').trim();
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && !isSeverityMarker(lines[j].trim())) { body = body + ' ' + lines[j].trim(); i = j; }
        nodes.push(
          <div key={i} className={`flex gap-3 items-start border-l-4 rounded-r-sm px-3 py-2.5 my-1.5 ${s.border}`} style={s.bgStyle}>
            <span className={`${s.badge} text-cream text-xs font-bold px-2 py-0.5 rounded-sm shrink-0 mt-0.5 tracking-wide whitespace-nowrap`}>{sevKey}</span>
            <p className={`text-sm leading-relaxed ${s.text}`} dangerouslySetInnerHTML={{ __html: inlineBold(body) }} />
          </div>
        );
        continue;
      }
      if (line.match(/^[-•]\s+/)) {
        const text = line.replace(/^[-•]\s+/, '');
        nodes.push(
          <div key={i} className="flex gap-2.5 items-start my-1 ml-1">
            <span className="text-teal-mid mt-[5px] shrink-0 text-[7px]">●</span>
            <p className="text-sm text-[#3A3A2A] leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineBold(text) }} />
          </div>
        );
        continue;
      }
      if (line.match(/^\*\*[^*]+\*\*[:\s]*$/)) {
        const text = line.replace(/\*\*/g, '');
        nodes.push(<p key={i} className="text-[#1A1A1A] font-semibold text-sm mt-4 mb-1">{text}</p>);
        continue;
      }
      const remaining = lines.slice(i + 1).filter(l => l.trim());
      if (remaining.length === 0 && line.endsWith('.') && !line.startsWith('-')) {
        nodes.push(
          <div key={i} className="mt-5 pt-3 border-t border-cream-border">
            <p className="text-muted text-sm italic leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineBold(line) }} />
          </div>
        );
        continue;
      }
      nodes.push(<p key={i} className="text-sm text-[#3A3A2A] leading-relaxed my-0.5" dangerouslySetInnerHTML={{ __html: inlineBold(raw) }} />);
    }
    return nodes;
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  const displayName = userName ? (userName.charAt(0).toUpperCase() + userName.slice(1)) : '';

  return (
    <div className="flex h-screen bg-cream overflow-hidden"
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

      <input ref={fileRef} type="file" accept=".docx,.pdf,.txt"
        onChange={e => handleFileSelect(e.target.files?.[0] || null)} className="hidden" />

      {/* Drop overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-teal/80 border-4 border-dashed border-white flex items-center justify-center pointer-events-none">
          <div className="text-center text-cream">
            <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-4 opacity-90">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xl font-bold font-serif">
              {armedFn ? `Run ${armedFn.label}` : 'Drop your manuscript here'}
            </p>
            <p className="text-sm mt-1 opacity-80">.docx · .pdf · .txt</p>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-cream border-r border-teal/20
        transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-4 pt-4 pb-3 border-b border-cream-border flex items-center justify-between">
          <Link href="/"><ClasrLogo scale={0.42} /></Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-muted hover:text-teal p-1" aria-label="Close sidebar">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* FILES */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-widest">FILES</span>
            <button onClick={() => { clearSession(); setSidebarOpen(false); }}
              className="flex items-center gap-1 text-xs text-teal hover:text-teal-dark transition-colors font-medium">
              <span className="text-base leading-none">+</span> New
            </button>
          </div>
          <div className="space-y-1">
            {conversations.slice(0, 8).map(c => (
              <button key={c.id}
                onClick={() => { router.push(`/analyze?conv=${c.id}`); setSidebarOpen(false); }}
                className={`w-full text-left text-xs px-2 py-1.5 rounded-sm transition-colors truncate
                  ${c.id === convId ? 'bg-sage text-teal font-medium' : 'text-muted hover:bg-cream-dark'}`}>
                {c.preview || 'Untitled session'}
              </button>
            ))}
          </div>
        </div>

        {/* SECTIONS — appears after analysis */}
        {messages.length > 0 && signalCounts.length > 0 && (
          <div className="border-t border-cream-border px-4 pt-4 pb-2 mt-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-widest block mb-3">SECTIONS</span>
            <nav className="space-y-1">
              {signalCounts.map((s, i) => (
                <a key={s.key}
                  href={`#msg-${lastAssistantIdx}-section-${i}`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded-sm text-muted hover:text-teal hover:bg-cream-dark transition-colors">
                  <span className="font-medium truncate">&gt; {s.label}</span>
                  {s.signals > 0 && <span className="text-orange-500 font-bold ml-1 shrink-0">{s.signals}</span>}
                </a>
              ))}
            </nav>
          </div>
        )}

        {/* Upgrade link */}
        {sub?.plan !== 'pro' && (
          <div className="mt-auto px-4 py-4 border-t border-cream-border">
            <Link href="/pricing"
              className="block text-center text-xs bg-teal hover:bg-teal-dark text-cream py-2 rounded-full transition-colors font-medium">
              Upgrade to Pro
            </Link>
          </div>
        )}
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="border-b border-cream-border px-4 sm:px-5 py-3 flex items-center justify-between shrink-0 bg-cream">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted hover:text-teal p-1.5 -ml-1" aria-label="Open sidebar">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-muted">
              <Link href="/features" className="hover:text-teal transition-colors">Features</Link>
              <Link href="/resources/signal-architecture" className="hover:text-teal transition-colors">Resources</Link>
              <Link href="/pricing" className="hover:text-teal transition-colors">Pricing</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {sub && (
              <span className="text-xs text-muted bg-cream-dark px-2 py-1 rounded-sm">
                {sub.used}/{sub.limit}
                <span className="opacity-60 ml-1 hidden sm:inline">{sub.plan === 'free' ? 'lifetime' : '/mo'}</span>
              </span>
            )}
            {convId && (
              <button
                onClick={async () => {
                  if (deleteLoading) return;
                  setDeleteLoading(true);
                  try { await chatApi.deleteConversation(convId); clearSession(); } catch {}
                  setDeleteLoading(false);
                }}
                aria-label="Delete session"
                className="text-muted hover:text-red-500 p-1.5 rounded-sm transition-colors">
                {deleteLoading ? <span className="text-xs">…</span> : (
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                )}
              </button>
            )}
            <Link href="/settings" aria-label="Settings" className="text-muted hover:text-teal p-1.5 rounded-sm transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Link>
            {displayName && (
              <span className="hidden sm:block text-sm text-muted font-medium capitalize">{displayName} ▾</span>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ── EMPTY STATE ── */
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-teal mb-6">
                {greeting}{displayName ? `, ${displayName}!` : '!'}
              </h1>

              {/* Role + Q-tier selector */}
              <div className="bg-sage-light border border-sage-dark rounded-sm p-5 mb-6">
                <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Reading preferences</p>

                {/* Role */}
                <div className="mb-4">
                  <p className="text-xs text-muted mb-2">I am</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'author', label: 'Author', desc: "I'm preparing my own manuscripts." },
                      { id: 'advisor', label: 'Advisor', desc: "I'm reviewing student or team manuscripts." },
                      { id: 'reviewer', label: 'Reviewer', desc: "I'm reading as a peer reviewer." },
                    ].map(r => (
                      <button key={r.id} onClick={() => setRole(r.id)}
                        title={r.desc}
                        className={`text-sm px-4 py-2 rounded-full border transition-all font-medium
                          ${role === r.id
                            ? 'bg-teal text-cream border-teal'
                            : 'bg-cream text-muted border-cream-border hover:border-teal hover:text-teal'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q-tier */}
                <div>
                  <p className="text-xs text-muted mb-2">Target journal tier</p>
                  <div className="flex gap-2">
                    {[
                      { id: 'Q1', label: 'Q1', sub: 'Strict' },
                      { id: 'Q2', label: 'Q2', sub: 'Balanced' },
                      { id: 'Q3', label: 'Q3', sub: 'Flex' },
                      { id: 'Q4', label: 'Q4', sub: 'Open' },
                    ].map(q => (
                      <button key={q.id} onClick={() => setQtier(q.id)}
                        className={`flex-1 py-3 rounded-sm border transition-all text-center
                          ${qtier === q.id
                            ? 'bg-teal text-cream border-teal'
                            : 'bg-cream text-muted border-cream-border hover:border-teal hover:text-teal'}`}>
                        <p className="font-serif font-bold text-lg">{q.label}</p>
                        <p className="text-xs opacity-70 mt-0.5">{q.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted mt-3 opacity-70">
                  Hi. I&rsquo;m <strong>CLASR</strong>. Calibrated for <strong>{qtier}</strong> reading, <strong>{role.charAt(0).toUpperCase() + role.slice(1)} Mode</strong>.
                </p>
              </div>

              {/* Last session banner */}
              {lastSession && (
                <div className="flex items-center justify-between bg-cream border border-cream-border rounded-sm px-4 py-3 mb-5">
                  <div className="min-w-0">
                    <p className="text-xs text-muted mb-0.5">Last session</p>
                    <p className="text-sm text-teal truncate font-medium">{lastSession.preview}</p>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button onClick={handleResume} disabled={resumeLoading}
                      className="text-xs bg-teal hover:bg-teal-dark disabled:opacity-50 text-cream px-3 py-1.5 rounded-full transition-colors">
                      {resumeLoading ? 'Loading…' : 'Continue'}
                    </button>
                    <button onClick={() => setLastSession(null)} aria-label="Dismiss"
                      className="text-xs text-muted hover:text-teal px-2 py-1.5 transition-colors">✕</button>
                  </div>
                </div>
              )}

              {/* Upload zone */}
              <div className="mb-5 text-center">
                <p className="text-sm text-muted font-medium mb-3">Upload a manuscript</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-sm p-8 sm:p-10 transition-all cursor-pointer group
                    ${armedFn ? 'border-teal bg-sage-light' : 'border-cream-border bg-cream hover:border-teal hover:bg-sage-light'}`}>
                  <div className={`w-12 h-12 mx-auto mb-3 flex items-center justify-center`}>
                    <svg width="28" height="28" fill="none" stroke="#2B555B" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="font-medium text-sm text-teal">
                    {armedFn ? `Drop manuscript to run ${armedFn.label}` : 'PDF / DOCX / TXT'}
                  </p>
                  <p className="text-muted text-xs mt-1">Max 10 MB</p>
                </button>

                {file && (
                  <div className="flex items-center gap-2 mt-2 bg-cream-dark rounded-sm px-3 py-2">
                    <span className="flex items-center gap-1.5 text-sm text-teal">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {file.name}
                    </span>
                    <button onClick={() => setFile(null)} aria-label="Remove file" className="text-muted hover:text-red-500 ml-auto text-xs">✕</button>
                  </div>
                )}
              </div>

              {/* OR paste */}
              <div className="text-center text-xs text-muted mb-3">OR</div>
              <p className="text-sm text-muted mb-2">paste text below.</p>

              {/* Function chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {FUNCTIONS.map(fn => {
                  const locked = !canAccess(userPlan, fn.minPlan);
                  const armed = armedFn?.id === fn.id;
                  return (
                    <button key={fn.id} onClick={() => handleFunctionClick(fn)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all
                        ${armed ? 'bg-teal border-teal text-cream' :
                          locked ? 'border-cream-border text-muted cursor-pointer opacity-60' :
                          'border-cream-border text-muted hover:border-teal hover:text-teal bg-cream'}`}>
                      {locked && (
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="inline-block mr-1 shrink-0" aria-hidden="true">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                      )}{fn.label}
                    </button>
                  );
                })}
              </div>

              {error && <p className="text-red-700 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-sm mb-3">{error}</p>}

              {/* Text input */}
              <form onSubmit={handleSend} className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a prompt or paste manuscript text…"
                  rows={4}
                  className="w-full bg-cream border border-cream-border focus:border-teal rounded-sm px-4 py-3 text-[#1A1A1A] placeholder-muted text-sm resize-none focus:outline-none transition-colors pr-12"
                />
                <button type="submit"
                  disabled={loading || (!prompt.trim() && !file && !armedFn)}
                  className="absolute right-3 bottom-3 bg-teal hover:bg-teal-dark disabled:opacity-30 text-cream w-8 h-8 rounded-full transition-colors flex items-center justify-center text-sm font-bold">
                  {loading ? '…' : '↑'}
                </button>
              </form>
            </div>
          ) : (
            /* ── RESULTS STATE ── */
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

              {/* Breadcrumb + metadata */}
              {currentFilename && (
                <div className="mb-4">
                  <h2 className="font-serif text-xl font-bold text-teal">&gt; {currentFilename}</h2>
                  <p className="text-xs text-muted mt-1">
                    {qtier} calibration · {role.charAt(0).toUpperCase() + role.slice(1)} Mode
                  </p>
                </div>
              )}

              {/* Reading completed card */}
              {lastAssistantMsg && (
                <div className="bg-sage-light border border-sage-dark rounded-sm p-5 sm:p-6 mb-5 text-center">
                  <p className="text-sm font-bold text-teal uppercase tracking-widest mb-2">READING COMPLETED</p>
                  {totalSignals > 0 && (
                    <p className="text-muted text-sm mb-1">
                      {totalSignals} signals mapped across {signalCounts.filter(s => s.signals > 0).length} sections
                    </p>
                  )}
                  <p className="text-muted text-xs italic">No verdicts here. Just visibility.</p>
                  <div className="flex justify-center gap-3 mt-4">
                    <CopyButton text={lastAssistantMsg.content} />
                    <button onClick={() => downloadText(lastAssistantMsg.content, 'clasr-report.txt')} className="text-xs text-muted hover:text-teal transition-colors">.txt</button>
                    <button onClick={() => printAsPdf(lastAssistantMsg.content, messages.filter(m => m.role === 'assistant').length)} className="text-xs text-muted hover:text-teal transition-colors">PDF</button>
                    <button onClick={() => downloadDocx(generateDocx, lastAssistantMsg.content, messages.filter(m => m.role === 'assistant').length, 'clasr-report.docx')} className="text-xs text-muted hover:text-teal transition-colors">.docx</button>
                  </div>
                </div>
              )}

              {/* Signal count table */}
              {signalCounts.length > 0 && (
                <div className="bg-cream border border-cream-border rounded-sm mb-5 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-cream-border">
                    <p className="text-xs font-semibold text-muted uppercase tracking-widest">CONTENT</p>
                    <a href="#full-report" className="text-xs text-teal hover:underline">Read full report ↓</a>
                  </div>
                  <div className="px-5 py-3 space-y-1.5">
                    {signalCounts.filter(s => s.signals > 0).map(s => (
                      <div key={s.key} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{s.label}</span>
                        <span className="text-teal font-medium">{s.signals} signal{s.signals !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div id="full-report" className="space-y-6" ref={reportRef}>
                {messages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-xl bg-teal text-cream rounded-2xl rounded-br-sm px-4 py-3">
                          {msg.filename && (
                            <p className="flex items-center gap-1 text-xs opacity-70 mb-1">
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              {msg.filename}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-cream border border-cream-border rounded-2xl rounded-bl-sm px-5 py-5">
                        {renderAssistant(msg.content, i)}
                        <div className="mt-4 pt-3 border-t border-cream-border flex gap-4">
                          <CopyButton text={msg.content} />
                          <button onClick={() => downloadText(msg.content, `clasr-report-${i + 1}.txt`)} className="text-xs text-muted hover:text-teal transition-colors">.txt</button>
                          <button onClick={() => printAsPdf(msg.content, i + 1)} className="text-xs text-muted hover:text-teal transition-colors">PDF</button>
                          <button onClick={() => downloadDocx(generateDocx, msg.content, i + 1, `clasr-report-${i + 1}.docx`)} className="text-xs text-muted hover:text-teal transition-colors">.docx</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="bg-cream border border-cream-border rounded-2xl px-5 py-4">
                    <div className="flex gap-1.5 items-center">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-2 h-2 bg-teal rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                      <span className="text-muted text-xs ml-2">Analyzing…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          )}
        </div>

        {/* ── INPUT AREA (chat state only) ── */}
        {messages.length > 0 && (
          <div className="border-t border-cream-border bg-cream px-4 sm:px-5 py-4 shrink-0">
            <div className="max-w-3xl mx-auto">
              {armedFn && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-teal bg-sage px-3 py-1 rounded-full flex items-center gap-2 border border-sage-dark">
                    {armedFn.label}
                    <button onClick={() => setArmedFn(null)} aria-label="Cancel" className="text-muted hover:text-teal ml-1">✕</button>
                  </span>
                  <span className="text-xs text-muted">armed — attach a file or send</span>
                </div>
              )}
              {limitReached && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-sm px-4 py-2 mb-3">
                  <p className="text-amber-800 text-sm">Analysis limit reached</p>
                  <Link href="/pricing" className="text-sm font-semibold text-teal hover:underline">Upgrade →</Link>
                </div>
              )}
              {error && <p className="text-red-700 text-sm mb-2 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">{error}</p>}
              {file && (
                <div className="flex items-center gap-2 mb-2 bg-cream-dark rounded-sm px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm text-teal">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {file.name}
                  </span>
                  <button onClick={() => setFile(null)} aria-label="Remove file" className="text-muted hover:text-red-500 ml-auto text-xs">✕</button>
                </div>
              )}

              {/* Function chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {FUNCTIONS.map(fn => {
                  const locked = !canAccess(userPlan, fn.minPlan);
                  const armed = armedFn?.id === fn.id;
                  return (
                    <button key={fn.id} onClick={() => handleFunctionClick(fn)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all
                        ${armed ? 'bg-teal border-teal text-cream' :
                          locked ? 'border-cream-border text-muted opacity-60' :
                          'border-cream-border text-muted hover:border-teal hover:text-teal bg-cream'}`}>
                      {locked && (
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="inline-block mr-1 shrink-0" aria-hidden="true">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                      )}{fn.label}
                    </button>
                  );
                })}
              </div>

              {userPlan === 'free' ? (
                <div className="text-center py-3 text-muted text-xs border border-cream-border rounded-sm bg-cream">
                  Chat is available on Basic and Pro plans.{' '}
                  <Link href="/pricing" className="text-teal hover:underline">Upgrade</Link>
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex gap-2 items-end">
                  <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach file"
                    className="shrink-0 p-3 bg-cream-dark hover:bg-sage text-teal rounded-sm transition-colors flex items-center justify-center">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 102.828 2.828l6.414-6.586a4 4 00-5.656-5.656l-6.415 6.585a6 6 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={armedFn ? `Add context for ${armedFn.label} (optional)…` : 'Ask a follow-up question…'}
                    rows={1}
                    className="flex-1 bg-cream border border-cream-border focus:border-teal rounded-sm px-4 py-3 text-[#1A1A1A] placeholder-muted text-sm resize-none focus:outline-none transition-colors"
                  />
                  <button type="submit"
                    disabled={loading || limitReached || (!prompt.trim() && !file && !armedFn)}
                    className="shrink-0 bg-teal hover:bg-teal-dark disabled:opacity-30 text-cream w-11 h-11 rounded-full transition-colors flex items-center justify-center font-bold">
                    {loading ? '…' : '↑'}
                  </button>
                </form>
              )}
              {userPlan === 'basic' && sub?.chat_limit > 0 && (
                <p className="text-center text-muted text-xs mt-1">
                  Chat: {sub.chat_used ?? 0}/{sub.chat_limit} used this month
                </p>
              )}
              <p className="text-center text-muted text-xs mt-2 opacity-60">CLASR-EN · 44 signal kits · SECTION 0–8</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
