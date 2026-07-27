'use strict';

/**
 * TEK doğruluk kaynağı (single source of truth) for the CLASR v2 signal
 * taxonomy. Everything downstream — the extraction schema, the system
 * prompt catalogue, and the deterministic scorer — reads from this file.
 *
 * *** SCHEMA-SIZE ISSUE — FOUND, FIXED, THEN FIXED BETTER (2026-07-26) ***
 * Anthropic Structured Outputs rejects the extraction schema once a single
 * `signal_id` enum grows past a threshold confirmed by live bisection to
 * sit between 100 and 120 entries: "Schema is too complex for compilation."
 * (400 invalid_request_error). This was invisible to every `node -e` smoke
 * test in this file's phase history because none of them called the live
 * API — extraction was last exercised live at 36 signals (end of Phase 3),
 * under the threshold.
 *
 * FIRST FIX (superseded, no longer in code): batched extraction — one
 * Structured Outputs call per ~80-signal chunk, run in parallel, merged in
 * extractor.js. It worked (re-verified live end-to-end) but multiplied API
 * calls with taxonomy size.
 *
 * CURRENT FIX: after auditing a parallel Python implementation of the same
 * kit-derivation problem (backend/Design/clasr code.zip, reviewed
 * 2026-07-26), signal_id was changed from a compiled `enum` to a plain
 * string whose allowed values are printed in the schema field's
 * `description` (schema.js) and in the system prompt (extractor.js), with
 * normaliseSignalId() below repairing case/hyphen drift in code afterward —
 * exactly the repair structured outputs already required even under the
 * enum, since enum casing was never guaranteed either. No batching, no
 * cardinality ceiling, one API call regardless of taxonomy size. The
 * batching machinery (signalIdBatches, MAX_SIGNALS_PER_EXTRACTION_BATCH)
 * was removed from this file as dead code once this landed — extractor.js
 * and schema.js no longer reference it. Re-verified live end-to-end after
 * the switch.
 *
 * PHASED ROLLOUT. This replaces the old ad-hoc 23-signal starter set with
 * a verbatim-grounded port, kit by kit, of the real CLASR-EN taxonomy.
 * Not all ~230 signals are here yet — this is an explicit phased rollout,
 * not an oversight. See PHASE LOG below for what's in and what's deferred
 * (and why).
 *
 * PHASE 1 (2026-07-25) — SECTION 4 (ARGUMENTATION), all 21 signals.
 * Source: backend/src/prompts/kits/40_CLASR_ARGUMENT_INTEGRITY_KIT_v1_2.txt,
 * read verbatim in full. Covers the complete A1-A5 "Argument Architecture
 * Audit".
 *
 * PHASE 2 (2026-07-25) — SECTION 3 (METHODOLOGICAL), partial: 11 signals.
 * Source: backend/src/prompts/kits/09_CLASR_CALIBRATION_DEEP_KIT_v1_5.txt
 * §1.5, §1.9, §1.10, §1.11, read verbatim in full.
 *
 * Two things in Kit 09 needed a product decision, not just data entry —
 * both were raised to and answered by the user on 2026-07-25:
 *
 *   - Q-VARIANT GAP. §1.10's three signals (EFFECT_SIZE_ABSENT_FROM_
 *     SIGNIFICANCE, CI_ABSENT_FROM_PRIMARY_ANALYSIS, MULTIVARIATE_ANALYSIS_
 *     ABSENT) have severity that's explicitly Q1/Q2/Q3 journal-tier
 *     dependent in the source kit, but routes/analyze-v2.js has no
 *     q_variant parameter (the old v1 /analyze endpoint has one, v2
 *     doesn't). Decision: port at a FIXED Q1 (highest-sensitivity) tier
 *     rather than build Q-variant support into v2 right now. This is a
 *     deliberate simplification, not an oversight — if v2 ever needs
 *     Q-variant-aware severity, these three entries are where to start.
 *   - PHYSICS SIGNALS SCOPE. §1.11's four signals (GAUSSIAN_BEAM_
 *     ASSUMPTION_NOT_VALIDATED, PSF_SPATIAL_INVARIANCE_NOT_VALIDATED,
 *     SHOT_TO_SHOT_STABILITY_NOT_INDEPENDENTLY_VALIDATED, PARAMETRIC_
 *     ASSUMPTION_NOT_VALIDATED) are written in accelerator-physics-specific
 *     language (the kit text cites "AWAKE/CERN", "CookeEtAl_2024",
 *     scintillating screens, beam-matrix reconstruction). Decision:
 *     these ARE part of the general CLASR-EN taxonomy — confirmed by the
 *     user, not assumed — they simply only fire on manuscripts where the
 *     relevant method appears. Caveat: they depend on Kit 38's
 *     field-sensitivity gating (SUPPRESS/AMPLIFY/RECLASSIFY by field) for
 *     proper calibration, which is not ported/designed as code yet, so
 *     until that lands they will fire on any manuscript using these
 *     methods without field-specific threshold adjustment. Ported at a
 *     fixed Q1 tier for the same reason as the §1.10 group above.
 *
 * Still deliberately NOT ported (architectural, not a decision the user
 * needed to make yet):
 *   - §1.12 (PARAMETER_VALUE_DIVERGENCE / DIRECTIONAL_BIAS_UNEXPLAINED):
 *     the kit's own label template is "WAIST_POSITION_DIVERGENCE_ACROSS_
 *     METHODS_UNADDRESSED (or equivalent parameter label)" — i.e. the
 *     signal_id is meant to be generated per-parameter at read time. The
 *     current schema (schema.js) requires a fixed enum of signal_ids for
 *     Anthropic structured outputs; a dynamically-named signal_id cannot
 *     fit that shape without a schema redesign (e.g. a generic signal_id
 *     plus a free-text parameter field).
 *   - The companion signal ASSUMPTION_SCOPE_EXTENSION_UNACKNOWLEDGED
 *     (§1.13, MODERATE / secondary-result variant of
 *     ASSUMPTION_VALIDITY_SCOPE_MISMATCH, already ported in Phase 1) was
 *     left out because the pair is dual-homed (primary SECTION 3, argument
 *     consequence SECTION 4 A3) and the current data shape only holds one
 *     `section` per signal — same known limitation noted in Phase 1's
 *     ASSUMPTION_VALIDITY_SCOPE_MISMATCH entry below.
 *
 * PHASE 3 (2026-07-25) — SECTION 3 (METHODOLOGICAL), extended: +4 signals.
 * Source: backend/src/prompts/kits/39_CLASR_METHODOLOGICAL_RHETORIC_KIT_v1_0.txt,
 * read verbatim in full. All 4 catalogued signals (REPRESENTATIVENESS_
 * TRANSFER, VISUAL_CHECK_AS_VALIDATION, DISTRIBUTIONAL_CONFIRMATION_BIAS,
 * COMPLEMENTARITY_REFRAMING) ported directly — no product decision needed
 * here. The kit states plainly it is field-independent by design ("These
 * patterns are not field-specific... appear across quantitative
 * disciplines"), and Q-variant only modulates reporting sensitivity/
 * threshold in this kit, not the severity value itself (unlike kit 09
 * §1.10/§1.11), so the Q-VARIANT GAP issue above doesn't apply. The kit
 * gives no explicit severity words (no HIGH/MEDIUM/LOW anywhere) for any
 * of its 4 signals, so all four base_severity values are informed
 * placeholders derived from the kit's own relative-significance language
 * (see per-signal comments below) rather than a transcribed value.
 * Each signal is secondary-homed in SECTION 4 (Argumentation) per the
 * kit's own "Primary SECTION 3 / Secondary SECTION 4" declaration — noted
 * in comments, not modeled as a second `section`, same known data-shape
 * limitation as elsewhere in this file.
 *
 * PHASE 4 (2026-07-26) — SECTION 0 (MACRO FRAME): +8 signals.
 * Sources: backend/src/prompts/kits/19_CLASR_INTEGRITY_SIGNAL_KIT_v1_0.txt
 * and backend/src/prompts/kits/21_CLASR_ABSTRACT_BODY_COHERENCE_KIT_v1_0.txt,
 * both read verbatim in full (the "_CLASR_" filenames, not the sibling
 * "_EN_" files of the same kit number — confirmed against kitAssembler.js's
 * KIT_ORDER, which is the only authoritative list of which physical file is
 * actually live).
 *
 * NON-EVALUATIVE SEVERITY DECISION (self-resolved, not escalated — this is
 * a direct transcription of explicit kit text, not a judgment call). Both
 * kit 19 and kit 21 state, verbatim and identically in structure: "No
 * judgment. No recommendation. Signal + location + label only," and kit
 * 19's own design principle section says outright "This kit reads
 * declarations as structural facts. It does not interpret motivation or
 * intent" (and kit 21's equivalent: "This kit reads the gap, not the
 * quality of either part"). Neither kit contains any HIGH/MEDIUM/LOW
 * severity language anywhere — that silence is intentional, not a gap to
 * fill with a placeholder. All 8 signals below carry base_severity: 0.
 * This is a deliberate architectural choice, not a missing calibration:
 * giving these a nonzero severity would let them move raw_score / risk_band
 * in scorer.js, which contradicts the kits' explicit "not a verdict"
 * design the same way a cross-axis cooccurrence rule would have
 * contradicted Kit 40's "does not cascade severity" rule (see CASCADE,
 * NOT SEVERITY below). Signals still surface in scored_signals for
 * reporting/UI purposes — score() does not special-case them, it just
 * naturally contributes 0.
 *
 * PHASE 5 (2026-07-26) — SECTION 1 (AIM & SCOPE), full primary coverage:
 * +18 signals. Sources: kits 16 (ORIENTATION LENS KIT v1.0), 23
 * (CONTRIBUTION FRAMING KIT v1.0), 28 (READER MODEL KIT v1.0), each read
 * verbatim in full.
 *
 * Kit 16 (5 signals: ONLY_OPTION_FRAMING, ALTERNATIVELESS_SCOPE,
 * INEVITABILITY_LANGUAGE, FORECLOSED_COMPARISON, THRESHOLD_LOCK) follows
 * the same explicit "No judgment. No recommendation" non-evaluative
 * pattern as kits 19/21 in Phase 4 — base_severity: 0 for the same reason,
 * see NON-EVALUATIVE SEVERITY DECISION above.
 *
 * Kit 23 (8 signals) is the FIRST ported kit with its own explicit,
 * numbered LOW/MEDIUM/HIGH "Signal Intensity Calibration" section (§4),
 * distinct from the non-evaluative kits — it is not a "no judgment" kit,
 * it grades severity by name. That calibration text is quoted directly:
 * "LOW -> bounded claim, anchored in literature, proportionate to scope";
 * "MEDIUM -> partially bounded, gap asserted with limited support";
 * "HIGH -> unbounded, unanchored, or inflated relative to study design."
 * Each of the kit's 8 catalogued label variants was matched against that
 * text: PRIMACY_CLAIM_BOUNDED / NOVELTY_ASSERTION_ANCHORED /
 * GAP_ASSERTION_SUPPORTED -> LOW (1); GAP_ASSERTION_UNSUPPORTED -> MEDIUM
 * (3, exact textual match: "gap asserted with limited support");
 * PRIMACY_CLAIM_UNBOUNDED / NOVELTY_ASSERTION_UNANCHORED /
 * CONTRIBUTION_SCOPE_INFLATION -> HIGH (4, exact textual match:
 * "unbounded", "unanchored", "inflated relative to study design").
 * KNOWLEDGE_BOUNDARY_ASSERTION has no bounded/unbounded variant and no
 * direct calibration-text match -> MEDIUM (3) placeholder, TODO calibrate.
 *
 * Kit 28 outputs a multi-dimensional positioning report (reader profile x
 * evidence threshold x alignment x explanation depth x audience shift),
 * not a flat list of independently flaggable defect events. The raw
 * READER_PROFILE_[EXPERT|INTERDISCIPLINARY|POLICY_ADJACENT|
 * GENERAL_ACADEMIC] classification is descriptive context, not itself a
 * signal of a problem (an EXPERT-profile manuscript is not more "wrong"
 * than a GENERAL_ACADEMIC one) — and its label is templated per type, the
 * same schema-incompatible shape as kit 09 §1.12 (see Phase 2 note above).
 * Only the kit's actual alignment-gap and drift states, which ARE defect
 * signals, are ported: READER_EVIDENCE_TENSION, READER_EVIDENCE_MISMATCH
 * (kit: "structurally incompatible", read as more severe than TENSION's
 * "positioning ambiguity"), EXPLANATION_DEPTH_OVER,
 * EXPLANATION_DEPTH_UNDER, AUDIENCE_SHIFT_DETECTED. None of these carry
 * explicit HIGH/MEDIUM/LOW text in kit 28 itself, so all five are informed
 * placeholders, TODO calibrate.
 *
 * PHASE 6 (2026-07-26) — SECTION 2 (CONCEPTUAL / THEORETICAL FRAMEWORK),
 * full primary coverage: +10 signals. Sources: kits 20 (CITATION BEHAVIOR
 * KIT v1.0), 27 (INTERDISCIPLINARY TENSION KIT v1.0), 33 (CONCEPT-EVIDENCE
 * BRIDGE KIT v1.0), each read verbatim in full.
 *
 * Kit 20 (5 signals: UNSUPPORTED_CLAIM_ZONE, CONFIRMATORY_CITATION_PATTERN,
 * ELEVATED_SELF_CITATION_DENSITY, REFERENCE_AGE_SIGNAL,
 * FIELD_CONCENTRATION_SIGNAL) is another explicit "No judgment. No
 * recommendation" kit -> base_severity: 0, same as Phase 4/5's
 * non-evaluative kits.
 *
 * Kit 27 is also non-evaluative, but only 2 of its states were ported as
 * signal_ids: TENSION_SUPPRESSED and ASSUMPTION_INVISIBILITY. The kit's
 * SINGLE_TRADITION / MULTIPLE_TRADITIONS / HYBRID tradition profile and
 * its TRADITION_CONFLICT_DETECTED / TENSION_ACKNOWLEDGED states were
 * deliberately excluded — same reasoning as Phase 5's exclusion of raw
 * READER_PROFILE classification: these are descriptive context or an
 * explicitly non-problematic outcome (an acknowledged conflict is, by the
 * kit's own design, the resolved/expected case, not a defect), not
 * independently flaggable defect events. TENSION_SUPPRESSED is the actual
 * risk pattern (conflict exists AND is not acknowledged) and subsumes
 * TRADITION_CONFLICT_DETECTED for scoring purposes.
 *
 * Kit 33 catalogues 4 named FLOATING-concept patterns, but one of them —
 * OPERATIONALIZATION_GAP ("concept defined but never connected to the
 * actual analytical operations of the study") — is the same canonical
 * signal_id already ported in Phase 1 from kit 40 A3 ("key construct
 * measured by proxy that does not fully capture the construct"). The
 * scratchpad's cross-kit research explicitly flags these as the same
 * signal recognized from two angles, not two different signals — so no
 * second OPERATIONALIZATION_GAP entry was added; the existing Phase-1
 * entry stands as-is, this is just corroborating documentation. Only the
 * 3 genuinely new patterns are ported: DECORATIVE_ABSTRACTION,
 * CLAIM_CARRYING_FLOAT, BORROWED_AUTHORITY_CONCEPT. Kit 33's own severity
 * language: "FLOATING is the high-signal state" (all 3 are FLOATING-state
 * patterns), and Q1 calibration explicitly says "BORROWED_AUTHORITY_
 * CONCEPT flagged at HIGH sensitivity" and "CLAIM_CARRYING_FLOAT noted as
 * potential desk-reject signal" -> both HIGH (4). DECORATIVE_ABSTRACTION
 * is comparatively de-prioritized in the kit's own Q3 calibration ("noted
 * only if claim-carrying") -> placeholder MEDIUM-low (2), TODO calibrate.
 *
 * PHASE 7 (2026-07-26) — SECTION 5 (NUMERICAL / SPATIAL BEHAVIOR), primary
 * coverage: +7 signals. Source: kit 26 (NEGATIVE RESULT VISIBILITY KIT
 * v1.0), read verbatim in full. Non-evaluative kit -> base_severity: 0,
 * same pattern as Phase 4-6.
 *
 * As with Phase 5/6's exclusion of explicitly "good"/expected states
 * (GROUNDED, TENSION_ACKNOWLEDGED), this kit's NULL_VISIBLE_INTEGRATED and
 * HYPOTHESIS_REJECTION_VISIBLE were deliberately NOT ported — the kit
 * defines these as the transparent/expected handling, not a defect to
 * flag. The kit's NULL_DEFLECTED umbrella label was split into its 4
 * named subtypes as distinct signal_ids (NULL_DEFLECTION_SURPRISE_FRAMING
 * / _FUTURE_DEFLECTION / _PIVOT_SUPPRESSION / _SUPPLEMENTARY_ONLY) rather
 * than one generic signal, matching the granularity kit 40's A4 axis
 * already established for this taxonomy (multiple fine-grained signal_ids
 * under one conceptual umbrella, not a single id with an unstructured
 * subtype field the schema has no place for).
 *
 * PHASE 8 (2026-07-26) — SECTION 6 (ACADEMIC LANGUAGE & HEDGING), primary
 * coverage: +5 signals. Sources: kit 37 (HEDGING-CALIBRATION KIT v1.0) and
 * kit 10 (VERBAL LENS KIT v1.1), both read verbatim in full.
 *
 * Kit 37 contributes all 5 signals (SELECTIVE_HEDGING, PROXIMITY_DRIFT,
 * COMPOUND_PERFORMATIVE_HEDGING, CALIBRATION_FAILURE, HEDGE_STRIPPING).
 * The kit grades each instance by LOW/MEDIUM/HIGH intensity AND, for
 * CALIBRATION_FAILURE specifically, by UNDER_HEDGED/OVER_HEDGED direction
 * — both are per-instance modifiers the flat one-severity-per-signal_id
 * model here cannot express (same known limitation as the condition-
 * dependent Kit 40 signals noted in PENDING CALIBRATION above). Relative
 * ranking between the 5 signal types is an informed placeholder derived
 * from the kit's own emphasis: Q1 calibration text singles out
 * "UNDER_HEDGED calibration failure flagged at highest sensitivity" and
 * explicitly pairs SELECTIVE_HEDGING + HEDGE_STRIPPING as "explicitly
 * surfaced" (HEDGE_STRIPPING is also the pattern Q1 reviewers name
 * directly: "overstating findings" / "inappropriate certainty" in R1
 * comments) -> CALIBRATION_FAILURE and HEDGE_STRIPPING placed a tier above
 * PROXIMITY_DRIFT and COMPOUND_PERFORMATIVE_HEDGING, which the kit
 * mentions with less individual emphasis.
 *
 * Kit 10 (Verbal Lens) contributes ZERO taxonomy entries — not an
 * oversight. The kit's own text is explicit and repeated: "This KIT does
 * not open new report sections... Prohibitions: must never generate new
 * flags or scores independently... Act as a standalone verbal report."
 * It is architecturally a cross-cutting modulation layer over OTHER
 * kits' signals (an overlay in quantitative-primary manuscripts, an
 * independent read of argument structure in verbal-primary ones) — the
 * same "gate, not a signal generator" role Kit 38 plays for field
 * sensitivity (see Coverage Note in the extraction research). It has
 * nothing to add to a flat signal_id list by design.
 *
 * PHASE 9 (2026-07-26) — SECTION 7 (STRUCTURAL INTEGRITY), full primary
 * coverage: +30 signals. Sources: kit 15 (SILENCE LENS KIT v1.0) and kit
 * 13, both read verbatim in full.
 *
 * Kit 15 (5 signals: UNACKNOWLEDGED_COUNTER_CASE, UNADDRESSED_ALTERNATIVE,
 * FRAMEWORK_MONOPOLY, SUPPRESSED_SCOPE_LIMIT, SILENCED_UNCERTAINTY) is
 * another explicit "No judgment word. No recommendation" kit ->
 * base_severity: 0, same pattern as Phase 4-8's non-evaluative kits.
 *
 * Kit 13 confirms the scratchpad research's finding: one physical file
 * contains two distinct systems — "NUMERICAL HAT KIT v1.0" (heading-only
 * structural QA, 8 flags) and "ACADEMIC STRUCTURE META-SYSTEM v1.0" (8
 * flag-emitting sub-modules 3.1-3.8) — both "content-free, heading-based"
 * and explicitly non-evaluative ("No content reading. No rewriting. No
 * recommendations... Flags are descriptive only. No advice. No scoring
 * explanation.") -> base_severity: 0 for every flag, same reasoning as
 * kit 15 and every other "no judgment" kit ported so far.
 *
 * REDUNDANT_SECTION is named as a flag in BOTH of kit 13's two systems
 * (Numerical Hat Kit §7 and Meta-System module 3.4) — this is the same
 * flag name reused within the source file itself, not a collision between
 * two different concepts, so it is ported once.
 *
 * Module 3.6 (Academic Maturity Level Estimator: EARLY_STAGE_PATTERN /
 * INTERMEDIATE_PATTERN / ADVANCED_PATTERN) is deliberately NOT ported —
 * the kit itself labels this module "(non-evaluative)" and it is a
 * three-way descriptive classification, not an independently flaggable
 * defect event, same reasoning as excluding READER_PROFILE and
 * SINGLE/MULTIPLE_TRADITIONS/HYBRID classification in Phases 5/6.
 *
 * PHASE 10 (2026-07-26) — SECTION 8 (LIMITS & UNCERTAINTIES), primary
 * coverage: +4 signals. Source: kit 36 (UNCERTAINTY-VISIBILITY KIT v1.0),
 * read verbatim in full.
 *
 * Like kit 28 (Phase 5) and kit 27's tradition profile (Phase 6), this kit
 * outputs a multi-dimensional composite (POSITION x DISTRIBUTION x SCOPE
 * MATCH x STRUCTURAL INTEGRATION x LANGUAGE REGISTER -> one of 4 profile
 * labels), not a flat list of independently flaggable events. Most
 * dimension states are explicitly non-problematic by the kit's own text
 * ("TERMINAL is not a failure — it is the minimum standard"; "APPENDED is
 * common and not inherently problematic") and were excluded, consistent
 * with prior phases. Only the states the kit itself singles out as risk —
 * either the worst composite profile or a dimension state that generates
 * one of the kit's own named secondary/tertiary signals — were ported:
 * UNCERTAINTY_VISIBILITY_SUPPRESSED (worst composite profile; kit: "one or
 * more primary claims carry no uncertainty acknowledgment", co-triggers
 * Calibration-Deep §1.3's mandatory SECTION 8 production);
 * UNCERTAINTY_INTEGRATION_PERFORMATIVE (kit's own words: "PERFORMATIVE is
 * the signal of concern"); UNCERTAINTY_SCOPE_ASYMMETRIC (kit: "major
 * claims left without uncertainty acknowledgment", explicitly named as
 * triggering the kit's SECTION 4 secondary signal); and
 * UNCERTAINTY_REGISTER_ASSERTIVE (explicitly named as triggering the
 * kit's SECTION 6 tertiary signal — kept distinct from kit 37's
 * CALIBRATION_FAILURE per kit 36's own §1 "Division of Responsibility":
 * "Hedging-Calibration Kit reads hedging consistency across claim types.
 * Uncertainty-Visibility Kit reads where uncertainty is positioned
 * relative to the argument structure... reported as separate
 * sub-signals"). None of the four carry explicit HIGH/MEDIUM/LOW text in
 * kit 36 itself, so all four base_severity values are TODO-calibrate
 * placeholders, ranked by the kit's own relative language (SUPPRESSED and
 * PERFORMATIVE named as the concerning end-states -> higher than the
 * partial-gap ASYMMETRIC and ASSERTIVE states).
 *
 * PHASE 11 (2026-07-26) — SECTION 9 (FIGURE / TABLE INTEGRITY), full
 * primary coverage: +41 signals. Source: kit 41 (FIGURE/TABLE INTEGRITY
 * KIT v1.1), read verbatim in full — this kit was flagged by the earlier
 * research pass as "too large to include" and never independently
 * re-verified; it was re-read in full this phase (491 lines) and is now
 * confirmed. It is a genuine outlier among the ported kits: unlike the
 * "No judgment/No recommendation" kits in Phases 4-10, kit 41 explicitly
 * defines its own 4-level severity scale (§4: CRITICAL / HIGH / MEDIUM /
 * LOW, "Severity assignment rule: when a detected signal falls between
 * anchor levels, assign the lower severity") and assigns per-signal
 * standards citations (APA 7th ed., CONSORT, STROBE, PRISMA, Nature
 * Reporting, etc.), but — except for the two v1.1-added M3 signals
 * (DECIMAL_INCONSISTENCY: "LOW at Q2/Q3; MEDIUM at Q1" -> ported at fixed
 * Q1 tier -> 3, per the established Q-VARIANT GAP convention from Phase
 * 2; FORMAT_INVERSION: "MEDIUM ... at any Q-tier" -> 3) — it does not
 * attach an explicit severity word to each of its other 39 catalogued
 * signals. Those 39 are informed placeholders (TODO calibrate),
 * tiered by how directly each signal's own one-line "Risk" description
 * matches kit 41's own CRITICAL/HIGH anchor language ("compromises
 * representational integrity"/"likely to distort interpretation" ->
 * outright directional exaggeration, selective/asymmetric omission, or
 * cross-layer numeric contradiction of a primary result -> 4) versus its
 * MEDIUM anchor ("may affect perception" -> labeling/unit/scale ambiguity
 * that could distort but is not itself a directional distortion -> 3).
 * No signal here was placed at LOW (1) as a placeholder — kit 41's own
 * rule ("inflation is a higher risk than under-detection") argues against
 * defaulting figure/table integrity gaps to the lowest tier before real
 * calibration data exists.
 *
 * A few of kit 41's signals are conceptually adjacent to signals already
 * in this taxonomy but are kept as separate entries because kit 09's own
 * text (Phase 2) explicitly distinguishes them by layer: kit 41's
 * CONFIDENCE_INTERVAL_ABSENCE and EFFECT_SIZE_ABSENCE are the figure/
 * table-layer variants; CI_ABSENT_FROM_PRIMARY_ANALYSIS and
 * EFFECT_SIZE_ABSENT_FROM_SIGNIFICANCE (Phase 2) are the text-layer
 * variants of the same underlying concern. Not a naming collision — two
 * canonical, independently-fireable signal_ids for the same category of
 * gap, exactly as kit 09's own coordination text requires.
 *
 * PHASE 12 (2026-07-26) — SECTION 10 (REPRODUCIBILITY & OPEN SCIENCE),
 * full primary coverage: +15 signals. Sources: kit 42 (REPRODUCIBILITY &
 * OPEN SCIENCE KIT v1.2) and kit 42b (REPRODUCIBILITY FIELD-TYPE SEVERITY
 * PATCH v1.0), both read verbatim in full — kit 42 was previously
 * unread/paraphrase-only per the research pass; this is its first
 * verbatim port.
 *
 * ARCHITECTURE MISMATCH (self-resolved). Kit 42 is not a flat catalogue
 * of named events like most other ported kits — it is a 16-module
 * checklist audit where each module (M01-M16) resolves to one of
 * PRESENT / PARTIAL / ABSENT / NOT_APPLICABLE. Only the "gap" outcome per
 * module is a defect worth flagging (PRESENT is compliance, NOT_APPLICABLE
 * is a structural non-fit, neither is a signal); PARTIAL and ABSENT were
 * collapsed into a single per-module signal_id rather than split into two
 * (unlike, e.g., Phase 2's two-way MODEL_FIT split) because kit 42's own
 * §4 Synthesis Rules grade severity by MODULE TIER (CRITICAL / STANDARD /
 * CONTEXTUAL), not by PARTIAL-vs-ABSENT distinction within a module, and
 * because 16 module-level signals already gives adequate resolution
 * without doubling to 32 for marginal precision.
 *
 * Severity was derived directly from kit 42's own §4 text, not invented:
 * "CRITICAL modules — any ABSENT -> overall risk tone minimum HIGH" -> 4,
 * for all 7 CRITICAL-tier modules (M01, M02, M04, M06, M12, M14, M15).
 * "STANDARD modules — ABSENT -> MEDIUM contribution to overall risk" -> 3,
 * for the 6 STANDARD-tier modules (M03, M05, M10, M11, M13, M16).
 * "CONTEXTUAL modules — do not independently drive overall risk
 * escalation" -> 1, for the 2 ported CONTEXTUAL-tier modules (M07, M09).
 *
 * M11's signal_id (FUNDING_NOT_VISIBLE_IN_TEXT) is taken verbatim from the
 * kit's own text, which explicitly names it to avoid the wrong
 * implication of FUNDING_ABSENT: "In double-blind peer review workflows,
 * funding declarations may be submitted separately to the editorial
 * management system... An ABSENT signal here reflects absence from the
 * manuscript text layer only." This is the one module where the kit
 * itself insists on a specific label, so it was used rather than the
 * generic _GAP naming pattern applied to the other 14.
 *
 * M08 (Retraction Risk Profile) was deliberately NOT ported as an
 * independent signal — its own text defines it as a synthesis over the
 * other modules' already-detected states ("Signal targets: combination of
 * absent data + absent code + no pre-registration..."), the same
 * "computed from other signals, not independently observable" reasoning
 * that excluded EXECUTIVE_SUMMARY_BLOCK and Layer Convergence from this
 * taxonomy elsewhere.
 *
 * Kit 22 (REPLICATION SIGNAL KIT) was NOT independently read or ported —
 * kit 42's own text states plainly, in its own dedicated section: "REPLICATION
 * SIGNAL KIT (kit 22) is retired. This kit fully absorbs and extends its
 * coverage... All signals from kit 22 are present within M01, M02, M04,
 * M10, and the STANDARD tier modules above." Porting kit 22 separately
 * would resurrect a retired, superseded source.
 *
 * Kit 42b confirms the same "gate, not a signal generator" role for
 * manuscript-type severity modulation that Kit 38 plays for field
 * sensitivity — its own hard limits section states outright "Does not
 * introduce new signals... only modulates severity" via a
 * TYPE-A..TYPE-E x module modifier table (implemented so far only for
 * M01, M02, M04, M06, M12). Like Kit 38, this gating architecture is not
 * yet built in code, so the 15 ported signals below carry their flat,
 * un-modulated base-tier severity for now (equivalent to the "fixed Q1
 * tier" simplification applied elsewhere) rather than a manuscript-type-
 * aware value — a real gap kit 42b's own table would close once a field/
 * type-gating layer exists.
 *
 * PHASE 13 (2026-07-26) — SECTION 4 (ARGUMENTATION) extension kits, full
 * coverage of kits 24, 25, 30, 32, 34, 35: +28 signals. All six read
 * verbatim in full. These kits extend (not replace) kit 40's A1-A5 audit
 * from Phase 1 — each reads a different structural dimension of the same
 * argumentation zone (Results-Discussion drift, claim/limit proportion,
 * longitudinal claim continuity, argumentative weight distribution,
 * conclusion-zone traceability, and a unified 8-type overreach catalogue).
 *
 * Kit 24 (Discussion Scope Drift, 4 new signals: CAUSAL_DRIFT, SCALE_DRIFT,
 * MECHANISM_INTRODUCTION_UNSUPPORTED, IMPLICATION_EXTENSION) grades
 * magnitude MINOR/MODERATE/MAJOR per instance (not per type) -> uniform
 * placeholder severity, TODO calibrate. Its 5th cataloged signal,
 * "Conclusion Introduction" (label CONCLUSION_INTRODUCTION_NEW_CLAIM), was
 * NOT ported separately — it is the same phenomenon kit 34 (below) defines
 * in more detail as CONCLUSION_NEW_CLAIM ("a claim appears in the
 * conclusion that was not present in results or discussion" is near-
 * verbatim identical wording in both kits) — same cross-kit-duplicate
 * reasoning as OPERATIONALIZATION_GAP (Phase 6) and POLICY_OVERREACH /
 * CONTRIBUTION_OVERREACH (kit 35, below).
 *
 * Kit 25 (Argument Symmetry) is a zone-by-zone composite profile kit, the
 * same architecture as kit 28/36/27 in earlier phases. Only the two
 * states the kit itself calls out with concern language were ported:
 * ARGUMENT_ASYMMETRY_STRUCTURAL (manuscript-level "STRUCTURALLY
 * ASYMMETRIC", kit: "noted as potential reviewer concern" at Q1) and
 * ARGUMENT_SYMMETRY_INVERTED (kit: "rare but structurally significant",
 * "retained at all Q-variants" — never suppressed, unlike every other
 * state in this kit). SYMMETRIC (good state) and single-zone
 * PARTIALLY_ASYMMETRIC (explicitly suppressed at Q3) were excluded.
 *
 * Kit 30 (Argument Chain) tracks the central claim across 4 longitudinal
 * transitions. CLAIM_NOT_ANCHORED (claim tracking cannot even start) and
 * the three composite chain-profile risk states were ported —
 * CHAIN_PROFILE_BROKEN (kit: "LOST is a high signal"),
 * CHAIN_PROFILE_UNRESOLVED, CHAIN_PROFILE_DRIFTED — plus the kit's own 3
 * additional named signals CLAIM_SUBSTITUTION, CLAIM_FRAGMENTATION,
 * CLAIM_ABANDONMENT. INTACT and PARTIALLY_INTACT (explicitly the
 * good/mild states) were excluded, consistent with prior phases.
 *
 * Kit 32 (Argument Load) is a 4-zone density profile kit. Of its 5 load-
 * profile labels, only the two the kit itself singles out with concern
 * language were ported — ARGUMENT_LOAD_FRONT_LOADED and
 * ARGUMENT_LOAD_BACK_LOADED (kit: "FRONT-LOADED and BACK-LOADED profiles
 * explicitly surfaced" at Q1; BACK-LOADED further named "common reviewer
 * concern" at Q3) and ARGUMENT_LOAD_METHODS_HEAVY (kit: "signals
 * methodological over-claiming"). CORE-CONCENTRATED and DISTRIBUTED carry
 * no such language (kit explicitly: "Does not... Label any load profile
 * as correct or incorrect") and were excluded as neutral classification,
 * consistent with the READER_PROFILE/tradition-profile exclusion pattern
 * from Phases 5-6. The kit's two additional named signals, LOAD_SHIFT_
 * DETECTED and METHODS_CLAIM_DENSITY, were also ported.
 *
 * Kit 34 (Conclusion Integrity) contributes CONCLUSION_NEW_CLAIM (see kit
 * 24 note above — this is the canonical id for that shared concept),
 * CONCLUSION_CONTRIBUTION_INFLATION, RESULT_CONCLUSION_DISPROPORTION, and
 * LIMITATION_REVERSAL. Its 5th signal type, Abstract-Conclusion
 * consistency (ESCALATED / DEFLATED / SUBSTITUTED), was NOT ported as new
 * entries — it is the same concept as ABSTRACT_CONCLUSION_DIVERGENCE
 * already ported in Phase 1 from kit 40 A5 ("abstract conclusion does not
 * match body conclusion"), just narrowed to the conclusion sub-zone
 * specifically; folding it into the existing entry rather than
 * duplicating follows the same reasoning as OPERATIONALIZATION_GAP.
 *
 * Kit 35 (Overreach-Signal Kit) catalogues 8 overreach types with an
 * explicit per-instance MINOR/MODERATE/MAJOR severity scale (§3). Two of
 * its 8 types are, by the kit's own coordination text and near-identical
 * definitions, the same canonical signals already in this taxonomy: Type
 * 3 POLICY_OVERREACH matches the Phase-1 kit-40-A5 entry ("directive
 * recommendations without causal/interventional design basis") — this
 * exact cross-kit match is independently confirmed by the scratchpad
 * research; Type 5 CONTRIBUTION_OVERREACH matches the Phase-1 kit-40-A1
 * entry ("contribution stated beyond what the study establishes"). Both
 * were left as-is, not duplicated. The remaining 6 types are new and were
 * ported with their kit-specified primary SECTION: CAUSAL_OVERREACH
 * (SECTION 4 — kit's own MAJOR-severity example, "causal claim central to
 * the argument with no experimental basis", so placed a tier above the
 * other 5 -> 4), GENERALIZATION_OVERREACH (SECTION 5 — kept distinct from
 * the existing kit-40 GENERALIZABILITY_CLAIM per different primary
 * section and no explicit same-signal declaration from either kit),
 * NOVELTY_OVERREACH (SECTION 1 — kit 35's own §1 explicitly keeps this
 * distinct from kit 23's NOVELTY_ASSERTION_UNANCHORED: "Both active in
 * SECTION 1 as separate sub-signals"), TEMPORAL_OVERREACH (SECTION 5),
 * TRANSLATIONAL_OVERREACH (SECTION 6), DISCIPLINARY_OVERREACH (SECTION 2).
 * The kit's own ISOLATED/COMPOUND/SYSTEMATIC aggregate pattern was NOT
 * ported — it is a synthesis computed over already-detected instances,
 * the same "not independently observable" reasoning that excluded M08
 * (Phase 12) and EXECUTIVE_SUMMARY_BLOCK.
 *
 * PHASE 15 (2026-07-26) — SECTION 0 remainder: kit 38 (JOURNAL-SENSITIVITY
 * KIT v1.0) and kit 29 (DESK-REJECT SIGNAL KIT v1.0), both read verbatim
 * in full to give this file's remaining SECTION 0 gap a confirmed final
 * disposition rather than carrying forward the research pass's
 * un-reread characterization.
 *
 * Kit 29 is explicitly self-declared "Type: SYNTHESIS KIT" — its hard
 * limits state outright "Generate signals independently of source kits"
 * is prohibited; it only co-occurrence-maps signals ALREADY produced by
 * other kits (SCOPE_FIT_RISK, ABSTRACT_POSTURE_RISK, STRUCTURAL_
 * COMPLETENESS_RISK, LANGUAGE_POSTURE_RISK, INTEGRITY_TRANSPARENCY_RISK
 * are zone labels over combinations of already-ported signals, not new
 * atomic events). Confirmed zero new taxonomy entries — same "computed
 * synthesis" exclusion as kit 42's M08 and kit 35's aggregate pattern.
 *
 * Kit 38 confirms the research pass's characterization for MOST of its
 * content: it is primarily a SUPPRESS/AMPLIFY/RECLASSIFY threshold-
 * modulation gate over OTHER kits' already-ported signals, per field
 * (8 field categories: FIELD-NAT/MED/SOC/HUM/LAW/ENG/EDU/INT) — e.g.
 * "TRANSLATIONAL_OVERREACH: maximum sensitivity" for FIELD-MED modulates
 * the severity of the TRANSLATIONAL_OVERREACH entry already ported in
 * Phase 13, it does not define a new signal. That modulation-table
 * architecture is still not built in code (same unbuilt-gate status as
 * documented since Phase 2's PHYSICS SIGNALS SCOPE decision) and remains
 * out of scope for this taxonomy file, which only holds flat per-signal
 * base severities.
 *
 * However, kit 38 §4.x also defines 14 field-specific signals under
 * explicit "Field-specific signals:" subheadings — these are net-new
 * detection targets, not modifiers of existing signals, structurally
 * identical in kind to kit 09 §1.11's physics-specific signals that the
 * user already confirmed belong in the general taxonomy (Phase 2). The
 * same decision applies here without needing to re-ask: these 14 signals
 * are ported now, at a flat baseline severity, with the same caveat as
 * the Phase 2 physics signals — until kit 38's field-gating is built in
 * code, they fire on any manuscript in the relevant field without
 * field-specific threshold adjustment (e.g. a FIELD-MED signal like
 * RISK_FRAMING_SIGNAL will be scored the same whether the manuscript is
 * actually medical or not, since field detection/gating isn't wired up).
 *
 * Of the 14, one (CI_ABSENT_SIGNAL, FIELD-MED §4.2: "P-value only, no
 * confidence intervals") was NOT ported as a separate entry — it is the
 * same canonical concept as CI_ABSENT_FROM_PRIMARY_ANALYSIS (Phase 2,
 * kit 09 §1.10), which is already field-general enough to cover the
 * medical case kit 38 describes; duplicating it would split one concept
 * across two ids, the same reasoning as OPERATIONALIZATION_GAP (Phase 6).
 * The remaining 13 are new: RISK_FRAMING_SIGNAL, NNT_ABSENT_SIGNAL
 * (FIELD-MED); RESPONSE_RATE_ABSENT, SAMPLING_FRAME_ABSENT (FIELD-SOC —
 * this resolves the scratchpad's open SAMPLING_FRAME_ABSENT cross-
 * reference to kit 40 A3, which does not itself define this signal_id
 * anywhere in its verbatim text; kit 38 is its actual source);
 * PRIMARY_SOURCE_ABSENT, ARCHIVAL_BASIS_ABSENT (FIELD-HUM);
 * JURISDICTION_UNSPECIFIED, LEGAL_TEMPORAL_SCOPE_ABSENT (FIELD-LAW);
 * COMPLEXITY_ABSENT, BENCHMARK_ABSENT, DATASET_CHARACTERIZATION_ABSENT
 * (FIELD-ENG); INTERVENTION_FIDELITY_ABSENT, INSTRUCTOR_EFFECT_ABSENT
 * (FIELD-EDU). Severities are informed placeholders — where kit 38 gives
 * an explicit word ("MEDIUM signal") that drove the number directly;
 * elsewhere ranked by the kit's own relative emphasis (e.g. BENCHMARK_
 * ABSENT is named directly in the kit's Revision Round Interaction
 * section as one of the signals "most frequently raised in field-specific
 * R1 reviewer comments" -> placed a tier above its FIELD-ENG siblings).
 * All 13 are placed under SECTION_3_METHODOLOGICAL as their natural home
 * (methodological-visibility gaps), except where the field context makes
 * a different section the better fit.
 *
 * This closes out the phased taxonomy port's planned scope. Remaining
 * unported material — the ~156-signal original estimate has been
 * substantially exceeded by more precise per-kit accounting — is now
 * limited to: kits not yet verbatim-read at all in this project (43
 * Source Integrity, 45 Reporting Standard, 46 Gold Standard, 47 Epistemic
 * Frame, 48 Concept Lifecycle, 49 Methodological Verbal Risk, 50 Cross
 * Consistency, 51 Citation Integrity M17, 53 Layer Convergence, 57 Beta
 * Signal — all flagged by the research pass as read only in an earlier,
 * now-superseded segment and not independently re-verified this project);
 * the two explicitly unresolved signal names from Phase 14
 * (FUTURE_CLAIM_EVIDENCE_BRIDGE_WEAK, CROSS_TABLE_NUMERICAL_ANOMALY); and
 * the architectural work items already flagged throughout this file (the
 * dual-homed-section data-model limitation, Kit 09 §1.12's templated
 * signal_ids, and the field/type-gating layer for kits 38 and 42b).
 *
 * NOT PORTED ON PURPOSE — known version-drift bug in the source kit
 * stack: Kit 44 v1.7 ("44_CLASR_ACTION_PRIORITY_BLOCK_KIT_v1_7.txt",
 * Tier 2 list) cites five signal names attributed to Kit 40 —
 * FINDING_CLAIM_INVERSION, PREMISE_CONTRADICTION, PREMISE_CHAIN_COLLAPSE,
 * METHOD_CLAIM_MISMATCH, CLAIM_UNTESTABILITY — that do not exist anywhere
 * in Kit 40 v1.2's actual A1-A5 catalogue below. Kit 44 was never updated
 * when Kit 40 was bumped from v1.1 to v1.2. Only real, current Kit 40
 * signal names are included here; the five phantom names are excluded.
 * CONFIRMED, not inherited uncertainty: kit 44 v1.7 was itself read
 * verbatim in full in Phase 14 (2026-07-26) specifically to resolve this —
 * the earlier research pass had flagged the discrepancy but never
 * re-read kit 44's actual text to rule out a paraphrase error. It is not
 * a paraphrase error; kit 44's Tier 2 list literally contains these five
 * names, verbatim, still in the current v1.7 text. This is a real,
 * uncorrected bug in the source kit stack, and this taxonomy correctly
 * excludes the phantom names rather than inventing entries to match them.
 *
 * PHASE 14 (2026-07-26) — PRIORITY ACTION SIGNALS layer: +1 signal,
 * VALIDATION_CIRCULARITY. Kit 44 v1.7 (ACTION PRIORITY BLOCK KIT), read
 * verbatim in full, is a pure signal-selection/ranking layer over
 * already-detected signals from every other kit — its own hard limits
 * section states outright "Does not generate new signals... Selects
 * signals." Its Tier 1-5 priority list, tier-cascade fill logic, and
 * intra-tier tiebreaker rules govern which already-scored signals surface
 * in the PRIORITY ACTION SIGNALS header block; none of that is itself a
 * new taxonomy entry, for the same "computed synthesis, not independently
 * observable" reasoning already applied to EXECUTIVE_SUMMARY_BLOCK, kit
 * 42's M08, and kit 35's aggregate pattern.
 *
 * One exception: VALIDATION_CIRCULARITY. Kit 44's own Tier 2 list cites
 * it as "(kit 44 v1.5)" — i.e. kit 44 itself is the originating kit for
 * this specific signal name, not merely a selector of it — and kit 09's
 * §1.11 text (already read verbatim in Phase 2) independently confirms
 * it as a real, distinct signal in its own "Coordination" note: "VALIDATION_
 * CIRCULARITY (Kit 44 Tier 2) takes precedence when the validation
 * evidence itself is drawn from the same dataset. Both may co-occur;
 * VALIDATION_CIRCULARITY reported in PAS, §1.11 reported in SECTION 3" —
 * explicitly distinguishing it from the already-ported SHOT_TO_SHOT_
 * STABILITY_NOT_INDEPENDENTLY_VALIDATED (Phase 2), which is kit 09's own
 * physics-specific instance of the same general circularity pattern. Both
 * signals can co-occur and are reported in different locations, so this
 * is a real second signal, not a duplicate — ported under SECTION_3_
 * METHODOLOGICAL (its natural home; PAS placement is a report-layout
 * concern the taxonomy doesn't model) at the same severity tier as its
 * physics-specific sibling.
 *
 * Two further signal names surfaced by kit 44's text could NOT be safely
 * ported and are left as an explicit open gap rather than guessed at:
 *   - FUTURE_CLAIM_EVIDENCE_BRIDGE_WEAK (kit 44 Rule C1): referenced as an
 *     already-existing signal type from some other kit, but its actual
 *     defining kit has not been identified among the kits read so far in
 *     this taxonomy port (candidates not yet verbatim-read: kits 47
 *     Epistemic Frame, 48 Concept Lifecycle, or others in the unread
 *     list). Inventing a definition from kit 44's exclusion-rule text
 *     alone, without seeing the signal's actual defining kit, would risk
 *     a wrong `label_en` and wrong section.
 *   - CROSS_TABLE_NUMERICAL_ANOMALY (kit 44 Rule C2): kit 41 (Figure/Table
 *     Integrity, read verbatim in full in Phase 11) does NOT contain this
 *     exact name anywhere in its M1-M5 catalogue, despite being the most
 *     likely source. It may be a synonym for kit 41's CROSS_LAYER_
 *     REPRESENTATIONAL_DRIFT or TABLE_TEXT_MISMATCH (both already ported),
 *     or a genuinely separate, still-unsourced signal. Not ported until
 *     its actual origin is confirmed.
 *
 * PHASE 16 (2026-07-26) — remaining unread kits: 43, 45, 46, 47, 48, 49,
 * 50, 51, 53, 57, all read verbatim in full. This closes out every kit
 * flagged in the Phase 15 "remaining unported material" note as
 * "not yet verbatim-read at all in this project." +48 signals.
 *
 * Kit 43 (Source Integrity, 14 signals across CAT-A..E) is another
 * "Produces signals — not scores, not verdicts" kit with zero graded
 * severity language anywhere in its own text -> base_severity: 0 for 12
 * of its 14 signals, same non-evaluative rule as Phases 4-10. Two
 * exceptions: HIGH_STAKES_SELF_CITATION and RETRACTION_SIGNAL_FROM_TEXT
 * are both named verbatim in kit 44's own Tier 4 ("Integrity and
 * transparency") priority list — the same kind of cross-kit elevation
 * that justified VALIDATION_CIRCULARITY's nonzero severity in Phase 14 —
 * so these two carry a TODO-calibrate placeholder of 3 instead of 0.
 * CAT-C (SELF-CITATION) is placed under SECTION_2_CONCEPTUAL and CAT-E
 * (RETRACTION/CORRECTION) under SECTION_7_STRUCTURAL_INTEGRITY per the
 * kit's own explicitly stated primary sections for those categories,
 * not the SECTION_3_METHODOLOGICAL default of CAT-A/B/D.
 *
 * Kit 45 (Reporting Standard) was deliberately NOT ported — not an
 * omission. It is architecturally incompatible with this taxonomy's
 * event-based extraction model: it defines ~90 individual per-item
 * compliance checks across STROBE, CONSORT, and PRISMA (e.g. "Item 12c —
 * Missing data addressed: PRESENT/PARTIAL/ABSENT/N/A"), meant to be
 * reported as an exhaustive, always-produced compliance table for every
 * applicable item — not an exception-based "flag what's wrong" signal
 * catalogue like every other kit ported so far. Porting it as ~90 more
 * signal_ids would both bloat the taxonomy for heavily-overlapping
 * concepts already covered elsewhere at a more general level (many items
 * duplicate CI/effect-size/funding/limitation signals already ported) and
 * still wouldn't produce the right output shape (a full item-by-item
 * table, not a sparse list of detected problems). This needs a dedicated
 * "reporting-standard compliance table" feature built separately from the
 * signal taxonomy, not more taxonomy entries — flagged here as an
 * architecture item, not ported.
 *
 * Kit 46 (Gold Standard) contributes zero entries — it is a pure
 * activation-mode governance kit ("Does not generate new signals... Does
 * not change signal detection logic... Configures the system to run at
 * full depth"), the same role as Kit 10 (Phase 8) and Kit 46's own text
 * confirms this outright.
 *
 * Kit 47 (Epistemic Frame, 9 signals) is the second kit (after kit 23) to
 * carry its own explicit LOW/MEDIUM/HIGH grading throughout, so its
 * graded states are ported as distinct entries rather than collapsed:
 * FRAME_METHOD_MISALIGNED (HIGH -> 4) / FRAME_METHOD_PARTIAL_TENSION
 * (MEDIUM -> 3); FRAME_CONTRIBUTION_MISALIGNED (HIGH -> 4) /
 * FRAME_CONTRIBUTION_PARTIAL_TENSION (MEDIUM -> 3) — ALIGNED excluded in
 * both pairs as the explicitly "no signal — expected behavior" state.
 * FRAME_UNIVERSALIZATION carries its own graded LOW/MEDIUM/HIGH intensity
 * per-instance (like kit 24's magnitude scale) -> uniform placeholder 3.
 * The three "structural normative depth" patterns — ALTERNATIVE_ERASURE,
 * INEVITABILITY_ARCHITECTURE, EPISTEMIC_PRIVILEGE — carry no per-signal
 * grading text, but kit 47's Q3 calibration explicitly separates
 * "INEVITABILITY_ARCHITECTURE and ALTERNATIVE_ERASURE at HIGH reported"
 * from "EPISTEMIC_PRIVILEGE at standard sensitivity" -> the first two get
 * 3, EPISTEMIC_PRIVILEGE gets 2. FRAME_VISIBILITY_INVISIBLE is ported at
 * 2 (TODO calibrate) — the kit's own text is explicit that this state is
 * read against disciplinary norms, not a universal defect ("INVISIBLE is
 * a signal, not a verdict... some fields have low frame-declaration
 * norms"), so it is deliberately placed below the misalignment states.
 * EXPLICIT and IMPLICIT visibility states are excluded as non-problematic.
 * All three cross-reference relationships this kit explicitly declares
 * against Kit 15/16/27 ("both may fire... not merged") confirm these are
 * genuinely new signals, not duplicates, consistent with every other
 * kit's own explicit non-redundancy declarations honored elsewhere in
 * this file.
 *
 * Kit 48 (Concept Lifecycle, 7 signals) tracks concepts longitudinally,
 * the concept-level analogue of kit 30's claim-chain tracking (Phase 13).
 * Ported: the 5 named transformation events (SEMANTIC_DRIFT,
 * SCOPE_INFLATION, AUTHORITY_TRANSFER, REIFICATION, EPISTEMIC_LOADING —
 * AUTHORITY_TRANSFER and EPISTEMIC_LOADING placed a tier above the other
 * three per Q1's explicit "AUTHORITY_TRANSFER flagged at HIGH
 * sensitivity" and EPISTEMIC_LOADING's own definition as the mechanism
 * that produces UNGROUNDED_CARRIER status) and the two "final epistemic
 * role" risk states UNGROUNDED_CARRIER (kit: "Signal: HIGH") and
 * PARTIALLY_GROUNDED_CARRIER (kit: "Signal: MEDIUM"). GROUNDED_CARRIER and
 * STABLE_CONCEPT are excluded as explicitly "expected behavior" states.
 * The kit's 3rd final-role state, DECORATIVE_CONCEPT, was NOT ported
 * separately — its definition ("introduced but never reaches carrier
 * status... present in framing and conclusion but absent from analysis")
 * is near-verbatim identical to DECORATIVE_ABSTRACTION already ported in
 * Phase 6 from kit 33 — same cross-kit-duplicate reasoning as
 * OPERATIONALIZATION_GAP. The 3 manuscript-level "_PATTERN" labels
 * (CONCEPT_LOADING_PATTERN, CONCEPT_DECORATION_PATTERN, SEMANTIC_DRIFT_
 * PATTERN) were also NOT ported — the kit's own text makes their
 * synthesis nature explicit ("Pattern threshold: two or more concepts
 * required"), a count-aggregation over the already-ported per-concept
 * events, the same "computed synthesis" exclusion applied to M08,
 * EXECUTIVE_SUMMARY_BLOCK, and kit 35's aggregate pattern elsewhere.
 *
 * Kit 49 (Methodological Verbal Risk, 5 signals: PROCEDURAL_OPACITY,
 * SATURATION_CLAIM_WITHOUT_GROUNDING, LEGITIMATION_BY_LABEL, RIGOR_
 * VOCABULARY_WITHOUT_PRACTICE, SAMPLING_CIRCULARITY) grades each
 * per-instance by LOW/MEDIUM/HIGH intensity but gives no clear
 * differentiation between the 5 types at the type level (Q1 flags all
 * five at similarly high emphasis) -> all 5 carry a uniform TODO-calibrate
 * placeholder of 3.
 *
 * Kit 50 (Cross-Consistency, 6 zone pairs) is a composite profile kit
 * covering long-range zone-to-zone consistency; each pair independently
 * grades CONSISTENT/MODIFIED (no signal) / TENSION (medium) / DIVERGENT
 * or SILENT_SHIFT (high). Rather than 6 pairs x 5 states, one signal_id
 * per pair was ported representing "a consistency gap exists in this
 * pair" (collapsing TENSION/DIVERGENT/SILENT_SHIFT together, since the
 * flat per-signal severity model can't hold per-instance state anyway).
 * PAIR 1 (Abstract <-> Conclusion) was NOT ported as a 6th entry — it is
 * the same canonical concept as ABSTRACT_CONCLUSION_DIVERGENCE already
 * ported in Phase 1 from kit 40 A5, unlike the other five pairs which
 * kit 50's own text explicitly and repeatedly declares distinct from
 * every topically-adjacent existing signal it cross-references ("Both
 * active; reported as separate sub-signals; not merged" — stated
 * separately for Pairs 3, 4, 5, and 6 against kits 47, 48, 24, and 34
 * respectively). CONSISTENCY_GAP_LITERATURE_METHODOLOGY (Pair 3) and
 * CONSISTENCY_GAP_CONTRIBUTION_LIMITATION (Pair 6) are placed a tier
 * above the other three per the kit's own explicit emphasis ("Pair 3...
 * at HIGH sensitivity — Q1 reviewers weight epistemological coherence
 * heavily"; "Pair 6... retained at full sensitivity regardless of
 * Q-variant — contribution-limitation proportionality is universally
 * important").
 *
 * Kit 51 (Citation Integrity Module M17) catalogues 5 signal types
 * (M17-S1 through M17-S5), of which 3 are cross-kit duplicates of kit 43
 * entries the taxonomy already carries: M17-S1 SINGLE_SOURCE_DEPENDENCY
 * matches kit 43's ARGUMENT_FRAGILITY_SIGNAL (near-identical definitions:
 * both read "a primary claim/conclusion rests on a single source with no
 * corroborating citation"); M17-S2 SELF_CITATION_PATTERN matches kit 43's
 * HIGH_STAKES_SELF_CITATION; M17-S4 RETRACTION_CORRECTION_SIGNAL matches
 * the union of kit 43's RETRACTION_SIGNAL_FROM_TEXT and RETRACTION_RISK_
 * INDICATOR. None were duplicated. The remaining two are genuinely new —
 * M17-S3 CITATION_CLAIM_FIT (claim type vs. source publication type
 * mismatch — a different mismatch dimension than kit 43's population/
 * condition/direction/version CONTEXT_MISMATCH_SIGNAL) and M17-S5
 * CITATION_DENSITY_ANOMALY (undercitation ratio / citation clustering,
 * with no existing analogue anywhere in this taxonomy) — both placed
 * under SECTION_10_REPRODUCIBILITY per kit 51's own explicit statement
 * that "M17 operates within SECTION 10 STANDARD tier," not the
 * SECTION_2_CONCEPTUAL home the rest of this file's citation-behavior
 * signals (kit 20, kit 43 CAT-C) otherwise use.
 *
 * Kit 53 (Layer Convergence) contributes zero entries — its own text is
 * explicit and repeated: "This is not a score. It is a transparency
 * layer... Does not generate convergence counts without actual layer
 * signals... Does not modify signal content — only adds the count." It
 * is a cross-cutting annotation layer that counts how many already-
 * ported signals from different SECTIONs independently converge on the
 * same manuscript element — computed entirely from other kits' already-
 * detected output, the same "computed synthesis" exclusion applied
 * throughout this file (M08, EXECUTIVE_SUMMARY_BLOCK, kit 35's aggregate
 * pattern, kit 48's _PATTERN labels above).
 *
 * Kit 57 (Beta Signal Kit, 6 signals from empirical beta testing across
 * ML/SBI, review-article, and policy-simulation manuscripts) is the last
 * kit ported this phase. Five are straightforward new domain-specific
 * signals: LOSS_PHYSICS_ALIGNMENT_GAP, TRAINING_PRIOR_LEAKAGE (kit: "MEDIUM
 * at Q2/Q3; HIGH at Q1 when generalization is the manuscript's central
 * contribution claim" -> ported at fixed Q1/HIGH tier -> 4, per the
 * established Q-VARIANT GAP convention from Phase 2), MODEL_
 * INTERPRETABILITY_ABSENT, INDEX_LINEARITY_ASSUMPTION, and ASSUMPTION_
 * STACKING_RISK (all four condition-dependent MEDIUM/HIGH in source ->
 * midpoint TODO-calibrate placeholder of 3, same pattern as Kit 40's
 * condition-dependent signals in PENDING CALIBRATION below). The sixth,
 * REVIEW_AS_ADVOCACY_PATTERN, is unusual: kit 57's own text says its 5
 * sub-components "are drawn from existing kit outputs — this signal
 * synthesizes them; it does not re-detect them," which sounds like the
 * same "computed synthesis" pattern excluded elsewhere (M08, kit 53
 * above) — but unlike those purely descriptive labels, kit 57 gives this
 * signal its own full Evidence/Inference-type/Confidence card schema and
 * explicit PAS eligibility ("noted as potential desk-reject signal" at
 * Q1), treating it as a first-class reportable signal in its own right
 * (the same precedent as kit 13's DESK_REJECT_RISK_HIGH/MEDIUM, which was
 * ported despite also being computed from other flags) — so it was
 * ported, at 3 (TODO calibrate).
 *
 * This phase also closes the two open signal-origin gaps from Phase 14
 * (FUTURE_CLAIM_EVIDENCE_BRIDGE_WEAK, CROSS_TABLE_NUMERICAL_ANOMALY) as
 * a search, not a resolution: neither name appears anywhere in kits 43,
 * 45, 46, 47, 48, 49, 50, 51, 53, or 57 — the last remaining substantive
 * candidates in the kit set. With every kit that plausibly defines new
 * signals now verbatim-read at least once in this project (the few still
 * unread — 02, 03, 04, 06, 07, 08, 10 [done, Phase 8], 11, 12a, 12b, 17,
 * 18, 31, 52, 54, 55, BETA-MANAGER kits, CLASR_BETA_ACCUMULATION — are
 * all governance, output-formatting, gate-threshold, or beta-test-log
 * kits per the original research pass, not signal sources), these two
 * names are left as a permanent, explicitly documented gap rather than
 * guessed at.
 *
 * PENDING CALIBRATION (user, not code — see trialfiles/README.md §3):
 *   base_severity values below are INFORMED placeholders, not final
 *   calibration. Where Kit 40 states an explicit severity, that value
 *   drove the number directly (FINDING_CONTRADICTS_RECOMMENDATION: kit
 *   text says "Severity: HIGH" -> 4; ASSUMPTION_VALIDITY_SCOPE_MISMATCH:
 *   kit text says "HIGH when central result depends on the assumption" ->
 *   4). Elsewhere the number follows Kit 40's own "PRIORITY BLOCK
 *   INTERACTION" section, which ranks A1 and A3 as most likely to reach
 *   the Priority block and states "A2 and A4 signals rarely reach
 *   Priority alone." Two signals have kit text that is explicitly
 *   condition-dependent rather than a single value
 *   (PRACTICAL_SIGNIFICANCE_ABSENT: "MEDIUM when effect size simply
 *   absent, HIGH when present but trivially small"; and
 *   ASSUMPTION_VALIDITY_SCOPE_MISMATCH: "HIGH .. MODERATE when a
 *   secondary result depends on it") — the flat base_severity-per-signal
 *   model here cannot express that conditionality yet, so these two
 *   carry a single midpoint/high placeholder pending a real fix (e.g. a
 *   per-signal severity-modifier function) once more of the taxonomy is
 *   ported and the pattern's frequency is known.
 *   Still to do: replace every base_severity placeholder with
 *   editorially-calibrated values, then re-tune scorer.js's
 *   COOCCURRENCE_RULES and BAND_THRESHOLDS against 15-20 historical
 *   CLASR reports.
 *
 * CASCADE, NOT SEVERITY. Kit 40's own "HARD LIMITS" section states this
 * kit "does not cascade severity — only context tags cascade." When an
 * upstream axis is CRITICAL, downstream axes inherit a note
 * ("[-> A3 cascade]"), not a severity multiplier. No cross-axis
 * cooccurrence rule should be added in scorer.js for A1-A5 pairs — that
 * would contradict the source kit's explicit design.
 *
 * Naming rules (non-negotiable, see README):
 *   - no hyphens in IDs (use underscores)
 *   - no two IDs that differ only by case — Anthropic structured outputs
 *     does not guarantee enum casing fidelity, and that collision is
 *     unrecoverable post-hoc.
 */

