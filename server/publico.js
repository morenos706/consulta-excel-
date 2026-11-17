// Inscripción pública a eventos (sin sesión): consulta del evento, verificación de persona y cónyuge,
// e inscripción con fotografías del documento de identidad.
import express from 'express';
import { query, uno, tx } from './db.js';
import { TIPOS_PERSONA, edad, evaluar } from './reglas.js';
import {
  ruta, fallo, texto, mayus, opcional, bool, identificacion, EMAIL_RE, fechaValida, hoy, limite, imagen, nombreParcial,
} from './util.js';

export const TIPOS_DOCUMENTO = {
  CC: 'Cédula de ciudadanía', CE: 'Cédula de extranjería', PA: 'Pasaporte', TI: 'Tarjeta de identidad', RC: 'Registro civil',
};

export const rutasPublicas = express.Router();

async function eventoPorCodigo(codigo, t = { uno }) {
  const ev = await t.uno(
    `select e.*, s.nombre as sede_nombre, s.direccion as sede_direccion,
            (select count(*)::int from inscripciones i where i.evento_id = e.id and i.estado <> 'CANCELADO') as inscritos
       from eventos e left join sedes s on s.id = e.sede_id
      where upper(e.codigo) = upper($1)`, [texto(codigo, 20)]);
  if (!ev) fallo(404, 'El evento no existe o el enlace no es correcto');
  const limiteFecha = ev.fecha_limite || ev.fecha_fin;
  const lleno = ev.cupo != null && ev.inscritos >= ev.cupo;
  const abierto = ev.activo && hoy() <= limiteFecha && !lleno;
  let motivo = null;
  if (!ev.activo) motivo = 'Las inscripciones para este evento están cerradas';
  else if (hoy() > limiteFecha) motivo = 'La fecha límite de inscripción ya pasó';
  else if (lleno) motivo = 'El evento ya alcanzó el cupo máximo';
  return { ev, abierto, motivo };
}

rutasPublicas.get('/eventos/:codigo', ruta(async (req, res) => {
  const { ev, abierto, motivo } = await eventoPorCodigo(req.params.codigo);
  res.json({
    codigo: ev.codigo, nombre: ev.nombre, tipo: ev.tipo, descripcion: ev.descripcion,
    fecha_inicio: ev.fecha_inicio, fecha_fin: ev.fecha_fin, fecha_limite: ev.fecha_limite || ev.fecha_fin,
    sede: ev.sede_nombre, sede_direccion: ev.sede_direccion, abierto, motivo,
  });
}));

const consultaLimite = limite({ ventanaMs: 10 * 60 * 1000, max: 60 });

/** Indica si la identificación ya está registrada y si tiene documentos (sin exponer datos personales). */
rutasPublicas.get('/eventos/:codigo/persona/:id', consultaLimite, ruta(async (req, res) => {
  const { ev } = await eventoPorCodigo(req.params.codigo);
  const p = await uno('select id, nombre, apellido from personas where identificacion = $1', [identificacion(req.params.id)]);
  if (!p) return res.json({ existe: false });
  const docs = await query(`select titular, lado from documentos where persona_id = $1 group by titular, lado`, [p.id]);
  const tiene = (titular) => ['FRENTE', 'REVERSO'].every((l) => docs.rows.some((d) => d.titular === titular && d.lado === l));
  const ins = await uno('select id from inscripciones where evento_id = $1 and persona_id = $2', [ev.id, p.id]);
  res.json({ existe: true, nombre: nombreParcial(p.nombre, p.apellido), tieneDocumentos: tiene('PERSONA'), tieneDocumentosAcudiente: tiene('ACUDIENTE'), yaInscrito: !!ins });
}));

/** Busca al cónyuge por identificación para vincularlo. */
rutasPublicas.get('/eventos/:codigo/conyuge/:id', consultaLimite, ruta(async (req, res) => {
  const { ev } = await eventoPorCodigo(req.params.codigo);
  const p = await uno('select id, nombre, apellido from personas where identificacion = $1', [identificacion(req.params.id)]);
  if (!p) return res.json({ encontrado: false });
  const ins = await uno('select id, tipo_persona from inscripciones where evento_id = $1 and persona_id = $2 and estado <> $3', [ev.id, p.id, 'CANCELADO']);
  res.json({ encontrado: true, nombre: nombreParcial(p.nombre, p.apellido), inscritoEnEvento: !!ins });
}));

