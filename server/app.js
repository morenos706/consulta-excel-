// Aplicación Express: API + archivos estáticos del cliente.
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { iniciar, ROOT } from './db.js';
import { sembrarAdmin, rutasAuth, rutasUsuarios } from './auth.js';
import { rutasPublicas } from './publico.js';
import { rutasAdmin } from './admin.js';

let preparado = null;
export const preparar = () => (preparado ||= (async () => { await iniciar(); await sembrarAdmin(); })());

export function crearApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    });
    next();
  });
  app.use(express.json({ limit: '25mb' }));
  app.use(cookieParser());
  app.use('/api', async (_req, _res, next) => { try { await preparar(); next(); } catch (e) { next(e); } });

  app.get('/api/salud', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', rutasAuth);
  app.use('/api/usuarios', rutasUsuarios);
  app.use('/api/publico', rutasPublicas);
  app.use('/api', rutasAdmin);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Cliente compilado (en Vercel lo sirve la CDN; aquí sirve para `npm start`).
  const dist = path.join(ROOT, 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
    if (status >= 500) console.error(err);
    const cuerpo = { error: status >= 500 ? 'Error interno del servidor' : err.message };
    for (const k of ['campos', 'avisos', 'errores', 'requiereConfirmacion']) if (err[k]) cuerpo[k] = err[k];
    if (status === 413) cuerpo.error = 'Los archivos son demasiado grandes';
    res.status(status).json(cuerpo);
  });
  return app;
}
