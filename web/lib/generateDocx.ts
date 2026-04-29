import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, Header, Footer,
} from 'docx';

const C = {
  navy:    '0F172A',
  steel:   '3B82F6',
  white:   'FFFFFF',
  red:     'DC2626',
  orange:  'EA580C',
  yellow:  'CA8A04',
  gray:    '6B7280',
  charcoal:'1E293B',
  mid:     '64748B',
  border:  'CBD5E1',
};

const SEV: Record<string, { badge: string; bg: string; text: string }> = {
  CRITICAL:    { badge: C.red,    bg: 'FEF2F2', text: '991B1B' },
  MAJOR:       { badge: C.orange, bg: 'FFF7ED', text: '9A3412' },
  MODERATE:    { badge: C.yellow, bg: 'FEFCE8', text: '854D0E' },
  UNCERTAINTY: { badge: C.gray,   bg: 'F8FAFC', text: '374151' },
};

const noBorder = {
  top:    { style: BorderStyle.NONE, size: 0, color: C.white },
  bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
  left:   { style: BorderStyle.NONE, size: 0, color: C.white },
  right:  { style: BorderStyle.NONE, size: 0, color: C.white },
};
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: C.border };

// Split text at **bold** markers and return mixed TextRun array
function richRun(text: string, opts: Record<string, unknown> = {}): TextRun[] {
  return text.split(/(\*\*.*?\*\*)/).reduce<TextRun[]>((acc, part) => {
    if (!part) return acc;
    if (part.startsWith('**') && part.endsWith('**')) {
      acc.push(new TextRun({ text: part.slice(2, -2), font: 'Calibri', bold: true, ...opts }));
    } else {
      acc.push(new TextRun({ text: part, font: 'Calibri', ...opts }));
    }
    return acc;
  }, []);
}

function run(text: string, opts: Record<string, unknown> = {}) {
  return new TextRun({ text, font: 'Calibri', ...opts });
}

function sp(pts = 25) {
  return new Paragraph({ spacing: { before: pts, after: 0 }, children: [] });
}

function sectionHeader(label: string) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorder,
      shading: { fill: C.navy, type: ShadingType.CLEAR },
      margins: { top: 90, bottom: 90, left: 160, right: 160 },
      children: [new Paragraph({
        children: [run('▸  ' + label, { bold: true, color: C.white, size: 22 })],
      })],
    })] })]
  });
}

function severityRow(sevKey: string, body: string) {
  const s = SEV[sevKey] || SEV.UNCERTAINTY;
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1500, 7860],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: noBorder,
        shading: { fill: s.badge, type: ShadingType.CLEAR },
        margins: { top: 70, bottom: 70, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [run(sevKey, { bold: true, color: C.white, size: 16 })],
        })],
      }),
      new TableCell({
        borders: {
          top: thinBorder, bottom: thinBorder, right: thinBorder,
          left: { style: BorderStyle.NONE, size: 0, color: C.white },
        },
        shading: { fill: s.bg, type: ShadingType.CLEAR },
        margins: { top: 70, bottom: 70, left: 140, right: 100 },
        children: [new Paragraph({ children: richRun(body, { color: s.text, size: 20 }) })],
      }),
    ]})]
  });
}

function bodyPara(text: string) {
  return new Paragraph({
    spacing: { before: 15, after: 15 },
    children: richRun(text, { color: C.charcoal, size: 20 }),
  });
}

function bulletPara(text: string) {
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    indent: { left: 240, hanging: 200 },
    children: [
      run('●  ', { color: C.steel, size: 18 }),
      ...richRun(text, { color: C.charcoal, size: 20 }),
    ],
  });
}

function summaryPara(text: string) {
  const clean = text.replace(/^\*\*[^*]+\*\*\s*/, '');
  return new Paragraph({
    spacing: { before: 100, after: 40 },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.border, space: 6 } },
    children: richRun(clean, { color: C.mid, size: 20, italics: true }),
  });
}

function hrPara() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 } },
    spacing: { before: 30, after: 30 },
    children: [],
  });
}