const TAXONOMY = {
  // --- A1: CLAIM INTEGRITY ---
  // "Is the central claim coherent, bounded, and verifiable?"
  // Priority block: A1 CRITICAL -> Category 1 (Contribution Collapse), the
  // highest tier Kit 40 defines.
  CLAIM_OVERREACH: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A1_CLAIM_INTEGRITY',
    label_en: 'Claim exceeds what the evidence can support',
    base_severity: 4, // TODO calibrate
  },
  SCOPE_UNMARKED: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A1_CLAIM_INTEGRITY',
    label_en: 'Claim does not carry explicit scope limits',
    base_severity: 4, // TODO calibrate
  },
  CONTRIBUTION_ABSENT: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A1_CLAIM_INTEGRITY',
    label_en: 'No identifiable contribution claim',
    base_severity: 4, // TODO calibrate
  },
  CONTRIBUTION_OVERREACH: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A1_CLAIM_INTEGRITY',
    label_en: 'Contribution stated beyond what the study establishes',
    base_severity: 4, // TODO calibrate
  },

  // --- A2: PREMISE INTEGRITY ---
  // "Are the load-bearing premises visible, stated, and justified?"
  // Kit 40: "A2 and A4 signals rarely reach Priority alone."
  PREMISE_INVISIBILITY: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A2_PREMISE_INTEGRITY',
    label_en: 'Load-bearing premise not stated',
    base_severity: 2, // TODO calibrate
  },
  IMPLICIT_CAUSAL_PREMISE: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A2_PREMISE_INTEGRITY',
    label_en: 'Causal assumption embedded without declaration',
    base_severity: 2, // TODO calibrate
  },
  THEORETICAL_PREMISE_UNSTATED: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A2_PREMISE_INTEGRITY',
    label_en: 'Theoretical framework assumed, not declared',
    base_severity: 2, // TODO calibrate
  },

  // --- A3: METHOD-CLAIM FIT ---
  // "Does the method test what the claim asserts?"
  // Priority block: A3 CRITICAL -> Category 2 (Structural Absence), or
  // Category 1 if the claim depends on a missing sampling frame.
  CAUSAL_DESIGN_MISMATCH: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A3_METHOD_CLAIM_FIT',
    label_en: 'Cross-sectional or correlational design with causal or directional claim language',
    base_severity: 4, // TODO calibrate
  },
  OPERATIONALIZATION_GAP: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A3_METHOD_CLAIM_FIT',
    label_en: 'Key construct measured by proxy that does not fully capture the construct',
    base_severity: 3, // TODO calibrate
  },
  ANALYTICAL_APPROACH_MISMATCH: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A3_METHOD_CLAIM_FIT',
    label_en: 'Analysis type does not match the stated research question',
    base_severity: 3, // TODO calibrate
  },
  // Kit 40 v1.2 text: "Severity: HIGH when central result depends on the
  // assumption; MODERATE when a secondary result depends on it." Condition-
  // dependent — see file header. PAS Tier 2, auto-elevated by Kit 44 v1.7
  // Rule C3.
  ASSUMPTION_VALIDITY_SCOPE_MISMATCH: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A3_METHOD_CLAIM_FIT',
    label_en: 'Load-bearing assumption validity range declared or constrained in methods, but results or conclusions extend beyond that range without acknowledgment',
    base_severity: 4, // TODO calibrate — HIGH/MODERATE conditional in source, see header
  },

  // --- A4: FINDING-CLAIM ALIGNMENT ---
  // "Do the findings actually support the stated claim?"
  // Kit 40: "A2 and A4 signals rarely reach Priority alone."
  ARGUMENT_SLIP: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A4_FINDING_CLAIM_ALIGNMENT',
    label_en: 'Results uses associative language; Discussion uses causal language; the gap is not argued',
    base_severity: 2, // TODO calibrate
  },
  SELECTIVE_FINDING_DEPLOYMENT: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A4_FINDING_CLAIM_ALIGNMENT',
    label_en: 'Findings that complicate the claim are not integrated into the argument',
    base_severity: 2, // TODO calibrate
  },
  MAGNITUDE_INFLATION: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A4_FINDING_CLAIM_ALIGNMENT',
    label_en: 'Effect size presented with less precision in conclusions than in results',
    base_severity: 2, // TODO calibrate
  },
  PARTIAL_SUPPORT_AS_CONFIRMATION: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A4_FINDING_CLAIM_ALIGNMENT',
    label_en: 'Partial evidence treated as full support for the claim',
    base_severity: 2, // TODO calibrate
  },
  // Kit 40 v1.2 text (verbatim): "Severity: HIGH. A directional
  // contradiction between a reported finding and a derived recommendation
  // is among the most visible argument failures at peer review."
  FINDING_CONTRADICTS_RECOMMENDATION: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A4_FINDING_CLAIM_ALIGNMENT',
    label_en: 'A reported finding is directionally opposite to the recommendation or intervention target that follows from it in Discussion or Conclusion',
    base_severity: 4, // kit text: "Severity: HIGH"
  },
  // Kit 40 v1.2 text: "Severity: MEDIUM when effect size simply absent.
  // HIGH when effect size present but trivially small..." Condition-
  // dependent — see file header; placeholder is the midpoint.
  PRACTICAL_SIGNIFICANCE_ABSENT: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A4_FINDING_CLAIM_ALIGNMENT',
    label_en: 'Statistical significance reported without effect size, or effect size present but trivially small relative to sample size',
    base_severity: 3, // TODO calibrate — MEDIUM/HIGH conditional in source, see header
  },

  // --- A5: CONCLUSION SCOPE ---
  // "Does the conclusion stay within what the manuscript can actually
  // support?" Priority block: Category 4 (Argument Calibration) for
  // POLICY_OVERREACH / GENERALIZABILITY_CLAIM.
  GENERALIZABILITY_CLAIM: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A5_CONCLUSION_SCOPE',
    label_en: 'Conclusion extends beyond sample scope without qualification',
    base_severity: 3, // TODO calibrate
  },
  LIMITATION_WITHOUT_CONSEQUENCE: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A5_CONCLUSION_SCOPE',
    label_en: 'Limitations acknowledged in body but not reflected in conclusion language',
    base_severity: 2, // TODO calibrate
  },
  POLICY_OVERREACH: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A5_CONCLUSION_SCOPE',
    label_en: 'Directive recommendations without causal or interventional design basis',
    base_severity: 3, // TODO calibrate
  },
  ABSTRACT_CONCLUSION_DIVERGENCE: {
    section: 'SECTION_4_ARGUMENTATION',
    axis: 'A5_CONCLUSION_SCOPE',
    label_en: 'Abstract conclusion does not match body conclusion',
    base_severity: 3, // TODO calibrate
  },

  // --- SECTION 3: METHODOLOGICAL VISIBILITY (partial — see PHASE 2 note) ---
  // Source: kit 09 (CALIBRATION-DEEP KIT v1.5) §1.9 Statistical
  // Method-Design Mismatch Detection. Kit text: "Severity: MEDIUM".
  ORDINAL_PEARSON_APPLICATION: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Ordinal variables (Likert-type scales, ranked categories) analyzed using Pearson correlation without justification for treating them as interval-level',
    base_severity: 3, // kit text: "Severity: MEDIUM"
  },
  // Kit text: "Severity: LOW (flagged for transparency; not a critical error)"
  LARGE_SAMPLE_NORMALITY_TEST: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Kolmogorov-Smirnov or Shapiro-Wilk normality test used as primary justification for parametric analysis on a sample with N > 300, where these tests are oversensitive',
    base_severity: 1, // kit text: "Severity: LOW"
  },

  // Source: kit 09 §1.5 Model Fit Threshold Violation Detection. No
  // explicit severity number in the source kit — placeholder reflects
  // that the kit marks this "always visible... not subject to the 3+
  // rule" and gives self-stated violation "priority... over conventional
  // violation".
  MODEL_FIT_SELF_STATED_THRESHOLD_VIOLATION: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Author states a fit-index threshold (CFI/TLI/RMSEA/SRMR) in the manuscript, and the reported index does not meet that author-stated threshold',
    base_severity: 3, // TODO calibrate
  },
  MODEL_FIT_CONVENTIONAL_THRESHOLD_VIOLATION: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'No author-stated fit-index threshold is present, and the reported index (CFI/TLI/RMSEA/SRMR) falls below the conventional threshold',
    base_severity: 2, // TODO calibrate
  },

  // Source: kit 09 §1.10 Inferential Reporting Incompleteness Detection.
  // Kit text gives Q1/Q2/Q3-modulated severity; ported at fixed Q1 tier
  // per the Q-VARIANT GAP decision documented in the file header.
  EFFECT_SIZE_ABSENT_FROM_SIGNIFICANCE: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Statistical significance (p-value, chi-square, F-ratio, correlation coefficient) reported for a primary outcome comparison without an accompanying effect size measure',
    base_severity: 3, // kit text: "Severity: MEDIUM (Q1)" — fixed-Q1 port
  },
  CI_ABSENT_FROM_PRIMARY_ANALYSIS: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Confidence intervals absent from primary outcome statistics in the Methods/Results text, in a study type where CI reporting is standard',
    base_severity: 3, // kit text: "Severity: MEDIUM (Q1)" — fixed-Q1 port
  },
  // Kit text: "Severity: HIGH (when manuscript claims to identify
  // predictors) / MEDIUM (when manuscript presents associations only)" —
  // condition-dependent on manuscript language, not just Q-tier; flat
  // placeholder is the MEDIUM case pending calibration.
  MULTIVARIATE_ANALYSIS_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Multiple demographic or predictor variables analyzed against an outcome using bivariate tests only, without multivariable modeling, while manuscript language implies predictor identification or causal priority',
    base_severity: 3, // TODO calibrate — HIGH/MEDIUM conditional in source, see comment
  },

  // Source: kit 09 §1.11 Assumption Declaration vs. Validation Detection.
  // Accelerator-physics-specific (AWAKE/CERN benchmark language in the
  // source kit) — confirmed by the user as in-scope for the general
  // taxonomy; fires only when the relevant method appears in a
  // manuscript. Depends on Kit 38 field-sensitivity gating for proper
  // calibration (not yet ported) — see PHYSICS SIGNALS SCOPE note in the
  // file header. Ported at fixed Q1 tier per the Q-VARIANT GAP decision.
  GAUSSIAN_BEAM_ASSUMPTION_NOT_VALIDATED: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Beam matrix reconstruction, emittance calculation, or phase-space tomography assumes a Gaussian beam distribution, stated but not supported by a goodness-of-fit test, residual plot, or non-Gaussian alternative comparison',
    base_severity: 3, // kit text: "Severity: MODERATE (Q1)" — fixed-Q1 port
  },
  PSF_SPATIAL_INVARIANCE_NOT_VALIDATED: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Point spread function assumed spatially invariant across the detection plane, stated but not supported by a measurement of PSF variation or depth-of-field assessment',
    base_severity: 3, // kit text: "Severity: MODERATE (Q1)" — fixed-Q1 port
  },
  // Kit text: "Severity: HIGH when visual check is the only stability
  // evidence" — single explicit condition, not a Q-tier split.
  SHOT_TO_SHOT_STABILITY_NOT_INDEPENDENTLY_VALIDATED: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Multishot technique assumes shot-to-shot beam parameter stability, validated only by a visual check (e.g. waterfall plot) performed on the same dataset the technique is applied to',
    base_severity: 4, // kit text: "Severity: HIGH when visual check is the only stability evidence"
  },
  PARAMETRIC_ASSUMPTION_NOT_VALIDATED: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A parametric method assumes a distributional form (Gaussian, Poisson, exponential, etc.) for primary output extraction, declared but not supported by a distributional test, Q-Q plot, residual analysis, or sensitivity analysis',
    base_severity: 3, // kit text: "Severity: MODERATE (Q1)" — fixed-Q1 port
  },

  // Source: kit 39 (METHODOLOGICAL RHETORIC KIT v1.0), read verbatim in
  // full. Field-independent by design. Secondary section: SECTION 4
  // (Argumentation) — see file header note.
  REPRESENTATIVENESS_TRANSFER: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A measured or sampled subset is treated as representative of a broader population, domain, or condition as an established fact rather than an argued or tested claim',
    base_severity: 3, // TODO calibrate — no explicit severity in source; kit calls this a "silent premise", surfaced explicitly at Q1
  },
  VISUAL_CHECK_AS_VALIDATION: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A figure or visual output is treated as confirmation that a methodological assumption holds or a procedure is valid, with no quantitative validation present or referenced',
    base_severity: 2, // TODO calibrate — no explicit severity in source; kit reports this "only if structurally load-bearing" at Q3
  },
  DISTRIBUTIONAL_CONFIRMATION_BIAS: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A distributional output (histogram, density plot, residual distribution) is interpreted with hedged language ("appears to support", "is consistent with") that nonetheless performs a confirmatory function the evidence cannot sustain',
    base_severity: 2, // TODO calibrate — no explicit severity in source; kit reports this "only if structurally load-bearing" at Q3
  },
  // Kit text: "the most structurally significant pattern in this kit";
  // remains "at full sensitivity regardless of field convention"; feeds
  // SYSTEMATIC (3+ patterns) into the Desk-Reject STRUCTURAL_COMPLETENESS_
  // RISK zone (kit 29, not yet ported).
  COMPLEMENTARITY_REFRAMING: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'When two methods or analytical approaches produce divergent results, the divergence is reframed as the methods addressing different aspects of the same phenomenon, without demonstrating why the difference in results follows from that',
    base_severity: 4, // TODO calibrate — no explicit severity in source, but kit calls this "the most structurally significant pattern" and keeps it at full sensitivity regardless of Q-variant or field
  },

  // --- SECTION 0: MACRO FRAME (partial — see PHASE 4 note) ---
  // Source: kit 19 (INTEGRITY SIGNAL KIT v1.0), read verbatim in full.
  // Secondary section: SECTION 3 (Methodological Visibility) for the
  // ANALYTIC_TOOL_INTERSECTION case specifically — see file header,
  // dual-homed-section limitation. base_severity: 0 by design — see
  // NON-EVALUATIVE SEVERITY DECISION in file header.
  OUTCOME_INSTRUMENT_INTERSECTION: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'Declared competing interest involves a tool, algorithm, or product used as the primary outcome or outcome-generating instrument in the study',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  ANALYTIC_TOOL_INTERSECTION: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'Declared competing interest involves a method, software, or algorithm central to the analytic pipeline',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  INTERPRETIVE_FRAMING_INTERSECTION: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'Declared competing interest creates directional pressure on how findings are framed toward a party with financial ties to authors',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // Source: kit 21 (ABSTRACT-BODY COHERENCE KIT v1.0), read verbatim in
  // full. Secondary section: SECTION 8 (Limits & Uncertainties) for
  // LIMIT_SIGNAL_GAP specifically — see file header, dual-homed-section
  // limitation. base_severity: 0 by design — see NON-EVALUATIVE SEVERITY
  // DECISION in file header.
  CLAIM_ESCALATION_ABSTRACT_EXCEEDS_BODY: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'Abstract makes a stronger claim than the body supports (e.g. abstract states a causal relationship the body presents as correlational only)',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  CLAIM_DEFLATION_BODY_EXCEEDS_ABSTRACT: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'Abstract understates claims present in the body; body Discussion or Conclusion makes stronger assertions or introduces claims not signaled in the abstract',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  SCOPE_BOUNDARY_GAP: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'Abstract declares a scope boundary (geographic, temporal, population) that the body does not respect, or vice versa',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  LIMIT_SIGNAL_GAP: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'Abstract acknowledges limitations not substantively addressed in the body, or body contains substantive limitations absent from the abstract',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  METHOD_SIGNAL_GAP: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'Abstract names a method or analytic approach that is inadequately described in the body, or the body method is more complex or different than the abstract implies',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // --- SECTION 1: AIM & SCOPE (full primary coverage — see PHASE 5 note) ---
  // Source: kit 16 (ORIENTATION LENS KIT v1.0), read verbatim in full.
  // Secondary section: SECTION 4 (Argumentation), where these function as
  // unsupported argumentative bridges — dual-homed-section limitation, see
  // file header. base_severity: 0 by design — see NON-EVALUATIVE SEVERITY
  // DECISION in file header.
  ONLY_OPTION_FRAMING: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript presents its approach as the only viable one without stating why alternatives were excluded',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  ALTERNATIVELESS_SCOPE: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Problem is defined in a way that pre-selects the solution, excluding competing interpretations by framing rather than argument',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  INEVITABILITY_LANGUAGE: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Scope of the study is presented as naturally or logically given rather than as a deliberate analytical choice',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  FORECLOSED_COMPARISON: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript acknowledges that alternatives exist but dismisses them without evidential basis',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  THRESHOLD_LOCK: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'A threshold, boundary, or cutoff is used as if it were a natural or standard value when it is in fact an analytical choice',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // Source: kit 23 (CONTRIBUTION FRAMING KIT v1.0), read verbatim in full.
  // Secondary section: SECTION 4 (Argumentation), where contribution
  // claims function as argumentative bridges — dual-homed-section
  // limitation, see file header. Unlike kit 16 above, this kit has its own
  // explicit LOW/MEDIUM/HIGH intensity calibration — see PHASE 5 note.
  PRIMACY_CLAIM_BOUNDED: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript asserts primacy ("first study to...") with an explicit scope boundary named (region, period, context)',
    base_severity: 1, // kit calibration: LOW — "bounded claim... proportionate to scope"
  },
  PRIMACY_CLAIM_UNBOUNDED: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript asserts primacy ("first study to...") as a universal claim with no scope boundary named',
    base_severity: 4, // kit calibration: HIGH — "unbounded, unanchored, or inflated"
  },
  KNOWLEDGE_BOUNDARY_ASSERTION: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Novelty claim qualified with epistemic hedging ("to our knowledge") but the literature gap is not demonstrated, only stated',
    base_severity: 3, // TODO calibrate — no bounded/unbounded variant, no direct calibration-text match
  },
  NOVELTY_ASSERTION_ANCHORED: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript claims novelty of method, framework, or contribution with the departure from prior work named and cited',
    base_severity: 1, // kit calibration: LOW (lower signal — departure from prior work named and cited)
  },
  NOVELTY_ASSERTION_UNANCHORED: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript claims novelty of method, framework, or contribution asserted without a comparative anchor to prior work',
    base_severity: 4, // kit calibration: HIGH — "unbounded, unanchored, or inflated"
  },
  GAP_ASSERTION_SUPPORTED: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript identifies a literature gap with citation support for the gap claim',
    base_severity: 1, // kit calibration: LOW — bounded/anchored, proportionate
  },
  GAP_ASSERTION_UNSUPPORTED: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript identifies a literature gap with no citation support, or the gap is defined so narrowly it is trivially true, or is contradicted by the manuscript\'s own reference list',
    base_severity: 3, // kit calibration: MEDIUM — exact match "gap asserted with limited support"
  },
  CONTRIBUTION_SCOPE_INFLATION: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Stated contribution exceeds what the study\'s design, scope, or data can deliver (e.g. multi-field contribution claimed from single-domain scope)',
    base_severity: 4, // kit calibration: HIGH — exact match "inflated relative to study design"
  },

  // Source: kit 28 (READER MODEL KIT v1.0), read verbatim in full.
  // Secondary section: SECTION 6 (Academic Language & Hedging) for
  // EXPLANATION_DEPTH and AUDIENCE_SHIFT specifically — dual-homed-section
  // limitation, see file header. Only the kit's alignment-gap / drift
  // signals are ported — see PHASE 5 note for why raw READER_PROFILE
  // classification is excluded.
  READER_EVIDENCE_TENSION: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Implied reader profile and the manuscript\'s actual evidence threshold diverge in ways that create positioning ambiguity (e.g. policy-adjacent framing with a low evidence threshold)',
    base_severity: 2, // TODO calibrate — no explicit severity in source
  },
  READER_EVIDENCE_MISMATCH: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Implied reader profile and the manuscript\'s actual evidence threshold are structurally incompatible (e.g. expert reader assumed but methods described at introductory level)',
    base_severity: 3, // TODO calibrate — kit describes this as "structurally incompatible", more severe than TENSION
  },
  EXPLANATION_DEPTH_OVER: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Basic concepts defined that the implied expert reader would already know, or foundational literature reviewed at introductory level in a specialist submission',
    base_severity: 1, // TODO calibrate — no explicit severity in source, treated as minor
  },
  EXPLANATION_DEPTH_UNDER: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Specialist assumptions made without definition in a cross-disciplinary framing context, or methods described at expert level when framing implies a broader audience',
    base_severity: 2, // TODO calibrate — no explicit severity in source
  },
  AUDIENCE_SHIFT_DETECTED: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Manuscript\'s implied reader shifts across zones — e.g. expert register in methods, policy-adjacent in discussion, general in conclusion',
    base_severity: 2, // TODO calibrate — no explicit severity in source
  },

  // --- SECTION 2: CONCEPTUAL / THEORETICAL FRAMEWORK (full primary
  // coverage — see PHASE 6 note) ---
  // Source: kit 20 (CITATION BEHAVIOR KIT v1.0), read verbatim in full.
  // Secondary section: SECTION 4 (Argumentation) — dual-homed-section
  // limitation, see file header. base_severity: 0 by design — see
  // NON-EVALUATIVE SEVERITY DECISION in file header.
  UNSUPPORTED_CLAIM_ZONE: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A claim is made without any accompanying citation in a zone where citation support is structurally expected (theoretical framework, methodological justification, or causal/interpretive claim in Discussion)',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  CONFIRMATORY_CITATION_PATTERN: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'Literature base consists predominantly of sources that support the manuscript\'s own position, with minimal or no engagement with contrastive or competing literature',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  ELEVATED_SELF_CITATION_DENSITY: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'Self-citations constitute 25% or more of the total reference list, or a single argument chain relies on 3+ consecutive self-citations',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  REFERENCE_AGE_SIGNAL: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'Citation base is concentrated in a narrow or outdated temporal window (majority pre-dating the manuscript by 10+ years) without acknowledgment of more recent developments',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  FIELD_CONCENTRATION_SIGNAL: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'All or nearly all citations draw from a single disciplinary tradition, without acknowledgment that the research question intersects with other fields',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // Source: kit 27 (INTERDISCIPLINARY TENSION KIT v1.0), read verbatim in
  // full. Secondary section: SECTION 3 (Methodological Visibility) —
  // dual-homed-section limitation, see file header. Only the two genuine
  // risk states are ported — see PHASE 6 note for why raw tradition-
  // profile classification is excluded. base_severity: 0 by design.
  TENSION_SUPPRESSED: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'Manuscript draws on two or more disciplinary traditions with incompatible foundational assumptions, used simultaneously without the incompatibility being opened, bridged, or justified',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  ASSUMPTION_INVISIBILITY: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A disciplinary assumption is treated as universal when it is in fact tradition-specific (may fire independently of tradition conflict, even in single-tradition manuscripts)',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // Source: kit 33 (CONCEPT-EVIDENCE BRIDGE KIT v1.0), read verbatim in
  // full. Secondary sections: SECTION 4 (Argumentation), SECTION 5
  // (Numerical/Spatial Behavior) — dual-homed-section limitation, see file
  // header. The kit's 4th named pattern, OPERATIONALIZATION_GAP, is NOT
  // duplicated here — it is the same canonical signal already ported in
  // Phase 1 from kit 40 A3; see PHASE 6 note.
  DECORATIVE_ABSTRACTION: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A high-register concept (e.g. "resilience", "sustainability", "complexity") is used to frame the manuscript in abstract and conclusion but never connected to methods or results',
    base_severity: 2, // TODO calibrate — kit de-prioritizes this relative to the claim-carrying patterns, see header
  },
  CLAIM_CARRYING_FLOAT: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A concept is used to make a claim in the conclusion but was never defined, measured, or grounded in the body',
    base_severity: 4, // kit calibration: "noted as potential desk-reject signal" at Q1
  },
  BORROWED_AUTHORITY_CONCEPT: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A concept is imported from a high-prestige theoretical tradition and used to elevate the manuscript\'s claims without engaging the tradition\'s internal debates or contested status',
    base_severity: 4, // kit text: "flagged at HIGH sensitivity" at Q1
  },

  // --- SECTION 5: NUMERICAL / SPATIAL BEHAVIOR (primary coverage — see
  // PHASE 7 note) ---
  // Source: kit 26 (NEGATIVE RESULT VISIBILITY KIT v1.0), read verbatim in
  // full. Secondary section: SECTION 8 (Limits & Uncertainties) —
  // dual-homed-section limitation, see file header. base_severity: 0 by
  // design — see NON-EVALUATIVE SEVERITY DECISION in file header.
  NULL_DEFLECTION_SURPRISE_FRAMING: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'A null or unexpected result is labeled "interesting" or "unexpected" without structural integration into the argument',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  NULL_DEFLECTION_FUTURE_DEFLECTION: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'A null result is acknowledged but redirected to future work ("warrants future investigation") rather than integrated or bounded here',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  NULL_DEFLECTION_PIVOT_SUPPRESSION: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'A null result is acknowledged then immediately abandoned, pivoting to a different result without explanation',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  NULL_DEFLECTION_SUPPLEMENTARY_ONLY: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'Non-significant results are displaced from the main text into supplementary materials only',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  HYPOTHESIS_REJECTION_SUPPRESSED: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'Hypothesis is stated in the introduction, but the Results section contains no clear rejection statement and Discussion proceeds as if it were partially confirmed',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  STRUCTURAL_NULL_ABSENCE: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'In a study design where null results would be structurally expected (multi-variable models, comparative or longitudinal studies), no null or non-significant result appears anywhere in the manuscript',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  SELECTIVE_PRESENTATION_SIGNAL: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'Language patterns structurally suggest results have been filtered before presentation (e.g. "selected results are presented below" without scope of non-selected findings)',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // --- SECTION 6: ACADEMIC LANGUAGE & HEDGING (primary coverage — see
  // PHASE 8 note) ---
  // Source: kit 37 (HEDGING-CALIBRATION KIT v1.0), read verbatim in full.
  // Secondary sections: SECTION 4 (Argumentation), SECTION 8 (Limits &
  // Uncertainties) — dual-homed-section limitation, see file header.
  // Kit 10 (Verbal Lens) contributes no entries here — see PHASE 8 note.
  SELECTIVE_HEDGING: {
    section: 'SECTION_6_LANGUAGE_HEDGING',
    label_en: 'The same claim type receives different hedging treatment in different locations — hedged in one zone, unhedged for the identical claim in another',
    base_severity: 2, // TODO calibrate — see PHASE 8 note for relative ranking
  },
  PROXIMITY_DRIFT: {
    section: 'SECTION_6_LANGUAGE_HEDGING',
    label_en: 'A hedge is present but positioned too far from the claim it nominally qualifies to function as a genuine constraint',
    base_severity: 2, // TODO calibrate — see PHASE 8 note for relative ranking
  },
  COMPOUND_PERFORMATIVE_HEDGING: {
    section: 'SECTION_6_LANGUAGE_HEDGING',
    label_en: 'Multiple hedging devices are stacked on a single claim in a way that performs caution without substantively constraining the claim',
    base_severity: 2, // TODO calibrate — see PHASE 8 note for relative ranking
  },
  CALIBRATION_FAILURE: {
    section: 'SECTION_6_LANGUAGE_HEDGING',
    label_en: 'Hedging level applied to a claim is structurally disproportionate to the evidence available — either under-hedged (claim stronger than evidence supports) or over-hedged (claim weaker than evidence supports)',
    base_severity: 3, // TODO calibrate — kit: "UNDER_HEDGED ... flagged at highest sensitivity" at Q1, see PHASE 8 note
  },
  HEDGE_STRIPPING: {
    section: 'SECTION_6_LANGUAGE_HEDGING',
    label_en: 'A hedged claim in one zone (e.g. Results) appears without its hedge in a later zone (e.g. Discussion or Conclusion) as it moves through the manuscript',
    base_severity: 3, // TODO calibrate — kit: "explicitly surfaced" at Q1, named directly in R1 reviewer language, see PHASE 8 note
  },

  // --- SECTION 7: STRUCTURAL INTEGRITY (full primary coverage — see
  // PHASE 9 note) ---
  // Source: kit 15 (SILENCE LENS KIT v1.0), read verbatim in full.
  // Secondary section: SECTION 8 (Limits & Uncertainties) —
  // dual-homed-section limitation, see file header. base_severity: 0 by
  // design — see NON-EVALUATIVE SEVERITY DECISION in file header.
  UNACKNOWLEDGED_COUNTER_CASE: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A pattern or finding is presented without acknowledging cases that contradict or complicate it (single-direction results with no variance discussion, "consistently..." with no exception handling)',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  UNADDRESSED_ALTERNATIVE: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A causal or interpretive claim is made without acknowledging competing explanations that are equally plausible',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  FRAMEWORK_MONOPOLY: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Manuscript operates within one theoretical tradition and treats it as the only available lens, without acknowledging that other frameworks exist',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  SUPPRESSED_SCOPE_LIMIT: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Manuscript\'s claims extend beyond what the data supports, but the extension is never flagged as a limit',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  SILENCED_UNCERTAINTY: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Uncertainty is present in the analysis (e.g. confidence intervals, model fit statistics) but suppressed in the surrounding language — not discussed or interpreted',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // Source: kit 13, "NUMERICAL HAT KIT v1.0" system (§7 FLAG SYSTEM),
  // read verbatim in full. Heading-only, content-free structural QA.
  // base_severity: 0 by design — see PHASE 9 note.
  MANDATORY_MISSING: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A mandatory section (Abstract, Introduction, Data, Methods, Results, Discussion, Limitations, Conclusion, or References) is absent from the heading structure',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  CONDITIONAL_MISSING: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A section conditionally required by the detected study type (e.g. identification strategy for causal studies, ethics/consent for human-subjects studies) is absent',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  DEPENDENCY_BREAK: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A section that structurally depends on another is present while its dependency is absent (e.g. Results without Methods, Discussion without Results)',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  ORDER_WARNING: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Section order deviates from the preferred reference flow (Front -> Intro -> Data -> Methods -> Results -> Discussion -> Conclusion -> Ethics -> References)',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  DOMAIN_SPEC_GAP: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A domain-specific structural expectation triggered by the detected study type (spatial, causal, ML/simulation, meta-analysis) is not met',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  AMBIGUOUS_HEADING: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A section heading cannot be confidently mapped to a fixed structural class',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  REDUNDANT_SECTION: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A section duplicates the structural role of another section in the manuscript',
    base_severity: 0, // by design — non-evaluative signal, see header; flag name shared by both of kit 13's two systems, see PHASE 9 note
  },
  SUBMISSION_ONLY_IGNORED: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'A submission-only section (cover letter, reviewer response) is present but was excluded from structural scoring as expected',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // Source: kit 13, "ACADEMIC STRUCTURE META-SYSTEM v1.0" system, modules
  // 3.1-3.5, 3.7-3.8 (3.6 excluded, see PHASE 9 note), read verbatim in
  // full. base_severity: 0 by design — see PHASE 9 note.
  ARGUMENT_GAP: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Academic Argument Structure Checker: a break in the expected Problem -> Motivation -> Claim -> Support -> Implication chain',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  CLAIM_WITHOUT_SUPPORT: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Academic Argument Structure Checker: a claim is present in the heading/structural map with no corresponding support element',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  IMPLICATION_WITHOUT_ANALYSIS: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Academic Argument Structure Checker: an implication is drawn with no corresponding analysis element behind it',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  THESIS_STYLE_IN_ARTICLE: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Thesis vs Article Structure Differentiator: manuscript submitted as an article carries thesis-style structural conventions',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  ARTICLE_STYLE_IN_THESIS: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Thesis vs Article Structure Differentiator: manuscript submitted as a thesis carries article-style structural conventions',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  STRUCTURAL_LENGTH_MISMATCH: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Thesis vs Article Structure Differentiator: section-level length distribution mismatches the manuscript\'s declared or inferred format',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  CONTRIBUTION_UNCLEAR: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Reviewer Expectation Mismatch Detector: heading/structural map does not make the contribution locatable',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  METHODS_UNDEREXPLAINED: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Reviewer Expectation Mismatch Detector: methods structural allocation is disproportionately thin relative to the manuscript\'s study type',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  DISCUSSION_TOO_THIN: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Reviewer Expectation Mismatch Detector: discussion structural allocation is disproportionately thin relative to the manuscript\'s results',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  OVER_SECTIONING: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Redundancy & Over-Sectioning Checker: manuscript is divided into more structural sections than its content density supports',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  FUNCTIONAL_DUPLICATION: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Redundancy & Over-Sectioning Checker: two or more sections serve the same structural function under different headings',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  DISCIPLINE_STYLE_MISMATCH: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Discipline Signal Mismatch Detector: heading conventions signal a discipline different from the one the manuscript\'s content structure implies',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  METHOD_DISCIPLINE_TENSION: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Discipline Signal Mismatch Detector: the structural placement of methods content signals a discipline inconsistent with the manuscript\'s heading conventions elsewhere',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  DESK_REJECT_RISK_HIGH: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Pre-Review Desk-Reject Risk Scanner: aggregated structural flags reach a high desk-reject risk profile from heading structure alone',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  DESK_REJECT_RISK_MEDIUM: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Pre-Review Desk-Reject Risk Scanner: aggregated structural flags reach a medium desk-reject risk profile from heading structure alone',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  TEMPLATE_DRIFT: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Template Drift Detector: heading structure departs from the journal or manuscript-type template it otherwise follows',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  STRUCTURAL_INCONSISTENCY: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Template Drift Detector: heading structure is internally inconsistent in naming or hierarchy conventions',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // --- SECTION 8: LIMITS & UNCERTAINTIES (primary coverage — see
  // PHASE 10 note) ---
  // Source: kit 36 (UNCERTAINTY-VISIBILITY KIT v1.0), read verbatim in
  // full. Secondary sections: SECTION 4 (Argumentation), SECTION 6
  // (Academic Language & Hedging) — dual-homed-section limitation, see
  // file header.
  UNCERTAINTY_VISIBILITY_SUPPRESSED: {
    section: 'SECTION_8_LIMITS_UNCERTAINTIES',
    label_en: 'One or more primary claims carry no uncertainty acknowledgment at all; scope match is absent or severely asymmetric, language register is assertive for bounded claims',
    base_severity: 3, // TODO calibrate — worst composite profile, see PHASE 10 note
  },
  UNCERTAINTY_INTEGRATION_PERFORMATIVE: {
    section: 'SECTION_8_LIMITS_UNCERTAINTIES',
    label_en: 'A Limitations section is present but does not connect to or constrain the claims made elsewhere in the manuscript',
    base_severity: 3, // kit text: "PERFORMATIVE is the signal of concern"
  },
  UNCERTAINTY_SCOPE_ASYMMETRIC: {
    section: 'SECTION_8_LIMITS_UNCERTAINTIES',
    label_en: 'Major claims are left without uncertainty acknowledgment while minor or secondary claims are acknowledged',
    base_severity: 2, // TODO calibrate — partial-gap state, see PHASE 10 note
  },
  UNCERTAINTY_REGISTER_ASSERTIVE: {
    section: 'SECTION_8_LIMITS_UNCERTAINTIES',
    label_en: 'Claims are stated without hedging markers despite bounded evidence, read at the uncertainty-positioning level (distinct from kit 37\'s hedging-consistency signals)',
    base_severity: 2, // TODO calibrate — partial-gap state, see PHASE 10 note
  },

  // --- SECTION 9: FIGURE / TABLE INTEGRITY (full primary coverage — see
  // PHASE 11 note) ---
  // Source: kit 41 (FIGURE/TABLE INTEGRITY KIT v1.1), read verbatim in
  // full. Secondary section: SECTION 5 (Numerical/Spatial Behavior) —
  // dual-homed-section limitation, see file header.

  // M1 — CLAIM-VISUAL TENSION
  VISUAL_CLAIM_ASYMMETRY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Text claim and visual representation diverge directionally',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  RHETORICAL_AMPLIFICATION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Figure framing exaggerates the textual claim it accompanies',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  UNDER_VISUALIZED_NULL_EFFECT: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A null or non-significant result is minimized visually',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  VISUAL_EMPHASIS_MISMATCH: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Visual salience in a figure does not match the analytical importance of what it depicts',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  FIGURE_EXAGGERATION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Figure overstates the magnitude of the reported effect',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  ABSTRACT_TABLE_DIVERGENCE: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Abstract claims diverge from the values reported in a table',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },

  // M2 — TABLE SILENCE
  SELECTIVE_TABLE_OMISSION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A critical variable is absent from a table without explanation',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  SUPPLEMENT_DISPLACEMENT: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Key data has been moved to supplementary material out of the main text',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  HIDDEN_NULL_ZONE: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Non-significant results are not shown in a table where they would be expected',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  SURVIVORSHIP_DISPLAY_BIAS: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Only successful conditions or outcomes are displayed in the table',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  OMISSION_ASYMMETRY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Omissions from tables or figures systematically favor one conclusion over another',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  SUBGROUP_OPACITY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Subgroup separation criteria used in a table are not explained',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  CATEGORY_COLLAPSE: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Categories are merged in a table without justification',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  OUTLIER_INVISIBILITY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Outliers are absent from or unexplained in a table or figure',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },

  // M3 — CROSS-LAYER CONSISTENCY
  TABLE_TEXT_MISMATCH: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Table values do not match their description in the text',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  SAMPLE_SIZE_DRIFT: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Different sample-size (n) values appear across abstract, table, and analysis',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  TEMPORAL_MISMATCH: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Time ranges differ between the text and a figure or table',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  METRIC_LABEL_INCONSISTENCY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'The same metric is labeled differently across text, tables, and figures',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  UNIT_INCONSISTENCY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'The same variable is reported in different units across the manuscript',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  DERIVED_METRIC_OPACITY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A derived score\'s calculation is not explained',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  NORMALIZATION_AMBIGUITY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Normalized values lack a stated reference baseline',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  CROSS_LAYER_REPRESENTATIONAL_DRIFT: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Systemic numerical or representational divergence across abstract, tables, figures, and discussion',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  DECIMAL_INCONSISTENCY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Decimal precision varies across cells within the same table, or between tables reporting the same type of value (e.g. 23.4% vs 23.40%)',
    base_severity: 3, // kit text: "MEDIUM at Q1" — fixed-Q1 port per established convention
  },
  FORMAT_INVERSION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Table columns report values in an order that inverts the column header\'s stated order (e.g. percentage before frequency when the header reads "n (%)")',
    base_severity: 3, // kit text: "MEDIUM (creates reader misread risk at any Q-tier)"
  },

  // M4 — UNCERTAINTY AUDIT
  CONFIDENCE_INTERVAL_ABSENCE: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Confidence interval not reported in a figure or table where expected (figure/table-layer variant — see PHASE 11 note)',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  ERROR_BAR_AMBIGUITY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Error bars in a figure are not labeled as SD, SE, or CI',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  EFFECT_SIZE_ABSENCE: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Only a p-value is reported in a table or figure; effect size is missing (figure/table-layer variant — see PHASE 11 note)',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  NON_SIGNIFICANT_RESULT_HIDING: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Non-significant results are visually de-emphasized in a figure or table',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  MULTIPLE_COMPARISON_SILENCE: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Multiple statistical tests are run in a table but no multiple-comparison correction is reported',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  MODEL_FIT_UNDERINTERPRETATION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Weak model-fit indices appear in a table but are not discussed in the text',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  MISSING_DENOMINATOR: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A percentage is reported in a table without its denominator specified',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  BASELINE_MISSING: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'No baseline value is provided for comparison in a table or figure',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  ROUNDING_DISTORTION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Rounding in a table or figure changes the interpretive meaning of a value',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },

  // M5 — VISUAL RHETORIC
  TRUNCATED_AXIS_INFLATION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A cut y-axis inflates the visual difference between plotted values',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  VISUAL_SCALE_COMPRESSION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A compressed scale minimizes a real difference between plotted values',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  COLOR_CODED_BIAS: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Color choices in a figure create a directional perception bias',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  LEGEND_INSUFFICIENCY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A figure\'s legend is insufficient to interpret the figure correctly',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },
  CAPTION_CLAIM_MISMATCH: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A figure caption states a stronger claim than the data in the figure supports',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  AXIS_DISTORTION: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Axis scaling distorts the true relationship between plotted values',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  SALIENCE_STEERING: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'Visual design guides reader attention toward a preferred result',
    base_severity: 4, // TODO calibrate — see PHASE 11 note
  },
  SCALE_DIRECTION_AMBIGUITY: {
    section: 'SECTION_9_FIGURE_TABLE_INTEGRITY',
    label_en: 'A figure or table does not specify which direction on a scale represents a high score',
    base_severity: 3, // TODO calibrate — see PHASE 11 note
  },

  // --- SECTION 10: REPRODUCIBILITY & OPEN SCIENCE (full primary coverage
  // — see PHASE 12 note) ---
  // Source: kit 42 (REPRODUCIBILITY & OPEN SCIENCE KIT v1.2), read
  // verbatim in full. Secondary sections: SECTION 3 (Methodological
  // Visibility) for M02/M03/M06, SECTION 7 (Structural Integrity) for
  // M05/M10/M12 — dual-homed-section limitation, see file header.
  // Severities derived from kit 42's own §4 module-tier synthesis rules,
  // not modulated by manuscript type — see PHASE 12 note (kit 42b gating
  // not yet built in code).

  // CRITICAL tier (base_severity: 4)
  DATA_AVAILABILITY_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M01: underlying data is not accessible to an independent reader — no data availability statement, or "available upon request" only',
    base_severity: 4, // kit §4: CRITICAL module, ABSENT -> risk tone minimum HIGH
  },
  CODE_SOFTWARE_AVAILABILITY_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M02: analysis cannot be computationally reproduced — no shared code/software, no version numbers, or software named without a version (includes the simulation-specific checklist: version, geometry/materials, physics list, output archival)',
    base_severity: 4, // kit §4: CRITICAL module, ABSENT -> risk tone minimum HIGH
  },
  PREREGISTRATION_STATUS_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M04: hypotheses and analysis plan were not registered before data collection, or pre-registration is claimed with no ID/link, or registration is retrospective',
    base_severity: 4, // kit §4: CRITICAL module, ABSENT -> risk tone minimum HIGH
  },
  REANALYSIS_FEASIBILITY_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M06: insufficient statistical information (means, SDs, N, test statistics, effect sizes) for an independent researcher to verify reported results, or reported values are internally inconsistent',
    base_severity: 4, // kit §4: CRITICAL module, ABSENT -> risk tone minimum HIGH
  },
  ETHICS_IRB_COMPLIANCE_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M12: no ethics approval statement, approving body, or informed consent procedure in a study involving human or animal participants',
    base_severity: 4, // kit §4: CRITICAL module, ABSENT -> risk tone minimum HIGH
  },
  TEMPORAL_CONSISTENCY_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M14: chronological sequence of study events is internally inconsistent or implausible (e.g. pre-registration date after data collection start, anachronistic citations, contradictory dates across sections)',
    base_severity: 4, // kit §4: CRITICAL module, ABSENT -> risk tone minimum HIGH
  },
  SELECTIVE_REPORTING_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M15: reported outcomes appear to represent a selected subset of analyses conducted — pre-registered outcomes missing from results, outcome switching, or exploratory analyses presented as confirmatory',
    base_severity: 4, // kit §4: CRITICAL module, ABSENT -> risk tone minimum HIGH
  },

  // STANDARD tier (base_severity: 3)
  MATERIALS_PROTOCOL_TRANSPARENCY_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M03: insufficient procedural detail for independent replication — instruments, protocol, equipment settings, or recruitment/inclusion criteria not adequately described',
    base_severity: 3, // kit §4: STANDARD module, ABSENT -> MEDIUM contribution to overall risk
  },
  SUPPLEMENTARY_FILE_AUDIT_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M05: supplementary materials are mentioned but their content is not described, or critical data/analysis is located only in supplements with no main-text summary',
    base_severity: 3, // kit §4: STANDARD module, ABSENT -> MEDIUM contribution to overall risk
  },
  AUTHORSHIP_CONTRIBUTION_TRANSPARENCY_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M10: no author contribution statement, or a vague one for a large author list, or missing/incomplete corresponding-author contact — including large collaborations (N>20) without a CRediT statement',
    base_severity: 3, // kit §4: STANDARD module, ABSENT -> MEDIUM contribution to overall risk
  },
  FUNDING_NOT_VISIBLE_IN_TEXT: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M11: no funding statement or conflict-of-interest statement of any kind is visible in the manuscript text (kit\'s own label — deliberately not "FUNDING_ABSENT", since double-blind workflows may route this to the editorial system rather than the manuscript body)',
    base_severity: 3, // kit §4: STANDARD module, ABSENT -> MEDIUM contribution to overall risk
  },
  DATA_PROVENANCE_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M13: origin of the underlying data is not declared (primary/secondary/public/synthetic/AI-generated), or a secondary dataset is used with no citation, version, or access date',
    base_severity: 3, // kit §4: STANDARD module, ABSENT -> MEDIUM contribution to overall risk
  },
  VERSION_AMENDMENT_TRACKING_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M16: a detectable prior preprint or version is not disclosed, or substantive differences between preprint and submitted version are not acknowledged',
    base_severity: 3, // kit §4: STANDARD module, ABSENT -> MEDIUM contribution to overall risk
  },

  // CONTEXTUAL tier (base_severity: 1) — M08 excluded, see PHASE 12 note
  JOURNAL_POLICY_COMPLIANCE_GAP: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M07: manuscript does not meet the named target journal\'s stated open science requirements (data/code sharing, pre-registration, ethics, AI disclosure)',
    base_severity: 1, // kit §4: CONTEXTUAL module, "do not independently drive overall risk escalation"
  },
  AI_DISCLOSURE_ABSENT: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'M09: no statement about AI tool use is present at all — neither disclosure of use nor an explicit "no AI tools were used" statement',
    base_severity: 1, // kit §4: CONTEXTUAL module, "do not independently drive overall risk escalation"; kit notes a within-module CRITICAL escalation specifically for an undisclosed AI-generated dataset, not modeled in this flat severity
  },

  // --- SECTION 4 EXTENSIONS: kits 24, 25, 30, 32, 34, 35 (full coverage
  // — see PHASE 13 note) ---

  // Source: kit 24 (DISCUSSION SCOPE DRIFT KIT v1.1), read verbatim in
  // full. Secondary section: SECTION 8 (Limits & Uncertainties).
  CAUSAL_DRIFT: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Results present correlational/associational/descriptive findings; Discussion reframes them as causal',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  SCALE_DRIFT: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Results are reported within a defined scope (sample, region, time period); Discussion extends beyond that scope without flagging the transition',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  MECHANISM_INTRODUCTION_UNSUPPORTED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Discussion introduces an explanatory mechanism not present in Results and not cited from prior literature',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  IMPLICATION_EXTENSION: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Discussion introduces policy, clinical, social, or practical implications that the study design cannot support',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },

  // Source: kit 25 (ARGUMENT SYMMETRY KIT v1.1), read verbatim in full.
  // Secondary section: SECTION 8 (Limits & Uncertainties).
  ARGUMENT_ASYMMETRY_STRUCTURAL: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Two or more manuscript zones show claim weight exceeding limit-acknowledgment weight (STRUCTURALLY ASYMMETRIC manuscript profile)',
    base_severity: 3, // TODO calibrate — kit: "noted as potential reviewer concern" at Q1
  },
  ARGUMENT_SYMMETRY_INVERTED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Limit-acknowledgment weight exceeds claim weight — a self-suppression pattern, rare but structurally significant',
    base_severity: 4, // TODO calibrate — kit: "structurally significant... retained at all Q-variants"
  },

  // Source: kit 30 (ARGUMENT CHAIN KIT v1.0), read verbatim in full.
  // Secondary sections: SECTION 0 (Macro Frame), SECTION 8 (Limits &
  // Uncertainties).
  CLAIM_NOT_ANCHORED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'No explicit central claim is identifiable in the framing zone (title, abstract, introduction), so longitudinal chain tracking cannot proceed',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  CHAIN_PROFILE_BROKEN: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The central claim is lost (no longer traceable) at one or more argument transitions without recovery',
    base_severity: 4, // kit text: "LOST is a high signal"
  },
  CHAIN_PROFILE_UNRESOLVED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The central claim reaches the conclusion in a transformed or expanded state without acknowledgment of the change',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  CHAIN_PROFILE_DRIFTED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Two or more argument transitions show the central claim expanded or transformed without recovery',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  CLAIM_SUBSTITUTION: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'A new claim not present in the framing zone emerges in Discussion or Conclusion and displaces the original claim',
    base_severity: 3, // TODO calibrate — kit: "noted as potential reviewer concern" at Q1, "particularly weighted" in Revision Round Mode
  },
  CLAIM_FRAGMENTATION: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The central claim, stated as unified in the framing zone, is operationalized as multiple disconnected sub-claims that are never reintegrated',
    base_severity: 2, // TODO calibrate — kit: suppressed at Q3 unless co-occurring with Desk-Reject SCOPE_FIT_RISK
  },
  CLAIM_ABANDONMENT: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The central claim is introduced and developed through Methods, then silently not addressed in Results or Discussion',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },

  // Source: kit 32 (ARGUMENT LOAD KIT v1.0), read verbatim in full.
  // Secondary section: SECTION 0 (Macro Frame).
  ARGUMENT_LOAD_FRONT_LOADED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Claim density in the framing zone (Abstract+Intro+Aim) significantly exceeds the core and closing zones',
    base_severity: 3, // TODO calibrate — kit: "explicitly surfaced" at Q1
  },
  ARGUMENT_LOAD_BACK_LOADED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Claim density in the closing zone (Discussion+Conclusion) significantly exceeds the framing and core zones',
    base_severity: 3, // kit: "explicitly surfaced" at Q1; BACK-LOADED specifically named "common reviewer concern" at Q3
  },
  ARGUMENT_LOAD_METHODS_HEAVY: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The methods zone carries unusually high claim density for a conventionally low-claim zone',
    base_severity: 3, // kit text: "signals methodological over-claiming"
  },
  LOAD_SHIFT_DETECTED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Claim density changes abruptly between adjacent structural zones without structural explanation',
    base_severity: 3, // TODO calibrate — kit: "MODERATE or MAJOR magnitude noted as potential reviewer concern" at Q1
  },
  METHODS_CLAIM_DENSITY: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Methodological choices are framed as contributions, or procedural descriptions carry superiority language, within the methods section',
    base_severity: 3, // kit text: "noted at HIGH sensitivity" at Q1
  },

  // Source: kit 34 (CONCLUSION INTEGRITY KIT v1.0), read verbatim in full.
  // Secondary sections: SECTION 8 (Limits & Uncertainties), SECTION 0
  // (Macro Frame).
  CONCLUSION_NEW_CLAIM: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'A claim appears in the conclusion that was not present in results or discussion (canonical id shared with kit 24\'s equivalent signal, see PHASE 13 note)',
    base_severity: 3, // TODO calibrate — kit: "MODERATE or MAJOR explicitly surfaced" at Q1
  },
  CONCLUSION_CONTRIBUTION_INFLATION: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The conclusion\'s contribution claim exceeds what the study\'s design, scope, or data can support, relative to what results and discussion delivered',
    base_severity: 3, // TODO calibrate — kit: "at HIGH noted" at Q2
  },
  RESULT_CONCLUSION_DISPROPORTION: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The conclusion is significantly denser in claim weight than the results it summarizes, in either direction (inflating beyond results or retreating from what results support)',
    base_severity: 3, // TODO calibrate — kit: reported even at Q3
  },
  LIMITATION_REVERSAL: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'A limitation acknowledged in SECTION 8 is functionally ignored in the conclusion\'s claim framing',
    base_severity: 3, // TODO calibrate — kit: "noted as potential reviewer concern" at Q1, reported even at Q3
  },

  // Source: kit 35 (OVERREACH-SIGNAL KIT v1.0), read verbatim in full. 6
  // of its 8 catalogued types are new entries — Types 3 (POLICY_OVERREACH)
  // and 5 (CONTRIBUTION_OVERREACH) match existing Phase-1 kit-40 entries
  // and were not duplicated, see PHASE 13 note.
  CAUSAL_OVERREACH: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Causal language ("causes", "leads to", "drives") applied to a relationship the design does not support (correlational, cross-sectional, observational)',
    base_severity: 4, // kit's own MAJOR-severity worked example is this type, see PHASE 13 note
  },
  GENERALIZATION_OVERREACH: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'A finding is generalized beyond the study\'s population, geography, time frame, or sample characteristics without an acknowledged boundary',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  NOVELTY_OVERREACH: {
    section: 'SECTION_1_AIM_SCOPE',
    label_en: 'Claims of unprecedented originality, first-ever status, or unique contribution without comparative basis ("no study has ever", "unprecedented")',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  TEMPORAL_OVERREACH: {
    section: 'SECTION_5_NUMERICAL_SPATIAL',
    label_en: 'Cross-sectional or short time-horizon findings framed as longitudinal trends or durable patterns without an acknowledged temporal boundary',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  TRANSLATIONAL_OVERREACH: {
    section: 'SECTION_6_LANGUAGE_HEDGING',
    label_en: 'Findings from one domain, population, or context applied directly to a different domain without an acknowledged translational gap',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },
  DISCIPLINARY_OVERREACH: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'Claims extend into adjacent disciplinary territory without methodological grounding in that field\'s norms or an acknowledged disciplinary boundary',
    base_severity: 3, // TODO calibrate — see PHASE 13 note
  },

  // --- PRIORITY ACTION SIGNALS layer (see PHASE 14 note) ---
  // Source: kit 44 (ACTION PRIORITY BLOCK KIT v1.7) Tier 2 list, cross-
  // confirmed by kit 09 §1.11's own "Coordination" note (both read
  // verbatim in full). Distinct from SHOT_TO_SHOT_STABILITY_NOT_
  // INDEPENDENTLY_VALIDATED (Phase 2) — see PHASE 14 note for why these
  // are two separate, co-occurring signals, not a duplicate.
  VALIDATION_CIRCULARITY: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A stability or validation check is presented as evidence, but the check itself uses the same dataset the technique under evaluation is applied to — not independent validation',
    base_severity: 4, // kit 09: co-occurs with and matches the severity of its HIGH-tier sibling signal, see PHASE 14 note
  },

  // --- FIELD-SPECIFIC SIGNALS (SECTION 0/3 remainder — see PHASE 15
  // note) ---
  // Source: kit 38 (JOURNAL-SENSITIVITY KIT v1.0) §4.x "Field-specific
  // signals" subheadings, read verbatim in full. Ported at flat baseline
  // severity — kit 38's own SUPPRESS/AMPLIFY/RECLASSIFY field-gating
  // architecture is not yet built in code, same caveat as the Phase 2
  // physics signals.
  RISK_FRAMING_SIGNAL: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-MED: only relative risk is reported for a clinical claim, with no absolute risk figures given',
    base_severity: 3, // kit text: "MEDIUM signal"
  },
  NNT_ABSENT_SIGNAL: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-MED: number needed to treat is absent from a clinical treatment-effect claim',
    base_severity: 3, // TODO calibrate — grouped with sibling FIELD-MED signals, see PHASE 15 note
  },
  RESPONSE_RATE_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-SOC: survey response rate is not reported',
    base_severity: 3, // kit text: "MEDIUM signal"
  },
  SAMPLING_FRAME_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-SOC: sampling frame is not described',
    base_severity: 3, // kit text: "MEDIUM signal"
  },
  PRIMARY_SOURCE_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-HUM: primary source citation is absent for a historical claim',
    base_severity: 3, // kit text: "Intensity: MEDIUM/HIGH depending on claim weight" — TODO calibrate, flat placeholder
  },
  ARCHIVAL_BASIS_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-HUM: archival basis is not described for a historical argument',
    base_severity: 2, // TODO calibrate — see PHASE 15 note
  },
  JURISDICTION_UNSPECIFIED: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-LAW: jurisdiction is not specified for a legal claim',
    base_severity: 3, // TODO calibrate — see PHASE 15 note
  },
  LEGAL_TEMPORAL_SCOPE_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-LAW: temporal scope of a legal analysis is not declared',
    base_severity: 2, // TODO calibrate — see PHASE 15 note
  },
  COMPLEXITY_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-ENG: computational complexity is not reported for an algorithm',
    base_severity: 2, // TODO calibrate — see PHASE 15 note
  },
  BENCHMARK_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-ENG: benchmark comparison is absent',
    base_severity: 3, // kit: named directly as "most frequently raised in field-specific R1 reviewer comments", see PHASE 15 note
  },
  DATASET_CHARACTERIZATION_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-ENG: dataset size and characteristics are not reported',
    base_severity: 2, // TODO calibrate — see PHASE 15 note
  },
  INTERVENTION_FIDELITY_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-EDU: intervention fidelity is not reported',
    base_severity: 3, // TODO calibrate — see PHASE 15 note
  },
  INSTRUCTOR_EFFECT_ABSENT: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'FIELD-EDU: teacher/instructor effect is not addressed',
    base_severity: 2, // TODO calibrate — see PHASE 15 note
  },

  // --- PHASE 16: kit 43 (SOURCE INTEGRITY KIT v1.1), full coverage ---
  // CAT-A/B/D primary section SECTION 3 per kit text.
  CLAIMED_VALUE_WITHOUT_VERIFICATION_PATH: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A specific numerical value is attributed to a cited source with no access information, DOI, or verification pathway provided',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  DATA_TYPE_CLAIM_SIGNAL: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Manuscript explicitly declares the data type of a cited value (directly measured / model estimate / secondary report / RCT / meta-analysis) — noted for transparency',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  CONTEXT_MISMATCH_SIGNAL: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Citation context signals a potential mismatch between what is claimed and what the source likely contains — population, condition, direction, or version dimension',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  ARGUMENT_FRAGILITY_SIGNAL: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A primary conclusion rests on a single source with no corroborating citation visible in that argument zone',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  CRITICAL_PATH_SOURCE: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A source appears multiple times along the critical argument path (premise and conclusion zones), creating cascading dependency fragility',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  DATA_TYPE_CONFLATION_PATTERN: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Across the manuscript, model estimates, computational outputs, or secondary reports are systematically described using language associated with direct measurement',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  PRECISION_INFLATION_SIGNAL: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A numerical value is reported with a precision level inconsistent with the measurement instrument or data type described',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  // CAT-C primary section SECTION 2 per kit text.
  HIGH_STAKES_SELF_CITATION: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A primary claim\'s sole evidential support is a self-citation by the same first author, with no independent corroboration',
    base_severity: 3, // TODO calibrate — named in kit 44's PAS Tier 4 list, see PHASE 16 note
  },
  SELF_CITATION_CHAIN: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'Three or more consecutive self-citations form the sole evidential base for an argument chain',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  // CAT-D primary section SECTION 3 per kit text.
  SOURCE_DECLARED_WITHOUT_ACCESS_PATH: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Grey literature, institutional report, conference proceeding, or thesis is cited with no DOI, URL, or repository link',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  PREPRINT_WITHOUT_DISCLOSURE: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A source shows preprint characteristics (server prefix, "preprint" in title/description) but is cited as if peer-reviewed',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  RETRACTION_RISK_INDICATOR: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Within-manuscript evidence suggests a cited source may have been retracted or corrected (e.g. inconsistent findings across sections suggesting an erratum)',
    base_severity: 0, // by design — non-evaluative signal, see header
  },
  // CAT-E primary section SECTION 7 (structural integrity) per kit text.
  RETRACTION_SIGNAL_FROM_TEXT: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'Manuscript explicitly cites a source that it elsewhere identifies as retracted or under correction, without acknowledging the impact on cited claims',
    base_severity: 3, // TODO calibrate — named in kit 44's PAS Tier 4 list, see PHASE 16 note
  },
  CORRECTION_WITHOUT_UPDATE: {
    section: 'SECTION_7_STRUCTURAL_INTEGRITY',
    label_en: 'An erratum or correction is mentioned for a source, but the cited value or claim has not been updated to reflect the correction',
    base_severity: 0, // by design — non-evaluative signal, see header
  },

  // --- PHASE 16: kit 47 (EPISTEMIC FRAME KIT v1.0), full coverage ---
  FRAME_METHOD_MISALIGNED: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Clear inconsistency between the manuscript\'s operational epistemic frame and its methodological practice (e.g. interpretivist stance applying positivist validity criteria)',
    base_severity: 4, // kit table: "MISALIGNED ... Signal level: HIGH"
  },
  FRAME_METHOD_PARTIAL_TENSION: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Partial misalignment between the manuscript\'s operational epistemic frame and its methodological practice',
    base_severity: 3, // kit table: "PARTIAL_TENSION ... Signal level: MEDIUM"
  },
  FRAME_CONTRIBUTION_MISALIGNED: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Clear inconsistency between the manuscript\'s contribution claim and what its epistemic frame can deliver (e.g. post-structuralist manuscript claims definitive findings)',
    base_severity: 4, // kit table: "MISALIGNED ... Signal level: HIGH"
  },
  FRAME_CONTRIBUTION_PARTIAL_TENSION: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Partial tension between the manuscript\'s contribution claim and what its epistemic frame can deliver (e.g. critical manuscript claims empirical contribution without a frame bridge)',
    base_severity: 3, // kit table: "PARTIAL_TENSION ... Signal level: MEDIUM"
  },
  FRAME_UNIVERSALIZATION: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'One epistemic frame is presented as self-evidently correct without acknowledgment of alternatives ("research must be...", "rigorous analysis demands...")',
    base_severity: 3, // TODO calibrate — graded LOW/MEDIUM/HIGH per instance in source, see PHASE 16 note
  },
  ALTERNATIVE_ERASURE: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'Competing epistemological frameworks are absent or dismissed without substantive engagement, in a zone where alternative engagement is structurally expected',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  INEVITABILITY_ARCHITECTURE: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'Manuscript builds toward a conclusion framed as the only logical outcome, with the argument never acknowledging that other conclusions were possible',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  EPISTEMIC_PRIVILEGE: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A methodological choice is presented as neutral or self-evident when it in fact reflects a specific epistemic commitment',
    base_severity: 2, // TODO calibrate — see PHASE 16 note
  },
  FRAME_VISIBILITY_INVISIBLE: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'Manuscript operates as if epistemologically neutral — no positioning statement present or implied, read against disciplinary expectation',
    base_severity: 2, // TODO calibrate — kit: read against disciplinary norms, not a universal defect, see PHASE 16 note
  },

  // --- PHASE 16: kit 48 (CONCEPT LIFECYCLE KIT v1.0) ---
  SEMANTIC_DRIFT: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A concept\'s meaning shifts between appearances across the manuscript without explicit acknowledgment',
    base_severity: 2, // TODO calibrate — see PHASE 16 note
  },
  SCOPE_INFLATION: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A concept\'s referential scope expands silently between appearances (e.g. "study community" becomes "society")',
    base_severity: 2, // TODO calibrate — see PHASE 16 note
  },
  AUTHORITY_TRANSFER: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A concept\'s epistemic authority is borrowed from its source domain and transferred to the manuscript\'s domain without bridge language',
    base_severity: 3, // kit: "AUTHORITY_TRANSFER flagged at HIGH sensitivity" at Q1
  },
  REIFICATION: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'An analytical concept is treated as a real entity rather than an analytical tool',
    base_severity: 2, // TODO calibrate — see PHASE 16 note
  },
  EPISTEMIC_LOADING: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A concept accumulates argumentative weight beyond what its definition and evidence support, becoming shorthand for claims the manuscript cannot otherwise make',
    base_severity: 3, // TODO calibrate — defines the mechanism behind UNGROUNDED_CARRIER, see PHASE 16 note
  },
  UNGROUNDED_CARRIER: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A concept reaches epistemic-carrier status (performs argumentative functions independently) without adequate definition or evidence support',
    base_severity: 4, // kit text: "Signal: HIGH"
  },
  PARTIALLY_GROUNDED_CARRIER: {
    section: 'SECTION_2_CONCEPTUAL',
    label_en: 'A concept reaches epistemic-carrier status with only partial definition and evidence support',
    base_severity: 3, // kit text: "Signal: MEDIUM"
  },

  // --- PHASE 16: kit 49 (METHODOLOGICAL VERBAL RISK KIT v1.0), full
  // coverage — all 5 signals primary SECTION 3 per kit text ---
  PROCEDURAL_OPACITY: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A core methodological procedure is named but not described at a level permitting independent replication or assessment',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  SATURATION_CLAIM_WITHOUT_GROUNDING: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Data/theoretical saturation or sample sufficiency is claimed without stating the criterion by which it was determined',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  LEGITIMATION_BY_LABEL: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A recognized method or framework is named as if the naming itself constitutes methodological justification, without describing how it was operationalized in this study',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  RIGOR_VOCABULARY_WITHOUT_PRACTICE: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Quality-assurance language from qualitative research traditions (trustworthiness, credibility, reflexivity) is invoked without the corresponding practice being described',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  SAMPLING_CIRCULARITY: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'The sample is justified by criteria that are circular — described as appropriate because it produced the findings, or selection criteria reproduce the conclusions they were meant to test',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },

  // --- PHASE 16: kit 50 (CROSS-CONSISTENCY KIT v1.0), 5 of 6 zone pairs
  // (Pair 1 folds into ABSTRACT_CONCLUSION_DIVERGENCE, see PHASE 16 note)
  CONSISTENCY_GAP_INTRO_CONTRIBUTION: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The research problem framed in the introduction is not the problem the manuscript\'s contribution actually addresses',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  CONSISTENCY_GAP_LITERATURE_METHODOLOGY: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'Methodological choices are inconsistent with the theoretical tradition established in the literature review (e.g. interpretivist literature base, positivist validity criteria in methods)',
    base_severity: 4, // kit: "at HIGH sensitivity — Q1 reviewers weight epistemological coherence heavily"
  },
  CONSISTENCY_GAP_THEORY_FINDINGS: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The theoretical framework established in the conceptual section is not operationally present in the findings (e.g. a named central concept never referenced in results)',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  CONSISTENCY_GAP_METHODOLOGY_DISCUSSION: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'The discussion\'s claims exceed the methodological scope established in the methodology section (e.g. an exploratory 12-participant study framed as indicative in discussion)',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  CONSISTENCY_GAP_CONTRIBUTION_LIMITATION: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'The manuscript\'s contribution claims are disproportionate to its acknowledged limitations (e.g. "first comprehensive study" contradicted by a single-national-context limitation)',
    base_severity: 4, // kit: "retained at full sensitivity regardless of Q-variant — universally important"
  },

  // --- PHASE 16: kit 51 (CITATION INTEGRITY MODULE M17 v1.0), 2 of 5
  // signal types (S1/S2/S4 fold into existing kit-43 entries, see PHASE
  // 16 note). Both placed in SECTION 10 per the kit's own explicit
  // statement of its position.
  CITATION_CLAIM_FIT: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'The citation type declared in the text (e.g. "directly measured", "meta-analysis showed") does not match the claim type or publication type visible from the reference entry',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  CITATION_DENSITY_ANOMALY: {
    section: 'SECTION_10_REPRODUCIBILITY',
    label_en: 'Citation behavior in a section is structurally anomalous relative to its claim load — undercitation (claims outnumber citations 2:1+) or citation clustering (60%+ of citations in one paragraph)',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },

  // --- PHASE 16: kit 57 (BETA SIGNAL KIT v1.1), full coverage ---
  REVIEW_AS_ADVOCACY_PATTERN: {
    section: 'SECTION_0_MACRO_FRAME',
    label_en: 'A manuscript presented as a review article behaves structurally as a position paper or advocacy document (3+ of: self-citation concentration, abstract claim overreach, asymmetric coverage of competing approaches, absent selection criteria, figure/section weight imbalance) without declaring this framing',
    base_severity: 3, // TODO calibrate — kit: "noted as potential desk-reject signal" at Q1, see PHASE 16 note
  },
  LOSS_PHYSICS_ALIGNMENT_GAP: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A manuscript applies an ML loss function and makes downstream physical-inference-quality claims without demonstrating or citing that minimizing the loss improves the stated inference',
    base_severity: 3, // TODO calibrate — see PHASE 16 note
  },
  TRAINING_PRIOR_LEAKAGE: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A model trained on synthetic data claims generalization to observational or out-of-distribution data with no ablation, transfer test, or distribution-shift analysis to support it',
    base_severity: 4, // kit text: "HIGH at Q1 when generalization is the manuscript's central contribution claim" — fixed-Q1 port
  },
  MODEL_INTERPRETABILITY_ABSENT: {
    section: 'SECTION_4_ARGUMENTATION',
    label_en: 'A black-box ML model is applied in a domain that implies an interpretability need (clinical, causal, scientific mechanism, policy) without addressing the opacity gap',
    base_severity: 3, // TODO calibrate — condition-dependent MEDIUM/HIGH in source, see PHASE 16 note
  },
  INDEX_LINEARITY_ASSUMPTION: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'A composite index uses weighted linear aggregation and makes validity/comparative claims without addressing the linearity, independence, or weight-validity assumptions the aggregation embeds',
    base_severity: 3, // TODO calibrate — condition-dependent MEDIUM/HIGH in source, see PHASE 16 note
  },
  ASSUMPTION_STACKING_RISK: {
    section: 'SECTION_3_METHODOLOGICAL',
    label_en: 'The central claim depends on 3+ independent load-bearing assumptions treated as independently valid, with no acknowledgment of the compound uncertainty from stacking them',
    base_severity: 3, // TODO calibrate — condition-dependent MEDIUM/HIGH in source, see PHASE 16 note
  },
};

