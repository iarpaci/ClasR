'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('clasr_cookie_consent')) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem('clasr_cookie_consent', 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('clasr_cookie_consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-700 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl">
        <p className="text-gray-400 text-sm flex-1 leading-relaxed">
          We use essential cookies to keep you signed in.{' '}
          <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={decline}
            className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2 rounded-lg transition-colors">
            Decline
          </button>
          <button onClick={accept}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
