// Capa de datos: PostgreSQL.
//  · Producción: cualquier PostgreSQL (Supabase, Neon, propio) mediante DATABASE_URL.
//  · Desarrollo y pruebas: PGlite (PostgreSQL embebido) en data/pgdata, o en memoria con DB=memory.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..');
const MIGRACIONES = path.join(ROOT, 'db', 'migraciones');

let driver = null;
let listo = null;

// PGlite es una sola conexión: las transacciones se serializan.
let cola = Promise.resolve();
function exclusivo(fn) {
  const r = cola.then(fn, fn);
  cola = r.catch(() => {});
  return r;
}

async function conectar() {
  if (process.env.DATABASE_URL) {
    const pg = (await import('pg')).default;
    pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
    pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
    pg.types.setTypeParser(1082, (v) => v); // date como texto AAAA-MM-DD
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL || 5),
      ssl: process.env.DB_SSL === 'off' ? false : { rejectUnauthorized: false },
      idleTimeoutMillis: 10000,
    });
    driver = { tipo: 'pg', pool };
  } else {
    const { PGlite, types } = await import('@electric-sql/pglite');
    const dir = process.env.DB === 'memory' ? undefined : path.join(ROOT, 'data', 'pgdata');
    if (dir) fs.mkdirSync(dir, { recursive: true });
    const lite = new PGlite(dir);
    await lite.waitReady;
    const parsers = { [types.DATE]: (v) => v, [types.INT8]: (v) => Number(v), [types.NUMERIC]: (v) => Number(v) };
    driver = { tipo: 'pglite', lite, opciones: { parsers } };
  }
}

const norm = (params) => params.map((p) => (p === undefined ? null : p));

async function migrar() {
  await query(`create table if not exists _migraciones (nombre text primary key, aplicada timestamptz not null default now())`);
  await query(`alter table _migraciones enable row level security`);
  const hechas = new Set((await query('select nombre from _migraciones')).rows.map((r) => r.nombre));
  const archivos = fs.readdirSync(MIGRACIONES).filter((f) => f.endsWith('.sql')).sort();
  for (const f of archivos) {
    if (hechas.has(f)) continue;
    const sql = fs.readFileSync(path.join(MIGRACIONES, f), 'utf8');
    await tx(async (t) => {
      await t.exec(sql);
      await t.query('insert into _migraciones (nombre) values ($1)', [f]);
    });
  }
}

export function iniciar() {
  if (!listo) listo = (async () => { await conectar(); await migrar(); })();
  return listo;
}

/** Consulta simple con parámetros $1..$n. */
export async function query(text, params = []) {
  if (driver.tipo === 'pg') {
    const r = await driver.pool.query(text, norm(params));
    return { rows: r.rows, count: r.rowCount };
  }
  return exclusivo(async () => {
    const r = await driver.lite.query(text, norm(params), driver.opciones);
    return { rows: r.rows, count: r.affectedRows ?? 0 };
  });
}

export const uno = async (text, params) => (await query(text, params)).rows[0] || null;

/** Ejecuta fn dentro de una transacción. fn recibe { query, uno, exec }. */
export async function tx(fn) {
  if (driver.tipo === 'pg') {
    const c = await driver.pool.connect();
    try {
      await c.query('begin');
      const t = {
        query: async (s, p = []) => { const r = await c.query(s, norm(p)); return { rows: r.rows, count: r.rowCount }; },
        exec: (s) => c.query(s),
      };
      t.uno = async (s, p) => (await t.query(s, p)).rows[0] || null;
      const out = await fn(t);
      await c.query('commit');
      return out;
    } catch (e) {
      await c.query('rollback').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }
  return exclusivo(() => driver.lite.transaction(async (lt) => {
    const t = {
      query: async (s, p = []) => { const r = await lt.query(s, norm(p), driver.opciones); return { rows: r.rows, count: r.affectedRows ?? 0 }; },
      exec: (s) => lt.exec(s),
    };
    t.uno = async (s, p) => (await t.query(s, p)).rows[0] || null;
    return fn(t);
  }));
}

export async function cerrar() {
  if (!driver) return;
  if (driver.tipo === 'pg') await driver.pool.end();
  else await driver.lite.close();
  driver = null; listo = null;
}
