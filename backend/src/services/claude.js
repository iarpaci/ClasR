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

// JSON schema for the Reviewer Mode render (2026-08-28) -- a peer-review
// style report with stable cross-referenced "Major Issue (a/b/c...)" IDs so
// later sections can point back at a full issue instead of repeating it.
// "exports" (pdf/docx/txt) is deliberately not part of the schema -- like
// Author Mode, exports are built client-side from the JSON, not generated
// by the model. Every section in comments_to_authors.sections carries a
// "compliance_items" array even though only section 1.7 populates it --
// strict JSON schema applies one item shape to every array element, so the
// alternative would be a separate schema per section, which output_config
// doesn't support for a single array.
const REVIEWER_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'report_status', 'mode', 'study_type', 'q_profile', 'manuscript',
    'quick_scan', 'comments_to_authors', 'confidential_comments_to_editor',
    'editorial_recommendation', 'cross_references',
  ],
  properties: {
    report_status: { type: 'string' },
    mode: { type: 'string', enum: ['reviewer'] },
    study_type: { type: 'string' },
    q_profile: {
      type: 'object', additionalProperties: false,
      required: ['estimate', 'applied', 'basis'],
      properties: { estimate: { type: 'string' }, applied: { type: 'string' }, basis: { type: 'string' } },
    },
    manuscript: {
      type: 'object', additionalProperties: false,
      required: ['title', 'field', 'identifier'],
      properties: { title: { type: 'string' }, field: { type: 'string' }, identifier: { type: 'string' } },
    },
    quick_scan: {
      type: 'object', additionalProperties: false,
      required: ['editorial_recommendation', 'risk_level', 'key_issues'],
      properties: {
        editorial_recommendation: { type: 'string', enum: ['Reject', 'Major Revision', 'Minor Revision'] },
        risk_level: { type: 'string', enum: ['Low', 'Moderate', 'Moderate-Elevated', 'High'] },
        key_issues: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            required: ['text', 'major_issue_ref'],
            properties: { text: { type: 'string' }, major_issue_ref: { type: 'string' } },
          },
        },
      },
    },
    comments_to_authors: {
      type: 'object', additionalProperties: false,
      required: ['general_evaluation', 'major_issues', 'sections'],
      properties: {
        general_evaluation: { type: 'string' },
        major_issues: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            required: ['id', 'issue', 'severity', 'location', 'why_it_matters', 'what_authors_should_address'],
            properties: {
              id: { type: 'string' },
              issue: { type: 'string' },
              severity: { type: 'string', enum: ['High', 'Moderate', 'Minor'] },
              location: { type: 'array', items: { type: 'string' } },
              why_it_matters: { type: 'string' },
              what_authors_should_address: { type: 'string' },
            },
          },
        },
        sections: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            required: ['number', 'title', 'status', 'items', 'compliance_items'],
            properties: {
              number: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string', enum: ['issues_identified', 'no_issues_identified'] },
              items: {
                type: 'array',
                items: {
                  type: 'object', additionalProperties: false,
                  required: ['text', 'major_issue_ref'],
                  properties: { text: { type: 'string' }, major_issue_ref: { type: 'string' } },
                },
              },
              compliance_items: {
                type: 'array',
                items: {
                  type: 'object', additionalProperties: false,
                  required: ['label', 'status'],
                  properties: {
                    label: { type: 'string' },
                    status: { type: 'string', enum: ['Present', 'Absent', 'Partial', 'Not applicable'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    confidential_comments_to_editor: { type: 'string' },
    editorial_recommendation: {
      type: 'object', additionalProperties: false,
      required: ['decision', 'rationale'],
      properties: {
        decision: { type: 'string', enum: ['Reject', 'Major Revision', 'Minor Revision'] },
        rationale: { type: 'string' },
      },
    },
    cross_references: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['source_text', 'target_id'],
        properties: { source_text: { type: 'string' }, target_id: { type: 'string' } },
      },
    },
  },
};

const REVIEWER_JSON_MAPPING_INSTRUCTIONS = `Output your Reviewer Mode response as JSON matching the schema. This mode is a peer-review style report for an editor/reviewer audience, not the author. Follow these rules:
- If a subsection has no substantive finding, set its status to "no_issues_identified" and leave "items" as an empty array -- do not pad it with commentary.
- Never repeat an issue in full in two places. Give each major issue a stable lowercase id ("a", "b", "c", ...) in comments_to_authors.major_issues, then reference it elsewhere via that entry's "major_issue_ref" field (just the letter, e.g. "a") instead of re-explaining it. Use "" for major_issue_ref when a point does not correspond to any major issue.
- "location" arrays must contain bare section names only ("Introduction", "§2.5.2", "Discussion"), never phrases like "In the Introduction" or "See above".
- Keep every field to 1-2 sentences. No throat-clearing, no "it is worth noting that". Restrained, professional, reviewer tone -- never overpraise. Avoid em dashes.
- Never include internal CLASR module codes, numeric confidence values, raw ALL_CAPS signal names, or underscores in user-facing text.
- comments_to_authors.sections must contain exactly these 10 entries, in this order, with these exact numbers and titles:
  1.3 Internal Inconsistencies and Contradictions -- reference only, do not re-explain a Major Issue already covered
  1.4 Title, Abstract, Aim, and Contribution -- one sentence unless there is a real mismatch, then cite the ref
  1.5 Literature Review Issues -- one line unless something exists beyond the Major Issues
  1.6 Methodology Issues -- one line unless something exists beyond the Major Issues
  1.7 Ethical and Transparency Issues -- populate "compliance_items" with exactly these seven labels: Ethics approval, Informed consent, Funding, Competing interests, Data availability, Code availability, AI disclosure; leave "items" empty unless there is a real problem
  1.8 Results and Discussion Issues -- one line if already covered
  1.9 Tables, Figures, and Graphs -- one line if no mismatch found
  1.10 Implications and Limitations -- reference a Major Issue where applicable
  1.11 Citation and Reference Problems -- "no_issues_identified" with empty items unless problems exist
  1.12 Writing and Formatting Issues -- "no_issues_identified" with empty items unless there are substantive readability problems
  Every section except 1.7 must have "compliance_items" as an empty array; 1.7 is the only one that populates it.
- quick_scan.key_issues: 2-3 of the most important issues, each citing major_issue_ref when it corresponds to a Major Issue.
- editorial_recommendation must be exactly one of Reject, Major Revision, or Minor Revision -- both the quick_scan string and the top-level object's "decision" must agree.
- confidential_comments_to_editor: one paragraph covering editorial risk, whether problems are remediable, and what the editor should watch for, citing a Major Issue ref where relevant.
- cross_references: for every place you write "Major Issue (x)" anywhere in the JSON text, add one entry {"source_text": "Major Issue (x)", "target_id": "major-issue-x"}.
- Preserve every substantive issue from the source report -- brevity applies only to sections with nothing substantive to add.`;

// Reviewer Mode only for now (2026-08-28), alongside Author Mode -- Advisor
// Mode still goes through the text-based reformatReport() below since it has
// no validated JSON schema yet.
async function reformatReportReviewerJson({ mainReport }) {
  const systemPrompt = assembleReformatPrompt();
  const userMessage = `reviewer mode\n\n${REVIEWER_JSON_MAPPING_INSTRUCTIONS}\n\nThe text below is a complete CLASR report already produced by the full detection pipeline. It is not a manuscript -- do not analyze it as one. Convert it into the JSON structure above, preserving every substantive issue it already contains (zero data loss).\n\n---\n\n${mainReport}`;

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
      format: { type: 'json_schema', schema: REVIEWER_JSON_SCHEMA },
    },
    messages: [{ role: 'user', content: userMessage }],
  });

  if (response.stop_reason === 'max_tokens') {
    console.warn('[claude] reformatReportReviewerJson response truncated at max_tokens.');
  }

  let parsed = null;
  try {
    parsed = JSON.parse(response.content[0].text);
  } catch (err) {
    console.error('[claude] reformatReportReviewerJson: failed to parse JSON output:', err.message);
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

// JSON schema for the Editor Mode render (2026-08-28) -- occupies the
// backend's existing "advisor" mode slot (kept as-is to avoid touching
// routes/DB/enum values already in use); only the user-facing label changed
// from "Advisor Mode" to "Editor Mode" once this real spec arrived. Audience
// is a handling editor doing fast triage, not a peer reviewer -- distinct
// tone/structure from both Author and Reviewer Mode. "exports" is dropped
// from the schema for the same reason as Author/Reviewer Mode: built
// client-side, not generated by the model.
const EDITOR_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'report_status', 'mode', 'manuscript', 'report_meta', 'overall_review_attention',
    'mode_switch', 'executive_summary', 'priority_order', 'full_report', 'final_checklist',
  ],
  properties: {
    report_status: { type: 'string' },
    mode: { type: 'string', enum: ['editor'] },
    manuscript: {
      type: 'object', additionalProperties: false,
      required: ['title', 'field', 'study_type', 'q_profile'],
      properties: { title: { type: 'string' }, field: { type: 'string' }, study_type: { type: 'string' }, q_profile: { type: 'string' } },
    },
    report_meta: {
      type: 'object', additionalProperties: false,
      required: ['status_label', 'mode_label', 'report_label'],
      properties: { status_label: { type: 'string' }, mode_label: { type: 'string' }, report_label: { type: 'string' } },
    },
    overall_review_attention: {
      type: 'object', additionalProperties: false,
      required: ['label', 'summary', 'counts'],
      properties: {
        label: { type: 'string', enum: ['Low', 'Moderate', 'Moderate-Elevated', 'High'] },
        summary: { type: 'string' },
        counts: {
          type: 'object', additionalProperties: false,
          required: ['high_priority', 'medium_priority', 'low_priority'],
          properties: { high_priority: { type: 'integer' }, medium_priority: { type: 'integer' }, low_priority: { type: 'integer' } },
        },
      },
    },
    mode_switch: {
      type: 'object', additionalProperties: false,
      required: ['available_modes', 'note'],
      properties: {
        available_modes: { type: 'array', items: { type: 'string' } },
        note: { type: 'string' },
      },
    },
    executive_summary: {
      type: 'object', additionalProperties: false,
      required: ['risk_label', 'view_label', 'decision', 'is_conditional', 'condition', 'rationale'],
      properties: {
        risk_label: { type: 'string' },
        view_label: { type: 'string' },
        decision: { type: 'string', enum: ['Reject', 'Major Revision', 'Minor Revision', 'Send to Review'] },
        is_conditional: { type: 'boolean' },
        condition: { type: 'string' },
        rationale: { type: 'string' },
      },
    },
    priority_order: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['severity', 'title'],
        properties: {
          severity: { type: 'string', enum: ['High', 'Moderate', 'Minor'] },
          title: { type: 'string' },
        },
      },
    },
    full_report: {
      type: 'object', additionalProperties: false,
      required: ['red_flags', 'recommendation'],
      properties: {
        red_flags: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            required: ['severity', 'title', 'location', 'why_it_matters', 'editor_action'],
            properties: {
              severity: { type: 'string', enum: ['High', 'Moderate', 'Minor'] },
              title: { type: 'string' },
              location: { type: 'string' },
              why_it_matters: { type: 'string' },
              editor_action: { type: 'string', enum: ['check before review', 'flag for reviewer attention', 'request clarification from authors', 'consider desk rejection'] },
            },
          },
        },
        recommendation: {
          type: 'object', additionalProperties: false,
          required: ['label', 'conditional', 'text'],
          properties: {
            label: { type: 'string', enum: ['Reject', 'Major Revision', 'Minor Revision', 'Send to Review'] },
            conditional: { type: 'boolean' },
            text: { type: 'string' },
          },
        },
      },
    },
    final_checklist: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['text', 'kind'],
        properties: {
          text: { type: 'string' },
          kind: { type: 'string', enum: ['administrative', 'verification'] },
        },
      },
    },
  },
};

