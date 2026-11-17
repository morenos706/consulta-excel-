// Rutas de administración: sedes, habitaciones, eventos, inscripciones y acomodación.
import crypto from 'node:crypto';
import express from 'express';
import { query, uno, tx } from './db.js';
import { autenticado, soloAdmin } from './auth.js';
import { TIPOS_HABITACION, TIPOS_PERSONA, edad, evaluar, asignarAutomatico } from './reglas.js';
import { TIPOS_DOCUMENTO } from './publico.js';
import { ruta, fallo, texto, mayus, opcional, bool, entero, EMAIL_RE, fechaValida, auditar } from './util.js';
import { excelInscritos, excelAcomodacion, leerHabitacionesExcel } from './excel.js';

export const rutasAdmin = express.Router();
rutasAdmin.use(autenticado);

// ==================== Catálogos ====================
rutasAdmin.get('/catalogos', (_req, res) => {
  res.json({ tiposHabitacion: TIPOS_HABITACION, tiposPersona: TIPOS_PERSONA, tiposDocumento: TIPOS_DOCUMENTO });
});

// ==================== Sedes ====================
rutasAdmin.get('/sedes', ruta(async (_req, res) => {
  res.json((await query(`select s.*,
      (select count(*)::int from habitaciones h where h.sede_id = s.id and h.activa) as habitaciones,
      (select coalesce(sum(capacidad), 0)::int from habitaciones h where h.sede_id = s.id and h.activa) as camas
    from sedes s order by s.nombre`)).rows);
}));

function datosSede(b) {
  const d = { nombre: texto(b.nombre, 120), direccion: opcional(b.direccion, 200), descripcion: opcional(b.descripcion, 500) };
  if (d.nombre.length < 2) fallo(400, 'Escriba el nombre de la sede');
  return d;
}

rutasAdmin.post('/sedes', ruta(async (req, res) => {
  const d = datosSede(req.body || {});
  if (await uno('select 1 from sedes where lower(nombre) = lower($1)', [d.nombre])) fallo(409, 'Ya existe una sede con ese nombre');
  const s = await uno('insert into sedes (nombre, direccion, descripcion) values ($1,$2,$3) returning *', [d.nombre, d.direccion, d.descripcion]);
  await auditar(req, 'crear_sede', d.nombre);
  res.status(201).json(s);
}));

rutasAdmin.put('/sedes/:id', ruta(async (req, res) => {
  const d = datosSede(req.body || {});
  const s = await uno('update sedes set nombre=$1, direccion=$2, descripcion=$3 where id=$4 returning *', [d.nombre, d.direccion, d.descripcion, Number(req.params.id)]);
  if (!s) fallo(404, 'Sede no encontrada');
  res.json(s);
}));

rutasAdmin.delete('/sedes/:id', soloAdmin, ruta(async (req, res) => {
  const id = Number(req.params.id);
  if (await uno('select 1 from eventos where sede_id = $1', [id])) fallo(409, 'La sede tiene eventos asociados. Cambie la sede de esos eventos primero.');
  const s = await uno('delete from sedes where id = $1 returning nombre', [id]);
  if (!s) fallo(404, 'Sede no encontrada');
  await auditar(req, 'eliminar_sede', s.nombre);
  res.json({ ok: true });
}));

// ==================== Habitaciones ====================
function datosHabitacion(b) {
  const d = {
    codigo: mayus(b.codigo, 20),
    bloque: mayus(b.bloque, 40),
    piso: entero(b.piso) ?? 1,
    capacidad: entero(b.capacidad),
    tipo: mayus(b.tipo, 20) || 'MIXTA',
    accesible: bool(b.accesible),
    bano_privado: bool(b.bano_privado),
    activa: b.activa === undefined ? true : bool(b.activa),
    notas: opcional(b.notas, 300),
  };
  if (!d.codigo) fallo(400, 'Escriba el número o nombre de la habitación');
  if (!Number.isInteger(d.capacidad) || d.capacidad < 1 || d.capacidad > 50) fallo(400, 'La capacidad debe estar entre 1 y 50 camas');
  if (!Number.isInteger(d.piso) || d.piso < -5 || d.piso > 100) fallo(400, 'Piso no válido');
  if (!TIPOS_HABITACION[d.tipo]) fallo(400, 'Tipo de habitación no válido');
  return d;
}

