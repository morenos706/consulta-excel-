// Lista de eventos y formulario de creación / edición.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, put } from '../api.js';
import { Campo, Cargando, Modal, useToast, fechaRango } from '../ui.jsx';

export function FormEvento({ evento, onCerrar, onGuardado }) {
  const [sedes, setSedes] = useState([]);
  const [f, setF] = useState(() => ({
    nombre: '', tipo: 'CONVIVENCIA', descripcion: '', fecha_inicio: '', fecha_fin: '', fecha_limite: '', sede_id: '', cupo: '', activo: true, codigo: '',
    ...(evento ? { ...evento, sede_id: evento.sede_id ?? '', cupo: evento.cupo ?? '', fecha_limite: evento.fecha_limite ?? '', descripcion: evento.descripcion ?? '' } : {}),
  }));
  const [error, setError] = useState('');
  const toast = useToast();
  useEffect(() => { get('/sedes').then(setSedes); }, []);
  const c = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const guardar = async () => {
    setError('');
    try {
      const datos = { ...f, sede_id: f.sede_id || null, cupo: f.cupo || null, fecha_limite: f.fecha_limite || null };
      const r = evento ? await put(`/eventos/${evento.id}`, datos) : await post('/eventos', datos);
      toast(evento ? 'Evento actualizado' : 'Evento creado');
      onGuardado(r);
    } catch (e) { setError(e.message); }
  };
  return (
    <Modal titulo={evento ? 'Editar evento' : 'Nuevo evento'} onCerrar={onCerrar}
      pie={<><button type="button" className="btn" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primario" onClick={guardar}>Guardar</button></>}>
      <div className="pila">
        <Campo etiqueta="Nombre del evento" requerido><input value={f.nombre} onChange={c('nombre')} placeholder="Ej.: Convivencia del Shemá · 3ª Com. Santa Lucía" /></Campo>
        <div className="rejilla-2">
          <Campo etiqueta="Tipo de evento"><input value={f.tipo} onChange={c('tipo')} placeholder="CONVIVENCIA, SHEMA, RETIRO…" /></Campo>
          <Campo etiqueta="Sede / casa de convivencias" ayuda="Las habitaciones de la sede se usan en la acomodación">
            <select value={f.sede_id} onChange={c('sede_id')}>
              <option value="">— Sin sede —</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.camas} camas)</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Fecha de inicio" requerido><input type="date" value={f.fecha_inicio} onChange={c('fecha_inicio')} /></Campo>
          <Campo etiqueta="Fecha de fin" requerido><input type="date" value={f.fecha_fin} onChange={c('fecha_fin')} /></Campo>
          <Campo etiqueta="Fecha límite de inscripción" ayuda="Si se deja vacía, se permite hasta la fecha de fin"><input type="date" value={f.fecha_limite} onChange={c('fecha_limite')} /></Campo>
          <Campo etiqueta="Cupo máximo" ayuda="Vacío = sin límite"><input type="number" min="1" value={f.cupo} onChange={c('cupo')} /></Campo>
          {!evento && <Campo etiqueta="Código del enlace" ayuda="Opcional. Si se deja vacío se genera uno (8 caracteres)"><input value={f.codigo} onChange={c('codigo')} style={{ textTransform: 'uppercase' }} /></Campo>}
        </div>
        <Campo etiqueta="Descripción / indicaciones para los inscritos"><textarea value={f.descripcion} onChange={c('descripcion')} rows={4} /></Campo>
        <label className="check"><input type="checkbox" checked={f.activo} onChange={c('activo')} /> <span>Inscripciones abiertas</span></label>
        {error && <div className="aviso aviso-error">{error}</div>}
      </div>
    </Modal>
  );
}

export default function Eventos() {
  const [eventos, setEventos] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const cargar = () => get('/eventos').then(setEventos);
  useEffect(() => { cargar(); }, []);
  if (!eventos) return <Cargando />;
  return (
    <>
      <div className="encabezado-pagina">
        <div><h1>Eventos</h1><p className="suave" style={{ margin: 0 }}>Inscripciones y acomodación de cada evento</p></div>
        <button type="button" className="btn btn-primario" onClick={() => setNuevo(true)}>+ Nuevo evento</button>
      </div>
      {!eventos.length && <div className="tarjeta centro pila"><p>Aún no hay eventos.</p><p className="suave">Primero registre la sede y sus habitaciones en <Link to="/admin/sedes">Sedes y habitaciones</Link>, luego cree el evento.</p></div>}
      <div className="lista-eventos">
        {eventos.map((e) => {
          const pct = e.camas ? Math.min(100, Math.round((e.acomodados / e.camas) * 100)) : 0;
          return (
            <Link key={e.id} to={`/admin/eventos/${e.id}`} className="tarjeta evento-tarjeta pila">
              <div className="fila entre">
                <span className="insignia oro">{e.tipo}</span>
                {e.activo ? <span className="insignia ok">Abierto</span> : <span className="insignia">Cerrado</span>}
              </div>
              <h3 style={{ margin: 0 }}>{e.nombre}</h3>
              <div className="pequeno suave">{fechaRango(e.fecha_inicio, e.fecha_fin)} · {e.sede_nombre || 'Sin sede'}</div>
              <div className="fila" style={{ gap: '1.5rem' }}>
                <div><div className="cifra-valor" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--azul)' }}>{e.inscritos}</div><div className="ayuda">inscritos</div></div>
                <div><div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--azul)' }}>{e.acomodados}</div><div className="ayuda">acomodados</div></div>
                <div><div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--azul)' }}>{e.camas}</div><div className="ayuda">camas</div></div>
              </div>
              <div className="barra-progreso" title={`Ocupación ${pct}%`}><div style={{ width: `${pct}%` }} /></div>
            </Link>
          );
        })}
      </div>
      {nuevo && <FormEvento onCerrar={() => setNuevo(false)} onGuardado={() => { setNuevo(false); cargar(); }} />}
    </>
  );
}
