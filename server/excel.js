// Exportación e importación de Excel.
import ExcelJS from 'exceljs';
import { TIPOS_HABITACION } from './reglas.js';

const AZUL = 'FF1F3A5F';
const ESTADOS = { INSCRITO: 'Inscrito', CONFIRMADO: 'Confirmado', LLEGO: 'Llegó', CANCELADO: 'Cancelado' };

function encabezado(ws, titulo, subtitulo, columnas) {
  ws.columns = columnas.map((c) => ({ key: c.key, width: c.width || 16 }));
  ws.mergeCells(1, 1, 1, columnas.length);
  ws.getCell(1, 1).value = titulo;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: AZUL } };
  ws.mergeCells(2, 1, 2, columnas.length);
  ws.getCell(2, 1).value = subtitulo;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF555555' } };
  const fila = ws.getRow(4);
  columnas.forEach((c, i) => {
    const cell = fila.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  fila.height = 22;
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columnas.length } };
}

const subtituloEvento = (ev) => `Fundación Familia de Nazaret · Del ${ev.fecha_inicio} al ${ev.fecha_fin} · Generado ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`;
const sexo = (s) => (s === 'F' ? 'Femenino' : 'Masculino');
const habTexto = (i) => (i.habitacion_codigo ? `${i.habitacion_bloque ? `${i.habitacion_bloque} · ` : ''}${i.habitacion_codigo}` : '');

export async function excelInscritos(ev, inscritos) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Fundación Familia de Nazaret';
  const ws = wb.addWorksheet('Inscritos');
  const cols = [
    { key: 'n', header: '#', width: 5 },
    { key: 'documento_tipo', header: 'Tipo doc.', width: 9 },
    { key: 'identificacion', header: 'Identificación', width: 15 },
    { key: 'apellido', header: 'Apellidos', width: 22 },
    { key: 'nombre', header: 'Nombres', width: 22 },
    { key: 'tipo_persona', header: 'Tipo', width: 14 },
    { key: 'sexo', header: 'Género', width: 11 },
    { key: 'edad', header: 'Edad', width: 6 },
    { key: 'celular', header: 'Celular', width: 14 },
    { key: 'email', header: 'Correo', width: 28 },
    { key: 'direccion', header: 'Dirección', width: 28 },
    { key: 'comunidad', header: 'Comunidad', width: 20 },
    { key: 'parroquia', header: 'Parroquia', width: 20 },
    { key: 'conyuge', header: 'Cónyuge', width: 26 },
    { key: 'acudiente', header: 'Acudiente (menores)', width: 30 },
    { key: 'movilidad', header: 'Movilidad reducida', width: 10 },
    { key: 'necesidades', header: 'Necesidades / salud', width: 28 },
    { key: 'habitacion', header: 'Habitación', width: 14 },
    { key: 'estado', header: 'Estado', width: 12 },
    { key: 'creado', header: 'Fecha inscripción', width: 18 },
    { key: 'observaciones', header: 'Observaciones', width: 28 },
  ];
  encabezado(ws, `Inscritos · ${ev.nombre}`, subtituloEvento(ev), cols);
  inscritos.forEach((i, k) => {
    ws.addRow({
      n: k + 1, documento_tipo: i.documento_tipo, identificacion: i.identificacion, apellido: i.apellido, nombre: i.nombre,
      tipo_persona: i.tipo_persona, sexo: sexo(i.sexo), edad: i.edad, celular: i.celular, email: i.email, direccion: i.direccion,
      comunidad: i.comunidad, parroquia: i.parroquia,
      conyuge: i.conyuge_nombre ? `${i.conyuge_nombre} ${i.conyuge_apellido}` : (i.tipo_persona === 'MATRIMONIO' ? `Pendiente${i.conyuge_identificacion ? ` (${i.conyuge_identificacion})` : ''}` : ''),
      acudiente: i.acudiente_nombre ? `${i.acudiente_nombre} ${i.acudiente_apellido} · ${i.acudiente_celular}` : '',
      movilidad: i.movilidad_reducida ? 'Sí' : '', necesidades: i.necesidades, habitacion: habTexto(i),
      estado: ESTADOS[i.estado], creado: new Date(i.creado).toLocaleString('es-CO', { timeZone: 'America/Bogota' }), observaciones: i.observaciones,
    });
  });
  return wb.xlsx.writeBuffer();
}