// ── Content preprocessor ─────────────────────────────────────────
function preprocessContent(raw: string): string {
  let s = raw.replace(/\n{3,}/g, '\n\n').replace(/^[ \t]+$/gm, '');
  s = s.replace(/▸\s*Severity Signal Map[^\n]*\n([\s\S]*?)(?=\n▸|\n#{1,3} |$)/gi, '');
  const lines = s.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('▸') || /^#{1,3}\s/.test(line)) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() ?? '';
      if (!next || next.startsWith('▸') || /^#{1,3}\s/.test(next)) continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}

// ── Content parser ────────────────────────────────────────────────
function parseContent(content: string): (Paragraph | Table)[] {
  content = preprocessContent(content);
  const lines = content.split('\n');
  const items: (Paragraph | Table)[] = [];
  const isSevMarker = (l: string) =>
    /\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/i.test(l) ||
    /^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]/i.test(l);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) { items.push(sp(25)); continue; }

    if (line.match(/^[━═─\-]{3,}$/) && !line.match(/[a-zA-Z]/)) {
      items.push(hrPara()); continue;
    }

    if (line.startsWith('▸') || line.match(/^#{1,3}\s/)) {
      const text = line.startsWith('▸') ? line.slice(1).trimStart() : line.replace(/^#{1,3}\s*/, '').trim();
      items.push(sectionHeader(text));
      continue;
    }

    const sevKey = line.includes('[CRITICAL]')    || /^CRITICAL[:\s]/i.test(line)    ? 'CRITICAL'
      : line.includes('[MAJOR]')       || /^MAJOR[:\s]/i.test(line)       ? 'MAJOR'
      : line.includes('[MODERATE]')    || /^MODERATE[:\s]/i.test(line)    ? 'MODERATE'
      : line.includes('[UNCERTAINTY]') || /^UNCERTAINTY[:\s]/i.test(line) ? 'UNCERTAINTY'
      : null;

    if (sevKey) {
      let body = line
        .replace(/\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/gi, '')
        .replace(/^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]*/i, '')
        .trim();
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() || '';
      if (next && !isSevMarker(next) && !next.startsWith('▸') && !next.match(/^#{1,3}\s/)) {
        body += ' ' + next; i = j;
      }
      items.push(severityRow(sevKey, body));
      continue;
    }

    if (line.match(/^[-•]\s+/)) {
      items.push(bulletPara(line.replace(/^[-•]\s+/, '')));
      continue;
    }

    const remaining = lines.slice(i + 1).filter(l => l.trim());
    if (remaining.length === 0 && line.endsWith('.') && !line.startsWith('-')) {
      items.push(summaryPara(line)); continue;
    }

    items.push(bodyPara(line));
  }

  return items;
}

// ── Main export ───────────────────────────────────────────────────
export async function generateDocx(content: string, reportIndex: number): Promise<Blob> {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Calibri', size: 20, color: C.charcoal } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Table({
              width: { size: 9638, type: WidthType.DXA },
              columnWidths: [5500, 4138],
              rows: [new TableRow({ children: [
                new TableCell({ borders: noBorder, children: [new Paragraph({ children: [
                  run('CLASR-EN', { bold: true, color: C.navy, size: 20 }),
                  run('  ·  ACADEMIC READING SIGNAL REPORT', { color: C.mid, size: 16 }),
                ] })] }),
                new TableCell({ borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
                  run(`Report ${reportIndex}  ·  ${today}`, { color: C.mid, size: 16 }),
                ] })] }),
              ]})],
            }),
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.navy, space: 1 } },
              spacing: { before: 40, after: 0 },
              children: [],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.border, space: 4 } },
              spacing: { before: 40, after: 0 },
              children: [],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run('This report is an academic reading signal. Decisions, evaluation, and publication responsibility rest with the user.', { color: C.mid, size: 15 })],
            }),
          ],
        }),
      },
      children: [
        sp(30),
        ...parseContent(content),
        sp(60),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