rutasAdmin.get('/sedes/:id/habitaciones', ruta(async (req, res) => {
  res.json((await query('select * from habitaciones where sede_id = $1 order by bloque, piso, codigo', [Number(req.params.id)])).rows
    .sort((a, b) => a.bloque.localeCompare(b.bloque, 'es') || a.piso - b.piso || a.codigo.localeCompare(b.codigo, 'es', { numeric: true })));
}));

rutasAdmin.post('/sedes/:id/habitaciones', ruta(async (req, res) => {
  const sede = Number(req.params.id);
  const d = datosHabitacion(req.body || {});
  if (await uno('select 1 from habitaciones where sede_id = $1 and codigo = $2', [sede, d.codigo])) fallo(409, `Ya existe la habitación ${d.codigo} en esta sede`);
  const h = await uno(`insert into habitaciones (sede_id, codigo, bloque, piso, capacidad, tipo, accesible, bano_privado, activa, notas)
                       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
  [sede, d.codigo, d.bloque, d.piso, d.capacidad, d.tipo, d.accesible, d.bano_privado, d.activa, d.notas]);
  res.status(201).json(h);
}));

/** Crea varias habitaciones con numeración consecutiva (p. ej. 101 a 110). */
rutasAdmin.post('/sedes/:id/habitaciones/lote', ruta(async (req, res) => {
  const sede = Number(req.params.id);
  const b = req.body || {};
  const desde = entero(b.desde);
  const hasta = entero(b.hasta);
  const prefijo = mayus(b.prefijo, 10);
  if (!Number.isInteger(desde) || !Number.isInteger(hasta) || hasta < desde) fallo(400, 'Indique el rango de números (desde ≤ hasta)');
  if (hasta - desde > 200) fallo(400, 'Máximo 200 habitaciones por lote');
  const base = datosHabitacion({ ...b, codigo: 'X' });
  const r = await tx(async (t) => {
    let creadas = 0; let omitidas = 0;
    for (let n = desde; n <= hasta; n += 1) {
      const codigo = `${prefijo}${n}`;
      const q = await t.query(`insert into habitaciones (sede_id, codigo, bloque, piso, capacidad, tipo, accesible, bano_privado, activa)
                               values ($1,$2,$3,$4,$5,$6,$7,$8,true) on conflict (sede_id, codigo) do nothing`,
      [sede, codigo, base.bloque, base.piso, base.capacidad, base.tipo, base.accesible, base.bano_privado]);
      if (q.count) creadas += 1; else omitidas += 1;
    }
    return { creadas, omitidas };
  });
  await auditar(req, 'crear_habitaciones_lote', `Sede ${sede}: ${r.creadas} creadas`);
  res.status(201).json(r);
}));

/** Importa habitaciones desde Excel (crea o actualiza por número). */
rutasAdmin.post('/sedes/:id/habitaciones/importar', ruta(async (req, res) => {
  const sede = Number(req.params.id);
  if (!await uno('select 1 from sedes where id = $1', [sede])) fallo(404, 'Sede no encontrada');
  const m = /^data:[^;]*;base64,(.+)$/.exec(String(req.body?.archivo || ''));
  if (!m) fallo(400, 'Adjunte el archivo de Excel (.xlsx)');
  const filas = await leerHabitacionesExcel(Buffer.from(m[1], 'base64'));
  const errores = [];
  const validas = [];
  for (const f of filas) {
    try { validas.push(datosHabitacion(f.datos)); } catch (e) { errores.push(`Fila ${f.fila}: ${e.message}`); }
  }
  if (errores.length) fallo(400, `El archivo tiene errores. No se importó nada.\n${errores.slice(0, 15).join('\n')}`);
  const r = await tx(async (t) => {
    let creadas = 0; let actualizadas = 0;
    for (const d of validas) {
      const ex = await t.uno('select id from habitaciones where sede_id = $1 and codigo = $2', [sede, d.codigo]);
      const v = [d.bloque, d.piso, d.capacidad, d.tipo, d.accesible, d.bano_privado, d.activa, d.notas];
      if (ex) { await t.query('update habitaciones set bloque=$1, piso=$2, capacidad=$3, tipo=$4, accesible=$5, bano_privado=$6, activa=$7, notas=$8 where id=$9', [...v, ex.id]); actualizadas += 1; }
      else { await t.query('insert into habitaciones (bloque, piso, capacidad, tipo, accesible, bano_privado, activa, notas, sede_id, codigo) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [...v, sede, d.codigo]); creadas += 1; }
    }
    return { creadas, actualizadas };
  });
  await auditar(req, 'importar_habitaciones', `Sede ${sede}: ${r.creadas} creadas, ${r.actualizadas} actualizadas`);
  res.json(r);
}));

rutasAdmin.put('/habitaciones/:id', ruta(async (req, res) => {
  const id = Number(req.params.id);
  const actual = await uno('select * from habitaciones where id = $1', [id]);
  if (!actual) fallo(404, 'Habitación no encontrada');
  const d = datosHabitacion({ ...actual, ...req.body });
  if (d.codigo !== actual.codigo && await uno('select 1 from habitaciones where sede_id = $1 and codigo = $2', [actual.sede_id, d.codigo])) fallo(409, `Ya existe la habitación ${d.codigo}`);
  const ocupadas = await uno(`select max(n)::int as n from (select count(*) as n from inscripciones i join eventos e on e.id = i.evento_id
                                where i.habitacion_id = $1 and i.estado <> 'CANCELADO' and e.fecha_fin >= current_date group by i.evento_id) x`, [id]);
  if (ocupadas?.n && d.capacidad < ocupadas.n) fallo(409, `La habitación tiene ${ocupadas.n} personas acomodadas en un evento vigente; no puede bajar la capacidad a ${d.capacidad}`);
  const h = await uno(`update habitaciones set codigo=$1, bloque=$2, piso=$3, capacidad=$4, tipo=$5, accesible=$6, bano_privado=$7, activa=$8, notas=$9
                       where id=$10 returning *`, [d.codigo, d.bloque, d.piso, d.capacidad, d.tipo, d.accesible, d.bano_privado, d.activa, d.notas, id]);
  res.json(h);
}));

rutasAdmin.delete('/habitaciones/:id', ruta(async (req, res) => {
  const id = Number(req.params.id);
  const n = await uno(`select count(*)::int as n from inscripciones i join eventos e on e.id = i.evento_id
                        where i.habitacion_id = $1 and i.estado <> 'CANCELADO' and e.fecha_fin >= current_date`, [id]);
  if (n.n) fallo(409, `La habitación tiene ${n.n} personas acomodadas en eventos vigentes. Retírelas primero o marque la habitación como fuera de servicio.`);
  const h = await uno('delete from habitaciones where id = $1 returning codigo', [id]);
  if (!h) fallo(404, 'Habitación no encontrada');
  await auditar(req, 'eliminar_habitacion', h.codigo);
  res.json({ ok: true });
}));

// ==================== Eventos ====================
const nuevoCodigo = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(8), (x) => abc[x % abc.length]).join('');
};

function datosEvento(b) {
  const d = {
    nombre: mayus(b.nombre, 250),
    tipo: mayus(b.tipo, 60) || 'CONVIVENCIA',
    descripcion: opcional(b.descripcion, 2000),
    fecha_inicio: texto(b.fecha_inicio, 10),
    fecha_fin: texto(b.fecha_fin, 10),
    fecha_limite: texto(b.fecha_limite, 10) || null,
    sede_id: entero(b.sede_id),
    cupo: entero(b.cupo),
    activo: b.activo === undefined ? true : bool(b.activo),
  };
  if (d.nombre.length < 3) fallo(400, 'Escriba el nombre del evento');
  if (!fechaValida(d.fecha_inicio)) fallo(400, 'Fecha de inicio no válida');
  if (!fechaValida(d.fecha_fin) || d.fecha_fin < d.fecha_inicio) fallo(400, 'La fecha de fin debe ser igual o posterior a la de inicio');
  if (d.fecha_limite && !fechaValida(d.fecha_limite)) fallo(400, 'Fecha límite no válida');
  if (d.cupo !== null && (!Number.isInteger(d.cupo) || d.cupo < 1)) fallo(400, 'El cupo debe ser un número positivo');
  return d;
}

const SQL_EVENTOS = `select e.*, s.nombre as sede_nombre,
    (select count(*)::int from inscripciones i where i.evento_id = e.id and i.estado <> 'CANCELADO') as inscritos,
    (select count(*)::int from inscripciones i where i.evento_id = e.id and i.estado <> 'CANCELADO' and i.habitacion_id is not null) as acomodados,
    (select coalesce(sum(h.capacidad), 0)::int from habitaciones h where h.sede_id = e.sede_id and h.activa) as camas
  from eventos e left join sedes s on s.id = e.sede_id`;

rutasAdmin.get('/eventos', ruta(async (_req, res) => {
  res.json((await query(`${SQL_EVENTOS} order by e.fecha_inicio desc, e.id desc`)).rows);
}));

rutasAdmin.get('/eventos/:id', ruta(async (req, res) => {
  const ev = await uno(`${SQL_EVENTOS} where e.id = $1`, [Number(req.params.id)]);
  if (!ev) fallo(404, 'Evento no encontrado');
  res.json(ev);
}));

rutasAdmin.post('/eventos', ruta(async (req, res) => {
  const d = datosEvento(req.body || {});
  let codigo = mayus(req.body?.codigo, 20).replace(/[^A-Z0-9]/g, '') || nuevoCodigo();
  if (await uno('select 1 from eventos where codigo = $1', [codigo])) {
    if (req.body?.codigo) fallo(409, 'Ya existe un evento con ese código');
    codigo = nuevoCodigo();
  }
  const ev = await uno(`insert into eventos (codigo, nombre, tipo, descripcion, fecha_inicio, fecha_fin, fecha_limite, sede_id, cupo, activo)
                        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
  [codigo, d.nombre, d.tipo, d.descripcion, d.fecha_inicio, d.fecha_fin, d.fecha_limite, d.sede_id, d.cupo, d.activo]);
  await auditar(req, 'crear_evento', `${codigo} ${d.nombre}`);
  res.status(201).json(ev);
}));

