// Reglas de acomodación en habitaciones y asignación automática.
// Las funciones son puras (sin base de datos) para poder probarlas y reutilizarlas.

export const TIPOS_HABITACION = {
  MATRIMONIAL: 'Matrimonial',
  HOMBRES: 'Hombres',
  MUJERES: 'Mujeres',
  FAMILIAR: 'Familiar',
  PRESBITEROS: 'Presbíteros / seminaristas',
  MIXTA: 'Mixta',
};

export const TIPOS_PERSONA = ['HOMBRE SOLO', 'MUJER SOLA', 'MATRIMONIO', 'PRESBITERO', 'SEMINARISTA'];
const CLERO = new Set(['PRESBITERO', 'SEMINARISTA']);

/** Edad en años cumplidos en una fecha (texto AAAA-MM-DD). */
export function edad(nacimiento, fecha) {
  const [a, m, d] = String(nacimiento).slice(0, 10).split('-').map(Number);
  const [fa, fm, fd] = String(fecha).slice(0, 10).split('-').map(Number);
  let e = fa - a;
  if (fm < m || (fm === m && fd < d)) e -= 1;
  return e;
}

/** ¿Todos los ocupantes son parte de un matrimonio cuyo cónyuge también está en la habitación? */
function todosEnPareja(ocupantes) {
  const ids = new Set(ocupantes.map((o) => o.id));
  return ocupantes.every((o) => o.conyuge_inscripcion_id && ids.has(o.conyuge_inscripcion_id));
}

/**
 * Evalúa una habitación con un conjunto de ocupantes.
 * Devuelve { errores, avisos }: los errores impiden la asignación; los avisos requieren confirmación.
 */
export function evaluar(hab, ocupantes) {
  const errores = [];
  const avisos = [];
  const nombre = `Habitación ${hab.codigo}`;
  if (!hab.activa) errores.push(`${nombre} está fuera de servicio`);
  if (ocupantes.length > hab.capacidad) errores.push(`${nombre} tiene capacidad para ${hab.capacidad} y quedaría con ${ocupantes.length}`);
  if (ocupantes.some((o) => o.estado === 'CANCELADO')) errores.push('No se puede acomodar una inscripción cancelada');

  const hayM = ocupantes.some((o) => o.sexo === 'M');
  const hayF = ocupantes.some((o) => o.sexo === 'F');
  switch (hab.tipo) {
    case 'HOMBRES':
      if (hayF) avisos.push(`${nombre} es de hombres y se acomodaría una mujer`);
      break;
    case 'MUJERES':
      if (hayM) avisos.push(`${nombre} es de mujeres y se acomodaría un hombre`);
      break;
    case 'PRESBITEROS':
      if (ocupantes.some((o) => !CLERO.has(o.tipo_persona))) avisos.push(`${nombre} es para presbíteros y seminaristas`);
      break;
    case 'MATRIMONIAL':
      if (!todosEnPareja(ocupantes)) avisos.push(`${nombre} es matrimonial y quedaría con personas sin su cónyuge`);
      break;
    default:
      break;
  }
  // En HOMBRES y MUJERES la mezcla ya genera aviso; en FAMILIAR se admite por diseño.
  if (hayM && hayF && ['MIXTA', 'PRESBITEROS'].includes(hab.tipo) && !todosEnPareja(ocupantes)) {
    avisos.push(`${nombre} quedaría con hombres y mujeres que no son matrimonio`);
  }
  return { errores, avisos };
}

/** Tipos de habitación preferidos, en orden, para una persona sola. */
function preferencias(p) {
  if (CLERO.has(p.tipo_persona)) return ['PRESBITEROS', 'HOMBRES', 'MIXTA'];
  return p.sexo === 'M' ? ['HOMBRES', 'MIXTA', 'FAMILIAR'] : ['MUJERES', 'MIXTA', 'FAMILIAR'];
}

/**
 * Asignación automática.
 * habitaciones: [{ id, codigo, tipo, capacidad, activa, ocupantes: [inscripción, ...] }]
 * pendientes: inscripciones sin habitación (no canceladas).
 * Si un matrimonio quedó separado porque uno de los cónyuges se inscribió tarde, se reúnen en otra habitación
 * (la asignación del cónyuge ya acomodado se marca con reubicado: true).
 * Devuelve { asignaciones: [{ inscripcion_id, habitacion_id, reubicado? }], sinLugar: [{ inscripcion_id, nombre, motivo }] }
 */
