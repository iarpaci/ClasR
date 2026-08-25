const Anthropic = require('@anthropic-ai/sdk');
const { assembleSystemPrompt, assembleReformatPrompt } = require('./kitAssembler');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';
// The full CLASR output (executive summary, priority signals, ~9 sections,
// argument density, confidence profile, closing risk posture) routinely
// runs well past 4000 tokens for a real manuscript — that ceiling was
// silently truncating reports mid-section with no error, no stop_reason
// check, nothing. claude-sonnet-4-6 supports up to 128k output tokens on
// the synchronous Messages API, no beta header needed.
const MAX_TOKENS = 16000;

const OUTPUT_MODES = { author: 'author mode', reviewer: 'reviewer mode', advisor: 'advisor mode' };

async function analyzeManuscript({ manuscriptText, qVariant = null, mode = null, outputMode = null }) {
  const systemPrompt = assembleSystemPrompt();

  // Build user message — Q-variant, output mode, then manuscript text
  let userMessage = manuscriptText;
  if (qVariant && ['Q1', 'Q2', 'Q3'].includes(qVariant.toUpperCase())) {
    userMessage = `${qVariant.toUpperCase()}\n\n${userMessage}`;
  }
  if (outputMode && OUTPUT_MODES[outputMode.toLowerCase()]) {
    userMessage = `${OUTPUT_MODES[outputMode.toLowerCase()]}\n\n${userMessage}`;
  } else if (mode && ['R1', 'R2', 'revision', 'resubmission'].includes(mode.toLowerCase())) {
    userMessage = `${mode}\n\n${userMessage}`;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.2,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  if (response.stop_reason === 'max_tokens') {
    console.warn('[claude] response truncated at max_tokens — report is incomplete. Consider raising MAX_TOKENS further.');
  }

  return {
    report: response.content[0].text,
    truncated: response.stop_reason === 'max_tokens',
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens || 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens || 0,
    },
  };
}

