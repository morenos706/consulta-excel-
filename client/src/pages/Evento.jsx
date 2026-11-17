// Detalle de un evento: resumen, inscritos y acomodación.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get, put, post, del, descargar } from '../api.js';
import { Campo, Cargando, Modal, useToast, ESTADOS, TIPO_PERSONA, TIPO_DOC, fechaRango } from '../ui.jsx';
import { useUsuario } from './AdminLayout.jsx';
import { FormEvento } from './Eventos.jsx';
import Acomodacion from './Acomodacion.jsx';

const PESTANAS = { resumen: 'Resumen', inscritos: 'Inscritos', acomodacion: 'Acomodación en habitaciones' };

export default function Evento() {
  const { id } = useParams();
  const [q, setQ] = useSearchParams();
  const pestana = PESTANAS[q.get('p')] ? q.get('p') : 'resumen';
  const [ev, setEv] = useState(null);
  const [editar, setEditar] = useState(false);
  const toast = useToast();
  const usuario = useUsuario();
  const ir = useNavigate();
  const cargar = useCallback(() => get(`/eventos/${id}`).then(setEv), [id]);
  useEffect(() => { cargar(); }, [cargar]);
  if (!ev) return <Cargando />;
  const enlace = `${location.origin}/registro/${ev.codigo}`;
  const copiar = async () => { try { await navigator.clipboard.writeText(enlace); toast('Enlace copiado'); } catch { toast(enlace); } };
  const eliminar = async () => {
    if (!confirm(`¿Eliminar el evento "${ev.nombre}" con sus ${ev.inscritos} inscripciones? Esta acción no se puede deshacer.`)) return;
    await del(`/eventos/${ev.id}`);
    toast('Evento eliminado');
    ir('/admin');
  };
  return (
    <>
      <div className="encabezado-pagina no-imprimir">
        <div style={{ minWidth: 0 }}>
          <div className="pequeno"><Link to="/admin">← Eventos</Link></div>
          <h1>{ev.nombre}</h1>
          <div className="fila pequeno suave">
            <span className="insignia oro">{ev.tipo}</span>
            <span>{fechaRango(ev.fecha_inicio, ev.fecha_fin)}</span>·<span>{ev.sede_nombre || 'Sin sede'}</span>·
            {ev.activo ? <span className="insignia ok">Inscripciones abiertas</span> : <span className="insignia">Inscripciones cerradas</span>}
          </div>
        </div>
        <div className="fila">
          <button type="button" className="btn" onClick={() => setEditar(true)}>Editar</button>
          {usuario.rol === 'admin' && <button type="button" className="btn btn-peligro" onClick={eliminar}>Eliminar</button>}
        </div>
      </div>
      <div className="tarjeta fila no-imprimir" style={{ marginBottom: '1.25rem', padding: '.75rem 1rem' }}>
        <span className="etiqueta">Enlace de inscripción:</span>
        <a href={enlace} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{enlace}</a>
        <span className="espacio" />
        <button type="button" className="btn btn-chico" onClick={copiar}>Copiar enlace</button>
      </div>
      <div className="pestanas">
        {Object.entries(PESTANAS).map(([k, v]) => <button key={k} type="button" className={pestana === k ? 'activo' : ''} onClick={() => setQ({ p: k })}>{v}</button>)}
      </div>
      {pestana === 'resumen' && <Resumen ev={ev} />}
      {pestana === 'inscritos' && <Inscritos ev={ev} onCambio={cargar} />}
      {pestana === 'acomodacion' && <Acomodacion ev={ev} onCambio={cargar} />}
      {editar && <FormEvento evento={ev} onCerrar={() => setEditar(false)} onGuardado={() => { setEditar(false); cargar(); }} />}
    </>
  );
}

