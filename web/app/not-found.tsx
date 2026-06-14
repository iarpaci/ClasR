import Link from 'next/link';
import ClasrLogo from './components/ClasrLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center">
        <Link href="/" className="inline-block mb-6"><ClasrLogo scale={0.48} /></Link>
        <p className="font-serif text-7xl font-bold text-teal mb-3">404</p>
        <p className="text-muted mb-8">This page doesn&rsquo;t exist.</p>
        <Link href="/"
          className="bg-teal hover:bg-teal-dark text-cream font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
          Back to home
        </Link>
      </div>
    </div>
  );
}
