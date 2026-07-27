'use strict';

/**
 * The only module that talks to the model.
 *
 * Uses Anthropic Structured Outputs (output_config.format), which constrains
 * decoding against a compiled grammar — schema compliance is enforced at the
 * sampling layer, not merely requested in a prompt.
 *
 * Docs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
 *
 * Note on SDK version: @anthropic-ai/sdk here is pinned to ^0.39.0, which
 * predates output_config in its TypeScript types. That's harmless in this
 * plain-JS backend — messages.create() passes the request body straight
 * through to POST /v1/messages with no client-side schema stripping, so the
 * extra top-level key reaches the API unmodified.
 *
 * FREE-TEXT signal_id, NOT an enum. A single Structured Outputs call with a
 * ~200+ value `enum` on signal_id is rejected by Anthropic with "Schema is
 * too complex for compilation" — confirmed by live bisection on 2026-07-26
 * (100 ids: OK, 120: fails). The taxonomy was first fixed by batching the
 * enum across several parallel calls (2026-07-26), then replaced with this
 * approach after auditing a parallel Python implementation of the same
 * kit-derivation problem, which sidesteps the ceiling entirely: `signal_id`
 * is a plain string, the full catalogue is printed in its schema
 * `description` (where the model is most reliably attentive to what belongs
 * in that exact field) AND in the system prompt, and `normaliseSignalId()`
 * in taxonomy.js repairs case/hyphen drift in code afterward — the same
 * repair structured outputs already required even under the enum, since
 * enum casing was never guaranteed either. This has no cardinality ceiling,
 * costs one API call instead of several, and scales with the taxonomy for
 * free. The trade line: without a compiled grammar constraint, an
 * off-catalogue label is no longer structurally impossible, only unlikely —
 * see unknownIds below, which makes that failure mode visible instead of
 * silently invisible.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { extractionJsonSchema } = require('./schema');
const { TAXONOMY, normaliseSignalId } = require('./taxonomy');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Structured outputs are GA for Claude 4.5 and later models. Kept in line
// with the rest of the CLASR backend (services/claude.js) rather than the
// Python reference's claude-sonnet-5, to avoid introducing a second model
// tier without an explicit decision to do so.
const DEFAULT_MODEL = 'claude-sonnet-4-6';

const MAX_TOKENS = 8000; // generous: a truncated response breaks schema compliance

function buildSystemPrompt() {
  // Note how short this is. Everything that used to be prompt scaffolding —
  // output format, signal names, taxonomy discipline, confidence rules — has
  // moved into the schema and the scoring engine. What's left is only the
  // part a schema cannot express: the reading posture.
  const catalogue = Object.entries(TAXONOMY)
    .map(([sid, spec]) => `- ${sid}: ${spec.label_en}`)
    .join('\n');

  return (
    'You are an extraction component inside a manuscript reliability ' +
    'pipeline. You do not write prose, assign scores, or reach an overall ' +
    'verdict — downstream code does that.\n\n' +
    'Your only job: identify which of the catalogued signals are supported ' +
    'by the manuscript, and quote the exact text that supports each one.\n\n' +
    `Signal catalogue:\n${catalogue}\n\n` +
    'Rules:\n' +
    '1. signal_id must be copied exactly from the catalogue above — never ' +
    'invent, abbreviate, or paraphrase a signal_id.\n' +
    '2. Every quote must be copied verbatim from the manuscript. If you ' +
    'cannot copy an exact span, do not report the signal. For a signal whose ' +
    'basis is EXPLICIT_ABSENCE (something the manuscript should state but ' +
    'does not), quote the passage where that statement would appear if ' +
    'present — the relevant Methods, Declarations, or Data/Code Availability ' +
    'paragraph — never an unrelated true sentence from elsewhere in the text.\n' +
    '3. Report a signal only if the evidence would convince a sceptical ' +
    'reviewer. Do not report a signal merely because it is plausible.\n' +
    '4. If a real concern exists that no catalogued signal covers, set ' +
    'no_applicable_signal to true rather than choosing an approximate match.\n' +
    '5. An empty signals list is a valid and often correct answer.\n\n' +
    'For inference_type: declare OBSERVATION when the finding is read ' +
    'directly off the text with no external reference; QUANTITATIVE when it ' +
    'comes from a numerical comparison or threshold; INTERPRETIVE when it ' +
    'requires pattern-level judgement beyond the text surface. Declare ' +
    'honestly — do not default to OBSERVATION to appear more certain.\n\n' +
    'For confidence: report your honest evidentiary strength for THIS ' +
    'finding, 0.00-1.00. Do not self-censor toward a ceiling — ceilings are ' +
    'applied downstream by code, not by you.\n\n' +
    'For inference: write exactly one sentence stating what the evidence ' +
    'reveals structurally. Name a concrete location, claim, or element — ' +
    'something the author could point to on the page. Describe what is ' +
    'present or absent, never what the author intended and never what a ' +
    'reviewer would do with it. Forbidden words: inflation, misleading, ' +
    'obscures, hides, downplays, cherry-picks, cherry-picked, manipulated. ' +
    'Forbidden framing: "reviewer will flag", "reviewer will ask", ' +
    '"desk-review stops here", any prediction of editorial or reviewer ' +
    'behaviour.'
  );
}

/**
 * @param {string} manuscriptText
 * @param {{ model?: string }} [opts]
 * @returns {Promise<{extraction: {signals: object[], noApplicableSignal: boolean}|null,
 *                     stopReason: string, normalisedIds: number, unknownIds: number,
 *                     error: string|null, usage: object}>}
 */