function Resumen({ ev }) {
  const [a, setA] = useState(null);
  useEffect(() => { get(`/eventos/${ev.id}/acomodacion`).then(setA); }, [ev.id]);
  if (!a) return <Cargando />;
  const r = a.resumen;
  const cifra = (valor, rotulo, extra) => <div className="cifra"><div className="valor">{valor}</div><div className="rotulo">{rotulo}</div>{extra}</div>;
  const pct = r.camas ? Math.round((r.acomodados / r.camas) * 100) : 0;
  return (
    <div className="pila">
      <div className="cifras">
        {cifra(r.inscritos, 'Inscritos activos', ev.cupo && <div className="ayuda">Cupo: {ev.cupo}</div>)}
        {cifra(r.acomodados, 'Con habitación')}
        {cifra(r.sinAsignar, 'Sin habitación')}
        {cifra(r.camas, 'Camas en la sede', <div className="barra-progreso"><div style={{ width: `${Math.min(100, pct)}%` }} /></div>)}
        {cifra(r.camasLibres, 'Camas libres')}
        {cifra(r.habitacionesConAlertas, 'Habitaciones con alertas')}
      </div>
      <div className="rejilla-2">
        <div className="tarjeta">
          <h3>Por tipo de participante</h3>
          <table><tbody>
            {r.porTipo.map((t) => <tr key={t.tipo}><td>{TIPO_PERSONA[t.tipo]}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{t.total}</td></tr>)}
            <tr><td>Mujeres / Hombres</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{r.porSexo.F} / {r.porSexo.M}</td></tr>
          </tbody></table>
        </div>
        <div className="tarjeta">
          <h3>Atención especial</h3>
          <table><tbody>
            <tr><td>Menores de edad (con acudiente)</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{r.menores}</td></tr>
            <tr><td>Matrimonios con cónyuge sin vincular</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{r.matrimoniosPendientes}</td></tr>
          </tbody></table>
          {!ev.sede_id && <div className="aviso aviso-alerta" style={{ marginTop: '1rem' }}>El evento no tiene sede. Edítelo y elija una para poder acomodar en habitaciones.</div>}
        </div>
      </div>
    </div>
  );
}

