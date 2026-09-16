'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { session } from '@/lib/session';
import { Sidebar } from './Sidebar';

/**
 * Layout compartido por toda pantalla autenticada: sidebar + topbar con
 * el usuario actual y "Salir". Redirige a /login si no hay sesión, igual
 * que hacía el dashboard antes de extraerse este componente.
 */
export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session.token()) {
      router.replace('/login');
      return;
    }
    setEmail(session.email());
    setReady(true);
  }, [router]);

  function logout() {
    session.clear();
    router.replace('/login');
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h1 className="text-base font-semibold text-text-primary">{title}</h1>
            <p className="text-sm text-text-secondary">{subtitle ?? 'Empresa Demo Colombia'}</p>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <span className="text-sm text-text-secondary">{email}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-raised"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
