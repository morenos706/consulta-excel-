'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { session } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sst@empresademo.co');
  const [devSecret, setDevSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await api.devLogin(email, devSecret);
      session.save(accessToken, email);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con la API');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-3xl">🛡️</div>
          <h1 className="text-lg font-semibold text-text-primary">Seguridad 360 Colombia</h1>
          <p className="mt-1 text-sm text-text-secondary">Empresa Demo Colombia</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-secondary">
              Correo
            </label>
            <select
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              <option value="sst@empresademo.co">sst@empresademo.co (SST Responsible)</option>
              <option value="admin@empresademo.co">admin@empresademo.co (Company Admin)</option>
              <option value="supervisor@empresademo.co">supervisor@empresademo.co (Supervisor)</option>
              <option value="inspector@empresademo.co">inspector@empresademo.co (Inspector)</option>
            </select>
          </div>

          <div>
            <label htmlFor="devSecret" className="mb-1 block text-sm font-medium text-text-secondary">
              Clave de desarrollo
            </label>
            <input
              id="devSecret"
              type="password"
              value={devSecret}
              onChange={(e) => setDevSecret(e.target.value)}
              placeholder="demo123"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
            <p className="mt-1 text-xs text-text-muted">
              Solo para desarrollo (AUTH_MODE=dev). En producción se autentica con Amazon Cognito.
            </p>
          </div>

          {error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--status-critical-soft)', color: 'var(--status-critical)' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
