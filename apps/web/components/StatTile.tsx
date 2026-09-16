/**
 * Stat tile per la skill dataviz (references/marks-and-anatomy.md):
 * label en sentence case sin dos puntos, valor en cifras proporcionales
 * (no tabular-nums, este no es una columna de tabla).
 */
export function StatTile({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-2 text-xl">{icon}</div>
      <div className="text-3xl font-semibold text-text-primary">{value.toLocaleString('es-CO')}</div>
      <div className="mt-1 text-sm text-text-secondary">{label}</div>
    </div>
  );
}
