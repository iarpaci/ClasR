import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, Header, Footer,
} from 'docx';

// ── Colour palette (ClasR dark-professional) ──────────────────────
const C = {
  navy:    '0F172A',   // header / section bars  (slate-900)
  steel:   '3B82F6',  // section accent (blue-500)
  silver:  'F1F5F9',  // light row shading (slate-100)
  white:   'FFFFFF',
  red:     'DC2626',  // CRITICAL (red-600)
  orange:  'EA580C',  // MAJOR (orange-600)
  yellow:  'CA8A04',  // MODERATE (yellow-600)
  gray:    '6B7280',  // UNCERTAINTY (gray-500)
  charcoal:'1E293B',  // body text (slate-800)
  mid:     '64748B',  // muted (slate-500)
  border:  'CBD5E1',  // slate-300
};

const SEV: Record<string, { badge: string; bg: string; text: string }> = {
  CRITICAL:    { badge: C.red,    bg: 'FEF2F2', text: '991B1B' },
  MAJOR:       { badge: C.orange, bg: 'FFF7ED', text: '9A3412' },
  MODERATE:    { badge: C.yellow, bg: 'FEFCE8', text: '854D0E' },
  UNCERTAINTY: { badge: C.gray,   bg: 'F8FAFC', text: '374151' },
};

// ── Helpers ───────────────────────────────────────────────────────
const border   = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders  = { top: border, bottom: border, left: border, right: border };
const noBorder = { top:{style:BorderStyle.NONE,size:0,color:C.white}, bottom:{style:BorderStyle.NONE,size:0,color:C.white}, left:{style:BorderStyle.NONE,size:0,color:C.white}, right:{style:BorderStyle.NONE,size:0,color:C.white} };

function run(text: string, opts: Record<string, unknown> = {}) {
  return new TextRun({ text, font: 'Calibri', ...opts });
}

function sp(pts = 80) {
  return new Paragraph({ spacing: { before: pts, after: 0 }, children: [] });
}

function sectionHeader(label: string) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorder,
      shading: { fill: C.navy, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      children: [new Paragraph({ children: [run(label, { bold: true, color: C.white, size: 22 })] })]
    })]})]
  });
}

function severityRow(sevKey: string, body: string) {
  const s = SEV[sevKey] || SEV.UNCERTAINTY;
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1600, 7760],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: noBorder,
        shading: { fill: s.badge, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(sevKey, { bold: true, color: C.white, size: 16 })] })]
      }),
      new TableCell({
        borders: { top: border, bottom: border, right: border, left: { style: BorderStyle.NONE, size: 0, color: C.white } },
        shading: { fill: s.bg, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 160, right: 120 },
        children: [new Paragraph({ children: [run(body, { color: s.text, size: 20 })] })]
      }),
    ]})]
  });
}

function bodyPara(text: string) {
  return new Paragraph({
    spacing: { before: 40, after: 60 },
    children: [run(text, { color: C.charcoal, size: 20 })],
  });
}

function bulletPara(text: string) {
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    indent: { left: 240, hanging: 200 },
    children: [
      run('● ', { color: C.steel, size: 18 }),
      run(text, { color: C.charcoal, size: 20 }),
    ],
  });
}

function summaryPara(text: string) {
  return new Paragraph({
    spacing: { before: 120, after: 60 },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.border, space: 6 } },
    children: [run(text.replace(/^\*\*[^*]+\*\*\s*/, ''), { color: C.mid, size: 20, italics: true })],
  });
}

function hrPara() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 } },
    spacing: { before: 40, after: 40 },
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

    if (!line) { items.push(sp(40)); continue; }

    if (line.match(/^[━═─\-]{3,}$/) && !line.match(/[a-zA-Z]/)) {
      items.push(hrPara()); continue;
    }

    if (line.startsWith('▸') || line.match(/^#{1,3}\s/)) {
      const text = line.startsWith('▸') ? line.slice(1).trimStart() : line.replace(/^#{1,3}\s*/, '').trim();
      items.push(sectionHeader(text));
      items.push(sp(20));
      continue;
    }

    const sevKey = line.includes('[CRITICAL]') || /^CRITICAL[:\s]/i.test(line) ? 'CRITICAL'
      : line.includes('[MAJOR]')    || /^MAJOR[:\s]/i.test(line)    ? 'MAJOR'
      : line.includes('[MODERATE]') || /^MODERATE[:\s]/i.test(line) ? 'MODERATE'
      : line.includes('[UNCERTAINTY]') || /^UNCERTAINTY[:\s]/i.test(line) ? 'UNCERTAINTY'
      : null;

    if (sevKey) {
      let body = line
        .replace(/\[(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)\]/gi, '')
        .replace(/^(CRITICAL|MAJOR|MODERATE|UNCERTAINTY)[:\s]*/i, '')
        .trim();
      // absorb continuation
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() || '';
      if (next && !isSevMarker(next) && !next.startsWith('▸') && !next.match(/^#{1,3}\s/)) {
        body += ' ' + next; i = j;
      }
      items.push(severityRow(sevKey, body.replace(/\*\*(.*?)\*\*/g, '$1')));
      items.push(sp(20));
      continue;
    }

    if (line.match(/^[-•]\s+/)) {
      items.push(bulletPara(line.replace(/^[-•]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1')));
      continue;
    }

    const remaining = lines.slice(i + 1).filter(l => l.trim());
    if (remaining.length === 0 && line.endsWith('.') && !line.startsWith('-')) {
      items.push(summaryPara(line)); continue;
    }

    items.push(bodyPara(line.replace(/\*\*(.*?)\*\*/g, '$1')));
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
              columnWidths: [5000, 4638],
              rows: [new TableRow({ children: [
                new TableCell({ borders: noBorder, children: [new Paragraph({ children: [run('CLASR  ·  Academic Signal Report', { bold: true, color: C.navy, size: 18 })] })] }),
                new TableCell({ borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(`Report ${reportIndex}  ·  ${today}`, { color: C.mid, size: 16 })] })] }),
              ]})]
            }),
            new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.navy, space: 1 } }, spacing: { before: 40, after: 0 }, children: [] }),
          ]
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.border, space: 4 } }, spacing: { before: 40, after: 0 }, children: [] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [run('This report is an academic reading signal. Decisions and publication responsibility rest with the user.', { color: C.mid, size: 15 })] }),
          ]
        }),
      },
      children: [
        sp(40),
        ...parseContent(content),
        sp(80),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