export async function excelAcomodacion({ evento, habitaciones, sinAsignar }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Fundación Familia de Nazaret';
  const ws = wb.addWorksheet('Acomodación');
  const cols = [
    { key: 'bloque', header: 'Bloque', width: 12 },
    { key: 'piso', header: 'Piso', width: 6 },
    { key: 'codigo', header: 'Habitación', width: 12 },
    { key: 'tipo', header: 'Tipo', width: 16 },
    { key: 'cama', header: 'Cama', width: 7 },
    { key: 'persona', header: 'Persona', width: 34 },
    { key: 'identificacion', header: 'Identificación', width: 15 },
    { key: 'tipo_persona', header: 'Tipo persona', width: 14 },
    { key: 'sexo', header: 'Género', width: 11 },
    { key: 'edad', header: 'Edad', width: 6 },
    { key: 'comunidad', header: 'Comunidad', width: 20 },
    { key: 'celular', header: 'Celular', width: 14 },
    { key: 'notas', header: 'Notas', width: 30 },
  ];
  encabezado(ws, `Acomodación · ${evento.nombre}`, `${evento.sede_nombre || 'Sin sede'} · ${subtituloEvento(evento)}`, cols);
  for (const h of habitaciones.filter((x) => x.activa)) {
    const inicio = ws.rowCount + 1;
    for (let c = 0; c < h.capacidad; c += 1) {
      const o = h.ocupantes[c];
      ws.addRow({
        bloque: h.bloque, piso: h.piso, codigo: h.codigo, tipo: TIPOS_HABITACION[h.tipo], cama: c + 1,
        persona: o ? `${o.apellido} ${o.nombre}` : '— libre —', identificacion: o?.identificacion, tipo_persona: o?.tipo_persona,
        sexo: o ? sexo(o.sexo) : '', edad: o?.edad, comunidad: o?.comunidad, celular: o?.celular,
        notas: o ? [o.movilidad_reducida ? 'Movilidad reducida' : '', o.necesidades || ''].filter(Boolean).join(' · ') : '',
      });
      if (!o) ws.getRow(ws.rowCount).font = { color: { argb: 'FF999999' }, italic: true };
    }
    for (let r = inicio; r <= ws.rowCount; r += 1) {
      ws.getRow(r).getCell(3).font = { bold: true };
    }
    ws.getRow(ws.rowCount).border = { bottom: { style: 'thin', color: { argb: 'FFBBBBBB' } } };
  }
  const ws2 = wb.addWorksheet('Sin habitación');
  const cols2 = [
    { key: 'persona', header: 'Persona', width: 34 },
    { key: 'identificacion', header: 'Identificación', width: 15 },
    { key: 'tipo_persona', header: 'Tipo', width: 14 },
    { key: 'sexo', header: 'Género', width: 11 },
    { key: 'edad', header: 'Edad', width: 6 },
    { key: 'comunidad', header: 'Comunidad', width: 20 },
    { key: 'celular', header: 'Celular', width: 14 },
  ];
  encabezado(ws2, `Personas sin habitación · ${evento.nombre}`, subtituloEvento(evento), cols2);
  for (const o of sinAsignar) {
    ws2.addRow({ persona: `${o.apellido} ${o.nombre}`, identificacion: o.identificacion, tipo_persona: o.tipo_persona, sexo: sexo(o.sexo), edad: o.edad, comunidad: o.comunidad, celular: o.celular });
  }
  return wb.xlsx.writeBuffer();
}

/** Lee habitaciones de la primera hoja. Reconoce encabezados por nombre, sin importar mayúsculas ni tildes. */
export async function leerHabitacionesExcel(buffer) {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buffer); } catch { throw Object.assign(new Error('El archivo no es un Excel (.xlsx) válido'), { status: 400 }); }
  const ws = wb.worksheets[0];
  if (!ws) throw Object.assign(new Error('El archivo no tiene hojas'), { status: 400 });
  const limpio = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const alias = {
    codigo: ['habitacion', 'codigo', 'numero', 'no', 'n°', 'cuarto'],
    bloque: ['bloque', 'casa', 'pabellon', 'edificio', 'ala'],
    piso: ['piso', 'nivel'],
    capacidad: ['capacidad', 'camas', 'cupo', 'plazas'],
    tipo: ['tipo', 'uso', 'destino'],
    accesible: ['accesible', 'movilidad reducida', 'discapacidad'],
    bano_privado: ['bano privado', 'bano', 'banio privado'],
    notas: ['notas', 'observaciones'],
  };
  // Buscar la fila de encabezados en las primeras 10 filas
  let filaEnc = 0; let mapa = {};
  for (let r = 1; r <= Math.min(10, ws.rowCount); r += 1) {
    const m = {};
    ws.getRow(r).eachCell((cell, c) => {
      const t = limpio(cell.text);
      for (const [k, lista] of Object.entries(alias)) if (!m[k] && lista.includes(t)) m[k] = c;
    });
    if (m.codigo && m.capacidad) { filaEnc = r; mapa = m; break; }
  }
  if (!filaEnc) throw Object.assign(new Error('No se encontraron las columnas "Habitación" y "Capacidad" en la primera hoja'), { status: 400 });
  const tipos = Object.fromEntries(Object.entries(TIPOS_HABITACION).flatMap(([k, v]) => [[limpio(k), k], [limpio(v), k]]));
  Object.assign(tipos, { matrimonio: 'MATRIMONIAL', matrimonios: 'MATRIMONIAL', hombre: 'HOMBRES', mujer: 'MUJERES', presbitero: 'PRESBITEROS', sacerdotes: 'PRESBITEROS', seminaristas: 'PRESBITEROS', familia: 'FAMILIAR' });
  const si = (v) => ['si', 'sí', 'x', '1', 'true', 'verdadero'].includes(limpio(v));
  const filas = [];
  for (let r = filaEnc + 1; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);
    const val = (k) => (mapa[k] ? row.getCell(mapa[k]).text : '');
    if (!String(val('codigo')).trim()) continue;
    const tipoTxt = limpio(val('tipo'));
    filas.push({
      fila: r,
      datos: {
        codigo: val('codigo'), bloque: val('bloque'), piso: val('piso') || 1, capacidad: val('capacidad'),
        tipo: tipoTxt ? (tipos[tipoTxt] || tipoTxt.toUpperCase()) : 'MIXTA',
        accesible: si(val('accesible')), bano_privado: si(val('bano_privado')), notas: val('notas'),
      },
    });
  }
  return filas;
}