// --- EVIDENCE SHAPES (2026-07-26) ---
// Ported from the parallel Python implementation's registry.py (see the
// SCHEMA-SIZE ISSUE note above for the audit that surfaced it). Its own
// finding: "the earlier draft assumed every signal is one quotable span —
// roughly half of the CLASR inventory is not." verify.js was SPAN-only
// (one evidence_quote, no negation awareness) — the same gap.
//
// EvidenceShape.ABSENCE signals are the highest-value fix: the signal's
// own claim is that something is missing, so an honest verifier must also
// confirm the manuscript doesn't say the missing thing elsewhere — without
// that, a well-written absence statement ("no funding was received") can
// falsify the very signal that detected it, because a naive scan for
// "funding" would find the word inside the negated sentence and treat it
// as contradicting evidence. See verify.js's negativeSearch()/isNegated().
//
// SCOPE — this is a FIRST TRANCHE, not full coverage. Only the ~18
// signals below with an unambiguous, fixed textual locus (a specific
// declaration a manuscript either does or doesn't contain — funding
// statements, CI reporting, pre-registration IDs, etc.) were classified.
// Every other signal in TAXONOMY defaults to SPAN via shapeOf() below,
// which matches this file's actual verified behaviour before this change
// — nothing regresses for unclassified signals. MULTI_SPAN (signals whose
// evidence is a relation between two quoted locations — e.g. CAUSAL_DRIFT,
// HEDGE_STRIPPING, the kit-50 CONSISTENCY_GAP_* family) and ZONE (composite
// profile signals — e.g. ARGUMENT_LOAD_*, CHAIN_PROFILE_*) are real
// categories in this taxonomy too, per the same Python audit, but require
// a schema change (evidence_quote -> an array of quotes) not made in this
// pass; they are left as an explicitly open follow-up, not silently
// dropped. Classifying the remaining ~240 signals by shape, and writing
// absence_terms for the rest of the ABSENCE-shaped ones, is unfinished
// work — same "editorial judgment, not yet user-reviewed" caveat the
// Python reference itself attaches to its own absence_terms lists.
const EvidenceShape = Object.freeze({
  SPAN: 'SPAN',
  MULTI_SPAN: 'MULTI_SPAN',
  ZONE: 'ZONE',
  ABSENCE: 'ABSENCE',
  META: 'META',
});

