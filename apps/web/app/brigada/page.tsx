'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, Brigadist, CompetencyLevel, CompetencyStatus, Employee } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/Badge';

const LEVEL_VARIANT: Record<CompetencyLevel, 'good' | 'warning' | 'critical'> = {
  COMPLIES: 'good',
  NEEDS_UPDATE: 'warning',
  NON_COMPLIANT: 'critical',
};

const LEVEL_LABEL: Record<CompetencyLevel, string> = {
  COMPLIES: 'Cumple',
  NEEDS_UPDATE: 'Requiere actualización',
  NON_COMPLIANT: 'No cumple',
};

export default function BrigadaPage() {
  const [brigadists, setBrigadists] = useState<Brigadist[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [group, setGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [competency, setCompetency] = useState<CompetencyStatus | null>(null);

  function load() {
    Promise.all([api.brigade.list(), api.employees.list()])
      .then(([b, e]) => {
        setBrigadists(b);
        setEmployees(e);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'No se pudo conectar con la API'));
  }

  useEffect(load, []);

  const eligibleEmployees = employees.filter((e) => !brigadists.some((b) => b.employeeId === e.id));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await api.brigade.create({ employeeId, group: group || undefined });
      setEmployeeId('');
      setGroup('');
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo registrar el brigadista');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompetency(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setCompetency(null);
      return;
    }
    setExpandedId(id);
    setCompetency(null);
    const status = await api.brigade.competencyStatus(id).catch(() => null);
    setCompetency(status);
  }

  return (
    <AppShell
      title="Brigada"
      actions={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
        >
          {showForm ? 'Cancelar' : '+ Nuevo brigadista'}
        </button>
      }
    >
      {loadError && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--status-critical-soft)', color: 'var(--status-critical)' }}
        >
          {loadError}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-secondary">Trabajador</span>
            <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input">
              <option value="">Seleccionar…</option>
              {eligibleEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} — {e.position}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-secondary">Grupo (opcional)</span>
            <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Grupo A" className="input" />
          </label>

          <div className="sm:col-span-2">
            {formError && (
              <p className="mb-3 text-sm" style={{ color: 'var(--status-critical)' }}>
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Registrar brigadista'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {brigadists.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">{b.employee.fullName}</p>
                <p className="text-sm text-text-secondary">
                  {b.employee.position} {b.group ? `· ${b.group}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={LEVEL_VARIANT[b.competencyLevel]}>{LEVEL_LABEL[b.competencyLevel]}</Badge>
                <button
                  onClick={() => toggleCompetency(b.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-raised"
                >
                  {expandedId === b.id ? 'Ocultar' : 'Ver competencias'}
                </button>
              </div>
            </div>

            {expandedId === b.id && (
              <div className="mt-4 border-t border-border pt-4">
                {!competency && <p className="text-sm text-text-secondary">Cargando…</p>}
                {competency && (
                  <>
                    <p className="mb-3 text-sm text-text-secondary">
                      Formación completada: <span className="font-medium text-text-primary">{competency.trainingCompletionPercent}%</span>
                      {competency.expiredCertificates > 0 && (
                        <> · {competency.expiredCertificates} certificado(s) vencido(s)</>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {competency.competencies.map((c) => (
                        <Badge key={c.name} variant={LEVEL_VARIANT[c.level]}>
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {brigadists.length === 0 && !loadError && (
          <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-secondary">
            Sin brigadistas registrados todavía.
          </p>
        )}
      </div>
    </AppShell>
  );
}