const EDITOR_JSON_MAPPING_INSTRUCTIONS = `Output your Editor Mode response as JSON matching the schema. Audience is a handling editor doing fast triage, not a peer reviewer -- they will not re-read the manuscript before deciding. Follow these rules:
- Calibrated language only: never imply a verdict has already been reached ("undermines confidence", "fatally flawed", "discredits"). State the practical consequence for the editor's ability to assess the manuscript instead (e.g. "limits the editor's ability to assess the transparency and completeness of the literature coverage").
- For methodology-transparency issues, use terms proportionate to the manuscript type: a narrative review gets "transparency and completeness", not "reproducibility" or other systematic-review language, unless the manuscript itself claims systematic-review-level rigor.
- Keep administrative or policy-dependent issues (AI-disclosure, formatting requirements, journal-specific declarations) out of full_report.red_flags entirely -- they belong only in final_checklist with kind "administrative", and must never influence overall_review_attention.label, executive_summary.decision, or any severity value.
- executive_summary.decision: pick exactly one of Reject, Major Revision, Minor Revision, Send to Review. Reject only for a non-remediable fit problem, unsupported central claim, fatal design limitation, ethical problem, or irreparable evidence gap. Major Revision when the contribution may be viable but needs substantial revision, additional reporting, reframing, robustness checks, or contradiction correction, and this holds regardless of journal-specific norms. Minor Revision when issues are mostly presentational, wording-level, citation-formatting, or clarification-based. Send to Review when the signals are real but their significance depends on subject-expert judgment or an unverifiable journal-specific norm.
- If the category genuinely depends on a journal-specific norm this report cannot verify, set is_conditional true, name the default decision in "decision", and state what would change it in "condition" (one sentence). Otherwise is_conditional is false and condition is "".
- priority_order: severity plus title only, most consequential first, no explanation -- that only goes in full_report.red_flags.
- full_report.red_flags: at most 5 items, highest severity first, each self-contained: title under 90 characters stating the problem plainly; location is a bare section name ("Introduction", "Discussion, cost-effectiveness paragraph"); why_it_matters is 1-2 calibrated sentences on the practical consequence for the editorial decision, never a verdict; editor_action is exactly one of "check before review", "flag for reviewer attention", "request clarification from authors", "consider desk rejection".
- full_report.recommendation.text: at most 3 sentences -- restate the decision, then name the strongest red flag by its title and, only if necessary, one secondary consideration. Do not re-list every red flag or repeat the full conditional logic already stated in executive_summary.
- final_checklist: 2-5 items ordered by importance to the editorial decision (items that could change the recommended category, or that block review outright, rank first; administrative/low-stakes items rank last). Each item's "kind" is "administrative" for policy-dependent facts (e.g. absent AI disclosure) or "verification" for actions the editorial office should take. No item restates a red flag.
- mode_switch.note: one short sentence noting a Reviewer Mode version is available, or "" if not applicable. available_modes should list "Reviewer Mode" when applicable, else an empty array.
- Never use markdown, bullets, underscores, em dashes, ALL CAPS (except short status labels), confidence scores, or internal module codes. Refer to the manuscript in third person, never address the author as "you".
- Preserve every substantive red flag from the source report, subject to the 5-item full_report.red_flags cap ordered by severity -- brevity applies to phrasing, not to omitting real findings.`;