// signal_id -> terms whose AFFIRMATIVE (non-negated) presence in the
// manuscript contradicts the signal's absence claim and should drop it.
// Kept short and declaration-specific on purpose — broad terms invite
// false contradictions (e.g. "data" alone would match almost any
// manuscript). TODO calibrate against a real PDF-extraction pipeline,
// same as verify.js's FUZZY_THRESHOLD.
//
// NEVER put a term here that itself already starts with a negation cue
// ("no funding was received", "not required", "ai tools were not used").
// verify.js's isNegated() looks at the text BEFORE a match to decide
// whether the match is negated — if the negation word is inside the term
// being searched for, it's never in that preceding window, so the match
// is (wrongly) read as affirmative and the signal gets rejected instead
// of confirmed. Caught live during this file's own smoke test on
// FUNDING_NOT_VISIBLE_IN_TEXT: "no funding was received" as a term made
// the check reject a manuscript that correctly disclosed no funding. Use
// the bare underlying concept ("funded by", "funding was received") —
// the negation window already handles a negated mention of it correctly.
const ABSENCE_TERMS = {
  DATA_AVAILABILITY_GAP: ['data availability statement', 'data are available', 'data is available', 'deposited in', 'available upon request', 'openicpsr', 'zenodo', 'dryad', 'figshare'],
  CODE_SOFTWARE_AVAILABILITY_GAP: ['code is available', 'code availability', 'source code', 'github.com', 'software is available'],
  PREREGISTRATION_STATUS_GAP: ['pre-registered', 'preregistered', 'prospero', 'clinicaltrials.gov', 'osf.io/registrations', 'aspredicted', 'registration number', 'registered report'],
  ETHICS_IRB_COMPLIANCE_GAP: ['irb approval', 'institutional review board', 'ethics committee', 'ethical approval', 'informed consent', 'declaration of helsinki'],
  AUTHORSHIP_CONTRIBUTION_TRANSPARENCY_GAP: ['author contributions', 'credit taxonomy', 'contributed equally', 'conceived the study', 'designed the study'],
  FUNDING_NOT_VISIBLE_IN_TEXT: ['funded by', 'funding was received', 'supported by grant', 'financial support'],
  VERSION_AMENDMENT_TRACKING_GAP: ['preprint', 'biorxiv', 'medrxiv', 'arxiv', 'previously posted', 'earlier version of this manuscript'],
  AI_DISCLOSURE_ABSENT: ['chatgpt', 'generative ai', 'large language model', 'ai tool', 'ai-assisted', 'artificial intelligence tool'],
  CI_ABSENT_FROM_PRIMARY_ANALYSIS: ['confidence interval', '95% ci', 'ci:'],
  CONFIDENCE_INTERVAL_ABSENCE: ['confidence interval', '95% ci', 'ci:'],
  EFFECT_SIZE_ABSENCE: ['effect size', "cohen's d", 'odds ratio', 'eta squared'],
  BASELINE_MISSING: ['baseline', 'reference value', 'control condition'],
  NNT_ABSENT_SIGNAL: ['number needed to treat', 'nnt'],
  RESPONSE_RATE_ABSENT: ['response rate'],
  SAMPLING_FRAME_ABSENT: ['sampling frame'],
  COMPLEXITY_ABSENT: ['time complexity', 'space complexity', 'computational complexity', 'big-o'],
  BENCHMARK_ABSENT: ['benchmark', 'baseline comparison', 'compared against', 'state of the art'],
  INTERVENTION_FIDELITY_ABSENT: ['fidelity', 'adherence to protocol', 'implementation fidelity'],
};

