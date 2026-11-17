// Tablero de acomodación: arrastrar personas a habitaciones, selección múltiple (celular) y asignación automática.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, descargar } from '../api.js';
import { Cargando, Modal, useToast, TIPO_HAB, TIPO_PERSONA, fechaRango } from '../ui.jsx';

const COLORES = { MATRIMONIAL: 'var(--oro)', HOMBRES: 'var(--hombre)', MUJERES: 'var(--mujer)', FAMILIAR: '#4f9a6b', PRESBITEROS: '#6b4fa0', MIXTA: '#8a8f98' };

function Chip({ p, seleccionado, onClic, onQuitar, onArrastrar }) {
  return (
    <div
      className={`chip ${p.sexo} ${seleccionado ? 'seleccionado' : ''}`}
      draggable
      onDragStart={(e) => onArrastrar(e, p)}
      onClick={() => onClic(p)}
      title={`${p.apellido} ${p.nombre} · ${TIPO_PERSONA[p.tipo_persona]} · ${p.edad} años${p.comunidad ? ` · ${p.comunidad}` : ''}${p.necesidades ? `\n${p.necesidades}` : ''}`}
    >
      <span className="nombre">{p.nombre.split(' ')[0]} {p.apellido}</span>
      <span className="marcas">
        {p.tipo_persona === 'MATRIMONIO' && <span className={`marca-m ${p.conyuge_inscripcion_id ? 'pareja' : ''}`} title={p.conyuge_nombre ? `Cónyuge: ${p.conyuge_nombre} ${p.conyuge_apellido}` : 'Cónyuge sin vincular'}>Mat</span>}
        {['PRESBITERO', 'SEMINARISTA'].includes(p.tipo_persona) && <span className="marca-m" title={TIPO_PERSONA[p.tipo_persona]}>{p.tipo_persona === 'PRESBITERO' ? 'Pbro' : 'Sem'}</span>}
        {p.edad < 18 && <span className="marca-m menor" title="Menor de edad">{p.edad}</span>}
        {p.movilidad_reducida && <span className="marca-m mov" title="Movilidad reducida">♿</span>}
      </span>
      {onQuitar && <button type="button" className="btn btn-icono btn-chico" onClick={(e) => { e.stopPropagation(); onQuitar(p); }} title="Retirar de la habitación" aria-label="Retirar">✕</button>}
    </div>
  );
}

