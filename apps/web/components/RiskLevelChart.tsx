import type { DashboardSummary } from '@/lib/api';

/**
 * Desglose de hallazgos por nivel de riesgo — paleta de estado (fija, no
 * temática) de la skill dataviz: good/warning/serious/critical, siempre
 * con ícono + etiqueta, nunca solo color (references/palette.md,
 * references/marks-and-anatomy.md).
 */
const LEVELS: { key: keyof DashboardSummary['findingsByRiskLevel']; label: string; icon: string; varName: string }[] = [
  { key: 'CRITICAL', label: 'Crítico', icon: '🔴', varName: '--status-critical' },
  { key: 'HIGH', label: 'Alto', icon: '🟠', varName: '--status-serious' },
  { key: 'MEDIUM', label: 'Medio', icon: '🟡', varName: '--status-warning' },
  { key: 'LOW', label: 'Bajo', icon: '🟢', varName: '--status-good' },
];

export function RiskLevelChart({ data }: { data: DashboardSummary['findingsByRiskLevel'] }) {
  const values = LEVELS.map((l) => data[l.key] ?? 0);
  const max = Math.max(1, ...values);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-text-primary">Hallazgos por nivel de riesgo</h2>
      <div className="space-y-3">
        {LEVELS.map((level) => {
          const count = data[level.key] ?? 0;
          const widthPercent = Math.max((count / max) * 100, count > 0 ? 4 : 0);
          return (
            <div key={level.key} className="flex items-center gap-3">
              <div className="flex w-20 shrink-0 items-center gap-1.5 text-sm text-text-secondary">
                <span aria-hidden>{level.icon}</span>
                <span>{level.label}</span>
              </div>
              {/* Baseline única a la izquierda; extremo de dato redondeado, base cuadrada. */}
              <div className="h-4 flex-1 rounded-r-full bg-surface-raised">
                <div
                  className="h-4 rounded-r-full transition-all"
                  style={{ width: `${widthPercent}%`, backgroundColor: `var(${level.varName})` }}
                />
              </div>
              <div className="w-8 shrink-0 text-right text-sm font-medium text-text-primary">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
