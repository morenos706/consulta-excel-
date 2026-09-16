'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, ApiError, CreateEmployeeInput, Employee, EmploymentType, Site } from '@/lib/api';
import { AppShell } from '@/components/AppShell';

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  DIRECT: 'Directo',
  TEMPORARY: 'Temporal',
  APPRENTICE: 'Aprendiz',
  OUTSOURCED: 'Tercerizado',
};

const emptyForm: CreateEmployeeInput = {
  siteId: '',
  areaId: undefined,
  documentNumber: '',
  fullName: '',
  position: '',
  employmentType: 'DIRECT',
  hireDate: '',
  phone: '',
};

export default function TrabajadoresPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateEmployeeInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    Promise.all([api.employees.list(), api.sites()])
      .then(([e, s]) => {
        setEmployees(e);
        setSites(s);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'No se pudo conectar con la API'));
  }

  useEffect(load, []);

  const siteName = useMemo(() => {
    const map = new Map(sites.map((s) => [s.id, s.name]));
    return (siteId: string) => map.get(siteId) ?? siteId;
  }, [sites]);

  const areasForSelectedSite = sites.find((s) => s.id === form.siteId)?.areas ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await api.employees.create({ ...form, areaId: form.areaId || undefined, phone: form.phone || undefined });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo guardar el trabajador');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Trabajadores"
      actions={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
        >
          {showForm ? 'Cancelar' : '+ Nuevo trabajador'}
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
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nombre completo">
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Documento de identidad">
            <input
              required
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Cargo">
            <input
              required
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Tipo de vinculación">
            <select
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}
              className="input"
            >
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de ingreso">
            <input
              required
              type="date"
              value={form.hireDate}
              onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Sede">
            <select
              required
              value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value, areaId: undefined })}
              className="input"
            >
              <option value="">Seleccionar…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Área (opcional)">
            <select
              value={form.areaId ?? ''}
              onChange={(e) => setForm({ ...form, areaId: e.target.value || undefined })}
              className="input"
              disabled={!form.siteId}
            >
              <option value="">Seleccionar…</option>
              {areasForSelectedSite.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Teléfono (opcional)">
            <input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          </Field>

          <div className="sm:col-span-2 lg:col-span-3">
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
              {saving ? 'Guardando…' : 'Guardar trabajador'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-raised text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Sede</th>
              <th className="px-4 py-3 font-medium">Vinculación</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text-primary">{emp.fullName}</td>
                <td className="px-4 py-3 text-text-secondary">{emp.documentNumber}</td>
                <td className="px-4 py-3 text-text-secondary">{emp.position}</td>
                <td className="px-4 py-3 text-text-secondary">{siteName(emp.siteId)}</td>
                <td className="px-4 py-3 text-text-secondary">{EMPLOYMENT_TYPE_LABELS[emp.employmentType]}</td>
                <td className="px-4 py-3 text-text-secondary">{emp.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && !loadError && (
          <p className="px-4 py-6 text-center text-sm text-text-secondary">Sin trabajadores registrados todavía.</p>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