/** Valida el cuerpo de la inscripción. Devuelve los datos normalizados o lanza 400 con el detalle por campo. */
export function validarInscripcion(b, ev) {
  const errores = {};
  const err = (campo, msg) => { errores[campo] ||= msg; };
  const d = {
    documento_tipo: texto(b.documento_tipo, 4).toUpperCase(),
    identificacion: identificacion(b.identificacion),
    nombre: mayus(b.nombre, 80),
    apellido: mayus(b.apellido, 80),
    tipo_persona: mayus(b.tipo_persona, 20).replace('PRESBÍTERO', 'PRESBITERO'),
    fecha_nacimiento: texto(b.fecha_nacimiento, 10),
    sexo: texto(b.sexo, 1).toUpperCase(),
    celular: texto(b.celular, 20).replace(/[\s()-]/g, ''),
    email: texto(b.email, 120).toLowerCase(),
    direccion: mayus(b.direccion, 200),
    comunidad: opcional(mayus(b.comunidad, 120)),
    parroquia: opcional(mayus(b.parroquia, 120)),
    movilidad_reducida: bool(b.movilidad_reducida),
    necesidades: opcional(b.necesidades, 500),
    acepta_politica: bool(b.acepta_politica),
    acepta_cultura: bool(b.acepta_cultura),
    conyuge_pendiente: bool(b.conyuge_pendiente),
    conyuge_identificacion: identificacion(b.conyuge_identificacion) || null,
    usar_documentos_existentes: bool(b.usar_documentos_existentes),
  };
  if (!TIPOS_DOCUMENTO[d.documento_tipo]) err('documento_tipo', 'Seleccione el tipo de documento');
  if (!/^[A-Z0-9-]{4,20}$/.test(d.identificacion)) err('identificacion', 'Escriba una identificación válida (4 a 20 letras o números)');
  if (d.nombre.length < 2) err('nombre', 'Escriba el nombre');
  if (d.apellido.length < 2) err('apellido', 'Escriba el apellido');
  if (!TIPOS_PERSONA.includes(d.tipo_persona)) err('tipo_persona', 'Seleccione el tipo');
  if (!['F', 'M'].includes(d.sexo)) err('sexo', 'Seleccione el género');
  if (!fechaValida(d.fecha_nacimiento) || d.fecha_nacimiento > hoy() || d.fecha_nacimiento < '1900-01-01') err('fecha_nacimiento', 'Escriba una fecha de nacimiento válida');
  if (!/^\+?\d{7,15}$/.test(d.celular)) err('celular', 'Escriba un celular válido (solo números)');
  if (!EMAIL_RE.test(d.email)) err('email', 'Escriba un correo electrónico válido');
  if (d.direccion.length < 4) err('direccion', 'Escriba la dirección');
  if (!d.acepta_politica) err('acepta_politica', 'Debe aceptar la política de tratamiento de datos personales');
  if (!d.acepta_cultura) err('acepta_cultura', 'Debe aceptar la cultura organizacional');

  if (d.tipo_persona === 'HOMBRE SOLO' && d.sexo === 'F') err('tipo_persona', 'El tipo "Hombre solo" no coincide con el género femenino');
  if (d.tipo_persona === 'MUJER SOLA' && d.sexo === 'M') err('tipo_persona', 'El tipo "Mujer sola" no coincide con el género masculino');
  if (['PRESBITERO', 'SEMINARISTA'].includes(d.tipo_persona) && d.sexo === 'F') err('tipo_persona', 'Presbíteros y seminaristas se registran con género masculino');

  d.edad = fechaValida(d.fecha_nacimiento) ? edad(d.fecha_nacimiento, ev.fecha_inicio) : null;
  d.menor = d.edad !== null && d.edad < 18;
  if (d.menor) {
    d.acudiente_tipo = texto(b.acudiente_tipo, 4).toUpperCase();
    d.acudiente_identificacion = identificacion(b.acudiente_identificacion);
    d.acudiente_nombre = mayus(b.acudiente_nombre, 80);
    d.acudiente_apellido = mayus(b.acudiente_apellido, 80);
    d.acudiente_email = texto(b.acudiente_email, 120).toLowerCase();
    d.acudiente_celular = texto(b.acudiente_celular, 20).replace(/[\s()-]/g, '');
    if (!TIPOS_DOCUMENTO[d.acudiente_tipo]) err('acudiente_tipo', 'Seleccione el tipo de documento del acudiente');
    if (!/^[A-Z0-9-]{4,20}$/.test(d.acudiente_identificacion)) err('acudiente_identificacion', 'Escriba la identificación del acudiente');
    if (d.acudiente_identificacion === d.identificacion) err('acudiente_identificacion', 'El acudiente debe ser otra persona');
    if (d.acudiente_nombre.length < 2) err('acudiente_nombre', 'Escriba el nombre del acudiente');
    if (d.acudiente_apellido.length < 2) err('acudiente_apellido', 'Escriba el apellido del acudiente');
    if (!EMAIL_RE.test(d.acudiente_email)) err('acudiente_email', 'Escriba el correo del acudiente');
    if (!/^\+?\d{7,15}$/.test(d.acudiente_celular)) err('acudiente_celular', 'Escriba el celular del acudiente');
    else if (d.acudiente_celular === d.celular) err('acudiente_celular', 'El celular del acudiente no puede ser igual al del menor');
  }
  if (d.tipo_persona === 'MATRIMONIO') {
    if (d.conyuge_pendiente) d.conyuge_identificacion = null;
    else if (!d.conyuge_identificacion) err('conyuge_identificacion', 'Escriba la identificación de su cónyuge o marque que aún no está registrado');
    else if (d.conyuge_identificacion === d.identificacion) err('conyuge_identificacion', 'La identificación del cónyuge no puede ser la suya');
  } else {
    d.conyuge_identificacion = null;
  }
  if (Object.keys(errores).length) fallo(400, 'Revise los campos marcados', { campos: errores });
  return d;
}