export function asignarAutomatico(habitaciones, pendientes) {
  const habs = habitaciones
    .filter((h) => h.activa)
    .map((h) => ({ ...h, ocupantes: [...h.ocupantes] }));
  const porId = new Map(pendientes.map((p) => [p.id, p]));
  const habDe = new Map();
  for (const h of habs) for (const o of h.ocupantes) habDe.set(o.id, h);

  const asignaciones = [];
  const sinLugar = [];
  const hechos = new Set();

  const libre = (h) => h.capacidad - h.ocupantes.length;
  const comunidadComun = (h, grupo) => grupo.some((g) => g.comunidad && h.ocupantes.some((o) => o.comunidad === g.comunidad));

  function valido(h, grupo) {
    if (libre(h) < grupo.length) return false;
    const { errores, avisos } = evaluar(h, [...h.ocupantes, ...grupo]);
    return !errores.length && !avisos.length;
  }

  function colocar(h, grupo) {
    for (const g of grupo) {
      h.ocupantes.push(g);
      habDe.set(g.id, h);
      hechos.add(g.id);
      asignaciones.push({ inscripcion_id: g.id, habitacion_id: h.id });
    }
  }

  /** Elige la mejor habitación entre las candidatas según una función de puntaje (menor es mejor). */
  function elegir(candidatas, grupo, puntaje) {
    const ok = candidatas.filter((h) => valido(h, grupo));
    return ok.sort((a, b) => puntaje(a) - puntaje(b) || a.codigo.localeCompare(b.codigo, 'es', { numeric: true }))[0] || null;
  }

  const puntajePareja = () => (x) => {
    let s = 0;
    if (x.tipo !== 'MATRIMONIAL') s += 100;
    if (x.ocupantes.length) s += 50;            // preferir habitación propia para el matrimonio
    s += (libre(x) - 2) * 5;                     // ajuste exacto
    return s;
  };

  // 1. Matrimonios con ambos cónyuges pendientes o con el cónyuge ya acomodado.
  const parejas = [];
  const solos = [];
  for (const p of pendientes) {
    if (hechos.has(p.id)) continue;
    const c = p.conyuge_inscripcion_id;
    if (c && porId.has(c)) {
      if (p.id < c) parejas.push([p, porId.get(c)]);
    } else if (c && habDe.has(c)) {
      const h = habDe.get(c);
      if (valido(h, [p])) { colocar(h, [p]); continue; }
      // El cónyuge quedó en una habitación donde no cabe la pareja: se reúnen en otra habitación libre.
      const conyuge = h.ocupantes.find((o) => o.id === c);
      const par = [conyuge, p];
      const destino = elegir(habs.filter((x) => x !== h), par, puntajePareja(par));
      if (destino) {
        h.ocupantes = h.ocupantes.filter((o) => o.id !== c);
        destino.ocupantes.push(conyuge);
        habDe.set(c, destino);
        asignaciones.push({ inscripcion_id: c, habitacion_id: destino.id, reubicado: true });
        colocar(destino, [p]);
      } else {
        solos.push(p);
      }
    } else {
      solos.push(p);
    }
  }
  for (const par of parejas) {
    const h = elegir(habs, par, puntajePareja(par));
    if (h) colocar(h, par);
    else for (const p of par) sinLugar.push({ inscripcion_id: p.id, nombre: p.nombre, motivo: 'No hay habitación matrimonial o familiar con 2 camas libres' });
  }

  // 2. Personas solas: primero clero, luego por comunidad.
  solos.sort((a, b) =>
    Number(CLERO.has(b.tipo_persona)) - Number(CLERO.has(a.tipo_persona))
    || (a.comunidad || '~').localeCompare(b.comunidad || '~', 'es')
    || (a.edad ?? 0) - (b.edad ?? 0));
  for (const p of solos) {
    if (hechos.has(p.id)) continue;
    const pref = preferencias(p);
    const candidatas = habs.filter((h) => pref.includes(h.tipo));
    const h = elegir(candidatas, [p], (x) => {
      let s = pref.indexOf(x.tipo) * 100;
      if (comunidadComun(x, [p])) s -= 20;         // mantener juntas a las comunidades
      if (x.ocupantes.length) s -= 10;             // llenar primero habitaciones ya ocupadas
      s += libre(x);                               // mejor ajuste
      return s;
    });
    if (h) colocar(h, [p]);
    else sinLugar.push({ inscripcion_id: p.id, nombre: p.nombre, motivo: `No hay camas libres en habitaciones de tipo ${pref.map((t) => TIPOS_HABITACION[t]).join(' / ')}` });
  }
  return { asignaciones, sinLugar };
}