rutasAdmin.put('/eventos/:id', ruta(async (req, res) => {
  const id = Number(req.params.id);
  const actual = await uno('select * from eventos where id = $1', [id]);
  if (!actual) fallo(404, 'Evento no encontrado');
  const d = datosEvento({ ...actual, ...req.body });
  if (d.sede_id !== actual.sede_id && await uno('select 1 from inscripciones where evento_id = $1 and habitacion_id is not null', [id])) {
    fallo(409, 'El evento ya tiene personas acomodadas en habitaciones de la sede actual. Vacíe la acomodación antes de cambiar la sede.');
  }
  const ev = await uno(`update eventos set nombre=$1, tipo=$2, descripcion=$3, fecha_inicio=$4, fecha_fin=$5, fecha_limite=$6, sede_id=$7, cupo=$8, activo=$9
                        where id=$10 returning *`, [d.nombre, d.tipo, d.descripcion, d.fecha_inicio, d.fecha_fin, d.fecha_limite, d.sede_id, d.cupo, d.activo, id]);
  await auditar(req, 'editar_evento', ev.codigo);
  res.json(ev);
}));

rutasAdmin.delete('/eventos/:id', soloAdmin, ruta(async (req, res) => {
  const ev = await uno('delete from eventos where id = $1 returning codigo, nombre', [Number(req.params.id)]);
  if (!ev) fallo(404, 'Evento no encontrado');
  await auditar(req, 'eliminar_evento', `${ev.codigo} ${ev.nombre}`);
  res.json({ ok: true });
}));

