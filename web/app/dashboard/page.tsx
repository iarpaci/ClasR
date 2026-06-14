'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isLoggedIn() ? '/analyze' : '/login');
  }, [router]);
  return null;
}
