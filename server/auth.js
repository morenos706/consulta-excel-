// Autenticación de usuarios administradores: contraseña con bcrypt y sesión JWT en cookie HttpOnly.
import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, uno } from './db.js';
import { ruta, fallo, texto, EMAIL_RE, limite, auditar } from './util.js';

const PROD = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const COOKIE = 'nz_sesion';
const DURACION_H = 12;

let secreto = process.env.JWT_SECRET;
if (!secreto) {
  if (PROD) console.error('[auth] Falta JWT_SECRET: las sesiones no sobrevivirán entre instancias.');
  secreto = crypto.randomBytes(32).toString('hex');
}

/** Crea el administrador inicial si no hay usuarios. */
export async function sembrarAdmin() {
  const hay = await uno('select count(*)::int as n from usuarios');
  if (hay.n > 0) return;
  let email = process.env.ADMIN_EMAIL;
  let clave = process.env.ADMIN_PASSWORD;
  if (!email || !clave) {
    if (PROD) { console.error('[auth] Defina ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador inicial.'); return; }
    email = 'admin@nazaret.local';
    clave = 'nazaret2026';
    console.log(`[auth] Administrador de desarrollo: ${email} / ${clave}`);
  }
  await query('insert into usuarios (email, nombre, password_hash, rol) values ($1, $2, $3, $4) on conflict (email) do nothing',
    [email.toLowerCase(), 'Administrador', await bcrypt.hash(clave, 10), 'admin']);
}

/** Middleware: exige sesión válida. */
export const autenticado = ruta(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) fallo(401, 'Inicie sesión');
  let datos;
  try { datos = jwt.verify(token, secreto); } catch { fallo(401, 'La sesión expiró. Inicie sesión de nuevo.'); }
  const u = await uno('select id, email, nombre, rol, activo from usuarios where id = $1', [datos.sub]);
  if (!u || !u.activo) fallo(401, 'Usuario inactivo');
  req.usuario = u;
  next();
});

export const soloAdmin = (req, _res, next) => (req.usuario?.rol === 'admin' ? next() : next(Object.assign(new Error('Solo administradores'), { status: 403 })));

export const rutasAuth = express.Router();

rutasAuth.post('/login', limite({ ventanaMs: 15 * 60 * 1000, max: 15, mensaje: 'Demasiados intentos. Espere 15 minutos.' }), ruta(async (req, res) => {
  const email = texto(req.body?.email).toLowerCase();
  const clave = String(req.body?.password || '');
  const u = await uno('select * from usuarios where email = $1', [email]);
  const ok = u && u.activo && (await bcrypt.compare(clave, u.password_hash));
  if (!ok) fallo(401, 'Correo o contraseña incorrectos');
  const token = jwt.sign({ sub: u.id }, secreto, { expiresIn: `${DURACION_H}h` });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: DURACION_H * 3600 * 1000, path: '/' });
  req.usuario = u;
  await auditar(req, 'login', u.email);
  res.json({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol });
}));

rutasAuth.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

rutasAuth.get('/yo', autenticado, (req, res) => res.json(req.usuario));

rutasAuth.post('/clave', autenticado, ruta(async (req, res) => {
  const actual = String(req.body?.actual || '');
  const nueva = String(req.body?.nueva || '');
  if (nueva.length < 8) fallo(400, 'La nueva contraseña debe tener al menos 8 caracteres');
  const u = await uno('select password_hash from usuarios where id = $1', [req.usuario.id]);
  if (!(await bcrypt.compare(actual, u.password_hash))) fallo(400, 'La contraseña actual no es correcta');
  await query('update usuarios set password_hash = $1 where id = $2', [await bcrypt.hash(nueva, 10), req.usuario.id]);
  await auditar(req, 'cambiar_clave', req.usuario.email);
  res.json({ ok: true });
}));

// ---------- Gestión de usuarios (solo administradores) ----------
export const rutasUsuarios = express.Router();
rutasUsuarios.use(autenticado, soloAdmin);

rutasUsuarios.get('/', ruta(async (_req, res) => {
  res.json((await query('select id, email, nombre, rol, activo, creado from usuarios order by nombre')).rows);
}));

rutasUsuarios.post('/', ruta(async (req, res) => {
  const email = texto(req.body?.email).toLowerCase();
  const nombre = texto(req.body?.nombre, 120);
  const rol = req.body?.rol === 'admin' ? 'admin' : 'coordinador';
  const clave = String(req.body?.password || '');
  if (!EMAIL_RE.test(email)) fallo(400, 'Correo no válido');
  if (!nombre) fallo(400, 'Escriba el nombre');
  if (clave.length < 8) fallo(400, 'La contraseña debe tener al menos 8 caracteres');
  if (await uno('select 1 from usuarios where email = $1', [email])) fallo(409, 'Ya existe un usuario con ese correo');
  const u = await uno('insert into usuarios (email, nombre, rol, password_hash) values ($1, $2, $3, $4) returning id, email, nombre, rol, activo',
    [email, nombre, rol, await bcrypt.hash(clave, 10)]);
  await auditar(req, 'crear_usuario', email);
  res.status(201).json(u);
}));

rutasUsuarios.put('/:id', ruta(async (req, res) => {
  const id = Number(req.params.id);
  const u = await uno('select * from usuarios where id = $1', [id]);
  if (!u) fallo(404, 'Usuario no encontrado');
  const nombre = texto(req.body?.nombre, 120) || u.nombre;
  const rol = req.body?.rol ? (req.body.rol === 'admin' ? 'admin' : 'coordinador') : u.rol;
  const activo = req.body?.activo === undefined ? u.activo : !!req.body.activo;
  if (id === req.usuario.id && (rol !== 'admin' || !activo)) fallo(400, 'No puede quitarse su propio rol de administrador ni desactivarse');
  await query('update usuarios set nombre = $1, rol = $2, activo = $3 where id = $4', [nombre, rol, activo, id]);
  if (req.body?.password) {
    if (String(req.body.password).length < 8) fallo(400, 'La contraseña debe tener al menos 8 caracteres');
    await query('update usuarios set password_hash = $1 where id = $2', [await bcrypt.hash(String(req.body.password), 10), id]);
  }
  await auditar(req, 'editar_usuario', u.email);
  res.json({ ok: true });
}));
