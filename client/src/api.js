// Cliente HTTP de la API. Lanza errores con el mensaje del servidor y los datos extra (campos, avisos...).
export class ApiError extends Error {
  constructor(status, body) { super(body?.error || `Error ${status}`); this.status = status; Object.assign(this, body); }
}

export async function api(method, url, body) {
  const r = await fetch(`/api${url}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const datos = (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
  if (!r.ok) {
    if (r.status === 401 && !url.startsWith('/auth/') && !location.pathname.startsWith('/admin/login')) {
      location.href = `/admin/login?volver=${encodeURIComponent(location.pathname)}`;
    }
    throw new ApiError(r.status, datos);
  }
  return datos;
}

export const get = (u) => api('GET', u);
export const post = (u, b) => api('POST', u, b || {});
export const put = (u, b) => api('PUT', u, b);
export const del = (u) => api('DELETE', u);

/** Descarga un archivo de la API. */
export function descargar(url) {
  const a = document.createElement('a');
  a.href = `/api${url}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Lee un archivo como data URL. */
export const leerArchivo = (file) => new Promise((ok, err) => {
  const fr = new FileReader();
  fr.onload = () => ok(fr.result);
  fr.onerror = err;
  fr.readAsDataURL(file);
});

/** Reduce una foto a máximo 1600 px y la convierte a JPEG para que pese poco. */
export async function comprimirFoto(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => err(new Error('No se pudo leer la imagen')); i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const fecha = (v) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
export const fechaCorta = (v) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '');
