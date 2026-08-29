// Server-side report export (2026-08-29): PDF via headless Chromium
// (Playwright), DOCX via the `docx` package, plain text natively. Content
// mapping mirrors the client-side exporters in static-web/script.js
// (clasrExport{Json,Reviewer,Editor}{Txt,Docx}) field-for-field, since those
// are the schemas Author/Reviewer/Editor Mode actually produce -- this is
// not a redesign, just the same content rendered off the main thread instead
// of in the browser, so PDF is always light-mode, paginated, and has
// selectable text regardless of the viewer's OS print dialog.
const { chromium } = require('playwright');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
} = require('docx');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(value) {
  return String(value || 'clasr-report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'clasr-report';
}

// Same humanization rules as clasrJsonHeadingCase/clasrJsonStatusLabel in
// script.js: internal module/status codes must never reach an export either.
function headingCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}
function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}
function cleanText(value) {
  return String(value || '').replace(/_/g, ' ');
}
function statusLabel(value) {
  const label = headingCase(value);
  return label.toLowerCase() === 'signal present' ? 'Review signal' : label;
}

// ── HTML shell (PDF only) ────────────────────────────────────────────────
// Deliberately does not import styles.css or anything theme-aware -- PDF
// must never pick up dark mode, so every color here is hardcoded light.
function htmlDocument(title, bodyHtml) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; --ink: #302b27; --muted: #756f68; --line: #ded9d2; --accent: #a32642; --paper: #fbfaf7; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; line-height: 1.5; }
  .report { max-width: 980px; margin: 0 auto; padding: 24px; }
  .brand { margin-bottom: 22px; color: var(--accent); font-size: 22px; font-weight: 900; letter-spacing: 0.08em; }
  .top { border: 1px solid var(--line); border-radius: 6px; padding: 18px; margin-bottom: 18px; page-break-inside: avoid; }
  .eyebrow { color: var(--muted); font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
  h1 { margin: 0 0 10px; font-size: 22px; line-height: 1.18; }
  h2 { margin: 30px 0 12px; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; page-break-after: avoid; color: var(--accent); }
  h3 { margin: 18px 0 8px; font-size: 15px; page-break-after: avoid; }
  p { margin: 0 0 10px; }
  .attention { border: 1px solid var(--line); border-radius: 6px; padding: 16px 18px; margin: 18px 0; page-break-inside: avoid; }
  .attention strong { display: block; color: var(--accent); font-size: 15px; margin-bottom: 8px; }
  .block { border-top: 1px solid var(--line); padding-top: 14px; margin-top: 16px; page-break-inside: avoid; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 8px 0; }
  .field-label { color: var(--muted); font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
  ul, ol { padding-left: 18px; margin: 6px 0; }
  li { margin-bottom: 4px; }
  .meta { color: var(--muted); }
  .severity { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; text-transform: uppercase; border: 1px solid var(--line); margin-left: 6px; }
  @page { size: A4; margin: 18mm 16mm; }
</style>
</head>
<body>
  <main class="report">
    <div class="brand">CLASR</div>
    ${bodyHtml}
  </main>
</body>
</html>`;
}

// ── Author Mode ───────────────────────────────────────────────────────────
function authorTitle(report, fallback) {
  return (report.manuscript && report.manuscript.title) || fallback || 'Clasr Signal Report';
}

function authorHtml(report, fallbackTitle) {
  const posture = report.integrated_risk_posture || {};
  const sectionsHtml = (report.sections || []).map((section) => {
    const signalsHtml = (section.signals || []).map((s) => `
      <div class="block">
        <h3>${escapeHtml(titleCase(s.name))}</h3>
        <div class="fields">
          <div><div class="field-label">What surfaced</div><p>${escapeHtml(s.what_this_is || '')}</p></div>
          <div><div class="field-label">Why a reviewer may notice it</div><p>${escapeHtml(s.why_this_becomes_visible || '')}</p></div>
        </div>
        ${(s.what_you_could_do || []).length ? `<div class="field-label">Possible next step</div><ul>${(s.what_you_could_do || []).map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>` : ''}
      </div>`).join('');
    return `<h2>Section ${escapeHtml(section.section)} — ${escapeHtml(cleanText(section.title))}</h2>
      ${section.no_issue_line ? `<p>${escapeHtml(section.no_issue_line)}</p>` : ''}
      ${signalsHtml}`;
  }).join('');

  const section10Html = report.section_10 ? `
    <h2>Section 10 — ${escapeHtml(cleanText(report.section_10.title))}</h2>
    ${(report.section_10.modules || []).map((m) => `
      <div class="block">
        <h3>${escapeHtml(headingCase(m.name))} <span class="meta">— ${escapeHtml(statusLabel(m.status))}</span></h3>
        ${m.what_was_found ? `<p>${escapeHtml(m.what_was_found)}</p>` : ''}
        ${m.why_it_matters ? `<div class="field-label">Why this matters structurally</div><p>${escapeHtml(m.why_it_matters)}</p>` : ''}
        ${(m.what_you_could_do || []).length ? `<div class="field-label">Possible next step</div><ul>${(m.what_you_could_do || []).map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}` : '';

  const closingPosture = (report.closing && report.closing.integrated_risk_posture) || {};
  const body = `
    <section class="top">
      <div class="eyebrow">Manuscript</div>
      <h1>${escapeHtml(authorTitle(report, fallbackTitle))}</h1>
      <p class="meta">${escapeHtml([report.field, report.study_type, report.q_profile && report.q_profile.estimate].filter(Boolean).join(' · '))}</p>
    </section>
    <section class="attention">
      <div class="eyebrow">Overall Review Attention</div>
      <strong>${escapeHtml(headingCase(posture.label || ''))}</strong>
      <p>${escapeHtml(posture.summary || '')}</p>
    </section>
    ${(posture.expanded_explanation || []).length ? `<h2>Executive Summary</h2>${(posture.expanded_explanation || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}` : ''}
    ${(report.priority_preview || []).length ? `<h2>Priority Action Signals Preview</h2><ol>${(report.priority_preview || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ol>` : ''}
    ${sectionsHtml}
    ${section10Html}
    ${closingPosture.explanation ? `<h2>Overall Review Attention — Closing</h2><p>${escapeHtml(closingPosture.explanation)}</p>` : ''}
    ${report.leverage_note ? `<p><em>${escapeHtml(report.leverage_note)}</em></p>` : ''}
    ${(report.final_checklist || []).length ? `<h2>Final Checklist</h2><ol>${(report.final_checklist || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ol>` : ''}
  `;
  return htmlDocument(authorTitle(report, fallbackTitle), body);
}

function authorTxt(report, fallbackTitle) {
  const lines = [];
  lines.push(authorTitle(report, fallbackTitle));
  lines.push('');
  const posture = report.integrated_risk_posture || {};
  lines.push('OVERALL REVIEW ATTENTION: ' + (posture.label || ''));
  lines.push(posture.summary || '');
  lines.push('');
  lines.push('EXECUTIVE SUMMARY');
  (posture.expanded_explanation || []).forEach((p) => lines.push(p));
  lines.push('');
  lines.push('PRIORITY ACTION SIGNALS PREVIEW');
  (report.priority_preview || []).forEach((p, i) => lines.push((i + 1) + '. ' + p));
  (report.sections || []).forEach((section) => {
    lines.push('');
    lines.push('SECTION ' + section.section + ' — ' + cleanText(section.title));
    if (section.no_issue_line) lines.push(section.no_issue_line);
    (section.signals || []).forEach((s) => {
      lines.push('');
      lines.push(titleCase(s.name));
      lines.push('What surfaced: ' + s.what_this_is);
      lines.push('Why a reviewer may notice it: ' + s.why_this_becomes_visible);
      (s.what_you_could_do || []).forEach((o) => lines.push('Possible next step: ' + o));
    });
  });
  if (report.section_10) {
    lines.push('');
    lines.push('SECTION 10 — ' + cleanText(report.section_10.title));
    (report.section_10.modules || []).forEach((m) => {
      lines.push(headingCase(m.name) + ': ' + statusLabel(m.status));
      if (m.what_was_found) lines.push('  ' + m.what_was_found);
    });
  }
  if ((report.final_checklist || []).length) {
    lines.push('');
    lines.push('FINAL CHECKLIST');
    report.final_checklist.forEach((item, i) => lines.push((i + 1) + '. ' + item));
  }
  return lines.join('\n');
}

function authorDocx(report, fallbackTitle) {
  const children = [];
  children.push(new Paragraph({ text: authorTitle(report, fallbackTitle), heading: HeadingLevel.TITLE }));
  const posture = report.integrated_risk_posture || {};
  children.push(new Paragraph({ text: 'Overall review attention: ' + (posture.label || ''), heading: HeadingLevel.HEADING_2 }));
  (posture.expanded_explanation || []).forEach((p) => children.push(new Paragraph({ children: [new TextRun(p)] })));
  children.push(new Paragraph({ text: 'Priority action signals preview', heading: HeadingLevel.HEADING_2 }));
  (report.priority_preview || []).forEach((p) => children.push(new Paragraph({ children: [new TextRun(p)] })));
  (report.sections || []).forEach((section) => {
    children.push(new Paragraph({ text: 'Section ' + section.section + ' — ' + cleanText(section.title), heading: HeadingLevel.HEADING_2 }));
    if (section.no_issue_line) children.push(new Paragraph({ children: [new TextRun(section.no_issue_line)] }));
    (section.signals || []).forEach((s) => {
      children.push(new Paragraph({ text: titleCase(s.name), heading: HeadingLevel.HEADING_3 }));
      children.push(new Paragraph({ children: [new TextRun('What surfaced: ' + s.what_this_is)] }));
      children.push(new Paragraph({ children: [new TextRun('Why a reviewer may notice it: ' + s.why_this_becomes_visible)] }));
      (s.what_you_could_do || []).forEach((o) => children.push(new Paragraph({ children: [new TextRun({ text: 'Possible next step: ' + o, italics: true })] })));
    });
  });
  if (report.section_10) {
    children.push(new Paragraph({ text: 'Section 10 — ' + cleanText(report.section_10.title), heading: HeadingLevel.HEADING_2 }));
    (report.section_10.modules || []).forEach((m) => {
      children.push(new Paragraph({ children: [new TextRun({ text: headingCase(m.name) + ': ' + statusLabel(m.status), bold: true })] }));
      if (m.what_was_found) children.push(new Paragraph({ children: [new TextRun(m.what_was_found)] }));
    });
  }
  if ((report.final_checklist || []).length) {
    children.push(new Paragraph({ text: 'Final checklist', heading: HeadingLevel.HEADING_2 }));
    report.final_checklist.forEach((item) => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));
  }
  return children;
}

// ── Reviewer Mode ─────────────────────────────────────────────────────────
function reviewerTitle(report, fallback) {
  return (report.manuscript && report.manuscript.title) || fallback || 'Clasr Signal Report';
}

function reviewerHtml(report, fallbackTitle) {
  const qs = report.quick_scan || {};
  const ca = report.comments_to_authors || {};
  const editorial = report.editorial_recommendation || {};
  const sectionsHtml = (ca.sections || []).map((section) => {
    let inner = '';
    (section.compliance_items || []).forEach((c) => { inner += `<p><strong>${escapeHtml(c.label)}:</strong> ${escapeHtml(c.status)}</p>`; });
    if (section.status === 'no_issues_identified' && !(section.items || []).length) {
      inner += '<p>No issues identified.</p>';
    } else {
      (section.items || []).forEach((item) => {
        inner += `<p>${escapeHtml(item.text)}${item.major_issue_ref ? ` (Major Issue ${escapeHtml(item.major_issue_ref)})` : ''}</p>`;
      });
    }
    return `<h2>${escapeHtml(section.number || '')} ${escapeHtml(cleanText(section.title))}</h2>${inner}`;
  }).join('');

  const majorIssuesHtml = (ca.major_issues || []).map((issue) => `
    <div class="block">
      <h3>(${escapeHtml(issue.id)}) ${escapeHtml(issue.issue)} <span class="severity">${escapeHtml(issue.severity || '')}</span></h3>
      <p class="meta">In: ${escapeHtml((issue.location || []).join(', '))}</p>
      <div class="fields">
        <div><div class="field-label">Why it matters</div><p>${escapeHtml(issue.why_it_matters || '')}</p></div>
        <div><div class="field-label">What authors should address</div><p>${escapeHtml(issue.what_authors_should_address || '')}</p></div>
      </div>
    </div>`).join('') || '<p>No issues identified.</p>';

  const body = `
    <section class="top">
      <div class="eyebrow">Manuscript</div>
      <h1>${escapeHtml(reviewerTitle(report, fallbackTitle))}</h1>
    </section>
    <section class="attention">
      <div class="eyebrow">Quick Scan</div>
      <strong>${escapeHtml(qs.editorial_recommendation || '')}</strong>
      <p class="meta">Risk level: ${escapeHtml(qs.risk_level || '')}</p>
      ${(qs.key_issues || []).length ? `<ul>${(qs.key_issues || []).map((item) => `<li>${escapeHtml(item.text)}${item.major_issue_ref ? ` (Major Issue ${escapeHtml(item.major_issue_ref)})` : ''}</li>`).join('')}</ul>` : ''}
    </section>
    <h2>1.1 General Evaluation</h2>
    <p>${escapeHtml(ca.general_evaluation || '')}</p>
    <h2>1.2 Major Issues</h2>
    ${majorIssuesHtml}
    ${sectionsHtml}
    <h2>Confidential Comments to the Editor</h2>
    <p>${escapeHtml(report.confidential_comments_to_editor || '')}</p>
    <h2>Editorial Recommendation</h2>
    <p><strong>${escapeHtml(editorial.decision || '')}</strong></p>
    <p>${escapeHtml(editorial.rationale || '')}</p>
  `;
  return htmlDocument(reviewerTitle(report, fallbackTitle), body);
}

function reviewerTxt(report, fallbackTitle) {
  const lines = [];
  lines.push(reviewerTitle(report, fallbackTitle));
  lines.push('');
  const qs = report.quick_scan || {};
  lines.push('QUICK SCAN');
  lines.push('Editorial recommendation: ' + (qs.editorial_recommendation || ''));
  lines.push('Risk level: ' + (qs.risk_level || ''));
  (qs.key_issues || []).forEach((item, i) => lines.push((i + 1) + '. ' + item.text + (item.major_issue_ref ? ' (Major Issue ' + item.major_issue_ref + ')' : '')));
  const ca = report.comments_to_authors || {};
  lines.push('');
  lines.push('1.1 GENERAL EVALUATION');
  lines.push(ca.general_evaluation || '');
  lines.push('');
  lines.push('1.2 MAJOR ISSUES');
  (ca.major_issues || []).forEach((issue) => {
    lines.push('');
    lines.push('(' + issue.id + ') ' + issue.issue + ' [' + issue.severity + ']');
    lines.push('In: ' + (issue.location || []).join(', '));
    lines.push('Why it matters: ' + issue.why_it_matters);
    lines.push('What authors should address: ' + issue.what_authors_should_address);
  });
  (ca.sections || []).forEach((section) => {
    lines.push('');
    lines.push(section.number + ' ' + cleanText(section.title));
    (section.compliance_items || []).forEach((c) => lines.push(c.label + ': ' + c.status));
    if (section.status === 'no_issues_identified' && !(section.items || []).length) {
      lines.push('No issues identified.');
    } else {
      (section.items || []).forEach((item) => lines.push(item.text + (item.major_issue_ref ? ' (Major Issue ' + item.major_issue_ref + ')' : '')));
    }
  });
  lines.push('');
  lines.push('CONFIDENTIAL COMMENTS TO THE EDITOR');
  lines.push(report.confidential_comments_to_editor || '');
  lines.push('');
  lines.push('EDITORIAL RECOMMENDATION');
  const editorial = report.editorial_recommendation || {};
  lines.push(editorial.decision || '');
  lines.push(editorial.rationale || '');
  return lines.join('\n');
}

function reviewerDocx(report, fallbackTitle) {
  const children = [];
  children.push(new Paragraph({ text: reviewerTitle(report, fallbackTitle), heading: HeadingLevel.TITLE }));
  const qs = report.quick_scan || {};
  children.push(new Paragraph({ text: 'Quick scan', heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ children: [new TextRun('Editorial recommendation: ' + (qs.editorial_recommendation || ''))] }));
  children.push(new Paragraph({ children: [new TextRun('Risk level: ' + (qs.risk_level || ''))] }));
  (qs.key_issues || []).forEach((item) => children.push(new Paragraph({ text: item.text + (item.major_issue_ref ? ' (Major Issue ' + item.major_issue_ref + ')' : ''), bullet: { level: 0 } })));
  const ca = report.comments_to_authors || {};
  children.push(new Paragraph({ text: '1.1 General evaluation', heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ children: [new TextRun(ca.general_evaluation || '')] }));
  children.push(new Paragraph({ text: '1.2 Major issues', heading: HeadingLevel.HEADING_2 }));
  (ca.major_issues || []).forEach((issue) => {
    children.push(new Paragraph({ text: '(' + issue.id + ') ' + issue.issue + ' [' + issue.severity + ']', heading: HeadingLevel.HEADING_3 }));
    children.push(new Paragraph({ children: [new TextRun('In: ' + (issue.location || []).join(', '))] }));
    children.push(new Paragraph({ children: [new TextRun('Why it matters: ' + issue.why_it_matters)] }));
    children.push(new Paragraph({ children: [new TextRun('What authors should address: ' + issue.what_authors_should_address)] }));
  });
  (ca.sections || []).forEach((section) => {
    children.push(new Paragraph({ text: section.number + ' ' + cleanText(section.title), heading: HeadingLevel.HEADING_2 }));
    (section.compliance_items || []).forEach((c) => children.push(new Paragraph({ children: [new TextRun(c.label + ': ' + c.status)] })));
    if (section.status === 'no_issues_identified' && !(section.items || []).length) {
      children.push(new Paragraph({ children: [new TextRun('No issues identified.')] }));
    } else {
      (section.items || []).forEach((item) => children.push(new Paragraph({ children: [new TextRun(item.text + (item.major_issue_ref ? ' (Major Issue ' + item.major_issue_ref + ')' : ''))] })));
    }
  });
  children.push(new Paragraph({ text: 'Confidential comments to the editor', heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ children: [new TextRun(report.confidential_comments_to_editor || '')] }));
  const editorial = report.editorial_recommendation || {};
  children.push(new Paragraph({ text: 'Editorial recommendation', heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ children: [new TextRun({ text: editorial.decision || '', bold: true })] }));
  children.push(new Paragraph({ children: [new TextRun(editorial.rationale || '')] }));
  return children;
}

// ── Editor Mode ───────────────────────────────────────────────────────────
function editorTitle(report, fallback) {
  return (report.manuscript && report.manuscript.title) || fallback || 'Clasr Signal Report';
}

function editorHtml(report, fallbackTitle) {
  const ora = report.overall_review_attention || {};
  const es = report.executive_summary || {};
  const fullReport = report.full_report || {};
  const recommendation = fullReport.recommendation || {};
  const body = `
    <section class="top">
      <div class="eyebrow">Manuscript</div>
      <h1>${escapeHtml(editorTitle(report, fallbackTitle))}</h1>
    </section>
    <section class="attention">
      <div class="eyebrow">Overall Review Attention</div>
      <strong>${escapeHtml(ora.label || '')}</strong>
      <p>${escapeHtml(ora.summary || '')}</p>
    </section>
    <h2>Editorial Triage</h2>
    <p><strong>Decision: ${escapeHtml(es.decision || '')}${es.is_conditional ? ` (conditional: ${escapeHtml(es.condition || '')})` : ''}</strong></p>
    <p>${escapeHtml(es.rationale || '')}</p>
    ${(report.priority_order || []).length ? `<h2>Red Flag Index</h2><ol>${(report.priority_order || []).map((item) => `<li><span class="severity">${escapeHtml(item.severity || '')}</span> ${escapeHtml(item.title)}</li>`).join('')}</ol>` : ''}
    ${(fullReport.red_flags || []).length ? `<h2>Red Flags</h2>${(fullReport.red_flags || []).map((flag) => `
      <div class="block">
        <h3><span class="severity">${escapeHtml(flag.severity || '')}</span> ${escapeHtml(flag.title)}</h3>
        ${flag.location ? `<p class="meta">In: ${escapeHtml(flag.location)}</p>` : ''}
        <div class="fields">
          <div><div class="field-label">Why it matters</div><p>${escapeHtml(flag.why_it_matters || '')}</p></div>
          <div><div class="field-label">Editor action</div><p>${escapeHtml(titleCase(flag.editor_action))}</p></div>
        </div>
      </div>`).join('')}` : ''}
    <h2>Editorial Recommendation</h2>
    <p><strong>${escapeHtml(recommendation.label || '')}${recommendation.conditional ? ' (conditional)' : ''}</strong></p>
    <p>${escapeHtml(recommendation.text || '')}</p>
    ${(report.final_checklist || []).length ? `<h2>Final Checklist</h2><ol>${(report.final_checklist || []).map((item) => `<li>${escapeHtml(item.text)} <span class="meta">[${escapeHtml(item.kind || '')}]</span></li>`).join('')}</ol>` : ''}
  `;
  return htmlDocument(editorTitle(report, fallbackTitle), body);
}

function editorTxt(report, fallbackTitle) {
  const lines = [];
  const manuscript = report.manuscript || {};
  lines.push(manuscript.title || fallbackTitle || 'Clasr Signal Report');
  lines.push('');
  const ora = report.overall_review_attention || {};
  lines.push('OVERALL REVIEW ATTENTION: ' + (ora.label || ''));
  lines.push(ora.summary || '');
  lines.push('');
  const es = report.executive_summary || {};
  lines.push('EDITORIAL TRIAGE');
  lines.push('Decision: ' + (es.decision || '') + (es.is_conditional ? ' (conditional: ' + es.condition + ')' : ''));
  lines.push(es.rationale || '');
  lines.push('');
  lines.push('RED FLAG INDEX');
  (report.priority_order || []).forEach((item, i) => lines.push((i + 1) + '. [' + item.severity + '] ' + item.title));
  const fullReport = report.full_report || {};
  lines.push('');
  lines.push('RED FLAGS');
  (fullReport.red_flags || []).forEach((flag) => {
    lines.push('');
    lines.push('[' + flag.severity + '] ' + flag.title + (flag.location ? ' (In: ' + flag.location + ')' : ''));
    lines.push('Why it matters: ' + flag.why_it_matters);
    lines.push('Editor action: ' + flag.editor_action);
  });
  const recommendation = fullReport.recommendation || {};
  lines.push('');
  lines.push('EDITORIAL RECOMMENDATION: ' + (recommendation.label || '') + (recommendation.conditional ? ' (conditional)' : ''));
  lines.push(recommendation.text || '');
  if ((report.final_checklist || []).length) {
    lines.push('');
    lines.push('FINAL CHECKLIST');
    report.final_checklist.forEach((item, i) => lines.push((i + 1) + '. ' + item.text + ' [' + item.kind + ']'));
  }
  return lines.join('\n');
}

function editorDocx(report, fallbackTitle) {
  const children = [];
  const manuscript = report.manuscript || {};
  children.push(new Paragraph({ text: manuscript.title || fallbackTitle || 'Clasr Signal Report', heading: HeadingLevel.TITLE }));
  const ora = report.overall_review_attention || {};
  children.push(new Paragraph({ text: 'Overall review attention: ' + (ora.label || ''), heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ children: [new TextRun(ora.summary || '')] }));
  const es = report.executive_summary || {};
  children.push(new Paragraph({ text: 'Editorial triage', heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Decision: ' + (es.decision || '') + (es.is_conditional ? ' (conditional: ' + es.condition + ')' : ''), bold: true })] }));
  children.push(new Paragraph({ children: [new TextRun(es.rationale || '')] }));
  children.push(new Paragraph({ text: 'Red flag index', heading: HeadingLevel.HEADING_2 }));
  (report.priority_order || []).forEach((item) => children.push(new Paragraph({ text: '[' + item.severity + '] ' + item.title, bullet: { level: 0 } })));
  const fullReport = report.full_report || {};
  children.push(new Paragraph({ text: 'Red flags', heading: HeadingLevel.HEADING_2 }));
  (fullReport.red_flags || []).forEach((flag) => {
    children.push(new Paragraph({ text: '[' + flag.severity + '] ' + flag.title, heading: HeadingLevel.HEADING_3 }));
    if (flag.location) children.push(new Paragraph({ children: [new TextRun('In: ' + flag.location)] }));
    children.push(new Paragraph({ children: [new TextRun('Why it matters: ' + flag.why_it_matters)] }));
    children.push(new Paragraph({ children: [new TextRun('Editor action: ' + flag.editor_action)] }));
  });
  const recommendation = fullReport.recommendation || {};
  children.push(new Paragraph({ text: 'Editorial recommendation', heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ children: [new TextRun({ text: (recommendation.label || '') + (recommendation.conditional ? ' (conditional)' : ''), bold: true })] }));
  children.push(new Paragraph({ children: [new TextRun(recommendation.text || '')] }));
  if ((report.final_checklist || []).length) {
    children.push(new Paragraph({ text: 'Final checklist', heading: HeadingLevel.HEADING_2 }));
    report.final_checklist.forEach((item) => children.push(new Paragraph({ text: item.text + ' [' + item.kind + ']', bullet: { level: 0 } })));
  }
  return children;
}

// ── Dispatch ──────────────────────────────────────────────────────────────
const MODE_HTML = { author: authorHtml, reviewer: reviewerHtml, advisor: editorHtml };
const MODE_TXT = { author: authorTxt, reviewer: reviewerTxt, advisor: editorTxt };
const MODE_DOCX = { author: authorDocx, reviewer: reviewerDocx, advisor: editorDocx };
const MODE_TITLE = { author: authorTitle, reviewer: reviewerTitle, advisor: editorTitle };
const MODE_SUFFIX = { author: '', reviewer: '-reviewer', advisor: '-editor' };

function exportFilename(report, mode, fallbackTitle, ext) {
  const title = (MODE_TITLE[mode] || authorTitle)(report, fallbackTitle);
  return slugify(title) + (MODE_SUFFIX[mode] || '') + '.' + ext;
}

let sharedBrowserPromise = null;
function getBrowser() {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = chromium.launch({ headless: true, args: ['--no-sandbox'] });
    sharedBrowserPromise.catch(() => { sharedBrowserPromise = null; });
  }
  return sharedBrowserPromise;
}

async function exportReportAsPdf(report, mode, fallbackTitle) {
  const buildHtml = MODE_HTML[mode] || authorHtml;
  const html = buildHtml(report, fallbackTitle);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
    });
    return buffer;
  } finally {
    await page.close();
  }
}

async function exportReportAsDocx(report, mode, fallbackTitle) {
  const buildChildren = MODE_DOCX[mode] || authorDocx;
  const doc = new Document({ sections: [{ properties: {}, children: buildChildren(report, fallbackTitle) }] });
  return Packer.toBuffer(doc);
}

function exportReportAsTxt(report, mode, fallbackTitle) {
  const buildTxt = MODE_TXT[mode] || authorTxt;
  return buildTxt(report, fallbackTitle);
}

async function closeSharedBrowser() {
  if (sharedBrowserPromise) {
    const browser = await sharedBrowserPromise.catch(() => null);
    if (browser) await browser.close().catch(() => {});
    sharedBrowserPromise = null;
  }
}

module.exports = {
  exportReportAsPdf,
  exportReportAsDocx,
  exportReportAsTxt,
  exportFilename,
  closeSharedBrowser,
};