// Occupies the "advisor" output-mode slot end-to-end (trigger word, DB
// column, route param) -- only the rendered content and its UI label are
// "Editor Mode". See the schema comment above for why.
async function reformatReportEditorJson({ mainReport }) {
  const systemPrompt = assembleReformatPrompt();
  const userMessage = `advisor mode\n\n${EDITOR_JSON_MAPPING_INSTRUCTIONS}\n\nThe text below is a complete CLASR report already produced by the full detection pipeline. It is not a manuscript -- do not analyze it as one. Convert it into the JSON structure above, preserving every substantive red flag it already contains (zero data loss, subject to the 5-item cap).\n\n---\n\n${mainReport}`;

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
      format: { type: 'json_schema', schema: EDITOR_JSON_SCHEMA },
    },
    messages: [{ role: 'user', content: userMessage }],
  });

  if (response.stop_reason === 'max_tokens') {
    console.warn('[claude] reformatReportEditorJson response truncated at max_tokens.');
  }

  let parsed = null;
  try {
    parsed = JSON.parse(response.content[0].text);
  } catch (err) {
    console.error('[claude] reformatReportEditorJson: failed to parse JSON output:', err.message);
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

module.exports = { analyzeManuscript, reformatReport, reformatReportAuthorJson, reformatReportReviewerJson, reformatReportEditorJson };
