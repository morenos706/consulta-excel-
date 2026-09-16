'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, DashboardSummary } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { StatTile } from '@/components/StatTile';
import { RiskLevelChart } from '@/components/RiskLevelChart';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo conectar con la API'));
  }, []);

  return (
    <AppShell title="Dashboard">
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
    </AppShell>
  );
}