export default function Acomodacion({ ev, onCambio }) {
  const [a, setA] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [conConyuge, setConConyuge] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [soloLibres, setSoloLibres] = useState(false);
  const [sobre, setSobre] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState(null);
  const toast = useToast();

  const cargar = useCallback(() => get(`/eventos/${ev.id}/acomodacion`).then(setA), [ev.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const todos = useMemo(() => (a ? [...a.sinAsignar, ...a.habitaciones.flatMap((h) => h.ocupantes)] : []), [a]);
  const porId = useMemo(() => new Map(todos.map((p) => [p.id, p])), [todos]);

  /** Agrega al cónyuge cuando está en el mismo lugar que la persona movida. */
  const conPareja = (ids) => {
    if (!conConyuge) return ids;
    const out = new Set(ids);
    for (const id of ids) {
      const p = porId.get(id);
      const c = p?.conyuge_inscripcion_id && porId.get(p.conyuge_inscripcion_id);
      if (c && (c.habitacion_id || null) === (p.habitacion_id || null)) out.add(c.id);
    }
    return [...out];
  };

  const mover = async (ids, habitacionId) => {
    if (!ids.length || ocupado) return;
    const lista = conPareja(ids);
    setOcupado(true);
    try {
      try {
        await post(`/eventos/${ev.id}/acomodacion/asignar`, { inscripcion_ids: lista, habitacion_id: habitacionId });
      } catch (e) {
        if (!e.requiereConfirmacion) throw e;
        if (!confirm(`Atención:\n\n• ${e.avisos.join('\n• ')}\n\n¿Desea hacer la asignación de todas formas?`)) return;
        await post(`/eventos/${ev.id}/acomodacion/asignar`, { inscripcion_ids: lista, habitacion_id: habitacionId, forzar: true });
      }
      setSel(new Set());
      await cargar();
      onCambio?.();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setOcupado(false);
    }
  };

  const alArrastrar = (e, p) => {
    const ids = sel.has(p.id) ? [...sel] : [p.id];
    e.dataTransfer.setData('text/plain', JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'move';
  };
  const zona = (clave, habitacionId) => ({
    onDragOver: (e) => { e.preventDefault(); setSobre(clave); },
    onDragLeave: () => setSobre((s) => (s === clave ? null : s)),
    onDrop: (e) => {
      e.preventDefault(); setSobre(null);
      try { mover(JSON.parse(e.dataTransfer.getData('text/plain')), habitacionId); } catch { /* no era una persona */ }
    },
  });
  const alternar = (p) => setSel((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; });

  const automatica = async () => {
    if (!confirm('La asignación automática acomodará a todas las personas que aún no tienen habitación, respetando matrimonios, género, presbíteros, movilidad reducida y comunidades. Las asignaciones actuales no se modifican, salvo para reunir a un matrimonio que haya quedado separado. ¿Continuar?')) return;
    setOcupado(true);
    try {
      const r = await post(`/eventos/${ev.id}/acomodacion/automatica`);
      setResultado(r);
      await cargar(); onCambio?.();
    } catch (e) { toast(e.message, 'error'); } finally { setOcupado(false); }
  };
  const vaciar = async (h) => {
    const msg = h ? `¿Retirar a todas las personas de la habitación ${h.codigo}?` : '¿Retirar a TODAS las personas de sus habitaciones? Tendrá que volver a acomodarlas.';
    if (!confirm(msg)) return;
    await post(`/eventos/${ev.id}/acomodacion/vaciar`, h ? { habitacion_id: h.id } : {});
    await cargar(); onCambio?.();
  };

  if (!a) return <Cargando />;
  if (!ev.sede_id) {
    return <div className="aviso aviso-alerta">Este evento no tiene sede. Use <strong>Editar</strong> arriba para elegir la casa de convivencias y así poder acomodar en sus habitaciones.</div>;
  }
  if (!a.habitaciones.length) {
    return <div className="aviso aviso-alerta">La sede <strong>{ev.sede_nombre}</strong> no tiene habitaciones registradas. Regístrelas en <Link to="/admin/sedes">Sedes y habitaciones</Link>.</div>;
  }

  const b = buscar.trim().toLocaleLowerCase('es');
  const pendientes = a.sinAsignar.filter((p) => !b || `${p.nombre} ${p.apellido} ${p.identificacion} ${p.comunidad || ''}`.toLocaleLowerCase('es').includes(b));
  const habs = a.habitaciones.filter((h) => (!filtroTipo || h.tipo === filtroTipo) && (!soloLibres || (h.activa && h.ocupantes.length < h.capacidad)));
  const grupos = [];
  for (const h of habs) {
    const k = `${h.bloque ? `Bloque ${h.bloque} · ` : ''}Piso ${h.piso}`;
    if (!grupos.length || grupos[grupos.length - 1].k !== k) grupos.push({ k, habs: [] });
    grupos[grupos.length - 1].habs.push(h);
  }
  const r = a.resumen;

  return (
    <>
      <div className="fila no-imprimir" style={{ marginBottom: '1rem' }}>
        <span className="insignia azul">{r.acomodados} de {r.inscritos} acomodados</span>
        <span className="insignia">{r.camasLibres} camas libres de {r.camas}</span>
        {r.habitacionesConAlertas > 0 && <span className="insignia error">{r.habitacionesConAlertas} habitaciones con alertas</span>}
        <span className="espacio" />
        <button type="button" className="btn btn-oro" onClick={automatica} disabled={ocupado || !r.sinAsignar}>✨ Asignación automática</button>
        <button type="button" className="btn" onClick={() => descargar(`/eventos/${ev.id}/exportar/acomodacion`)}>⬇ Excel</button>
        <button type="button" className="btn" onClick={() => window.print()}>🖨 Imprimir</button>
        <button type="button" className="btn btn-peligro" onClick={() => vaciar(null)} disabled={!r.acomodados}>Vaciar todo</button>
      </div>

      <div className="tablero no-imprimir">
        <div className="tarjeta panel-pendientes" style={{ padding: '.9rem' }}>
          <div className="fila entre" style={{ marginBottom: '.5rem' }}>
            <h3 style={{ margin: 0 }}>Sin habitación ({a.sinAsignar.length})</h3>
            {sel.size > 0 && <button type="button" className="btn btn-chico" onClick={() => setSel(new Set())}>Quitar selección</button>}
          </div>
          <input placeholder="Buscar…" value={buscar} onChange={(e) => setBuscar(e.target.value)} style={{ marginBottom: '.5rem' }} />
          <label className="check pequeno" style={{ marginBottom: '.5rem' }}>
            <input type="checkbox" checked={conConyuge} onChange={(e) => setConConyuge(e.target.checked)} />
            <span>Mover matrimonios juntos</span>
          </label>
          <div className={`lista ${sobre === 'pendientes' ? 'sobre' : ''}`} {...zona('pendientes', null)}>
            {pendientes.map((p) => <Chip key={p.id} p={p} seleccionado={sel.has(p.id)} onClic={alternar} onArrastrar={alArrastrar} />)}
            {!a.sinAsignar.length && <div className="aviso aviso-ok pequeno">¡Todas las personas tienen habitación!</div>}
          </div>
          <p className="ayuda" style={{ marginTop: '.5rem', marginBottom: 0 }}>Arrastre a una habitación, o toque varias personas y luego “Asignar aquí”. Arrastre aquí para retirar.</p>
        </div>

        <div>
          <div className="fila" style={{ marginBottom: '.75rem' }}>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Todos los tipos de habitación</option>
              {Object.entries(TIPO_HAB).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="check pequeno"><input type="checkbox" checked={soloLibres} onChange={(e) => setSoloLibres(e.target.checked)} /> <span>Solo con camas libres</span></label>
            <span className="espacio" />
            <div className="leyenda">{Object.entries(TIPO_HAB).map(([k, v]) => <span key={k} style={{ '--c': COLORES[k] }}>{v}</span>)}</div>
          </div>
          <div className="habitaciones">
            {grupos.map((g) => (
              <Grupo key={g.k} titulo={g.k}>
                {g.habs.map((h) => {
                  const llena = h.ocupantes.length >= h.capacidad;
                  return (
                    <div key={h.id} className={`hab t-${h.tipo} ${llena ? 'llena' : ''} ${h.activa ? '' : 'inactiva'} ${h.alertas.length ? 'con-alerta' : ''} ${sobre === h.id ? 'sobre' : ''}`} {...zona(h.id, h.id)}>
                      <div className="hab-cab">
                        <span className="hab-codigo">{h.codigo}</span>
                        <span className="pequeno suave">{TIPO_HAB[h.tipo]}</span>
                        <span className="espacio" />
                        {h.accesible && <span title="Accesible">♿</span>}
                        {h.bano_privado && <span title="Baño privado">🚿</span>}
                        <strong className="pequeno">{h.ocupantes.length}/{h.capacidad}</strong>
                      </div>
                      <div className="camas">{Array.from({ length: h.capacidad }, (_, i) => <span key={i} className={`cama ${i < h.ocupantes.length ? 'ocupada' : ''}`} />)}</div>
                      {!h.activa && <div className="pequeno suave">Fuera de servicio</div>}
                      {h.ocupantes.map((p) => <Chip key={p.id} p={p} seleccionado={sel.has(p.id)} onClic={alternar} onArrastrar={alArrastrar} onQuitar={(x) => mover([x.id], null)} />)}
                      {!h.ocupantes.length && h.activa && <div className="hab-vacia">Vacía · suelte aquí</div>}
                      {!!h.alertas.length && <div className="hab-alertas">⚠ {h.alertas.join('. ')}</div>}
                      <div className="fila">
                        {sel.size > 0 && h.activa && !llena && <button type="button" className="btn btn-chico btn-primario" onClick={() => mover([...sel], h.id)} disabled={ocupado}>Asignar aquí ({conPareja([...sel]).length})</button>}
                        {h.notas && <span className="pequeno suave" title={h.notas}>📝</span>}
                        <span className="espacio" />
                        {h.ocupantes.length > 1 && <button type="button" className="btn btn-icono btn-chico" onClick={() => vaciar(h)} title="Vaciar habitación">Vaciar</button>}
                      </div>
                    </div>
                  );
                })}
              </Grupo>
            ))}
          </div>
        </div>
      </div>

      <Impresion ev={ev} a={a} />

      {resultado && (
        <Modal titulo="Resultado de la asignación automática" onCerrar={() => setResultado(null)} pie={<button type="button" className="btn btn-primario" onClick={() => setResultado(null)}>Entendido</button>}>
          <div className="pila">
            <div className="aviso aviso-ok">{resultado.asignadas === 1 ? <><strong>1</strong> persona fue acomodada.</> : <><strong>{resultado.asignadas}</strong> personas fueron acomodadas.</>}</div>
            {resultado.reubicadas > 0 && <div className="aviso aviso-info">{resultado.reubicadas === 1 ? '1 persona se cambió' : `${resultado.reubicadas} personas se cambiaron`} de habitación para quedar junto a su cónyuge.</div>}
            {resultado.sinLugar.length > 0 && (
              <>
                <div className="aviso aviso-alerta"><strong>{resultado.sinLugar.length}</strong> personas quedaron sin habitación. Acomódelas manualmente o agregue habitaciones.</div>
                <ul className="pequeno">{resultado.sinLugar.map((s) => <li key={s.inscripcion_id}><strong>{s.nombre}</strong>: {s.motivo}</li>)}</ul>
              </>
            )}
            <p className="suave pequeno">Revise el tablero: puede mover a cualquier persona arrastrándola.</p>
          </div>
        </Modal>
      )}
    </>
  );
}

function Grupo({ titulo, children }) {
  return (<><div className="grupo-piso">{titulo}</div>{children}</>);
}

/** Listado para imprimir y pegar en la casa de convivencias. */
function Impresion({ ev, a }) {
  return (
    <div className="solo-impresion">
      <h2>Acomodación · {ev.nombre}</h2>
      <p>{ev.sede_nombre} · {fechaRango(ev.fecha_inicio, ev.fecha_fin)} · {a.resumen.acomodados} personas acomodadas</p>
      <div className="impresion-rejilla">
        {a.habitaciones.filter((h) => h.ocupantes.length).map((h) => (
          <div key={h.id} className="impresion-hab">
            <h4>Habitación {h.codigo} <small>({TIPO_HAB[h.tipo]}{h.bloque ? ` · Bloque ${h.bloque}` : ''} · Piso {h.piso})</small></h4>
            <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>{h.ocupantes.map((p) => <li key={p.id}>{p.apellido} {p.nombre}{p.comunidad ? ` — ${p.comunidad}` : ''}</li>)}</ol>
          </div>
        ))}
      </div>
      {a.sinAsignar.length > 0 && <><h3>Sin habitación</h3><p>{a.sinAsignar.map((p) => `${p.apellido} ${p.nombre}`).join(' · ')}</p></>}
    </div>
  );
}
