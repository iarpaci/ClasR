export const SEVERITY_KEYS = ['CRITICAL', 'MAJOR', 'MODERATE', 'UNCERTAINTY'] as const;
export type SeverityKey = typeof SEVERITY_KEYS[number];

const SEV_RE = new RegExp(
  `\\[(${SEVERITY_KEYS.join('|')})\\]|^(${SEVERITY_KEYS.join('|')})[:\\s]`,
  'i',
);

export function parseSeverityKey(line: string): SeverityKey | null {
  for (const k of SEVERITY_KEYS) {
    if (line.includes(`[${k}]`) || new RegExp(`^${k}[:\\s]`, 'i').test(line)) return k;
  }
  return null;
}

export function isSeverityMarker(line: string): boolean {
  return !line || line.startsWith('▸') || /^#{1,3}\s/.test(line) ||
    /^[-•]\s+/.test(line) || SEV_RE.test(line);
}

export function countSeverityMatches(text: string): number {
  return (text.match(new RegExp(SEV_RE.source, 'gim')) ?? []).length;
}
