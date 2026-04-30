import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-blue-500 font-black tracking-widest text-sm mb-4">CLASR</p>
        <h1 className="text-6xl font-black text-white mb-3">404</h1>
        <p className="text-gray-400 mb-8">This page doesn't exist.</p>
        <Link href="/"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
          Back to home
        </Link>
      </div>
    </div>
  );
}
