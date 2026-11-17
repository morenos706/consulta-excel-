// Pruebas de extremo a extremo de la API sobre PostgreSQL embebido en memoria.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB = 'memory';
const { crearApp, preparar } = await import('../server/app.js');
const { cerrar } = await import('../server/db.js');

let server; let base; let cookie = '';
// Imagen JPEG válida de más de 1 KB para simular la foto del documento
const FOTO = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]).toString('base64')}`;

async function api(method, url, body, { auth = true } = {}) {
  const r = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, body: ct.includes('json') ? await r.json() : await r.arrayBuffer() };
}

const persona = (o = {}) => ({
  documento_tipo: 'CC', identificacion: '1000', nombre: 'Ana', apellido: 'Pérez', tipo_persona: 'MUJER SOLA',
  fecha_nacimiento: '1990-05-01', sexo: 'F', celular: '3001234567', email: 'ana@example.com', direccion: 'Calle 1 # 2-3',
  acepta_politica: true, acepta_cultura: true, documento_frente: FOTO, documento_reverso: FOTO, comunidad: 'Santa Lucía', ...o,
});

let evento; let sede;
const Y = new Date().getFullYear() + 1;
const MENOR = `${Y - 10}-01-01`;

before(async () => {
  await preparar();
  server = crearApp().listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => { server.close(); await cerrar(); });

test('login de administrador', async () => {
  assert.equal((await api('GET', '/eventos')).status, 401);
  assert.equal((await api('POST', '/auth/login', { email: 'admin@nazaret.local', password: 'mala' })).status, 401);
  const r = await api('POST', '/auth/login', { email: 'admin@nazaret.local', password: 'nazaret2026' });
  assert.equal(r.status, 200);
  assert.equal(r.body.rol, 'admin');
});

test('sede, habitaciones y evento', async () => {
  sede = (await api('POST', '/sedes', { nombre: 'Casa de Convivencias Nazaret' })).body;
  let r = await api('POST', `/sedes/${sede.id}/habitaciones/lote`, { desde: 101, hasta: 103, capacidad: 2, tipo: 'MATRIMONIAL', piso: 1 });
  assert.equal(r.body.creadas, 3);
  r = await api('POST', `/sedes/${sede.id}/habitaciones/lote`, { desde: 201, hasta: 202, capacidad: 3, tipo: 'MUJERES', piso: 2 });
  r = await api('POST', `/sedes/${sede.id}/habitaciones/lote`, { desde: 301, hasta: 302, capacidad: 3, tipo: 'HOMBRES', piso: 3 });
  r = await api('POST', `/sedes/${sede.id}/habitaciones`, { codigo: 'P1', capacidad: 2, tipo: 'PRESBITEROS', accesible: true });
  assert.equal(r.status, 201);
  assert.equal((await api('POST', `/sedes/${sede.id}/habitaciones`, { codigo: 'P1', capacidad: 2 })).status, 409);
  r = await api('POST', '/eventos', { nombre: 'Convivencia del Shemá', tipo: 'SHEMA', fecha_inicio: `${Y}-11-20`, fecha_fin: `${Y}-11-22`, fecha_limite: `${Y}-11-11`, sede_id: sede.id });
  assert.equal(r.status, 201);
  evento = r.body;
  assert.match(evento.codigo, /^[A-Z0-9]{8}$/);
});

test('inscripción pública: validaciones', async () => {
  const info = await api('GET', `/publico/eventos/${evento.codigo}`, null, { auth: false });
  assert.equal(info.body.abierto, true);
  let r = await api('POST', `/publico/eventos/${evento.codigo}/inscripcion`, persona({ email: 'x', acepta_politica: false }), { auth: false });
  assert.equal(r.status, 400);
  assert.ok(r.body.campos.email && r.body.campos.acepta_politica);
  r = await api('POST', `/publico/eventos/${evento.codigo}/inscripcion`, persona({ tipo_persona: 'HOMBRE SOLO' }), { auth: false });
  assert.equal(r.status, 400, 'tipo y género deben coincidir');
  // Menor de edad sin acudiente
  r = await api('POST', `/publico/eventos/${evento.codigo}/inscripcion`, persona({ identificacion: '2000', fecha_nacimiento: MENOR }), { auth: false });
  assert.equal(r.status, 400);
  assert.ok(r.body.campos.acudiente_identificacion);
  // Sin fotos
  r = await api('POST', `/publico/eventos/${evento.codigo}/inscripcion`, persona({ documento_frente: null }), { auth: false });
  assert.equal(r.status, 400);
});

test('inscripción pública y vínculo de matrimonio', async () => {
  const ok = (b) => api('POST', `/publico/eventos/${evento.codigo}/inscripcion`, b, { auth: false });
  assert.equal((await ok(persona())).status, 201);
  assert.equal((await ok(persona())).status, 409, 'no se puede inscribir dos veces');

  // Esposo se inscribe primero con su esposa pendiente; ella luego indica la cédula del esposo
  let r = await ok(persona({ identificacion: '3001', nombre: 'Juan', apellido: 'Gómez', sexo: 'M', tipo_persona: 'MATRIMONIO', conyuge_pendiente: true, email: 'j@example.com' }));
  assert.equal(r.body.conyugePendiente, true);
  const c = await api('GET', `/publico/eventos/${evento.codigo}/conyuge/3001`, null, { auth: false });
  assert.deepEqual(c.body, { encontrado: true, nombre: 'JUAN G.', inscritoEnEvento: true });
  r = await ok(persona({ identificacion: '3002', nombre: 'María', apellido: 'Gómez', tipo_persona: 'MATRIMONIO', conyuge_identificacion: '3001', email: 'm@example.com' }));
  assert.equal(r.body.conyuge, 'JUAN G.');

  // Otros participantes
  await ok(persona({ identificacion: '4001', nombre: 'Luis', sexo: 'M', tipo_persona: 'HOMBRE SOLO', email: 'l@example.com' }));
  await ok(persona({ identificacion: '4002', nombre: 'Pedro', sexo: 'M', tipo_persona: 'PRESBITERO', email: 'p@example.com', movilidad_reducida: true }));
  await ok(persona({ identificacion: '4003', nombre: 'Rosa', email: 'r@example.com', comunidad: 'Madre del Salvador' }));
  // Menor con acudiente
  r = await ok(persona({
    identificacion: '5001', nombre: 'Sofía', fecha_nacimiento: MENOR, email: 's@example.com',
    acudiente_tipo: 'CC', acudiente_identificacion: '5000', acudiente_nombre: 'Carlos', acudiente_apellido: 'Ruiz',
    acudiente_email: 'c@example.com', acudiente_celular: '3119999999', acudiente_documento_frente: FOTO, acudiente_documento_reverso: FOTO,
  }));
  assert.equal(r.status, 201);

  // Persona conocida: puede reutilizar sus documentos en otro evento
  const p = await api('GET', `/publico/eventos/${evento.codigo}/persona/1000`, null, { auth: false });
  assert.equal(p.body.tieneDocumentos, true);
  assert.equal(p.body.yaInscrito, true);
  assert.equal(p.body.email, undefined, 'no expone datos personales');
});

test('acomodación manual con reglas', async () => {
  let a = (await api('GET', `/eventos/${evento.id}/acomodacion`)).body;
  assert.equal(a.resumen.inscritos, 7);
  assert.equal(a.resumen.sinAsignar, 7);
  const id = (nombre) => a.sinAsignar.find((i) => i.nombre === nombre).id;
  const hab = (codigo) => a.habitaciones.find((h) => h.codigo === codigo).id;

  // Hombre en habitación de mujeres: requiere confirmación
  let r = await api('POST', `/eventos/${evento.id}/acomodacion/asignar`, { inscripcion_ids: [id('LUIS')], habitacion_id: hab('201') });
  assert.equal(r.status, 409);
  assert.equal(r.body.requiereConfirmacion, true);
  r = await api('POST', `/eventos/${evento.id}/acomodacion/asignar`, { inscripcion_ids: [id('LUIS')], habitacion_id: hab('201'), forzar: true });
  assert.equal(r.status, 200);
  // Capacidad: nunca se puede forzar
  r = await api('POST', `/eventos/${evento.id}/acomodacion/asignar`, { inscripcion_ids: [id('ANA'), id('ROSA'), id('SOFÍA')], habitacion_id: hab('201'), forzar: true });
  assert.equal(r.status, 409);
  assert.ok(r.body.errores[0].includes('capacidad'));
  // Retirar
  r = await api('POST', `/eventos/${evento.id}/acomodacion/asignar`, { inscripcion_ids: [id('LUIS')], habitacion_id: null });
  assert.equal(r.status, 200);
});

test('acomodación automática', async () => {
  const r = await api('POST', `/eventos/${evento.id}/acomodacion/automatica`, {});
  assert.equal(r.status, 200);
  assert.equal(r.body.asignadas, 7);
  const a = (await api('GET', `/eventos/${evento.id}/acomodacion`)).body;
  const dondeEsta = (nombre) => a.habitaciones.find((h) => h.ocupantes.some((o) => o.nombre === nombre));
  assert.equal(dondeEsta('JUAN').id, dondeEsta('MARÍA').id, 'el matrimonio queda junto');
  assert.equal(dondeEsta('JUAN').tipo, 'MATRIMONIAL');
  assert.equal(dondeEsta('PEDRO').tipo, 'PRESBITEROS');
  assert.equal(dondeEsta('LUIS').tipo, 'HOMBRES');
  for (const n of ['ANA', 'ROSA', 'SOFÍA']) assert.equal(dondeEsta(n).tipo, 'MUJERES');
  assert.equal(a.resumen.habitacionesConAlertas, 0);
});

test('cancelar libera la cama y exportaciones Excel', async () => {
  const lista = (await api('GET', `/eventos/${evento.id}/inscripciones`)).body;
  const luis = lista.find((i) => i.nombre === 'LUIS');
  assert.ok(luis.habitacion_id);
  await api('PUT', `/inscripciones/${luis.id}`, { estado: 'CANCELADO' });
  const det = (await api('GET', `/inscripciones/${luis.id}`)).body;
  assert.equal(det.habitacion_id, null);
  assert.equal(det.documentos.length, 2);
  const img = await api('GET', `/inscripciones/${luis.id}/documento/persona/frente`);
  assert.equal(img.status, 200);

  for (const tipo of ['inscritos', 'acomodacion']) {
    const x = await api('GET', `/eventos/${evento.id}/exportar/${tipo}`);
    assert.equal(x.status, 200);
    assert.equal(Buffer.from(x.body).subarray(0, 2).toString(), 'PK', 'es un archivo xlsx');
  }
});

test('importar habitaciones desde Excel', async () => {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hab');
  ws.addRow(['Habitación', 'Bloque', 'Piso', 'Camas', 'Tipo', 'Accesible']);
  ws.addRow(['401', 'B', 4, 4, 'Mujeres', 'sí']);
  ws.addRow(['101', '', 1, 2, 'Matrimonial', '']);
  const b64 = Buffer.from(await wb.xlsx.writeBuffer()).toString('base64');
  const r = await api('POST', `/sedes/${sede.id}/habitaciones/importar`, { archivo: `data:application/octet-stream;base64,${b64}` });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { creadas: 1, actualizadas: 1 });
});

test('matrimonio separado por inscripción tardía se reúne en la asignación automática', async () => {
  const { asignarAutomatico } = await import('../server/reglas.js');
  const habs = [
    { id: 1, codigo: '201', tipo: 'MUJERES', capacidad: 4, activa: true, accesible: false, ocupantes: [{ id: 10, nombre: 'SANDRA', sexo: 'F', tipo_persona: 'MATRIMONIO', conyuge_inscripcion_id: 11 }] },
    { id: 2, codigo: '204', tipo: 'HOMBRES', capacidad: 4, activa: true, accesible: false, ocupantes: [] },
    { id: 3, codigo: '108', tipo: 'MATRIMONIAL', capacidad: 2, activa: true, accesible: false, ocupantes: [] },
  ];
  const r = asignarAutomatico(habs, [{ id: 11, nombre: 'RICARDO', sexo: 'M', tipo_persona: 'MATRIMONIO', conyuge_inscripcion_id: 10 }]);
  assert.deepEqual(r.asignaciones.map((a) => [a.inscripcion_id, a.habitacion_id]).sort(), [[10, 3], [11, 3]]);
  assert.equal(r.sinLugar.length, 0);
});