// Turns an already-generated, mode-agnostic CLASR report ("ana rapor") into
// an Author/Signal/Advisor Mode view without re-analyzing the manuscript --
// the reformat-only prompt (core + kit 03 + kit 31, ~56K chars) is a small
// fraction of the full 60-kit assembly, so this is far cheaper and faster
// than calling analyzeManuscript() again per mode switch.
async function reformatReport({ mainReport, outputMode }) {
  const modeTrigger = OUTPUT_MODES[(outputMode || '').toLowerCase()];
  if (!modeTrigger) throw new Error(`Unknown output mode: ${outputMode}`);

  const systemPrompt = assembleReformatPrompt();
  const userMessage = `${modeTrigger}\n\nThe text below is a complete CLASR report already produced by the full detection pipeline. It is not a manuscript -- do not analyze it as one. Reformat its presentation per the active mode above, preserving every signal, section, and module status it already contains (zero data loss).\n\n---\n\n${mainReport}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.2,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  if (response.stop_reason === 'max_tokens') {
    console.warn('[claude] reformatReport response truncated at max_tokens.');
  }

  return {
    report: response.content[0].text,
    truncated: response.stop_reason === 'max_tokens',
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens || 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens || 0,
    },
  };
}

// JSON schema for the live Author Mode report render (2026-08-24) --
// matches static-web/assets/reports/author-mode-structured.json exactly, the
// reference shape the live-author-preview page's renderer consumes. Every
// object requires additionalProperties:false + every key listed in
// `required` (confirmed live: Anthropic's structured-output validator
// rejects a nested `json_schema` wrapper and expects the schema inline --
// see reformatReportAuthorJson's use of output_config.format below).
// N/A fields use empty string/array sentinels rather than omission, so the
// schema never needs optional keys -- mirrors the reference JSON itself.
const AUTHOR_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'report_status', 'mode', 'study_type', 'q_profile', 'field', 'reporting_standard',
    'manuscript', 'integrated_risk_posture', 'priority_preview', 'sections',
    'section_10', 'priority_dashboard', 'closing', 'leverage_note', 'final_checklist',
  ],
  properties: {
    report_status: { type: 'string' },
    mode: { type: 'string', enum: ['author'] },
    study_type: { type: 'string' },
    q_profile: {
      type: 'object', additionalProperties: false,
      required: ['estimate', 'basis'],
      properties: { estimate: { type: 'string' }, basis: { type: 'string' } },
    },
    field: { type: 'string' },
    reporting_standard: { type: 'string' },
    manuscript: {
      type: 'object', additionalProperties: false,
      required: ['title', 'identifier', 'identifier_note'],
      properties: { title: { type: 'string' }, identifier: { type: 'string' }, identifier_note: { type: 'string' } },
    },
    integrated_risk_posture: {
      type: 'object', additionalProperties: false,
      required: ['label', 'summary', 'expanded_explanation'],
      properties: {
        label: { type: 'string' },
        summary: { type: 'string' },
        expanded_explanation: { type: 'array', items: { type: 'string' } },
      },
    },
    priority_preview: { type: 'array', items: { type: 'string' } },
    sections: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['section', 'title', 'status', 'no_issue_line', 'signals'],
        properties: {
          section: { type: 'integer' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['no_issue_flagged', 'signal_present'] },
          no_issue_line: { type: 'string' },
          signals: {
            type: 'array',
            items: {
              type: 'object', additionalProperties: false,
              required: ['name', 'primary_location', 'what_this_is', 'why_this_becomes_visible', 'what_you_could_do', 'also_appears_in'],
              properties: {
                name: { type: 'string' },
                primary_location: { type: 'string' },
                what_this_is: { type: 'string' },
                why_this_becomes_visible: { type: 'string' },
                what_you_could_do: { type: 'array', items: { type: 'string' } },
                also_appears_in: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    section_10: {
      type: 'object', additionalProperties: false,
      required: ['title', 'modules', 'compound_risk_flag'],
      properties: {
        title: { type: 'string' },
        modules: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            required: ['name', 'status', 'what_was_found', 'why_it_matters', 'what_you_could_do'],
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['present', 'absent', 'partial', 'not_applicable', 'not_flagged'] },
              what_was_found: { type: 'string' },
              why_it_matters: { type: 'string' },
              what_you_could_do: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        compound_risk_flag: {
          type: 'object', additionalProperties: false,
          required: ['triggered', 'explanation'],
          properties: { triggered: { type: 'boolean' }, explanation: { type: 'string' } },
        },
      },
    },
    priority_dashboard: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['rank', 'label', 'section', 'why_it_ranks_here'],
        properties: {
          rank: { type: 'integer' },
          label: { type: 'string' },
          section: { type: 'string' },
          why_it_ranks_here: { type: 'string' },
        },
      },
    },
    closing: {
      type: 'object', additionalProperties: false,
      required: ['integrated_risk_posture'],
      properties: {
        integrated_risk_posture: {
          type: 'object', additionalProperties: false,
          required: ['label', 'explanation'],
          properties: { label: { type: 'string' }, explanation: { type: 'string' } },
        },
      },
    },
    leverage_note: { type: 'string' },
    final_checklist: { type: 'array', items: { type: 'string' } },
  },
};

const AUTHOR_JSON_MAPPING_INSTRUCTIONS = `Output your Author Mode response as JSON matching the schema, not the labeled-text format described above. Map the content you would otherwise write onto these fields:
- restatement + structural visibility note -> a section/signal's "what_this_is" (restatement) and "why_this_becomes_visible" (visibility note)
- "what you could do" options -> "what_you_could_do" (array of 1-2 short strings, not a paragraph)
- a section with no signal -> status "no_issue_flagged", fill "no_issue_line" with one sentence naming what was checked, leave "signals" as an empty array
- a section with signals -> status "signal_present", "no_issue_line" as an empty string, one entry in "signals" per finding
- the PAS preview -> "priority_preview" (3-5 plain-language one-liners)
- the Advisor-style ranked list -> "priority_dashboard"
- Section 10 -> "section_10.modules", one entry per module, "status" using exactly one of: present, absent, partial, not_applicable, not_flagged
- the closing risk posture expansion -> both "integrated_risk_posture" (top level) and "closing.integrated_risk_posture" (same content, both are populated)
- "leverage_note": one sentence on where addressing one finding would resolve the most connected signals, if such a pattern exists -- otherwise a short neutral sentence
- "final_checklist": a short pre-submission checklist appropriate to this manuscript's field and type (8-10 items), not signal-specific
- "manuscript": use whatever title/identifier the source report's header carries; empty string for any part it does not state
- Never include numeric confidence values, internal module codes (M01-M17), raw signal IDs with underscores, or a Retraction Risk Profile entry -- per kit 31's existing Author Mode rules, still in force
- Zero data loss still applies: every signal, every Section 10 module, and the compound risk flag from the source report must appear somewhere in the JSON`;

// Author Mode only for now (2026-08-24) -- the JSON schema above matches a
// concrete reference (author-mode-structured.json) built for this specific
// mode's card-based renderer. Signal/Advisor Mode would need their own
// schemas (Signal Mode's kit 31 rules explicitly forbid the same narrative
// framing Author Mode uses) -- not designed or validated yet, so
// reviewer/advisor still go through the text-based reformatReport() above.
async function reformatReportAuthorJson({ mainReport }) {
  const systemPrompt = assembleReformatPrompt();
  const userMessage = `author mode\n\n${AUTHOR_JSON_MAPPING_INSTRUCTIONS}\n\nThe text below is a complete CLASR report already produced by the full detection pipeline. It is not a manuscript -- do not analyze it as one. Convert it into the JSON structure above, preserving every signal, section, and module status it already contains (zero data loss).\n\n---\n\n${mainReport}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.2,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: AUTHOR_JSON_SCHEMA },
    },
    messages: [{ role: 'user', content: userMessage }],
  });

  if (response.stop_reason === 'max_tokens') {
    console.warn('[claude] reformatReportAuthorJson response truncated at max_tokens.');
  }

  let parsed = null;
  try {
    parsed = JSON.parse(response.content[0].text);
  } catch (err) {
    console.error('[claude] reformatReportAuthorJson: failed to parse JSON output:', err.message);
  }

  return {
    report: parsed,
    truncated: response.stop_reason === 'max_tokens',
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens || 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens || 0,
    },
  };
}

module.exports = { analyzeManuscript, reformatReport, reformatReportAuthorJson };