async function extract(manuscriptText, opts = {}) {
  const model = opts.model || DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    temperature: 0.0, // necessary, NOT sufficient for determinism — see trialfiles/README.md
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: manuscriptText }],
    output_config: {
      format: { type: 'json_schema', schema: extractionJsonSchema() },
    },
  });

  // Two documented cases where output can violate the schema despite
  // constrained decoding: a refusal, and hitting the token ceiling.
  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
    return {
      extraction: null,
      stopReason: response.stop_reason,
      normalisedIds: 0,
      unknownIds: 0,
      error: `unusable stop_reason: ${response.stop_reason}`,
      usage: response.usage,
    };
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  let payload;
  try {
    payload = JSON.parse(textBlock.text);
  } catch (err) {
    return {
      extraction: null,
      stopReason: response.stop_reason,
      normalisedIds: 0,
      unknownIds: 0,
      error: `invalid JSON in model output: ${err.message}`,
      usage: response.usage,
    };
  }

  // Enum casing/exactness is no longer grammar-enforced (see file header), so
  // an off-catalogue signal_id is now a real possibility, not a theoretical
  // one. normaliseSignalId() repairs case/hyphen drift; anything it can't
  // resolve is dropped and counted in unknownIds — a rising count here is
  // the first sign of catalogue/prompt drift, the same role rejection_rate
  // plays in verify.js. Never silently swallowed.
  let repaired = 0;
  let unknown = 0;
  const kept = [];
  for (const sig of payload.signals || []) {
    const canonical = normaliseSignalId(sig.signal_id);
    if (canonical === null) { unknown += 1; continue; }
    if (canonical !== sig.signal_id) {
      repaired += 1;
      sig.signal_id = canonical;
    }
    kept.push(sig);
  }

  return {
    extraction: {
      signals: kept,
      noApplicableSignal: Boolean(payload.no_applicable_signal),
    },
    stopReason: response.stop_reason,
    normalisedIds: repaired,
    unknownIds: unknown,
    error: null,
    usage: response.usage,
  };
}

module.exports = { extract, buildSystemPrompt, DEFAULT_MODEL, MAX_TOKENS };
