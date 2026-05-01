'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { chatApi, subscriptionApi } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { generateDocx } from '@/lib/generateDocx';

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
    CRITICAL:    { badge: '#DC2626', bg: '#FEF2F2', text: '#991B1B' },
    MAJOR:       { badge: '#EA580C', bg: '#FFF7ED', text: '#9A3412' },
    MODERATE:    { badge: '#CA8A04', bg: '#FEFCE8', text: '#854D0E' },
    UNCERTAINTY: { badge: '#6B7280', bg: '#F8FAFC', text: '#374151' },
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
      html += '<hr style="border:none;border-top:1px solid #E2E8F0;margin:10px 0">';
      continue;
    }

    if (line.startsWith('▸') || line.match(/^#{1,3}\s/)) {
      const text = line.startsWith('▸') ? line.slice(1).trimStart() : line.replace(/^#{1,3}\s*/, '').trim();
      html += `<div style="background:#0F172A;color:#fff;padding:9px 16px;font-size:11.5px;font-weight:700;letter-spacing:0.06em;margin:22px 0 10px;-webkit-print-color-adjust:exact;print-color-adjust:exact">▸ ${esc(text)}</div>`;
      continue;
    }

    const sevKey = line.includes('[CRITICAL]') || /^CRITICAL[:\s]/i.test(line) ? 'CRITICAL'
      : line.includes('[MAJOR]') || /^MAJOR[:\s]/i.test(line) ? 'MAJOR'
      : line.includes('[MODERATE]') || /^MODERATE[:\s]/i.test(line) ? 'MODERATE'
      : line.includes('[UNCERTAINTY]') || /^UNCERTAINTY[:\s]/i.test(line) ? 'UNCERTAINTY'
      : null;

    if (sevKey) {
      const c = SEV[sevKey];
      let body = line
        .replace(/\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/gi, '')
        .replace(/^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]*/i, '')
        .trim();
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() || '';
      if (next && !isSevMarker(next) && !next.startsWith('▸') && !next.match(/^#{1,3}\s/)) {
        body += ' ' + next; i = j;
      }
      html += `<div style="display:flex;margin:6px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <div style="min-width:110px;background:${c.badge};color:#fff;font-size:10px;font-weight:700;text-align:center;padding:9px 10px;display:flex;align-items:center;justify-content:center;letter-spacing:0.07em;line-height:1.3;flex-shrink:0">${sevKey}</div>
        <div style="flex:1;background:${c.bg};padding:9px 14px;font-size:12px;color:${c.text};line-height:1.55">${bold(body)}</div>
      </div>`;
      continue;
    }

    if (line.match(/^[-•]\s+/)) {
      const text = line.replace(/^[-•]\s+/, '');
      html += `<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0 4px 8px">
        <span style="color:#3B82F6;font-size:7px;margin-top:5px;flex-shrink:0">●</span>
        <span style="font-size:12px;color:#374151;line-height:1.55">${bold(text)}</span>
      </div>`;
      continue;
    }

    const remaining = lines.slice(i + 1).filter(l => l.trim());
    if (remaining.length === 0 && line.endsWith('.') && !line.startsWith('-')) {
      html += `<div style="margin-top:14px;padding-top:10px;border-top:1px solid #E2E8F0">
        <p style="margin:0;font-size:12px;color:#64748B;font-style:italic;line-height:1.55">${bold(line)}</p>
      </div>`;
      continue;
    }

    html += `<p style="margin:3px 0;font-size:12px;color:#374151;line-height:1.6">${bold(line)}</p>`;
  }

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>CLASR-EN Report ${index}</title>
    <style>
      * { box-sizing: border-box; }
      body { background:#fff; color:#1E293B; font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif; margin:0; padding:36px 44px 72px; }
      .page { max-width:720px; margin:0 auto; }
      @media print {
        body { padding:0; }
        @page { margin:1.5cm; size:A4; }
        * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
      }
    </style>
  </head><body><div class="page">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px;border-bottom:2.5px solid #0F172A;margin-bottom:22px">
      <div>
        <span style="font-size:15px;font-weight:900;color:#0F172A;letter-spacing:0.12em">CLASR-EN</span>
        <span style="font-size:11px;color:#64748B;margin-left:10px;letter-spacing:0.04em">ACADEMIC READING SIGNAL REPORT</span>
      </div>
      <span style="font-size:11px;color:#64748B">Report ${index} · ${today}</span>
    </div>
    ${html}
    <div style="margin-top:36px;padding-top:8px;border-top:1px solid #CBD5E1;text-align:center;font-size:10px;color:#94A3B8;font-style:italic">
      This report is an academic reading signal. Decisions, evaluation, and publication responsibility rest with the user.
    </div>
  </div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
  win.document.close();
}

const FUNCTIONS = [
  {
    id: 1,
    label: 'Structural Review',
    desc: 'IMRaD flow, section organization, contribution framing, argument-limit symmetry, reader–evidence alignment',
    minPlan: 'basic',
    prompt: `Run STRUCTURAL REVIEW on the attached manuscript.

Output rule: report ONLY signals where a problem exists. Skip clean areas entirely. Each finding = 1–2 sentences: signal name, location, academic risk. Omit any heading with no findings.

▸ IMRaD / Section Organization
▸ Structural Balance & Section Proportions
▸ Contribution & Originality Visibility
  Are "first study," "novel contribution," or "gap" assertions bounded and anchored in the literature? Report PRIMACY CLAIM — UNBOUNDED or CONTRIBUTION SCOPE INFLATION if detected.
▸ Missing / Redundant / Overloaded Sections
▸ Reader–Evidence Alignment
  What reader profile does the manuscript's framing imply (EXPERT / INTERDISCIPLINARY / POLICY_ADJACENT / GENERAL_ACADEMIC)? Does the actual evidence threshold match? Report TENSION or MISMATCH only — skip ALIGNED.
▸ Writing Surface & Readability
▸ First-Screening Risk Signals
▸ Uncertainties

Close with one summary sentence.`,
  },
  {
    id: 2,
    label: 'Methodological Visibility',
    desc: 'Data, sampling, analysis, replication profile, null results, disciplinary tradition conflicts',
    minPlan: 'basic',
    prompt: `Run METHODOLOGICAL VISIBILITY on the attached manuscript.

Output rule: report ONLY gaps where method, data, analysis, or reproducibility is unclear or insufficient. Skip adequately reported areas. Each finding = 1–2 sentences: gap name, location, reviewability risk. Omit any heading with no findings.

▸ Research Design & Empirical Logic
▸ Data, Sample, Variables & Measurement
▸ Analytical Procedures & Model Visibility
▸ Validity, Reliability, Robustness & Sensitivity
▸ Replication Signal Profile
  Report each dimension as OPEN / ON REQUEST / ABSENT / NOT APPLICABLE — list only ABSENT dimensions:
  Pre-registration · Data availability · Code availability · Materials/instruments · Reporting standard (CONSORT / STROBE / PRISMA etc.)
▸ Negative Result Visibility
  Are non-significant or contrary-to-hypothesis results reported? Assign: NULL_VISIBLE / NULL_DEFLECTED / NULL_ABSENT.
  If NULL_DEFLECTED — identify subtype: SURPRISE_FRAMING / FUTURE_DEFLECTION / PIVOT_SUPPRESSION / SUPPLEMENTARY_ONLY.
  If STRUCTURAL_NULL_ABSENCE (multi-variable or comparative design with zero non-significant results reported): flag explicitly.
▸ Disciplinary Tradition Conflicts
  Are methods from one disciplinary tradition applied under assumptions from another without acknowledgment? Report TENSION_SUPPRESSED or ASSUMPTION_INVISIBILITY if detected.
▸ Ethics, Transparency & Reproducibility
▸ Table / Figure / Model Use
▸ Uncertainties

Close with one summary sentence.`,
  },
  {
    id: 3,
    label: 'Reference Check',
    desc: 'Citation–reference matching, missing entries, year mismatches, citation pattern signals',
    minPlan: 'free',
    prompt: `Run REFERENCE CHECK on the attached manuscript.

EVIDENCE RULE: Every finding MUST include a direct quote from the text as proof. Format:
- Missing from list: exact in-text citation → "not found in reference list"
- Not cited in text: full reference entry → "no in-text citation found"
- Year/author mismatch: in-text version → reference list version (quote both)
If you cannot quote both sides with certainty — do NOT report it. Uncertain = skip.
No "present; OK", no verification notes. Silence = correct. Omit any heading with zero findings.

▸ In-Text Citations Missing from Reference List
▸ Reference List Entries Not Cited in Text
▸ Author / Year Mismatches (in-text → list)
▸ Same-Year Citation Problems (missing a/b labels)
▸ Incomplete or Duplicate Entries (quote the entry, state the missing field)
▸ APA Formatting Inconsistencies (substantive only — quote the problem)
▸ Undercited or Unsupported Key Claims
▸ Citation Pattern Signals
  CONFIRMATORY CITATION PATTERN: does cited literature align exclusively with the manuscript's position, with no contrastive or competing sources engaged?
  ELEVATED SELF-CITATION DENSITY: do self-citations constitute ≥25% of the reference list, or does any argument chain rely on 3+ consecutive self-citations?
  REFERENCE AGE SIGNAL: do the majority of references pre-date the manuscript by 10+ years without field-specific justification?
  FIELD CONCENTRATION SIGNAL: does a cross-field or interdisciplinary topic draw exclusively from a single disciplinary literature?
▸ Literature Use Issues (decorative citations, gap claim not grounded, discussion not reconnected to literature)

Close with one summary sentence.`,
  },
  {
    id: 4,
    label: 'Inconsistency Detection',
    desc: 'Abstract–body gaps, aim–method–results mismatches, argument chain continuity, drift signals',
    minPlan: 'free',
    prompt: `Run INCONSISTENCY DETECTION on the attached manuscript.

Output rule: report ONLY detected mismatches and evidence-boundary violations. Skip consistent areas. Each finding = 1–2 sentences: what conflicts with what, where, coherence risk. Tag each: [CRITICAL] [MAJOR] [MODERATE] [UNCERTAINTY]. Omit any heading with no findings.

▸ Abstract ↔ Main Text
  CLAIM ESCALATION: abstract makes a stronger claim than the body supports.
  CLAIM DEFLATION: body makes stronger claims than the abstract represents.
  SCOPE BOUNDARY GAP: abstract declares a scope boundary the body does not respect.
  LIMIT SIGNAL GAP: limitations acknowledged in abstract absent from the body, or vice versa.
▸ Aim / RQ ↔ Method / Analysis
▸ Method ↔ Results
▸ Results ↔ Discussion / Conclusion
  CAUSAL DRIFT: are correlational or associational findings reframed as causal in the Discussion?
  SCALE DRIFT: are findings generalized beyond the sample, region, or time period without flagging the transition?
  MECHANISM INTRODUCTION: does the Discussion introduce an explanatory mechanism not present in Results and not cited from prior literature?
▸ Table / Figure ↔ Text
▸ Terminology / Variable Name Shifts
▸ Evidence-Boundary Violations (causality, scale, overclaim)

Close with one summary sentence.`,
  },
  {
    id: 5,
    label: 'Red Flags',
    desc: 'Critical risks, overclaims, null result suppression, desk-reject zones, integrity signals',
    minPlan: 'free',
    prompt: `Run RED FLAG DETECTION on the attached manuscript.

Output rule: report ONLY significant risk signals. Skip anything below notable risk threshold. Each finding = 1–2 sentences: signal, location, credibility / screening risk. Tag each: [CRITICAL] [MAJOR] [MODERATE] [UNCERTAINTY]. Omit any heading with no findings.

▸ Research Framing / Contribution / Originality Risks
  Unbounded primacy claims ("first study to...") without scope boundary. Unanchored novelty assertions. CONTRIBUTION SCOPE INFLATION: stated contribution exceeds what the study design can deliver.
▸ Methodological Red Flags
▸ Analytical & Results Red Flags
  STRUCTURAL_NULL_ABSENCE: does a comparative, multi-variable, or longitudinal design report zero non-significant results — where some would be structurally expected?
  SELECTIVE_PRESENTATION_SIGNAL: are results filtered, ordered by significance level, or displaced to supplementary materials without explanation?
▸ Conclusion & Evidence-Boundary Red Flags
▸ Language Risks
  Certainty escalation ("demonstrates," "proves," "conclusively shows"). Impact inflation ("high impact," "critical," "severe" — when unmeasured). Normative leakage ("should," "must," "requires action").
▸ Ethics / Transparency / Reproducibility Red Flags

Close with one summary sentence.`,
  },
  {
    id: 6,
    label: 'Final Integrated Review',
    desc: 'One-paragraph Q1 synthesis, desk-reject risk summary, critical sentence corrections',
    minPlan: 'pro',
    prompt: `Run FINAL INTEGRATED REVIEW on the attached manuscript.

▸ Integrated Review
One paragraph. No lists, no em dashes. Professional English. Cover: contribution visibility and framing quality, methodological transparency, replication readiness, analytical rigor, argument chain continuity, internal consistency, evidence-boundary control, claim-limit symmetry, literature integration, reader–evidence alignment, Q1-readiness signals. Cautious tone. No publication decision.

▸ Desk-Reject Risk Summary
For each of the five risk zones, state RISK DETECTED or NOT DETECTED with one supporting observation. Omit zones with no active risk signals.
Scope–Journal Fit · Abstract Posture · Structural Completeness · Language Posture · Integrity & Transparency
Close the block with: Co-occurrence pattern: LOW (1 zone) / MODERATE (2 zones) / HIGH (3+ zones).

▸ Critical Sentence Corrections
Only sentences with critical problems (overclaim, unsupported causality, APA violation, translation-like phrasing). Format:
- Original: [sentence]
- Problem: [one line]
- Corrected: [revised sentence]
If none: write "No critical sentence-level corrections detected."`,
  },
  {
    id: 7,
    label: 'Argument Chain Analysis',
    desc: 'Central claim continuity T1–T4, chain profile, claim substitution / fragmentation / abandonment',
    minPlan: 'basic',
    prompt: `Run ARGUMENT CHAIN ANALYSIS on the attached manuscript.

Track the continuity of the manuscript's central claim from the framing zone through to the conclusion. Report ONLY drift, breaks, substitutions, or asymmetries. Tag each: [CRITICAL] [MAJOR] [MODERATE]. Omit any heading with no findings.

▸ Central Claim
Extract and state the primary claim from the title / abstract / introduction aim in one sentence.
If no explicit claim is identifiable: state CLAIM_NOT_ANCHORED — stop here.

▸ Transition Map
For each transition, assign a continuity state. Report ONLY transitions showing EXPANDED, TRANSFORMED, LOST, or unrecovered drift — skip SUSTAINED and NARROWED:
T1 (Framing → Methods): [state]
T2 (Methods → Results): [state]
T3 (Results → Discussion): [state] — also flag CAUSAL DRIFT or SCALE DRIFT if present
T4 (Discussion → Conclusion): [state] — also flag UNRESOLVED if claim reaches conclusion in TRANSFORMED or EXPANDED state without acknowledgment

▸ Chain Profile
State overall profile: INTACT / PARTIALLY INTACT / DRIFTED / BROKEN / UNRESOLVED

▸ Additional Chain Signals
Check and report only if detected:
CLAIM_SUBSTITUTION — a new claim in Discussion or Conclusion displaces the original framing-zone claim.
CLAIM_FRAGMENTATION — the unified claim splits into multiple disconnected sub-claims that are never reintegrated.
CLAIM_ABANDONMENT — the central claim is introduced, developed through Methods, then silently not addressed in Results or Discussion.

▸ Argument–Limit Symmetry
Across FRAMING / CORE / CLOSING zones: does claim weight match limit acknowledgment weight?
Report only ASYMMETRIC zones (claim weight exceeds limit weight) or INVERTED zones (limit weight suppresses claim weight). Skip SYMMETRIC zones.

Close with one summary sentence on overall argument chain integrity.`,
  },
  {
    id: 8,
    label: 'Desk-Reject Risk Profile',
    desc: '5-zone editorial risk synthesis: scope fit, abstract posture, completeness, language, integrity',
    minPlan: 'basic',
    prompt: `Run DESK-REJECT RISK PROFILE on the attached manuscript.

Assess behavioral signals across five editorial risk zones. For each zone: state RISK DETECTED or NOT DETECTED, then provide one supporting observation (1–2 sentences). Omit zones with no active risk signals. No recommendation. No prediction.

▸ Scope–Journal Fit Risk
Active signals: unbounded primacy claim combined with low evidence threshold; scale drift from Results to Discussion in a Q1-target manuscript; policy-adjacent framing in a specialist journal context.

▸ Abstract Posture Risk
Active signals: abstract claim exceeds what the body supports (CLAIM ESCALATION); contribution scope stated in abstract exceeds study design; abstract behavioral type (empirical / theoretical / exploratory) mismatches the body.

▸ Structural Completeness Risk
Active signals: mandatory sections missing (Introduction, Methods, Results, Limitations, Conclusion); Limitations section absent or under-substantiated; replication-critical elements absent in a data-heavy or computational manuscript; methods chain dependency break (Results without Methods; Discussion without Results).

▸ Language Posture Risk
Active signals: HIGH-frequency certainty words combined with HIGH-intensity assertions (AMPLIFICATION CLUSTER); normative language ("should," "must," "requires action") in a Q1-target context; reader–evidence mismatch — POLICY_ADJACENT framing in a specialist submission.

▸ Integrity & Transparency Risk
Active signals: self-citations ≥25% of the reference list or 3+ consecutive self-citations in one argument chain; competing interests declaration intersecting with the outcome variable or primary analytic tool; zero non-significant results reported in a confirmatory multi-variable design; pre-registration absent in a clinical or experimental study.

▸ Co-occurrence Pattern
Count active risk zones and state: LOW (1 zone) / MODERATE (2 zones) / HIGH (3+ zones)

Close with one sentence on overall editorial risk posture.`,
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

    const convParam = new URLSearchParams(window.location.search).get('conv');
    if (convParam) {
      chatApi.getConversation(convParam).then(({ data }) => {
        const msgs: Message[] = (data || []).map((m: any) => ({
          role: m.role, content: m.content, filename: m.filename,
        }));
        setMessages(msgs);
        setConvId(convParam);
      }).catch(() => {});
    } else {
      chatApi.conversations().then(r => {
        const last = r.data?.[0];
        if (last) setLastSession({ id: last.id, preview: last.preview });
        else if (!localStorage.getItem('clasr_onboarded')) setShowOnboarding(true);
      }).catch(() => {
        if (!localStorage.getItem('clasr_onboarded')) setShowOnboarding(true);
      });
    }
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
    content = preprocessContent(content);
    const SEV = {
      CRITICAL:    { border: 'border-l-red-500',    bg: 'bg-red-950/30',    badge: 'bg-red-600',    text: 'text-red-200'    },
      MAJOR:       { border: 'border-l-orange-500', bg: 'bg-orange-950/30', badge: 'bg-orange-600', text: 'text-orange-200' },
      MODERATE:    { border: 'border-l-yellow-500', bg: 'bg-yellow-950/30', badge: 'bg-yellow-600', text: 'text-yellow-200' },
      UNCERTAINTY: { border: 'border-l-gray-500',   bg: 'bg-gray-800/60',   badge: 'bg-gray-500',   text: 'text-gray-200'  },
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

      // Horizontal rule (Unicode box chars or ASCII ---)
      if (line.match(/^[━═─\-]{3,}$/) && !line.match(/[a-zA-Z]/)) {
        nodes.push(<hr key={i} className="border-gray-800 my-3" />);
        continue;
      }

      // Section heading: ▸ or ## or "1. TITLE"
      if (line.startsWith('▸') || line.match(/^#{1,3}\s/) || line.match(/^\d+\.\s+[A-Z]/)) {
        const text = line.startsWith('▸') ? line.slice(1).trimStart() : line.replace(/^#{1,3}\s*/, '').trim();
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
        let body = line
          .replace(/\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/gi, '')
          .replace(/^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]*/i, '')
          .trim();

        // Absorb continuation lines (AI sometimes wraps a single finding across 2 lines)
        const isSevMarker = (l: string) =>
          !l || l.startsWith('▸') || /^#{1,3}\s/.test(l) || /^\d+\.\s+[A-Z]/.test(l) ||
          /^[-•]\s+/.test(l) || /\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/i.test(l) ||
          /^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]/i.test(l);

        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && !isSevMarker(lines[j].trim())) {
          body = body + ' ' + lines[j].trim();
          i = j;
        }

        nodes.push(
          <div key={i} className={`flex gap-3 items-start border-l-4 rounded-r-lg px-3 py-2.5 my-1.5 ${s.border} ${s.bg}`}>
            <span className={`${s.badge} text-white text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 tracking-wide whitespace-nowrap`}>
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

      // Reference finding: citation pattern only (Author Year → problem), not generic arrows
      if (line.match(/^⚠/) || line.match(/[A-Z][a-zA-Z\s&,]+\(\d{4}\).*[→↔]/) || line.match(/^[A-Z][a-z]+.+\(\d{4}\)/) && line.match(/[→↔]/)) {
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
            <p className="text-gray-400 text-sm italic leading-relaxed"
          dangerouslySetInnerHTML={{ __html: inlineBold(line) }} />
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
                      .txt
                    </button>
                    <button onClick={() => printAsPdf(msg.content, i + 1)}
                      className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      PDF
                    </button>
                    <button onClick={async () => {
                      const blob = await generateDocx(msg.content, i + 1);
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `clasr-report-${i + 1}.docx`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      .docx
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