// ==================== Inscripciones ====================
const SQL_INSCRITOS = `select i.*, p.documento_tipo, p.identificacion, p.nombre, p.apellido, p.fecha_nacimiento, p.sexo, p.celular, p.email, p.direccion,
       h.codigo as habitacion_codigo, h.bloque as habitacion_bloque, h.piso as habitacion_piso,
       cp.nombre as conyuge_nombre, cp.apellido as conyuge_apellido
  from inscripciones i
  join personas p on p.id = i.persona_id
  left join habitaciones h on h.id = i.habitacion_id
  left join inscripciones ci on ci.id = i.conyuge_inscripcion_id
  left join personas cp on cp.id = ci.persona_id`;

async function inscritosDe(eventoId, t = { query, uno }) {
  const ev = await t.uno('select fecha_inicio from eventos where id = $1', [eventoId]);
  const rows = (await t.query(`${SQL_INSCRITOS} where i.evento_id = $1 order by p.apellido, p.nombre`, [eventoId])).rows;
  return rows.map((r) => ({ ...r, edad: edad(r.fecha_nacimiento, ev.fecha_inicio) }));
}

rutasAdmin.get('/eventos/:id/inscripciones', ruta(async (req, res) => {
  const id = Number(req.params.id);
  if (!await uno('select 1 from eventos where id = $1', [id])) fallo(404, 'Evento no encontrado');
  res.json(await inscritosDe(id));
}));