const inscripcionLimite = limite({ ventanaMs: 10 * 60 * 1000, max: 20 });

rutasPublicas.post('/eventos/:codigo/inscripcion', inscripcionLimite, ruta(async (req, res) => {
  const b = req.body || {};
  const resultado = await tx(async (t) => {
    const { ev, abierto, motivo } = await eventoPorCodigo(req.params.codigo, t);
    if (!abierto) fallo(409, motivo);
    const d = validarInscripcion(b, ev);

    let persona = await t.uno('select * from personas where identificacion = $1', [d.identificacion]);
    if (persona && await t.uno('select 1 from inscripciones where evento_id = $1 and persona_id = $2', [ev.id, persona.id])) {
      fallo(409, 'Esta persona ya está inscrita en el evento');
    }
    // Documentos: obligatorios salvo que la persona ya los tenga y decida reutilizarlos.
    const docsActuales = persona ? (await t.query('select titular, lado from documentos where persona_id = $1', [persona.id])).rows : [];
    const tiene = (titular) => ['FRENTE', 'REVERSO'].every((l) => docsActuales.some((x) => x.titular === titular && x.lado === l));
    const nuevos = [];
    const pedir = (titular, campoF, campoR, etiqueta) => {
      const reutiliza = d.usar_documentos_existentes && tiene(titular) && !b[campoF] && !b[campoR];
      if (reutiliza) return;
      if (!b[campoF] || !b[campoR]) fallo(400, `Tome la foto del frente y del reverso del ${etiqueta}`, { campos: { [campoF]: 'Requerido' } });
      nuevos.push({ titular, lado: 'FRENTE', ...imagen(b[campoF], `Frente del ${etiqueta}`) });
      nuevos.push({ titular, lado: 'REVERSO', ...imagen(b[campoR], `Reverso del ${etiqueta}`) });
    };
    pedir('PERSONA', 'documento_frente', 'documento_reverso', 'documento de identidad');
    if (d.menor) pedir('ACUDIENTE', 'acudiente_documento_frente', 'acudiente_documento_reverso', 'documento del acudiente');

    const datosPersona = [d.documento_tipo, d.nombre, d.apellido, d.fecha_nacimiento, d.sexo, d.celular, d.email, d.direccion];
    if (persona) {
      persona = await t.uno(`update personas set documento_tipo=$1, nombre=$2, apellido=$3, fecha_nacimiento=$4, sexo=$5, celular=$6,
                               email=$7, direccion=$8, actualizado=now() where id=$9 returning *`, [...datosPersona, persona.id]);
    } else {
      persona = await t.uno(`insert into personas (documento_tipo, nombre, apellido, fecha_nacimiento, sexo, celular, email, direccion, identificacion)
                             values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`, [...datosPersona, d.identificacion]);
    }
    for (const n of nuevos) {
      await t.query('delete from documentos where persona_id = $1 and titular = $2 and lado = $3', [persona.id, n.titular, n.lado]);
      await t.query('insert into documentos (persona_id, titular, lado, mime, datos) values ($1,$2,$3,$4,$5)', [persona.id, n.titular, n.lado, n.mime, n.datos]);
    }

    const ins = await t.uno(
      `insert into inscripciones (evento_id, persona_id, tipo_persona, comunidad, parroquia, movilidad_reducida, necesidades,
         acudiente_tipo, acudiente_identificacion, acudiente_nombre, acudiente_apellido, acudiente_email, acudiente_celular,
         conyuge_identificacion, acepta_politica, acepta_cultura)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *`,
      [ev.id, persona.id, d.tipo_persona, d.comunidad, d.parroquia, d.movilidad_reducida, d.necesidades,
        d.acudiente_tipo || null, d.acudiente_identificacion || null, d.acudiente_nombre || null, d.acudiente_apellido || null,
        d.acudiente_email || null, d.acudiente_celular || null, d.conyuge_identificacion, d.acepta_politica, d.acepta_cultura]);

    const conyuge = d.tipo_persona === 'MATRIMONIO' ? await vincularConyuge(t, ev, ins, persona) : null;
    return { ev, persona, ins, conyuge };
  });

  const { ev, persona, ins, conyuge } = resultado;
  res.status(201).json({
    id: ins.id,
    evento: ev.nombre,
    nombre: `${persona.nombre} ${persona.apellido}`,
    tipo_persona: ins.tipo_persona,
    conyuge: conyuge ? nombreParcial(conyuge.nombre, conyuge.apellido) : null,
    conyugePendiente: ins.tipo_persona === 'MATRIMONIO' && !conyuge,
  });
}));

