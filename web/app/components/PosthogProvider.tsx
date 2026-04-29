'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PosthogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === 'undefined') return;

    import('posthog-js').then(({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
          capture_pageview: false,
          persistence: 'localStorage',
        });
      }
      posthog.capture('$pageview', { path: pathname });
    });
  }, [pathname]);

  return <>{children}</>;
}