rutasAdmin.get('/inscripciones/:id', ruta(async (req, res) => {
  const r = await uno(`${SQL_INSCRITOS} where i.id = $1`, [Number(req.params.id)]);
  if (!r) fallo(404, 'Inscripción no encontrada');
  const ev = await uno('select fecha_inicio from eventos where id = $1', [r.evento_id]);
  const docs = (await query('select titular, lado, creado from documentos where persona_id = $1 order by titular, lado', [r.persona_id])).rows;
  const otros = (await query(`select e.id, e.nombre, e.fecha_inicio from inscripciones i join eventos e on e.id = i.evento_id
                               where i.persona_id = $1 and i.id <> $2 order by e.fecha_inicio desc`, [r.persona_id, r.id])).rows;
  res.json({ ...r, edad: edad(r.fecha_nacimiento, ev.fecha_inicio), documentos: docs, otrosEventos: otros });
}));

rutasAdmin.get('/inscripciones/:id/documento/:titular/:lado', ruta(async (req, res) => {
  const ins = await uno('select persona_id from inscripciones where id = $1', [Number(req.params.id)]);
  if (!ins) fallo(404, 'Inscripción no encontrada');
  const d = await uno('select mime, datos from documentos where persona_id = $1 and titular = $2 and lado = $3 order by id desc limit 1',
    [ins.persona_id, texto(req.params.titular).toUpperCase(), texto(req.params.lado).toUpperCase()]);
  if (!d) fallo(404, 'Documento no encontrado');
  res.set('Content-Type', d.mime).set('Cache-Control', 'private, max-age=300').send(Buffer.from(d.datos));
}));