/** Evidence shape for a signal_id. Defaults to SPAN — see scope note above. */
function shapeOf(signalId) {
  return signalId in ABSENCE_TERMS ? EvidenceShape.ABSENCE : EvidenceShape.SPAN;
}

/** Absence-contradiction terms for an ABSENCE-shaped signal_id, or []. */
function absenceTermsOf(signalId) {
  return ABSENCE_TERMS[signalId] || [];
}

// --- PAS TIERS (2026-07-26) ---
// Kit 44 v1.7 §1's Tier 1-5 priority list, mapped to this taxonomy's real
// signal_ids — ported so priority.js can implement the actual tier-cascade
// selection logic instead of leaving Kit 44 as taxonomy-only documentation
// (Phase 14 correctly identified Kit 44 as a selection layer with zero new
// signals, but never built the selection logic itself; this closes that gap).
//
// NOT every PAS-eligible line in Kit 44's text could be mapped:
//   - Five of Kit 44 Tier 2's own listed names (FINDING_CLAIM_INVERSION,
//     PREMISE_CONTRADICTION, PREMISE_CHAIN_COLLAPSE, METHOD_CLAIM_MISMATCH,
//     CLAIM_UNTESTABILITY) are the CONFIRMED phantom names from the
//     Kit 44-vs-Kit 40 version-drift bug documented above — correctly
//     excluded, not omitted by mistake.
//   - Tier 3's "CONCLUSION_OVERREACH at MAJOR magnitude (kit 40 A5)" has no
//     literal match anywhere in Kit 40's verbatim A5 catalogue (GENERALIZ-
//     ABILITY_CLAIM, LIMITATION_WITHOUT_CONSEQUENCE, POLICY_OVERREACH,
//     ABSTRACT_CONCLUSION_DIVERGENCE) — left unmapped rather than guessed
//     at, consistent with how this file treats every other unconfirmed
//     kit cross-reference.
//   - Tier 4's "SECTION 9 CRITICAL signals (kit 41)" maps to the subset of
//     Phase 11's kit-41 signals placed at base_severity 4 (this taxonomy's
//     top tier — kit 41 itself grades CRITICAL/HIGH/MEDIUM/LOW but this
//     file's placeholders only distinguish 4/3, see Phase 11 note; treating
//     4 as "CRITICAL-or-HIGH" is an approximation, documented as such).
//   - Tier 5's "AMPLIFICATION_CLUSTER (kits 09 + 11)" and "NORMATIVE
//     LANGUAGE detected (kit 09)" are not independent signal_ids anywhere
//     in this taxonomy (kit 11 was never read this project; kit 09's
//     normative-language detection was documented in Phase 8 as an
//     expression-level correction trigger, not a separately labeled
//     signal) — not available to map.
//   - ASSUMPTION_VALIDITY_SCOPE_MISMATCH has NO base tier here on purpose:
//     Kit 44 Rule C3 elevates it to Tier 2 only under specific per-
//     manuscript conditions (see priority.js) — it is not unconditionally
//     Tier 2, so it carries no entry in this table and only becomes
//     PAS-eligible when C3's conditions are met.
//
// signal_id -> 1 (highest priority) .. 5 (lowest)
const PAS_TIERS = {
  // Tier 1 — structural completeness risks.
  MANDATORY_MISSING: 1,
  DEPENDENCY_BREAK: 1,
  DATA_AVAILABILITY_GAP: 1,
  CODE_SOFTWARE_AVAILABILITY_GAP: 1,
  PREREGISTRATION_STATUS_GAP: 1,
  REANALYSIS_FEASIBILITY_GAP: 1,
  ETHICS_IRB_COMPLIANCE_GAP: 1,
  TEMPORAL_CONSISTENCY_GAP: 1,
  SELECTIVE_REPORTING_GAP: 1,

  // Tier 2 — argument and claim failures.
  FINDING_CONTRADICTS_RECOMMENDATION: 2,
  CAUSAL_DESIGN_MISMATCH: 2,
  PRACTICAL_SIGNIFICANCE_ABSENT: 2,
  VALIDATION_CIRCULARITY: 2,

  // Tier 3 — overreach and scope failures.
  CHAIN_PROFILE_BROKEN: 3,
  GENERALIZABILITY_CLAIM: 3,
  REVIEW_AS_ADVOCACY_PATTERN: 3,
  ASSUMPTION_STACKING_RISK: 3,

  // Tier 4 — integrity and transparency, including kit 41's severity-4
  // (highest-placeholder-tier) figure/table signals — see note above.
  RETRACTION_SIGNAL_FROM_TEXT: 4,
  HIGH_STAKES_SELF_CITATION: 4,
  OUTCOME_INSTRUMENT_INTERSECTION: 4,
  VISUAL_CLAIM_ASYMMETRY: 4,
  RHETORICAL_AMPLIFICATION: 4,
  FIGURE_EXAGGERATION: 4,
  ABSTRACT_TABLE_DIVERGENCE: 4,
  SELECTIVE_TABLE_OMISSION: 4,
  HIDDEN_NULL_ZONE: 4,
  SURVIVORSHIP_DISPLAY_BIAS: 4,
  OMISSION_ASYMMETRY: 4,
  TABLE_TEXT_MISMATCH: 4,
  SAMPLE_SIZE_DRIFT: 4,
  CROSS_LAYER_REPRESENTATIONAL_DRIFT: 4,
  NON_SIGNIFICANT_RESULT_HIDING: 4,
  ROUNDING_DISTORTION: 4,
  TRUNCATED_AXIS_INFLATION: 4,
  COLOR_CODED_BIAS: 4,
  CAPTION_CLAIM_MISMATCH: 4,
  AXIS_DISTORTION: 4,
  SALIENCE_STEERING: 4,

  // Tier 5 — language and hedging failures.
  CALIBRATION_FAILURE: 5,
};

