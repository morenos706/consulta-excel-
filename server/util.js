// Utilidades compartidas: errores HTTP, validación, límites de frecuencia y auditoría.
import { query } from './db.js';

export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}
export const fallo = (status, message, extra) => { throw new HttpError(status, message, extra); };

/** Envuelve un manejador async para que los errores lleguen al middleware de errores. */
export const ruta = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const texto = (v, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
export const mayus = (v, max) => texto(v, max).toLocaleUpperCase('es-CO');
export const opcional = (v, max) => texto(v, max) || null;
export const bool = (v) => v === true || v === 'true' || v === 'SI' || v === 1 || v === '1' || v === 'on';
export const entero = (v) => (v === '' || v === null || v === undefined ? null : Number.parseInt(v, 10));
export const identificacion = (v) => texto(v, 30).replace(/[\s.]/g, '').toUpperCase();

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function fechaValida(v) {
  if (!FECHA_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Fecha de hoy en Colombia (AAAA-MM-DD). */
export function hoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

/** Límite de frecuencia en memoria por IP. */
export function limite({ ventanaMs, max, mensaje }) {
  const hits = new Map();
  return (req, _res, next) => {
    const ahora = Date.now();
    const clave = req.ip;
    const lista = (hits.get(clave) || []).filter((t) => ahora - t < ventanaMs);
    if (lista.length >= max) return next(new HttpError(429, mensaje || 'Demasiadas solicitudes. Intente de nuevo en unos minutos.'));
    lista.push(ahora);
    hits.set(clave, lista);
    if (hits.size > 5000) hits.clear();
    next();
  };
}

export async function auditar(req, accion, detalle) {
  try {
    await query('insert into auditoria (usuario_id, accion, detalle) values ($1, $2, $3)', [req.usuario?.id ?? null, accion, detalle ?? null]);
  } catch { /* la auditoría nunca debe romper la operación */ }
}

/** Decodifica una imagen en data URL y valida tipo y tamaño. */
export function imagen(dataUrl, etiqueta) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) fallo(400, `${etiqueta}: la imagen no es válida (use JPG, PNG o WEBP)`);
  const datos = Buffer.from(m[2], 'base64');
  if (datos.length > 4 * 1024 * 1024) fallo(400, `${etiqueta}: la imagen supera 4 MB`);
  if (datos.length < 1000) fallo(400, `${etiqueta}: la imagen está vacía o es demasiado pequeña`);
  return { mime: m[1], datos };
}

/** Muestra el nombre de forma parcial para no exponer datos personales a terceros. */
export function nombreParcial(nombre, apellido) {
  const n = String(nombre || '').split(/\s+/)[0] || '';
  const a = String(apellido || '').trim();
  return `${n} ${a ? `${a[0]}.` : ''}`.trim();
}
