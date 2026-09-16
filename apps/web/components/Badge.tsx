/**
 * Insignia de estado. Usa la paleta de estado fija de la skill dataviz
 * (good/warning/serious/critical) — siempre con ícono + etiqueta, nunca
 * solo color, porque esos tonos no garantizan contraste suficiente por
 * sí solos (ver references/palette.md de la skill).
 */
const VARIANTS = {
  good: { icon: '🟢', varName: '--status-good' },
  warning: { icon: '🟡', varName: '--status-warning' },
  serious: { icon: '🟠', varName: '--status-serious' },
  critical: { icon: '🔴', varName: '--status-critical' },
  neutral: { icon: '⚪', varName: '--text-muted' },
} as const;

export function Badge({ variant, children }: { variant: keyof typeof VARIANTS; children: React.ReactNode }) {
  const { icon, varName } = VARIANTS[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: `var(${varName})`, color: `var(${varName})` }}
    >
      <span aria-hidden>{icon}</span>
      {children}
    </span>
  );
}
