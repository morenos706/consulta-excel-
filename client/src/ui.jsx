// Componentes de interfaz reutilizables.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export function Logo({ tam = 26 }) {
  return (
    <span className="logo" aria-hidden="true">
      <svg width={tam} height={tam} viewBox="0 0 32 32">
        <path d="M16 3v26M8 10h16" stroke="#c8a15a" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M6 29c2.5-5 6-7.5 10-7.5S23.5 24 26 29" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const mostrar = useCallback((mensaje, tipo = 'ok') => setT({ mensaje, tipo, k: Date.now() }), []);
  useEffect(() => {
    if (!t) return undefined;
    const id = setTimeout(() => setT(null), t.tipo === 'error' ? 6000 : 3000);
    return () => clearTimeout(id);
  }, [t]);
  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      {t && <div key={t.k} className={`toast ${t.tipo}`} role="status" onClick={() => setT(null)}>{t.mensaje}</div>}
    </ToastCtx.Provider>
  );
}

export function Modal({ titulo, onCerrar, children, pie, ancho }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCerrar]);
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={`modal ${ancho ? 'ancho' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cab">
          <h2>{titulo}</h2>
          <button type="button" className="btn btn-icono" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>
  );
}

/** Campo de formulario con etiqueta, ayuda y error. */
export function Campo({ etiqueta, requerido, error, ayuda, children, className = '' }) {
  return (
    <div className={`campo ${error ? 'con-error' : ''} ${className}`}>
      {etiqueta && <label className={requerido ? 'req' : ''}>{etiqueta}</label>}
      {children}
      {error ? <span className="error-campo">{error}</span> : ayuda && <span className="ayuda">{ayuda}</span>}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return <p className="suave centro" style={{ padding: '2rem' }}>{texto}</p>;
}

export const ESTADOS = {
  INSCRITO: { t: 'Inscrito', c: 'azul' },
  CONFIRMADO: { t: 'Confirmado', c: 'ok' },
  LLEGO: { t: 'Llegó', c: 'oro' },
  CANCELADO: { t: 'Cancelado', c: 'error' },
};
export const TIPO_PERSONA = {
  'HOMBRE SOLO': 'Hombre solo', 'MUJER SOLA': 'Mujer sola', MATRIMONIO: 'Matrimonio', PRESBITERO: 'Presbítero', SEMINARISTA: 'Seminarista',
};
export const TIPO_HAB = {
  MATRIMONIAL: 'Matrimonial', HOMBRES: 'Hombres', MUJERES: 'Mujeres', FAMILIAR: 'Familiar', PRESBITEROS: 'Presbíteros', MIXTA: 'Mixta',
};
export const TIPO_DOC = { CC: 'Cédula de ciudadanía', CE: 'Cédula de extranjería', PA: 'Pasaporte', TI: 'Tarjeta de identidad', RC: 'Registro civil' };

const fmt = (v, o) => new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', o);
/** "20 – 22 de noviembre de 2026" */
export function fechaRango(a, b) {
  if (!a) return '';
  if (!b || a === b) return fmt(a, { day: 'numeric', month: 'long', year: 'numeric' });
  if (a.slice(0, 7) === b.slice(0, 7)) return `${fmt(a, { day: 'numeric' })} – ${fmt(b, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  return `${fmt(a, { day: 'numeric', month: 'short' })} – ${fmt(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