rutasAdmin.put('/inscripciones/:id', ruta(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const actual = await uno(`${SQL_INSCRITOS} where i.id = $1`, [id]);
  if (!actual) fallo(404, 'Inscripción no encontrada');
  const v = {
    estado: b.estado !== undefined ? mayus(b.estado, 20) : actual.estado,
    tipo_persona: b.tipo_persona !== undefined ? mayus(b.tipo_persona, 20) : actual.tipo_persona,
    comunidad: b.comunidad !== undefined ? opcional(mayus(b.comunidad, 120)) : actual.comunidad,
    parroquia: b.parroquia !== undefined ? opcional(mayus(b.parroquia, 120)) : actual.parroquia,
    movilidad_reducida: b.movilidad_reducida !== undefined ? bool(b.movilidad_reducida) : actual.movilidad_reducida,
    necesidades: b.necesidades !== undefined ? opcional(b.necesidades, 500) : actual.necesidades,
    observaciones: b.observaciones !== undefined ? opcional(b.observaciones, 1000) : actual.observaciones,
  };
  if (!['INSCRITO', 'CONFIRMADO', 'LLEGO', 'CANCELADO'].includes(v.estado)) fallo(400, 'Estado no válido');
  if (!TIPOS_PERSONA.includes(v.tipo_persona)) fallo(400, 'Tipo de persona no válido');
  const p = {
    nombre: b.nombre !== undefined ? mayus(b.nombre, 80) : actual.nombre,
    apellido: b.apellido !== undefined ? mayus(b.apellido, 80) : actual.apellido,
    celular: b.celular !== undefined ? texto(b.celular, 20) : actual.celular,
    email: b.email !== undefined ? texto(b.email, 120).toLowerCase() : actual.email,
    sexo: b.sexo !== undefined ? texto(b.sexo, 1).toUpperCase() : actual.sexo,
  };
  if (p.nombre.length < 2 || p.apellido.length < 2) fallo(400, 'Nombre y apellido son obligatorios');
  if (!EMAIL_RE.test(p.email)) fallo(400, 'Correo no válido');
  if (!['F', 'M'].includes(p.sexo)) fallo(400, 'Género no válido');
  await tx(async (t) => {
    const cancelar = v.estado === 'CANCELADO';
    await t.query(`update inscripciones set estado=$1, tipo_persona=$2, comunidad=$3, parroquia=$4, movilidad_reducida=$5, necesidades=$6, observaciones=$7
                   ${cancelar ? ', habitacion_id = null' : ''} where id=$8`,
    [v.estado, v.tipo_persona, v.comunidad, v.parroquia, v.movilidad_reducida, v.necesidades, v.observaciones, id]);
    if (v.tipo_persona !== 'MATRIMONIO' && actual.conyuge_inscripcion_id) {
      await t.query('update inscripciones set conyuge_inscripcion_id = null where id in ($1, $2)', [id, actual.conyuge_inscripcion_id]);
    }
    await t.query('update personas set nombre=$1, apellido=$2, celular=$3, email=$4, sexo=$5, actualizado=now() where id=$6',
      [p.nombre, p.apellido, p.celular, p.email, p.sexo, actual.persona_id]);
  });
  await auditar(req, 'editar_inscripcion', `${actual.identificacion} estado ${v.estado}`);
  res.json({ ok: true });
}));

/** Vincula o desvincula manualmente a dos cónyuges del mismo evento. */
rutasAdmin.post('/inscripciones/:id/conyuge', ruta(async (req, res) => {
  const id = Number(req.params.id);
  const otroId = entero(req.body?.conyuge_inscripcion_id);
  await tx(async (t) => {
    const a = await t.uno('select * from inscripciones where id = $1', [id]);
    if (!a) fallo(404, 'Inscripción no encontrada');
    if (a.conyuge_inscripcion_id) await t.query('update inscripciones set conyuge_inscripcion_id = null where id in ($1, $2)', [a.id, a.conyuge_inscripcion_id]);
    if (otroId) {
      const b = await t.uno('select i.*, p.identificacion from inscripciones i join personas p on p.id = i.persona_id where i.id = $1', [otroId]);
      if (!b || b.evento_id !== a.evento_id || b.id === a.id) fallo(400, 'El cónyuge debe estar inscrito en el mismo evento');
      if (b.conyuge_inscripcion_id) await t.query('update inscripciones set conyuge_inscripcion_id = null where id in ($1, $2)', [b.id, b.conyuge_inscripcion_id]);
      const pa = await t.uno('select identificacion from personas where id = $1', [a.persona_id]);
      await t.query(`update inscripciones set conyuge_inscripcion_id = $1, conyuge_identificacion = $2, tipo_persona = 'MATRIMONIO' where id = $3`, [b.id, b.identificacion, a.id]);
      await t.query(`update inscripciones set conyuge_inscripcion_id = $1, conyuge_identificacion = $2, tipo_persona = 'MATRIMONIO' where id = $3`, [a.id, pa.identificacion, b.id]);
    }
  });
  await auditar(req, 'vincular_conyuge', `${id} ↔ ${otroId ?? 'ninguno'}`);
  res.json({ ok: true });
}));

