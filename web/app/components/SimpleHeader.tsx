import Link from 'next/link';
import ClasrLogo from './ClasrLogo';

interface Props { backHref?: string; backLabel?: string }

export default function SimpleHeader({ backHref = '/analyze', backLabel = 'Back' }: Props) {
  return (
    <header className="border-b border-cream-border px-6 py-4 flex items-center gap-4 bg-cream">
      <Link href={backHref} className="text-muted hover:text-teal text-sm transition-colors">
        ← {backLabel}
      </Link>
      <Link href="/"><ClasrLogo scale={0.42} /></Link>
    </header>
  );
}
