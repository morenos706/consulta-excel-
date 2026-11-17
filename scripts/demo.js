// Carga datos de demostración: una sede con habitaciones, un evento y 34 inscritos ficticios.
// Uso: npm run demo   (no se ejecuta si ya existe el evento de demostración)
import { iniciar, cerrar, query, uno, tx } from '../server/db.js';
import { sembrarAdmin } from '../server/auth.js';
import { hoy } from '../server/util.js';

await iniciar();
await sembrarAdmin();
if (await uno(`select 1 from eventos where codigo = 'DEMO2026'`)) {
  console.log('Los datos de demostración ya existen.');
  await cerrar();
  process.exit(0);
}
const sumar = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const h0 = hoy();

await tx(async (t) => {
  const sede = await t.uno(`insert into sedes (nombre, direccion, descripcion) values ('Casa de Convivencias Nazaret (demo)', 'Vereda El Placer, Guarne', 'Casa de convivencias de ejemplo') returning id`);
  const hab = (codigo, bloque, piso, capacidad, tipo, extra = {}) => t.query(
    `insert into habitaciones (sede_id, codigo, bloque, piso, capacidad, tipo, accesible, bano_privado) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [sede.id, codigo, bloque, piso, capacidad, tipo, !!extra.acc, !!extra.bano]);
  for (let n = 101; n <= 108; n += 1) await hab(String(n), 'A', 1, 2, 'MATRIMONIAL', { acc: n <= 102, bano: true });
  for (let n = 201; n <= 203; n += 1) await hab(String(n), 'A', 2, 4, 'MUJERES');
  for (let n = 204; n <= 206; n += 1) await hab(String(n), 'A', 2, 4, 'HOMBRES');
  await hab('B1', 'B', 1, 2, 'PRESBITEROS', { acc: true, bano: true });
  await hab('B2', 'B', 1, 2, 'PRESBITEROS', { bano: true });
  await hab('B3', 'B', 1, 5, 'FAMILIAR', { acc: true });
  await hab('B4', 'B', 1, 3, 'MUJERES', { acc: true });

  const ev = await t.uno(`insert into eventos (codigo, nombre, tipo, descripcion, fecha_inicio, fecha_fin, fecha_limite, sede_id)
    values ('DEMO2026', 'CONVIVENCIA DE DEMOSTRACIÓN · COMUNIDADES SANTA LUCÍA Y MADRE DEL SALVADOR', 'SHEMA',
            'Llegada el viernes a las 5:00 p. m. Traer Biblia, ropa de cama y elementos de aseo.', $1, $2, $3, $4) returning id, fecha_inicio`,
  [sumar(h0, 10), sumar(h0, 12), sumar(h0, 7), sede.id]);

  const comunidades = ['3ª COM. SANTA LUCÍA', '5ª COM. MADRE DEL SALVADOR'];
  let doc = 900000;
  const persona = async (nombre, apellido, sexo, tipo, anio, extra = {}) => {
    doc += 1;
    const p = await t.uno(`insert into personas (documento_tipo, identificacion, nombre, apellido, fecha_nacimiento, sexo, celular, email, direccion)
      values ($1,$2,$3,$4,$5,$6,$7,$8,'CALLE 10 # 20-30, MEDELLÍN') returning id, identificacion`,
    [anio > 2009 ? 'TI' : 'CC', String(doc), nombre, apellido, `${anio}-0${(doc % 9) + 1}-1${doc % 9}`, sexo, `300${String(doc).padStart(7, '0')}`, `demo${doc}@example.com`]);
    const i = await t.uno(`insert into inscripciones (evento_id, persona_id, tipo_persona, comunidad, movilidad_reducida, necesidades, acepta_politica, acepta_cultura, estado,
        acudiente_tipo, acudiente_identificacion, acudiente_nombre, acudiente_apellido, acudiente_email, acudiente_celular)
      values ($1,$2,$3,$4,$5,$6,true,true,$7,$8,$9,$10,$11,$12,$13) returning id`,
    [ev.id, p.id, tipo, comunidades[doc % 2], !!extra.mov, extra.nec || null, doc % 4 === 0 ? 'CONFIRMADO' : 'INSCRITO',
      ...(anio > 2008 ? ['CC', '800001', 'MARTA', 'RESTREPO', 'acudiente@example.com', '3109998877'] : [null, null, null, null, null, null])]);
    return { ...i, identificacion: p.identificacion };
  };
  const matrimonio = async (el, ella, apellido, anio, extra) => {
    const a = await persona(el, apellido, 'M', 'MATRIMONIO', anio, extra);
    const b = await persona(ella, apellido, 'F', 'MATRIMONIO', anio + 2, extra);
    await t.query('update inscripciones set conyuge_inscripcion_id = $1, conyuge_identificacion = $2 where id = $3', [b.id, b.identificacion, a.id]);
    await t.query('update inscripciones set conyuge_inscripcion_id = $1, conyuge_identificacion = $2 where id = $3', [a.id, a.identificacion, b.id]);
  };
  await matrimonio('JORGE', 'LUCÍA', 'ÁLVAREZ', 1968, { mov: true, nec: 'Usa caminador' });
  await matrimonio('ANDRÉS', 'CAROLINA', 'MEJÍA', 1985);
  await matrimonio('FELIPE', 'DIANA', 'OSORIO', 1990);
  await matrimonio('HERNÁN', 'GLORIA', 'CASTAÑO', 1959);
  await matrimonio('MAURICIO', 'NATALIA', 'GIRALDO', 1988);
  await matrimonio('CAMILO', 'PAULA', 'RENDÓN', 1993);
  await persona('SANDRA', 'ZAPATA', 'F', 'MATRIMONIO', 1979); // cónyuge aún sin inscribir
  for (const [n, a, anio] of [['MARÍA', 'LÓPEZ', 1975], ['ANA', 'GARCÍA', 1999], ['LAURA', 'HENAO', 2001], ['ROSA', 'MONTOYA', 1950], ['VALENTINA', 'RÍOS', 2010],
    ['CLAUDIA', 'VÉLEZ', 1982], ['ISABEL', 'CARDONA', 1962], ['SARA', 'PATIÑO', 1997]]) await persona(n, a, 'F', 'MUJER SOLA', anio, a === 'MONTOYA' ? { mov: true } : {});
  for (const [n, a, anio] of [['CARLOS', 'RAMÍREZ', 1980], ['JUAN', 'MARTÍNEZ', 2003], ['DAVID', 'SÁNCHEZ', 1995], ['SANTIAGO', 'TORO', 2011],
    ['LUIS', 'GÓMEZ', 1971], ['MATEO', 'ARANGO', 2000], ['JULIÁN', 'BETANCUR', 1989]]) await persona(n, a, 'M', 'HOMBRE SOLO', anio);
  await persona('ALBERTO', 'MUÑOZ', 'M', 'PRESBITERO', 1965, { nec: 'Diabético' });
  await persona('ESTEBAN', 'QUINTERO', 'M', 'SEMINARISTA', 1998);
});
await cerrar();
console.log('Datos de demostración cargados. Evento: /registro/DEMO2026');