/** Kit 44 PAS tier (1-5) for a signal_id, or null if not PAS-eligible. */
function pasTierOf(signalId) {
  return PAS_TIERS[signalId] || null;
}

// --- CATEGORICAL RESOLUTION INPUTS (2026-07-26, "Option A") ---
// CORE v1.9.0 forbids "composite quality scores... or any summarizing
// metric that collapses signal complexity into a single number" —
// scorer.js's raw_score/risk_band is exactly that, and stays exactly that
// (Option A, chosen deliberately: the real fix, deriving risk_band from
// integrated_posture below, was rejected for now because desk-reject and
// overreach data aren't complete enough yet to make that derivation more
// correct than what raw_score already gives — see resolution.js's header
// for the full reasoning). What follows are the categorical layers CLASR's
// own kits actually define, added as new report fields alongside
// raw_score/risk_band, not as a replacement for them.

// Kit 29 §3 co-occurrence indicators, mapped to real signal_ids where the
// kit names a discrete signal. Several of kit 29's own indicators are NOT
// signal_ids at all (AUTO-Q estimate comparisons, "LOW evidence threshold"
// as a bare state, "specialist journal implied by Q1 target") — those
// aren't representable here and are simply absent from the corresponding
// zone's list, not silently misrepresented as covered.
const DESK_REJECT_ZONE_SIGNALS = {
  SCOPE_FIT_RISK: ['PRIMACY_CLAIM_UNBOUNDED', 'SCALE_DRIFT'],
  ABSTRACT_POSTURE_RISK: ['CLAIM_ESCALATION_ABSTRACT_EXCEEDS_BODY', 'CONTRIBUTION_SCOPE_INFLATION'],
  STRUCTURAL_COMPLETENESS_RISK: ['MANDATORY_MISSING', 'DEPENDENCY_BREAK'],
  LANGUAGE_POSTURE_RISK: ['READER_EVIDENCE_TENSION', 'READER_EVIDENCE_MISMATCH'],
  INTEGRITY_TRANSPARENCY_RISK: [
    'ELEVATED_SELF_CITATION_DENSITY', 'OUTCOME_INSTRUMENT_INTERSECTION',
    'STRUCTURAL_NULL_ABSENCE', 'PREREGISTRATION_STATUS_GAP',
  ],
};