function Inscritos({ ev, onCambio }) {
  const [lista, setLista] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [hab, setHab] = useState('');
  const [detalle, setDetalle] = useState(null);
  const cargar = useCallback(() => get(`/eventos/${ev.id}/inscripciones`).then(setLista), [ev.id]);
  useEffect(() => { cargar(); }, [cargar]);
  const filtrados = useMemo(() => {
    if (!lista) return [];
    const b = buscar.trim().toLocaleLowerCase('es');
    return lista.filter((i) => (!b || `${i.nombre} ${i.apellido} ${i.identificacion} ${i.comunidad || ''} ${i.celular}`.toLocaleLowerCase('es').includes(b))
      && (!tipo || i.tipo_persona === tipo)
      && (!estado ? i.estado !== 'CANCELADO' : estado === 'TODOS' || i.estado === estado)
      && (!hab || (hab === 'si' ? i.habitacion_id : !i.habitacion_id)));
  }, [lista, buscar, tipo, estado, hab]);
  if (!lista) return <Cargando />;
  return (
    <>
      <div className="fila" style={{ marginBottom: '1rem' }}>
        <input placeholder="Buscar por nombre, identificación, comunidad…" value={buscar} onChange={(e) => setBuscar(e.target.value)} style={{ flex: '1 1 260px' }} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_PERSONA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Activos</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}
          <option value="TODOS">Todos</option>
        </select>
        <select value={hab} onChange={(e) => setHab(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Con y sin habitación</option>
          <option value="si">Con habitación</option>
          <option value="no">Sin habitación</option>
        </select>
        <button type="button" className="btn" onClick={() => descargar(`/eventos/${ev.id}/exportar/inscritos`)}>⬇ Excel</button>
      </div>
      <p className="pequeno suave">{filtrados.length} de {lista.length} inscripciones</p>
      <div className="tabla-envoltura">
        <table>
          <thead><tr><th>Persona</th><th>Identificación</th><th>Tipo</th><th>Edad</th><th>Comunidad</th><th>Cónyuge</th><th>Habitación</th><th>Estado</th></tr></thead>
          <tbody>
            {filtrados.map((i) => (
              <tr key={i.id} className="clic" onClick={() => setDetalle(i.id)}>
                <td><strong>{i.apellido} {i.nombre}</strong><div className="pequeno suave">{i.celular}</div></td>
                <td>{i.documento_tipo} {i.identificacion}</td>
                <td>{TIPO_PERSONA[i.tipo_persona]}<div className="pequeno suave">{i.sexo === 'F' ? 'Femenino' : 'Masculino'}</div></td>
                <td>{i.edad}{i.edad < 18 && <> <span className="insignia alerta">Menor</span></>}</td>
                <td>{i.comunidad}</td>
                <td>{i.conyuge_nombre ? `${i.conyuge_nombre} ${i.conyuge_apellido}` : i.tipo_persona === 'MATRIMONIO' && <span className="insignia alerta">Sin vincular</span>}</td>
                <td>{i.habitacion_codigo ? <strong>{i.habitacion_codigo}</strong> : <span className="suave">—</span>}</td>
                <td><span className={`insignia ${ESTADOS[i.estado].c}`}>{ESTADOS[i.estado].t}</span></td>
              </tr>
            ))}
            {!filtrados.length && <tr><td colSpan={8} className="centro suave">No hay inscripciones con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      {detalle && <DetalleInscripcion id={detalle} lista={lista} onCerrar={() => setDetalle(null)} onGuardado={() => { cargar(); onCambio(); }} />}
    </>
  );
}

function DetalleInscripcion({ id, lista, onCerrar, onGuardado }) {
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [conyuge, setConyuge] = useState('');
  const toast = useToast();
  const usuario = useUsuario();
  const cargar = useCallback(() => get(`/inscripciones/${id}`).then((x) => {
    setD(x);
    setConyuge(x.conyuge_inscripcion_id ? String(x.conyuge_inscripcion_id) : '');
    setF({ estado: x.estado, tipo_persona: x.tipo_persona, comunidad: x.comunidad || '', parroquia: x.parroquia || '', necesidades: x.necesidades || '', observaciones: x.observaciones || '', nombre: x.nombre, apellido: x.apellido, celular: x.celular, email: x.email, sexo: x.sexo });
  }), [id]);
  useEffect(() => { cargar(); }, [cargar]);
  if (!d || !f) return <Modal titulo="Inscripción" onCerrar={onCerrar}><Cargando /></Modal>;
  const c = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const guardar = async () => {
    setError('');
    try {
      await put(`/inscripciones/${id}`, f);
      if (String(d.conyuge_inscripcion_id || '') !== conyuge) await post(`/inscripciones/${id}/conyuge`, { conyuge_inscripcion_id: conyuge ? Number(conyuge) : null });
      toast('Inscripción actualizada');
      onGuardado();
      onCerrar();
    } catch (e) { setError(e.message); }
  };
  const eliminar = async () => {
    if (!confirm(`¿Eliminar definitivamente la inscripción de ${d.nombre} ${d.apellido}? Para conservar el registro, mejor márquela como cancelada.`)) return;
    await del(`/inscripciones/${id}`);
    toast('Inscripción eliminada');
    onGuardado(); onCerrar();
  };
  const docs = (titular) => ['FRENTE', 'REVERSO'].filter((l) => d.documentos.some((x) => x.titular === titular && x.lado === l));
  const candidatos = lista.filter((x) => x.id !== d.id && x.estado !== 'CANCELADO' && x.sexo !== f.sexo);
  return (
    <Modal ancho titulo={`${d.nombre} ${d.apellido}`} onCerrar={onCerrar}
      pie={<>
        {usuario.rol === 'admin' && <button type="button" className="btn btn-peligro" onClick={eliminar} style={{ marginRight: 'auto' }}>Eliminar</button>}
        <button type="button" className="btn" onClick={onCerrar}>Cerrar</button>
        <button type="button" className="btn btn-primario" onClick={guardar}>Guardar cambios</button>
      </>}>
      <div className="pila">
        <div className="fila pequeno suave">
          <span>{TIPO_DOC[d.documento_tipo]} <strong>{d.identificacion}</strong></span>·
          <span>Nació el {d.fecha_nacimiento} ({d.edad} años)</span>·
          <span>Inscrito el {new Date(d.creado).toLocaleString('es-CO')}</span>
        </div>
        <div className="rejilla">
          <Campo etiqueta="Estado"><select value={f.estado} onChange={c('estado')}>{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}</select></Campo>
          <Campo etiqueta="Tipo"><select value={f.tipo_persona} onChange={c('tipo_persona')}>{Object.entries(TIPO_PERSONA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
          <Campo etiqueta="Nombres"><input value={f.nombre} onChange={c('nombre')} /></Campo>
          <Campo etiqueta="Apellidos"><input value={f.apellido} onChange={c('apellido')} /></Campo>
          <Campo etiqueta="Género"><select value={f.sexo} onChange={c('sexo')}><option value="F">Femenino</option><option value="M">Masculino</option></select></Campo>
          <Campo etiqueta="Celular"><input value={f.celular} onChange={c('celular')} /></Campo>
          <Campo etiqueta="Correo"><input value={f.email} onChange={c('email')} /></Campo>
          <Campo etiqueta="Comunidad"><input value={f.comunidad} onChange={c('comunidad')} /></Campo>
          <Campo etiqueta="Parroquia"><input value={f.parroquia} onChange={c('parroquia')} /></Campo>
        </div>
        <div className="pequeno"><span className="etiqueta">Dirección: </span>{d.direccion}</div>
        {f.tipo_persona === 'MATRIMONIO' && (
          <Campo etiqueta="Cónyuge vinculado" ayuda={!d.conyuge_inscripcion_id && d.conyuge_identificacion ? `Indicó la identificación ${d.conyuge_identificacion}, que aún no se ha inscrito` : 'Vincule manualmente si su cónyuge se inscribió sin indicarlo'}>
            <select value={conyuge} onChange={(e) => setConyuge(e.target.value)}>
              <option value="">— Sin vincular —</option>
              {candidatos.map((x) => <option key={x.id} value={x.id}>{x.apellido} {x.nombre} · {x.identificacion}</option>)}
            </select>
          </Campo>
        )}
        <div className="rejilla-2">
          <Campo etiqueta="Salud / necesidades especiales"><textarea value={f.necesidades} onChange={c('necesidades')} /></Campo>
          <Campo etiqueta="Observaciones internas"><textarea value={f.observaciones} onChange={c('observaciones')} /></Campo>
        </div>
        {d.acudiente_nombre && (
          <div className="aviso aviso-alerta">
            <strong>Acudiente:</strong> {d.acudiente_nombre} {d.acudiente_apellido} · {d.acudiente_tipo} {d.acudiente_identificacion} · {d.acudiente_celular} · {d.acudiente_email}
          </div>
        )}
        <div>
          <div className="etiqueta" style={{ marginBottom: '.5rem' }}>Documento de identidad</div>
          <div className="fila" style={{ alignItems: 'flex-start' }}>
            {docs('PERSONA').map((l) => <a key={l} href={`/api/inscripciones/${id}/documento/persona/${l}`} target="_blank" rel="noreferrer"><img src={`/api/inscripciones/${id}/documento/persona/${l}`} alt={`Documento ${l}`} style={{ height: 130, borderRadius: 6, border: '1px solid var(--borde)' }} /></a>)}
            {docs('ACUDIENTE').map((l) => <a key={l} href={`/api/inscripciones/${id}/documento/acudiente/${l}`} target="_blank" rel="noreferrer" title="Documento del acudiente"><img src={`/api/inscripciones/${id}/documento/acudiente/${l}`} alt={`Acudiente ${l}`} style={{ height: 130, borderRadius: 6, border: '2px solid var(--alerta)' }} /></a>)}
            {!d.documentos.length && <span className="suave">Sin documentos</span>}
          </div>
        </div>
        {!!d.otrosEventos.length && <div className="pequeno suave">También asistió a: {d.otrosEventos.map((e) => e.nombre).join(' · ')}</div>}
        {error && <div className="aviso aviso-error">{error}</div>}
      </div>
    </Modal>
  );
}
