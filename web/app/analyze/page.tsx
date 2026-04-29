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
    prompt: `You are ClasR, an academic structural, contribution, and organization signal reader for English quantitative and empirical manuscripts.

Read the attached manuscript carefully. If only section headings or a table of contents are provided, read only the section structure. Do not translate, rewrite, paraphrase, copyedit, or provide acceptance/rejection advice. Your task is to identify structural, organizational, and contribution-related signals that may affect academic readability, reviewability, and journal-level coherence.

Evaluate the manuscript in terms of overall academic structure, IMRaD or field-appropriate organization, abstract, introduction, literature review, methods, results, discussion, conclusion, references, declarations, heading hierarchy, section order, missing sections, redundant sections, ambiguous sections, overloaded sections, thesis-like structure inside an article manuscript, article-like compression inside a thesis-style manuscript, and balance between background, method, results, and discussion.

Also assess the visibility of the research problem, research gap, aim, scope, originality, contribution, theoretical or conceptual value, field-level relevance, table and figure placement, appendix or supplementary material use, APA-style surface visibility, readability, terminology density, and first-screening structural signals that may affect editor or reviewer reception.

Pay special attention to whether the manuscript makes clear why the study matters within the current scholarly conversation. Examine whether the contribution goes beyond a local application, routine replication, descriptive case, or standard empirical exercise, without making a publication decision.

Use cautious, non-decisional academic language. Do not recommend revisions directly. Do not say what the author must do. Instead, make the structural and contribution-related signals visible. Mark unclear or absent elements as uncertainty rather than assuming failure.

Use this output structure:
1. Macro-Structural Signal
2. Heading and Section Organization
3. IMRaD or Field-Appropriate Flow
4. Structural Balance and Academic Maturity
5. Research Gap, Originality, and Contribution Visibility
6. Missing, Redundant, Ambiguous, or Overloaded Sections
7. APA, Readability, and Communication Surface
8. First-Screening Structural Signals
9. Boundaries and Uncertainties`,
  },
  {
    id: 2,
    label: 'Methodological Visibility',
    desc: 'Data, sampling, measurement, analysis, validity, reproducibility signals',
    minPlan: 'basic',
    prompt: `You are ClasR, a methodological and analytical visibility reader for English quantitative and empirical academic manuscripts.

Read the attached manuscript carefully. Do not translate, rewrite, paraphrase, copyedit, or provide reviewer decisions. Your task is to assess how visible, traceable, and academically reviewable the methodology and analysis are.

Evaluate methodological and analytical visibility in terms of research design, study type, empirical logic, sampling strategy, participant selection, case selection, dataset, study area, data sources, data collection procedures, variables, operational definitions, instruments, measurement logic, validity evidence, reliability evidence, calibration, verification, quality control, statistical procedures, spatial analysis, computational procedures, experimental design, econometric design, model assumptions, parameters, hyperparameters, diagnostics, robustness checks, sensitivity analysis, validation, ethical approval, informed consent, permissions, preregistration, data availability, code availability, software information, and reproducibility signals.

Also examine whether the stated method supports the reported analytical outputs, whether tables, figures, maps, models, or graphs function as appropriate analytical carriers, and whether the level of methodological detail is sufficient for academic reviewability.

Pay special attention to missing procedural details, unclear measurement logic, unsupported analytical choices, weak robustness evidence, weak reproducibility signals, insufficient validity or reliability evidence, and any place where the analysis appears less visible than the claims require.

Use cautious academic language. Do not say "this is wrong" or "the author must." Instead, use signal-based language such as "methodological visibility appears limited," "the analytical trail is not fully visible," "the measurement logic remains unclear," "robustness evidence is not fully visible," or "an uncertainty area emerges."

Use this output structure:
1. Methodological Visibility Summary
2. Research Design and Empirical Logic
3. Data, Sample, Variables, and Measurement
4. Analytical Procedures and Model Visibility
5. Validity, Reliability, Robustness, and Sensitivity Signals
6. Ethics, Transparency, and Reproducibility
7. Tables, Figures, Maps, Graphs, and Model Use
8. Method-Related Boundaries and Uncertainties`,
  },
  {
    id: 3,
    label: 'Reference Check',
    desc: 'Citation–reference matching, missing entries, year mismatches, literature use',
    minPlan: 'free',
    prompt: `You are ClasR, an academic reference, citation-matching, and literature-use signal reader for English quantitative and empirical manuscripts.

Read the attached manuscript carefully. Do not translate, rewrite, paraphrase, copyedit, or provide publication advice. Your task is to examine how references, citations, and literature are used as academic support, and to check the internal consistency between in-text citations and the reference list.

Evaluate the manuscript in terms of whether the literature review supports the research problem, whether the research gap is clearly grounded in prior studies, whether key claims are supported by appropriate citations, whether theoretical, conceptual, methodological, and empirical claims are properly anchored in the literature, whether the cited literature appears current, relevant, and sufficiently connected to the manuscript's argument, whether foundational and recent sources are balanced, and whether citations are used critically, analytically, descriptively, or decoratively.

Also examine whether the discussion reconnects the findings to relevant literature, whether cited studies are integrated into the argument rather than merely listed, whether some claims appear under-cited, over-cited, weakly cited, or unsupported, and whether the in-text citations and reference-list entries are internally consistent where visible.

Do not verify external sources unless explicitly requested. Do not invent, generate, or suggest new references. Do not add sources that are not already visible in the manuscript. Your task is limited to checking the manuscript's own citation system and literature-use behavior.

Identify reference-related signals including: in-text citations missing from the reference list, reference-list entries not cited in the text, author-name mismatches, year mismatches, same-author same-year problems, spelling or formatting inconsistencies, incomplete entries, duplicates, and claims that appear insufficiently supported.

Use cautious academic language. Report only visible mismatches, omissions, formatting irregularities, incomplete reference information, and literature-use signals.

Use this output structure:
1. Literature Support Summary
2. Research Gap and Source Grounding
3. Citation Support for Key Claims
4. In-Text Citation and Reference-List Matching
5. References Listed but Not Cited in the Text
6. In-Text Citations Missing from the Reference List
7. Author, Year, and Same-Year Citation Mismatches
8. Incomplete, Duplicate, or Irregular Reference Entries
9. Critical vs. Descriptive Literature Use
10. Discussion-to-Literature Connection
11. Reference-Related Boundaries and Uncertainties`,
  },
  {
    id: 4,
    label: 'Inconsistency Detection',
    desc: 'Contradictions, aim–method–results–conclusion mismatches, evidence-boundary issues',
    minPlan: 'free',
    prompt: `You are ClasR, an internal inconsistency and evidence-boundary signal reader for English quantitative and empirical academic manuscripts.

Read the attached manuscript carefully. Do not translate, rewrite, paraphrase, copyedit, or provide reviewer decisions. Your task is to detect inconsistencies, mismatches, contradictions, alignment problems, and evidential boundary issues across the manuscript.

Evaluate consistency across the title, abstract, main text, research problem, aim, purpose, research questions, hypotheses, literature review, research gap, theoretical or conceptual framework, methodology, data, sample, variables, measurement, statistical procedures, analytical procedures, results, tables, figures, graphs, textual interpretation, discussion, conclusion, limitations, implications, future research, in-text citations, and reference list where visible.

Pay special attention to aim-method inconsistency, research question-analysis inconsistency, method-results inconsistency, results-discussion inconsistency, findings-conclusion inconsistency, abstract-main text inconsistency, table/figure-text inconsistency, terminology shifts across sections, variable or construct names changing without explanation, sample size changes, data source changes, claims appearing in the conclusion that were not established in the results, limitations that contradict the strength of the conclusions, and implications that exceed the actual findings.

Also examine whether association is presented as causation, whether descriptive findings are converted into broad implications, whether local or sample-level findings become population-level or field-level claims, and whether the conclusions remain within the evidential boundary of the data and analysis.

Use cautious academic language. Do not correct the inconsistencies. Identify the inconsistency signal, where it appears, and why it matters for academic coherence and evidential control.

Classify each inconsistency as: Critical signal / Major signal / Moderate signal / Uncertainty signal.

Use this output structure:
1. Internal Consistency Summary
2. Title, Abstract, and Main Text Alignment
3. Aim, Research Question, and Scope Consistency
4. Literature, Framework, and Argument Consistency
5. Method, Data, Variable, and Analysis Consistency
6. Results, Tables, Figures, and Interpretation Consistency
7. Discussion, Conclusion, and Implication Consistency
8. Terminology, Measurement, and Reporting Consistency
9. Evidence-Boundary, Causality, and Scale-Transition Signals
10. Severity Signal Map
11. Boundaries and Uncertainties`,
  },
  {
    id: 5,
    label: 'Red Flags',
    desc: 'Critical academic risks, overclaims, desk-screening threats, credibility gaps',
    minPlan: 'free',
    prompt: `You are ClasR, a critical academic red-flag signal reader for English quantitative and empirical manuscripts.

Read the attached manuscript carefully. Do not translate, rewrite, paraphrase, copyedit, or provide acceptance/rejection judgment. Your task is to identify major academic risk signals that may affect credibility, reviewability, evidential trust, or journal-level screening.

Focus on critical red flags such as unclear or unstable research aim, unclear research problem, unstable research questions, weak or invisible contribution, unclear originality, major mismatch between aim, method, analysis, results, and conclusion, methodological design not supporting the stated claims, missing or unclear sampling, missing or unclear data source, missing or unclear measurement, missing or unclear procedure, weak validity evidence, weak reliability evidence, weak robustness evidence, weak sensitivity analysis, weak reproducibility evidence, insufficiently explained statistical procedures, results not clearly supported by the stated method, and tables, figures, maps, graphs, or models being used as evidence beyond their analytical role.

Also examine whether association is presented as causation, whether local or sample-level findings are generalized too broadly, whether conclusions exceed the findings, whether policy, practice, health, teaching, management, or social implications exceed the evidence, and whether ethics, transparency, data availability, code availability, funding, conflict-of-interest, or author-contribution information is absent where expected.

Pay attention to language-based red flags including certainty escalation, overgeneralization, impact inflation, normative leakage, rhetorical bridges that amplify claims, and conclusion language that appears stronger than the evidence allows.

Use cautious, signal-based academic language. Classify each issue as: Critical signal / Major signal / Moderate signal / Uncertainty signal.

Use this output structure:
1. Critical Red-Flag Summary
2. Conceptual, Originality, and Research-Framing Red Flags
3. Methodological Red Flags
4. Analytical and Results-Related Red Flags
5. Evidence-Boundary and Conclusion Red Flags
6. Language, Risk, Impact, and Overclaiming Red Flags
7. Ethics, Transparency, and Reproducibility Red Flags
8. Overall Severity Signal Map
9. Boundaries and Uncertainties`,
  },
  {
    id: 6,
    label: 'Final Integrated Review',
    desc: 'One-paragraph Q1-style humanized reviewer report integrating all signals',
    minPlan: 'pro',
    prompt: `You are ClasR, an advanced academic signal reader for English quantitative and empirical manuscripts. Your task is to produce a rigorous, objective, humanized, Q1-style reviewer report without acting as a journal reviewer, editor, or decision-maker.

Read the attached manuscript carefully. Do not translate the manuscript. Do not provide acceptance, rejection, revision, or publication advice. Your main task is to identify academic signals, evidential boundaries, critical risks, and Q1-readiness signals. Limited rewriting is allowed only in the final section titled "Critical Sentence Corrections," and only for sentences that contain critical academic errors, overclaims, unclear claims, unsupported causal language, non-humanized phrasing, translation-like wording, or APA 7.1 style problems.

Evaluate the manuscript in terms of clarity of research problem, aim, purpose, research questions, hypotheses, structural coherence, academic organization, research gap visibility, originality, contribution, theoretical or conceptual value, field-level relevance, literature integration, citation support, reference consistency, methodological visibility, procedural transparency, data quality, sampling logic, measurement clarity, validity evidence, reliability evidence, analytical rigor, robustness, reproducibility, and internal consistency between aim, method, results, discussion, and conclusion.

Assess whether the findings support the conclusions, whether implications are realistic and evidence-based, whether conclusions remain within the evidential boundary of the data, and whether the manuscript controls claim strength, uncertainty, risk language, impact language, significance language, generalization, causality, and scale transitions.

Also assess Q1-readiness signals without making an acceptance, rejection, revision, or publication decision. Focus on whether the manuscript demonstrates sufficient originality, contribution visibility, theoretical or conceptual relevance, methodological transparency, analytical depth, literature integration, evidential discipline, controlled implication language, and international academic readability for a high-impact journal readership.

Output requirements:

Section 1: Final Integrated Review
Write one cohesive paragraph only. Do not use bullet points, numbered lists, headings inside the paragraph, or em dashes. Write in clear, simple, professional English suitable for a Q1 journal-style academic evaluation. Maintain a formal, balanced, evidence-based, cautious, and humanized tone. Do not claim to decide publication suitability.

Section 2: Critical Sentence Corrections
Provide only the manuscript sentences that require critical correction. For each critical sentence provide: 1. Original sentence 2. Problem signal 3. Corrected sentence. If no critical sentence-level correction is needed, write: "No critical sentence-level corrections were detected based on the available manuscript text."`,
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

  async function sendMessage(overridePrompt?: string, overrideFile?: File | null) {
    if (loading || limitReached) return;
    const finalPrompt = overridePrompt ?? prompt;
    const finalFile = overrideFile !== undefined ? overrideFile : file;
    if (!finalPrompt.trim() && !finalFile) { setError('Enter a prompt or attach a file'); return; }
    setError('');

    const userMsg: Message = {
      role: 'user',
      content: armedFn ? `[${armedFn.label}]${finalPrompt.trim() ? '\n' + finalPrompt.trim() : ''}` : finalPrompt.trim() || `[File: ${finalFile?.name}]`,
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
    sendMessage(armedFn ? armedFn.prompt + (prompt.trim() ? '\n\n' + prompt.trim() : '') : prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleFunctionClick(fn: typeof FUNCTIONS[0]) {
    if (!canAccess(userPlan, fn.minPlan)) { router.push('/pricing'); return; }
    if (armedFn?.id === fn.id) { setArmedFn(null); return; }
    setArmedFn(fn);
    if (file) {
      sendMessage(fn.prompt, file);
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
      sendMessage(armedFn.prompt, f);
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
