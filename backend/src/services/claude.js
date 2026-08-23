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

module.exports = { analyzeManuscript, reformatReport };
