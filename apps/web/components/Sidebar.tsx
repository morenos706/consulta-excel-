'use client';

const MENU = [
  { icon: '🏠', label: 'Dashboard', href: '/dashboard', enabled: true },
  { icon: '👥', label: 'Trabajadores', enabled: false },
  { icon: '👨‍🚒', label: 'Brigada', enabled: false },
  { icon: '🎓', label: 'Capacitación', enabled: false },
  { icon: '🔍', label: 'Inspecciones', enabled: false },
  { icon: '⚠️', label: 'Riesgos', enabled: false },
  { icon: '🩹', label: 'Accidentes', enabled: false },
  { icon: '🦺', label: 'EPP', enabled: false },
  { icon: '🧯', label: 'Equipos', enabled: false },
  { icon: '🚨', label: 'Emergencias', enabled: false },
  { icon: '🏃', label: 'Simulacros', enabled: false },
  { icon: '👷', label: 'Contratistas', enabled: false },
  { icon: '📂', label: 'Documentos', enabled: false },
  { icon: '📊', label: 'Indicadores', href: '/dashboard', enabled: true },
  { icon: '🚨', label: 'Centro de Comando', enabled: false },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface px-3 py-6 md:block">
      <div className="mb-6 flex items-center gap-2 px-3">
        <span className="text-2xl">🛡️</span>
        <span className="text-sm font-semibold leading-tight text-text-primary">
          Seguridad 360
          <br />
          Colombia
        </span>
      </div>
      <nav className="space-y-1">
        {MENU.map((item) => (
          <a
            key={item.label}
            href={item.enabled ? item.href : undefined}
            aria-disabled={!item.enabled}
            title={item.enabled ? undefined : 'Próximamente'}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
              item.enabled
                ? 'text-text-primary hover:bg-surface-raised'
                : 'cursor-not-allowed text-text-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </span>
            {!item.enabled && <span className="text-[10px] uppercase text-text-muted">pronto</span>}
          </a>
        ))}
      </nav>
    </aside>
  );
}
