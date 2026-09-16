'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, DashboardSummary } from '@/lib/api';
import { session } from '@/lib/session';
import { Sidebar } from '@/components/Sidebar';
import { StatTile } from '@/components/StatTile';
import { RiskLevelChart } from '@/components/RiskLevelChart';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!session.token()) {
      router.replace('/login');
      return;
    }
    setEmail(session.email());

    api
      .dashboard()
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          session.clear();
          router.replace('/login');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con la API');
      });
  }, [router]);

  function logout() {
    session.clear();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h1 className="text-base font-semibold text-text-primary">Dashboard</h1>
            <p className="text-sm text-text-secondary">Empresa Demo Colombia</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">{email}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-raised"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="p-6">
          {error && (
            <div
              className="mb-6 rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: 'var(--status-critical-soft)', color: 'var(--status-critical)' }}
            >
              {error}
            </div>
          )}

          {!data && !error && <p className="text-sm text-text-secondary">Cargando indicadores…</p>}

          {data && (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <StatTile icon="👥" label="Trabajadores" value={data.employees} />
                <StatTile icon="👨‍🚒" label="Brigadistas activos" value={data.brigadists} />
                <StatTile icon="👷" label="Contratistas" value={data.contractors} />
                <StatTile icon="🔍" label="Inspecciones" value={data.inspections} />
                <StatTile icon="⚠️" label="Hallazgos abiertos" value={data.findingsOpen} />
                <StatTile icon="⏰" label="Acciones vencidas" value={data.actionsOverdue} />
                <StatTile icon="🎓" label="Capacitaciones" value={data.trainingRecords} />
                <StatTile icon="🩹" label="Accidentes" value={data.accidents} />
                <StatTile icon="🏃" label="Simulacros" value={data.drills} />
              </div>

              <RiskLevelChart data={data.findingsByRiskLevel} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