rutasAdmin.delete('/inscripciones/:id', soloAdmin, ruta(async (req, res) => {
  const r = await uno('delete from inscripciones where id = $1 returning id', [Number(req.params.id)]);
  if (!r) fallo(404, 'Inscripción no encontrada');
  await auditar(req, 'eliminar_inscripcion', String(r.id));
  res.json({ ok: true });
}));

// ==================== Acomodación ====================
async function estadoAcomodacion(eventoId, t = { query, uno }) {
  const ev = await t.uno(`${SQL_EVENTOS} where e.id = $1`, [eventoId]);
  if (!ev) fallo(404, 'Evento no encontrado');
  const inscritos = (await inscritosDe(eventoId, t)).filter((i) => i.estado !== 'CANCELADO');
  const habs = ev.sede_id ? (await t.query('select * from habitaciones where sede_id = $1', [ev.sede_id])).rows : [];
  habs.sort((a, b) => a.bloque.localeCompare(b.bloque, 'es') || a.piso - b.piso || a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
  const porHab = new Map(habs.map((h) => [h.id, []]));
  const sinAsignar = [];
  for (const i of inscritos) {
    if (i.habitacion_id && porHab.has(i.habitacion_id)) porHab.get(i.habitacion_id).push(i);
    else sinAsignar.push(i);
  }
  const habitaciones = habs.map((h) => {
    const ocupantes = porHab.get(h.id);
    const { errores, avisos } = evaluar(h, ocupantes);
    return { ...h, ocupantes, alertas: [...errores, ...avisos] };
  });
  const camas = habitaciones.filter((h) => h.activa).reduce((s, h) => s + h.capacidad, 0);
  return {
    evento: ev,
    habitaciones,
    sinAsignar,
    resumen: {
      inscritos: inscritos.length,
      acomodados: inscritos.length - sinAsignar.length,
      sinAsignar: sinAsignar.length,
      camas,
      camasLibres: camas - (inscritos.length - sinAsignar.length),
      habitacionesConAlertas: habitaciones.filter((h) => h.alertas.length).length,
      porTipo: TIPOS_PERSONA.map((tp) => ({ tipo: tp, total: inscritos.filter((i) => i.tipo_persona === tp).length })),
      porSexo: { F: inscritos.filter((i) => i.sexo === 'F').length, M: inscritos.filter((i) => i.sexo === 'M').length },
      menores: inscritos.filter((i) => i.edad < 18).length,
      movilidadReducida: inscritos.filter((i) => i.movilidad_reducida).length,
      matrimoniosPendientes: inscritos.filter((i) => i.tipo_persona === 'MATRIMONIO' && !i.conyuge_inscripcion_id).length,
    },
  };
}

rutasAdmin.get('/eventos/:id/acomodacion', ruta(async (req, res) => {
  res.json(await estadoAcomodacion(Number(req.params.id)));
}));

/**
 * Asigna (o retira, con habitacion_id null) una o varias inscripciones.
 * Si la habitación queda con avisos (p. ej. mezcla de géneros) responde 409 con los avisos,
 * salvo que se envíe forzar: true. Los errores (capacidad, fuera de servicio) nunca se pueden forzar.
 */
rutasAdmin.post('/eventos/:id/acomodacion/asignar', ruta(async (req, res) => {
  const eventoId = Number(req.params.id);
  const ids = [...new Set((req.body?.inscripcion_ids || []).map(Number).filter(Boolean))];
  const habId = entero(req.body?.habitacion_id);
  const forzar = req.body?.forzar === true;
  if (!ids.length) fallo(400, 'Seleccione al menos una persona');
  const r = await tx(async (t) => {
    const ev = await t.uno('select * from eventos where id = $1', [eventoId]);
    if (!ev) fallo(404, 'Evento no encontrado');
    const inscritos = await inscritosDe(eventoId, t);
    const mover = inscritos.filter((i) => ids.includes(i.id));
    if (mover.length !== ids.length) fallo(400, 'Alguna persona no pertenece a este evento');
    if (habId) {
      const hab = await t.uno('select * from habitaciones where id = $1', [habId]);
      if (!hab || hab.sede_id !== ev.sede_id) fallo(400, 'La habitación no pertenece a la sede del evento');
      const quedan = inscritos.filter((i) => i.habitacion_id === habId && !ids.includes(i.id) && i.estado !== 'CANCELADO');
      const { errores, avisos } = evaluar(hab, [...quedan, ...mover]);
      if (errores.length) fallo(409, errores.join('. '), { errores });
      if (avisos.length && !forzar) fallo(409, 'La asignación requiere confirmación', { avisos, requiereConfirmacion: true });
    }
    await t.query(`update inscripciones set habitacion_id = $1 where evento_id = $2 and id = any($3::int[])`, [habId, eventoId, ids]);
    return { movidas: ids.length };
  });
  await auditar(req, habId ? 'asignar_habitacion' : 'retirar_habitacion', `Evento ${eventoId}: ${ids.join(',')} → ${habId ?? 'sin habitación'}${forzar ? ' (confirmado con avisos)' : ''}`);
  res.json(r);
}));

rutasAdmin.post('/eventos/:id/acomodacion/automatica', ruta(async (req, res) => {
  const eventoId = Number(req.params.id);
  const r = await tx(async (t) => {
    const est = await estadoAcomodacion(eventoId, t);
    if (!est.evento.sede_id) fallo(400, 'Asigne una sede al evento antes de acomodar');
    const { asignaciones, sinLugar } = asignarAutomatico(est.habitaciones, est.sinAsignar);
    for (const a of asignaciones) await t.query('update inscripciones set habitacion_id = $1 where id = $2', [a.habitacion_id, a.inscripcion_id]);
    return { asignadas: asignaciones.length, sinLugar };
  });
  await auditar(req, 'acomodacion_automatica', `Evento ${eventoId}: ${r.asignadas} asignadas, ${r.sinLugar.length} sin lugar`);
  res.json(r);
}));

rutasAdmin.post('/eventos/:id/acomodacion/vaciar', ruta(async (req, res) => {
  const eventoId = Number(req.params.id);
  const habId = entero(req.body?.habitacion_id);
  const q = habId
    ? await query('update inscripciones set habitacion_id = null where evento_id = $1 and habitacion_id = $2', [eventoId, habId])
    : await query('update inscripciones set habitacion_id = null where evento_id = $1', [eventoId]);
  await auditar(req, 'vaciar_acomodacion', `Evento ${eventoId}${habId ? ` habitación ${habId}` : ''}: ${q.count}`);
  res.json({ retiradas: q.count });
}));

// ==================== Exportaciones Excel ====================
const nombreArchivo = (ev, sufijo) => `${ev.codigo}-${sufijo}.xlsx`;

rutasAdmin.get('/eventos/:id/exportar/inscritos', ruta(async (req, res) => {
  const ev = await uno('select * from eventos where id = $1', [Number(req.params.id)]);
  if (!ev) fallo(404, 'Evento no encontrado');
  const buf = await excelInscritos(ev, await inscritosDe(ev.id));
  res.attachment(nombreArchivo(ev, 'inscritos')).type('xlsx').send(buf);
}));

rutasAdmin.get('/eventos/:id/exportar/acomodacion', ruta(async (req, res) => {
  const est = await estadoAcomodacion(Number(req.params.id));
  const buf = await excelAcomodacion(est);
  res.attachment(nombreArchivo(est.evento, 'acomodacion')).type('xlsx').send(buf);
}));

rutasAdmin.get('/auditoria', soloAdmin, ruta(async (_req, res) => {
  res.json((await query(`select a.*, u.nombre as usuario from auditoria a left join usuarios u on u.id = a.usuario_id order by a.id desc limit 300`)).rows);
}));

