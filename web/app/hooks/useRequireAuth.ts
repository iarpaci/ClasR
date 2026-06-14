'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';

/** Redirects to /login if not authenticated. Use on protected pages. */
export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    if (!isLoggedIn()) router.replace('/login');
  }, []);
}

/** Redirects to /analyze if already authenticated. Use on auth pages (login/register). */
export function useRedirectIfLoggedIn() {
  const router = useRouter();
  useEffect(() => {
    if (isLoggedIn()) router.replace('/analyze');
  }, []);
}
