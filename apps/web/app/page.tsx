'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { session } from '@/lib/session';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(session.token() ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
