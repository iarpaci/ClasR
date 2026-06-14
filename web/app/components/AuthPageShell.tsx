import Link from 'next/link';
import ClasrLogo from './ClasrLogo';

interface Props {
  subtitle?: string;
  children: React.ReactNode;
}

export default function AuthPageShell({ subtitle, children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-sage">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/"><ClasrLogo scale={0.55} /></Link>
          {subtitle && <p className="text-muted text-sm mt-2">{subtitle}</p>}
        </div>
        <div className="bg-cream rounded-sm p-8 border border-cream-border space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