// Kit 35's 8 overreach types map 1:1 onto real signal_ids — the cleanest
// of these four tables, no gaps.
const OVERREACH_SIGNALS = [
  'CAUSAL_OVERREACH', 'GENERALIZATION_OVERREACH', 'POLICY_OVERREACH',
  'NOVELTY_OVERREACH', 'CONTRIBUTION_OVERREACH', 'TEMPORAL_OVERREACH',
  'TRANSLATIONAL_OVERREACH', 'DISCIPLINARY_OVERREACH',
];

// Kit 42 §4's 7 CRITICAL-tier modules (Phase 12), used by
// resolution.js's reproducibilityRisk(). Known approximation: Phase 12
// collapsed each module's PARTIAL and ABSENT states into one signal_id
// (no PARTIAL/ABSENT distinction in this taxonomy), so any hit here is
// treated as the more severe ABSENT case — documented in resolution.js.
const REPRODUCIBILITY_CRITICAL_SIGNALS = [
  'DATA_AVAILABILITY_GAP', 'CODE_SOFTWARE_AVAILABILITY_GAP',
  'PREREGISTRATION_STATUS_GAP', 'REANALYSIS_FEASIBILITY_GAP',
  'ETHICS_IRB_COMPLIANCE_GAP', 'TEMPORAL_CONSISTENCY_GAP',
  'SELECTIVE_REPORTING_GAP',
];

