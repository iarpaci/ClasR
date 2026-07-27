'use strict';

/**
 * The limit of everything the LLM can produce. Mirrors the Python reference's
 * Pydantic models (schema.py) as a hand-written JSON Schema for Anthropic
 * Structured Outputs (output_config.format).
 *
 * No optional fields by design — Structured Outputs caps requests at 24
 * optional parameters, so the reference implementation avoids Optional
 * entirely. Keep that convention if this schema grows.
 *
 * signal_id is a plain string, NOT a compiled `enum`. An enum of the full
 * ~200+ taxonomy is rejected by Anthropic ("Schema is too complex for
 * compilation" — confirmed by live bisection, 100 ids OK / 120 fails). The
 * catalogue is instead printed directly in this field's `description` (the
 * Python reference's approach: the model is most reliably attentive to what
 * belongs in the exact field it's filling) and again in extractor.js's
 * system prompt. taxonomy.js's normaliseSignalId() repairs case/hyphen
 * drift afterward in code — the same repair structured outputs already
 * required under the old enum, since enum casing was never guaranteed
 * either. Ids the model still gets wrong are dropped and counted, not
 * silently kept — see extractor.js's unknownIds.
 *
 * inference_type / confidence / inference (2026-07-26). Added for Kit 44
 * v1.7's PRIORITY ACTION SIGNALS card, which CORE v1.9.0 requires on every
 * candidate: Evidence -> Inference type -> Inference -> Confidence. Neither
 * field is derivable from evidence_quote/basis alone — inference_type
 * (Observation/Interpretive/Quantitative) is a different axis than basis
 * (which describes HOW the model read the text, not what KIND of judgement
 * producing the finding required), and confidence is a per-finding
 * evidentiary-strength value the model must self-report. The model declares
 * honestly; priority.js enforces the inference-type confidence ceiling
 * downstream (Kit 44 v1.7 §4) — it does not invent or adjust the declared
 * value here, only caps it later.
 */

const { TAXONOMY } = require('./taxonomy');

const EvidenceBasis = Object.freeze({
  EXPLICIT_STATEMENT: 'EXPLICIT_STATEMENT',
  EXPLICIT_ABSENCE: 'EXPLICIT_ABSENCE',
  INFERRED: 'INFERRED',
});

// Kit 44 v1.7 §4 / CORE v1.9.0. Confidence ceilings keyed by this enum are
// enforced in priority.js, not here — see enforceConfidenceCeiling().
const InferenceType = Object.freeze({
  OBSERVATION: 'OBSERVATION',
  INTERPRETIVE: 'INTERPRETIVE',
  QUANTITATIVE: 'QUANTITATIVE',
});

function extractionJsonSchema() {
  const signalIds = Object.keys(TAXONOMY);
  return {
    type: 'object',
    properties: {
      signals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            signal_id: {
              type: 'string',
              description:
                'The catalogued signal this finding supports. Must be copied exactly ' +
                '(same case, same underscores) from this list — never invented or ' +
                'paraphrased: ' + signalIds.join(', '),
            },
            evidence_quote: {
              type: 'string',
              description:
                'A verbatim span copied exactly from the manuscript that supports this signal. ' +
                'For basis=EXPLICIT_ABSENCE: quote the passage where the missing statement would ' +
                'normally appear (e.g. the relevant Methods, Declarations, or Data/Code Availability ' +
                'paragraph) — not an unrelated true sentence from elsewhere in the manuscript.',
            },
            basis: {
              type: 'string',
              enum: Object.values(EvidenceBasis),
              description: 'How the finding was reached: an explicit statement in the text, an explicit absence of something expected, or an inference from context.',
            },
            inference_type: {
              type: 'string',
              enum: Object.values(InferenceType),
              description:
                'OBSERVATION: read directly off the text, no external reference needed. ' +
                'QUANTITATIVE: derived from a numerical comparison or threshold check. ' +
                'INTERPRETIVE: derived from pattern-level reading that requires analytical ' +
                'judgement beyond the text surface. Declare honestly — the confidence ceiling ' +
                'applied downstream depends on this value.',
            },
            confidence: {
              type: 'number',
              description:
                'Evidentiary strength of this specific finding, as a number from 0.00 to 1.00 ' +
                'inclusive. Report the honest value — do not self-censor to fit an assumed ' +
                'ceiling; ceilings are enforced downstream, by code, from the declared ' +
                'inference_type. (Structured Outputs does not support a JSON Schema min/max ' +
                'constraint here, so priority.js clamps out-of-range values defensively.)',
            },
            inference: {
              type: 'string',
              description:
                'ONE sentence stating what this evidence reveals structurally. Name a concrete ' +
                'location, claim, or element. Describe what is present or absent — never what ' +
                'the author intended, never what a reviewer would do. Forbidden words: ' +
                'inflation, misleading, obscures, hides, downplays, cherry-picks, ' +
                '"reviewer will flag".',
            },
          },
          required: ['signal_id', 'evidence_quote', 'basis', 'inference_type', 'confidence', 'inference'],
          additionalProperties: false,
        },
      },
      no_applicable_signal: {
        type: 'boolean',
        description: 'True if a real concern exists in the manuscript that no catalogued signal covers.',
      },
    },
    required: ['signals', 'no_applicable_signal'],
    additionalProperties: false,
  };
}

module.exports = { EvidenceBasis, InferenceType, extractionJsonSchema };
