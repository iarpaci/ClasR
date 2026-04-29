const Anthropic = require('@anthropic-ai/sdk');
const { assembleSystemPrompt } = require('./kitAssembler');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2500;

async function analyzeManuscript({ manuscriptText, qVariant = null, mode = null }) {
  const systemPrompt = assembleSystemPrompt();

  // Build user message — prepend Q-variant hint or revision mode if provided
  let userMessage = manuscriptText;
  if (qVariant && ['Q1', 'Q2', 'Q3'].includes(qVariant.toUpperCase())) {
    userMessage = `${qVariant.toUpperCase()}\n\n${manuscriptText}`;
  }
  if (mode && ['R1', 'R2', 'revision', 'resubmission'].includes(mode.toLowerCase())) {
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

  return {
    report: response.content[0].text,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens || 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens || 0,
    },
  };
}

module.exports = { analyzeManuscript };