const _CANONICAL_BY_UPPER = new Map(
  Object.keys(TAXONOMY).map((id) => [id.toUpperCase(), id])
);

/**
 * Repairs case/hyphen drift from the model's free-text signal_id (see the
 * SCHEMA-SIZE ISSUE note above — signal_id is a plain string, not a compiled
 * enum, so this repair is doing real work, not defending against a
 * theoretical case). Returns the canonical signal_id, or null if the raw
 * value is genuinely off-taxonomy — extractor.js counts and drops these.
 */
function normaliseSignalId(raw) {
  if (!raw) return null;
  const upper = String(raw).trim().toUpperCase().replace(/-/g, '_');
  return _CANONICAL_BY_UPPER.get(upper) || null;
}

function baseSeverityOf(signalId) {
  const spec = TAXONOMY[signalId];
  if (!spec) throw new Error(`Unknown signal_id: ${signalId}`);
  return spec.base_severity;
}

function sectionOf(signalId) {
  const spec = TAXONOMY[signalId];
  if (!spec) throw new Error(`Unknown signal_id: ${signalId}`);
  return spec.section;
}

function axisOf(signalId) {
  const spec = TAXONOMY[signalId];
  if (!spec) throw new Error(`Unknown signal_id: ${signalId}`);
  return spec.axis;
}

module.exports = {
  TAXONOMY,
  normaliseSignalId,
  baseSeverityOf,
  sectionOf,
  axisOf,
  EvidenceShape,
  shapeOf,
  absenceTermsOf,
  pasTierOf,
  DESK_REJECT_ZONE_SIGNALS,
  OVERREACH_SIGNALS,
  REPRODUCIBILITY_CRITICAL_SIGNALS,
};
