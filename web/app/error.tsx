'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-blue-500 font-black tracking-widest text-sm mb-4">CLASR</p>
        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-gray-400 mb-8 text-sm">An unexpected error occurred. Please try again.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
            Try again
          </button>
          <Link href="/"
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
