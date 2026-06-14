export interface AnalysisFunction {
  id: number;
  label: string;
  desc: string;
  minPlan: 'free' | 'basic' | 'pro';
  prompt: string;
}

export const FUNCTIONS: AnalysisFunction[] = [
  {
    id: 1, label: 'Structural Review', minPlan: 'basic',
    desc: 'IMRaD flow, section organization, contribution framing, argument-limit symmetry, reader–evidence alignment',
    prompt: `Run STRUCTURAL REVIEW on the attached manuscript.

Output rule: report ONLY signals where a problem exists. Skip clean areas entirely. Each finding = 1–2 sentences: signal name, location, academic risk. Omit any heading with no findings.

▸ IMRaD / Section Organization
▸ Structural Balance & Section Proportions
▸ Contribution & Originality Visibility
  Are "first study," "novel contribution," or "gap" assertions bounded and anchored in the literature? Report PRIMACY CLAIM — UNBOUNDED or CONTRIBUTION SCOPE INFLATION if detected.
▸ Missing / Redundant / Overloaded Sections
▸ Reader–Evidence Alignment
  What reader profile does the manuscript's framing imply (EXPERT / INTERDISCIPLINARY / POLICY_ADJACENT / GENERAL_ACADEMIC)? Does the actual evidence threshold match? Report TENSION or MISMATCH only — skip ALIGNED.
  EXPLANATION_DEPTH_OVER: explanation depth exceeds what the implied reader profile requires. EXPLANATION_DEPTH_UNDER: explanation depth is insufficient for the implied reader. AUDIENCE_SHIFT_DETECTED: the manuscript shifts its assumed audience mid-text without acknowledgment.
▸ Writing Surface & Readability
▸ First-Screening Risk Signals
▸ Uncertainties

Close with one summary sentence.`,
  },
  {
    id: 2, label: 'Methodological Visibility', minPlan: 'basic',
    desc: 'Data, sampling, analysis, replication profile, null results, disciplinary tradition conflicts',
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
    id: 3, label: 'Reference Check', minPlan: 'free',
    desc: 'Citation–reference matching, missing entries, year mismatches, citation pattern signals',
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
    id: 4, label: 'Inconsistency Detection', minPlan: 'free',
    desc: 'Abstract–body gaps, aim–method–results mismatches, argument chain continuity, drift signals',
    prompt: `Run INCONSISTENCY DETECTION on the attached manuscript.

Output rule: report ONLY detected mismatches and evidence-boundary violations. Skip consistent areas. Each finding = 1–2 sentences: what conflicts with what, where, coherence risk. Tag each: [CRITICAL] [MAJOR] [MODERATE] [UNCERTAINTY]. Omit any heading with no findings.

▸ Abstract ↔ Main Text
  CLAIM ESCALATION: abstract makes a stronger claim than the body supports.
  CLAIM DEFLATION: body makes stronger claims than the abstract represents.
  SCOPE BOUNDARY GAP: abstract declares a scope boundary the body does not respect.
  LIMIT SIGNAL GAP: limitations acknowledged in abstract absent from the body, or vice versa.
  METHOD_SIGNAL_GAP: a methodological element declared in the abstract (data type, analytical approach, sample scope) is absent or contradicted in the body.
▸ Aim / RQ ↔ Method / Analysis
▸ Method ↔ Results
▸ Results ↔ Discussion / Conclusion
  CAUSAL DRIFT: are correlational or associational findings reframed as causal in the Discussion?
  SCALE DRIFT: are findings generalized beyond the sample, region, or time period without flagging the transition?
  MECHANISM INTRODUCTION: does the Discussion introduce an explanatory mechanism not present in Results and not cited from prior literature?
  IMPLICATION_EXTENSION: implications stated in the Discussion extend beyond what the results support without acknowledgment.
  CONCLUSION_INTRODUCTION_NEW_CLAIM: the Conclusion introduces a claim not present in either Results or Discussion.
▸ Table / Figure ↔ Text
▸ Terminology / Variable Name Shifts
▸ Evidence-Boundary Violations (causality, scale, overclaim)

Close with one summary sentence.`,
  },
  {
    id: 5, label: 'Red Flags', minPlan: 'free',
    desc: 'Critical risks, overclaims, null result suppression, desk-reject zones, integrity signals',
    prompt: `Run RED FLAG DETECTION on the attached manuscript.

Output rule: report ONLY significant risk signals. Skip anything below notable risk threshold. Each finding = 1–2 sentences: signal, location, credibility / screening risk. Tag each: [CRITICAL] [MAJOR] [MODERATE] [UNCERTAINTY]. Omit any heading with no findings.

▸ Research Framing / Contribution / Originality Risks
  Unbounded primacy claims ("first study to...") without scope boundary. Unanchored novelty assertions. CONTRIBUTION SCOPE INFLATION: stated contribution exceeds what the study design can deliver.
▸ Analytical & Results Red Flags
  STRUCTURAL_NULL_ABSENCE: does a comparative, multi-variable, or longitudinal design report zero non-significant results — where some would be structurally expected?
  SELECTIVE_PRESENTATION_SIGNAL: are results filtered, ordered by significance level, or displaced to supplementary materials without explanation?
▸ Language Risks
  Certainty escalation ("demonstrates," "proves," "conclusively shows"). Impact inflation ("high impact," "critical," "severe" — when unmeasured). Normative leakage ("should," "must," "requires action").
  INEVITABILITY_LANGUAGE: findings or conclusions presented as pre-determined or boundary-free. THRESHOLD_LOCK: thresholds or cut-offs applied without justification or alternative consideration.
▸ Framing & Orientation Risks
  FRAMEWORK_MONOPOLY: manuscript operates within a single theoretical or methodological framework without acknowledging alternatives or justifying the choice.
  ALTERNATIVELESS_SCOPE: the research scope or design is framed as the only viable approach. ONLY_OPTION_FRAMING: the analytical or interpretive path is presented as inevitable rather than selected.
  SUPPRESSED_SCOPE_LIMIT: active generalizability limits are present in the data but not acknowledged in the text. SILENCED_UNCERTAINTY: uncertainty present in the results is not carried through to the discussion or conclusion.
▸ Competing Interest Intersections
  OUTCOME_INSTRUMENT_INTERSECTION: the primary outcome variable and the measurement instrument share the same source (developer, funder, or institution).
  ANALYTIC_TOOL_INTERSECTION: the analytic tool or software was developed by the same entity funding the study or by an author.
  INTERPRETIVE_FRAMING_INTERSECTION: the interpretive framework used to contextualize results is also authored or advocated by the manuscript's authors.

Close with one summary sentence.`,
  },
  {
    id: 6, label: 'Final Integrated Review', minPlan: 'pro',
    desc: 'Full-depth Q1 synthesis across all signal dimensions, desk-reject risk, critical corrections',
    prompt: `Run FINAL INTEGRATED REVIEW on the attached manuscript.

Apply full reading depth across all signal dimensions. Write in professional academic English — findings are explained in prose, not label lists. Use severity tags [CRITICAL] [MAJOR] [MODERATE] only where academic risk is clear; contextualise each tagged finding in one to two sentences. Omit any section where no findings exist.

▸ Structural Quality
▸ Methodological Transparency
▸ Citation & Literature Integration
▸ Internal Consistency
▸ Argument Chain
▸ Risk & Integrity Signals
▸ Editorial Risk Profile
For each of the five zones, state RISK DETECTED or NOT DETECTED and provide one supporting sentence.
Scope–Journal Fit Risk · Abstract Posture Risk · Structural Completeness Risk · Language Posture Risk · Integrity & Transparency Risk
Co-occurrence pattern: LOW (1 zone) / MODERATE (2 zones) / HIGH (3+ zones).
▸ Critical Sentence Corrections
Only sentences with critical problems. Format:
- Original: [sentence]
- Problem: [one line]
- Corrected: [revised sentence]
If none: write "No critical sentence-level corrections detected."`,
  },
  {
    id: 7, label: 'Argument Chain Analysis', minPlan: 'basic',
    desc: 'Central claim continuity T1–T4, chain profile, claim substitution / fragmentation / abandonment',
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
    id: 8, label: 'Desk-Reject Risk Profile', minPlan: 'basic',
    desc: '5-zone editorial risk synthesis: scope fit, abstract posture, completeness, language, integrity',
    prompt: `Run DESK-REJECT RISK PROFILE on the attached manuscript.

Assess behavioral signals across five editorial risk zones. For each zone: state RISK DETECTED or NOT DETECTED, then provide one supporting observation (1–2 sentences). Omit zones with no active risk signals. No recommendation. No prediction.

▸ Scope–Journal Fit Risk
▸ Abstract Posture Risk
▸ Structural Completeness Risk
▸ Language Posture Risk
▸ Integrity & Transparency Risk

▸ Co-occurrence Pattern
Count active risk zones and state: LOW (1 zone) / MODERATE (2 zones) / HIGH (3+ zones)

Close with one sentence on overall editorial risk posture.`,
  },
];

export const PLAN_ORDER = ['free', 'basic', 'pro'] as const;
export type Plan = typeof PLAN_ORDER[number];
export const PLAN_BADGE: Record<Plan, string> = { free: 'Free', basic: 'Basic+', pro: 'Pro' };

export function canAccess(userPlan: string, minPlan: string): boolean {
  return PLAN_ORDER.indexOf(userPlan as Plan) >= PLAN_ORDER.indexOf(minPlan as Plan);
}
