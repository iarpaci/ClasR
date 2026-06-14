'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import ClasrLogo from './components/ClasrLogo';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center">
        <Link href="/" className="inline-block mb-6"><ClasrLogo scale={0.48} /></Link>
        <p className="font-serif text-2xl font-bold text-teal mb-3">Something went wrong</p>
        <p className="text-muted mb-8 text-sm">An unexpected error occurred. Please try again.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset}
            className="bg-teal hover:bg-teal-dark text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
            Try again
          </button>
          <Link href="/"
            className="bg-parchment hover:bg-cream-dark border border-cream-border text-muted font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
