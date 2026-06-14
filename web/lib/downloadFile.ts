export function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadDocx(
  generateFn: (content: string, index: number) => Promise<Blob>,
  content: string,
  index: number,
  filename: string,
) {
  const blob = await generateFn(content, index);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
