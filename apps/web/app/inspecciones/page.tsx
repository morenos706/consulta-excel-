'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, Inspection, InspectionTemplate, Site } from '@/lib/api';
import { AppShell } from '@/components/AppShell';

export default function InspeccionesPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [performedAt, setPerformedAt] = useState('');
  const [cumple, setCumple] = useState(true);
  const [observations, setObservations] = useState('');

  function load() {
    Promise.all([api.inspections.list(), api.inspections.templates(), api.sites()])
      .then(([i, t, s]) => {
        setInspections(i);
        setTemplates(t);
        setSites(s);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'No se pudo conectar con la API'));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await api.inspections.create({
        templateId,
        siteId,
        performedAt: new Date(performedAt).toISOString(),
        observations: observations || undefined,
        answers: { cumple },
      });
      setTemplateId('');
      setSiteId('');
      setPerformedAt('');
      setObservations('');
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo crear la inspección');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Inspecciones"
      actions={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
        >
          {showForm ? 'Cancelar' : '+ Nueva inspección'}
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
            <span className="mb-1 block text-sm font-medium text-text-secondary">Tipo de inspección</span>
            <select required value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input">
              <option value="">Seleccionar…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-secondary">Sede</span>
            <select required value={siteId} onChange={(e) => setSiteId(e.target.value)} className="input">
              <option value="">Seleccionar…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-secondary">Fecha y hora</span>
            <input
              required
              type="datetime-local"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="input"
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" checked={cumple} onChange={(e) => setCumple(e.target.checked)} />
            <span className="text-sm text-text-secondary">¿Cumple la condición general evaluada?</span>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-text-secondary">Observaciones</span>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="input" rows={2} />
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
              {saving ? 'Guardando…' : 'Crear inspección'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-raised text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Sede</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Hallazgos</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {inspections.map((i) => (
              <tr key={i.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text-primary">{i.template?.name}</td>
                <td className="px-4 py-3 text-text-secondary">{i.site?.name}</td>
                <td className="px-4 py-3 text-text-secondary">{new Date(i.performedAt).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3 text-text-secondary">{i.findings?.length ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/inspecciones/${i.id}`} className="text-sm font-medium" style={{ color: 'var(--brand)' }}>
                    Ver detalle →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inspections.length === 0 && !loadError && (
          <p className="px-4 py-6 text-center text-sm text-text-secondary">Sin inspecciones registradas todavía.</p>
        )}
      </div>
    </AppShell>
  );
}
