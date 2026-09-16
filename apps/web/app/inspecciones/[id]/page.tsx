'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError, ActionPriority, Employee, Finding, FindingStatus, Inspection, RiskLevel } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/Badge';

const RISK_VARIANT: Record<RiskLevel, 'good' | 'warning' | 'serious' | 'critical'> = {
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'serious',
  CRITICAL: 'critical',
};

const RISK_LABEL: Record<RiskLevel, string> = { LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto', CRITICAL: 'Crítico' };

const STATUS_LABEL: Record<FindingStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En proceso',
  OVERDUE: 'Vencido',
  PENDING_VERIFICATION: 'Pendiente de verificación',
  CLOSED: 'Cerrado',
};

const emptyFindingForm = {
  description: '',
  category: '',
  riskLevel: 'MEDIUM' as RiskLevel,
  actionDescription: '',
  priority: 'MEDIUM' as ActionPriority,
  responsibleEmployeeId: '',
  dueDate: '',
};

export default function InspeccionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyFindingForm);
  const [saving, setSaving] = useState(false);
  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, string>>({});

  function load() {
    Promise.all([api.inspections.get(id), api.employees.list()])
      .then(([insp, emp]) => {
        setInspection(insp);
        setEmployees(emp);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo conectar con la API'));
  }

  useEffect(load, [id]);

  async function handleAddFinding(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.inspections.addFinding(id, {
        description: form.description,
        category: form.category,
        riskLevel: form.riskLevel,
        correctiveAction: {
          description: form.actionDescription,
          priority: form.priority,
          responsibleEmployeeId: form.responsibleEmployeeId || undefined,
          dueDate: new Date(form.dueDate).toISOString(),
        },
      });
      setForm(emptyFindingForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el hallazgo');
    } finally {
      setSaving(false);
    }
  }

  async function submitEvidence(findingId: string) {
    const evidenceS3Key = evidenceDraft[findingId]?.trim();
    if (!evidenceS3Key) return;
    try {
      await api.findings.submitClosureEvidence(findingId, evidenceS3Key);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo subir la evidencia');
    }
  }

  async function verifyFinding(findingId: string) {
    try {
      await api.findings.verifyAndClose(findingId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo verificar el hallazgo');
    }
  }

  if (!inspection && !error) {
    return (
      <AppShell title="Inspección">
        <p className="text-sm text-text-secondary">Cargando…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={inspection?.template?.name ?? 'Inspección'}
      subtitle={inspection ? `${inspection.site?.name} · ${new Date(inspection.performedAt).toLocaleString('es-CO')}` : undefined}
      actions={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
        >
          {showForm ? 'Cancelar' : '+ Registrar hallazgo'}
        </button>
      }
    >
      {error && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--status-critical-soft)', color: 'var(--status-critical)' }}
        >
          {error}
        </div>
      )}

      {inspection?.observations && (
        <p className="mb-6 text-sm text-text-secondary">Observaciones generales: {inspection.observations}</p>
      )}

      {showForm && (
        <form onSubmit={handleAddFinding} className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-text-secondary">Descripción del hallazgo</span>
            <input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-secondary">Categoría</span>
            <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-secondary">Nivel de riesgo</span>
            <select
              value={form.riskLevel}
              onChange={(e) => setForm({ ...form, riskLevel: e.target.value as RiskLevel })}
              className="input"
            >
              {(Object.keys(RISK_LABEL) as RiskLevel[]).map((r) => (
                <option key={r} value={r}>
                  {RISK_LABEL[r]}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg bg-surface-raised p-4 sm:col-span-2">
            <p className="mb-3 text-sm font-semibold text-text-primary">Acción correctiva</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-text-secondary">Descripción de la acción</span>
                <input
                  required
                  value={form.actionDescription}
                  onChange={(e) => setForm({ ...form, actionDescription: e.target.value })}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">Prioridad</span>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as ActionPriority })}
                  className="input"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">Fecha límite</span>
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="input"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-text-secondary">Responsable (opcional)</span>
                <select
                  value={form.responsibleEmployeeId}
                  onChange={(e) => setForm({ ...form, responsibleEmployeeId: e.target.value })}
                  className="input"
                >
                  <option value="">Sin asignar</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Registrar hallazgo y acción correctiva'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {inspection?.findings?.map((finding: Finding) => (
          <div key={finding.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-text-primary">{finding.description}</p>
                <p className="text-sm text-text-secondary">{finding.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={RISK_VARIANT[finding.riskLevel]}>{RISK_LABEL[finding.riskLevel]}</Badge>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary">
                  {STATUS_LABEL[finding.status]}
                </span>
              </div>
            </div>

            {finding.correctiveActions.map((action) => (
              <p key={action.id} className="mt-2 text-sm text-text-secondary">
                Acción: {action.description} — vence {new Date(action.dueDate).toLocaleDateString('es-CO')}
              </p>
            ))}

            {finding.status !== 'CLOSED' && finding.status !== 'PENDING_VERIFICATION' && (
              <div className="mt-3 flex gap-2">
                <input
                  placeholder="Referencia de evidencia (ej. foto-cierre.jpg)"
                  value={evidenceDraft[finding.id] ?? ''}
                  onChange={(e) => setEvidenceDraft({ ...evidenceDraft, [finding.id]: e.target.value })}
                  className="input"
                />
                <button
                  onClick={() => submitEvidence(finding.id)}
                  className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface-raised"
                >
                  Subir evidencia de cierre
                </button>
              </div>
            )}

            {finding.status === 'PENDING_VERIFICATION' && (
              <button
                onClick={() => verifyFinding(finding.id)}
                className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--status-good)' }}
              >
                Verificar y cerrar
              </button>
            )}
          </div>
        ))}

        {inspection?.findings?.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-secondary">
            Sin hallazgos registrados en esta inspección.
          </p>
        )}
      </div>
    </AppShell>
  );
}