/**
 * Vincula a los dos cónyuges inscritos en el mismo evento:
 *  · si esta persona indicó la identificación del cónyuge y él ya se inscribió, o
 *  · si otra inscripción del evento indicó la identificación de esta persona como cónyuge.
 * Si el cónyuge ya tiene habitación con cama libre, se acomoda a esta persona con él.
 */
async function vincularConyuge(t, ev, ins, persona) {
  let otro = null;
  if (ins.conyuge_identificacion) {
    otro = await t.uno(`select i.*, p.nombre, p.apellido from inscripciones i join personas p on p.id = i.persona_id
                         where i.evento_id = $1 and p.identificacion = $2 and i.estado <> 'CANCELADO'
                           and i.tipo_persona = 'MATRIMONIO' and i.conyuge_inscripcion_id is null`, [ev.id, ins.conyuge_identificacion]);
  }
  if (!otro) {
    otro = await t.uno(`select i.*, p.nombre, p.apellido from inscripciones i join personas p on p.id = i.persona_id
                         where i.evento_id = $1 and i.conyuge_identificacion = $2 and i.estado <> 'CANCELADO'
                           and i.conyuge_inscripcion_id is null and i.id <> $3 order by i.id limit 1`, [ev.id, persona.identificacion, ins.id]);
  }
  if (!otro) return null;
  const idOtro = await t.uno('select identificacion from personas where id = $1', [otro.persona_id]);
  await t.query('update inscripciones set conyuge_inscripcion_id = $1, conyuge_identificacion = $2 where id = $3', [otro.id, idOtro.identificacion, ins.id]);
  await t.query('update inscripciones set conyuge_inscripcion_id = $1, conyuge_identificacion = $2 where id = $3', [ins.id, persona.identificacion, otro.id]);

  if (otro.habitacion_id) {
    const hab = await t.uno('select * from habitaciones where id = $1', [otro.habitacion_id]);
    const ocupantes = (await t.query(`select i.id, i.estado, i.tipo_persona, i.movilidad_reducida, i.conyuge_inscripcion_id, p.sexo, p.nombre
                                        from inscripciones i join personas p on p.id = i.persona_id
                                       where i.evento_id = $1 and i.habitacion_id = $2`, [ev.id, hab.id])).rows;
    const yo = { id: ins.id, estado: ins.estado, tipo_persona: ins.tipo_persona, movilidad_reducida: ins.movilidad_reducida, conyuge_inscripcion_id: otro.id, sexo: persona.sexo, nombre: persona.nombre };
    const ocup = ocupantes.map((o) => (o.id === otro.id ? { ...o, conyuge_inscripcion_id: ins.id } : o));
    const r = evaluar(hab, [...ocup, yo]);
    if (!r.errores.length && !r.avisos.length) await t.query('update inscripciones set habitacion_id = $1 where id = $2', [hab.id, ins.id]);
  }
  return otro;
}
