// Sedes (casas de convivencia) y su inventario de habitaciones.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get, post, put, del, leerArchivo } from '../api.js';
import { Campo, Cargando, Modal, useToast, TIPO_HAB } from '../ui.jsx';
import { useUsuario } from './AdminLayout.jsx';

function FormSede({ sede, onCerrar, onGuardado }) {
  const [f, setF] = useState({ nombre: sede?.nombre || '', direccion: sede?.direccion || '', descripcion: sede?.descripcion || '' });
  const [error, setError] = useState('');
  const guardar = async () => {
    try { onGuardado(sede ? await put(`/sedes/${sede.id}`, f) : await post('/sedes', f)); } catch (e) { setError(e.message); }
  };
  return (
    <Modal titulo={sede ? 'Editar sede' : 'Nueva sede'} onCerrar={onCerrar} pie={<><button type="button" className="btn" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primario" onClick={guardar}>Guardar</button></>}>
      <div className="pila">
        <Campo etiqueta="Nombre" requerido><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej.: Casa de Convivencias Nazaret" autoFocus /></Campo>
        <Campo etiqueta="Dirección"><input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></Campo>
        <Campo etiqueta="Descripción"><textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
        {error && <div className="aviso aviso-error">{error}</div>}
      </div>
    </Modal>
  );
}

const HAB_VACIA = { codigo: '', bloque: '', piso: 1, capacidad: 2, tipo: 'MIXTA', accesible: false, bano_privado: false, activa: true, notas: '' };

function CamposHabitacion({ f, setF, lote }) {
  const c = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div className="pila">
      <div className="rejilla">
        {lote ? (
          <>
            <Campo etiqueta="Prefijo" ayuda="Opcional, ej. A- o C"><input value={f.prefijo} onChange={c('prefijo')} /></Campo>
            <Campo etiqueta="Desde el número" requerido><input type="number" value={f.desde} onChange={c('desde')} /></Campo>
            <Campo etiqueta="Hasta el número" requerido><input type="number" value={f.hasta} onChange={c('hasta')} /></Campo>
          </>
        ) : <Campo etiqueta="Número / nombre" requerido><input value={f.codigo} onChange={c('codigo')} autoFocus /></Campo>}
        <Campo etiqueta="Bloque / casa" ayuda="Opcional"><input value={f.bloque} onChange={c('bloque')} /></Campo>
        <Campo etiqueta="Piso"><input type="number" value={f.piso} onChange={c('piso')} /></Campo>
        <Campo etiqueta="Camas (capacidad)" requerido><input type="number" min="1" max="50" value={f.capacidad} onChange={c('capacidad')} /></Campo>
        <Campo etiqueta="Tipo de habitación" ayuda="Define a quién se acomoda aquí">
          <select value={f.tipo} onChange={c('tipo')}>{Object.entries(TIPO_HAB).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Campo>
      </div>
      <div className="fila" style={{ gap: '1.5rem' }}>
        <label className="check"><input type="checkbox" checked={f.accesible} onChange={c('accesible')} /><span>♿ Accesible (movilidad reducida)</span></label>
        <label className="check"><input type="checkbox" checked={f.bano_privado} onChange={c('bano_privado')} /><span>🚿 Baño privado</span></label>
        {!lote && <label className="check"><input type="checkbox" checked={f.activa} onChange={c('activa')} /><span>En servicio</span></label>}
      </div>
      {!lote && <Campo etiqueta="Notas"><input value={f.notas || ''} onChange={c('notas')} placeholder="Ej.: cama doble + cama sencilla" /></Campo>}
    </div>
  );
}

function FormHabitacion({ sedeId, hab, onCerrar, onGuardado }) {
  const [f, setF] = useState(hab ? { ...hab, notas: hab.notas || '' } : HAB_VACIA);
  const [error, setError] = useState('');
  const guardar = async () => {
    try { await (hab ? put(`/habitaciones/${hab.id}`, f) : post(`/sedes/${sedeId}/habitaciones`, f)); onGuardado(); } catch (e) { setError(e.message); }
  };
  return (
    <Modal titulo={hab ? `Habitación ${hab.codigo}` : 'Nueva habitación'} onCerrar={onCerrar} pie={<><button type="button" className="btn" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primario" onClick={guardar}>Guardar</button></>}>
      <CamposHabitacion f={f} setF={setF} />
      {error && <div className="aviso aviso-error" style={{ marginTop: '1rem' }}>{error}</div>}
    </Modal>
  );
}

function FormLote({ sedeId, onCerrar, onGuardado }) {
  const [f, setF] = useState({ ...HAB_VACIA, prefijo: '', desde: 101, hasta: 110 });
  const [error, setError] = useState('');
  const toast = useToast();
  const guardar = async () => {
    try {
      const r = await post(`/sedes/${sedeId}/habitaciones/lote`, f);
      toast(`${r.creadas} habitaciones creadas${r.omitidas ? ` (${r.omitidas} ya existían)` : ''}`);
      onGuardado();
    } catch (e) { setError(e.message); }
  };
  return (
    <Modal titulo="Crear varias habitaciones" onCerrar={onCerrar} pie={<><button type="button" className="btn" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primario" onClick={guardar}>Crear</button></>}>
      <p className="suave">Crea habitaciones consecutivas con las mismas características (por ejemplo, del 201 al 215, de mujeres, con 4 camas).</p>
      <CamposHabitacion f={f} setF={setF} lote />
      {error && <div className="aviso aviso-error" style={{ marginTop: '1rem' }}>{error}</div>}
    </Modal>
  );
}

function Importar({ sedeId, onCerrar, onGuardado }) {
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const toast = useToast();
  const importar = async () => {
    if (!archivo) return;
    setCargando(true); setError('');
    try {
      const r = await post(`/sedes/${sedeId}/habitaciones/importar`, { archivo: await leerArchivo(archivo) });
      toast(`${r.creadas} habitaciones creadas y ${r.actualizadas} actualizadas`);
      onGuardado();
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  };
  return (
    <Modal titulo="Importar habitaciones desde Excel" onCerrar={onCerrar} pie={<><button type="button" className="btn" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primario" onClick={importar} disabled={!archivo || cargando}>{cargando ? 'Importando…' : 'Importar'}</button></>}>
      <div className="pila">
        <p>La primera hoja del archivo debe tener una fila de encabezados con estas columnas (el orden no importa):</p>
        <div className="tabla-envoltura"><table>
          <thead><tr><th>Habitación</th><th>Bloque</th><th>Piso</th><th>Camas</th><th>Tipo</th><th>Accesible</th><th>Baño privado</th><th>Notas</th></tr></thead>
          <tbody><tr><td>201</td><td>A</td><td>2</td><td>4</td><td>Mujeres</td><td>No</td><td>Sí</td><td></td></tr></tbody>
        </table></div>
        <p className="ayuda">Obligatorias: <strong>Habitación</strong> y <strong>Camas</strong>. Tipos: Matrimonial, Hombres, Mujeres, Familiar, Presbíteros, Mixta. Si la habitación ya existe se actualiza.</p>
        <input type="file" accept=".xlsx" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
        {error && <div className="aviso aviso-error">{error}</div>}
      </div>
    </Modal>
  );
}

export default function Sedes() {
  const [sedes, setSedes] = useState(null);
  const [q, setQ] = useSearchParams();
  const [habs, setHabs] = useState(null);
  const [modal, setModal] = useState(null);
  const toast = useToast();
  const usuario = useUsuario();
  const sedeId = Number(q.get('sede')) || sedes?.[0]?.id;
  const sede = sedes?.find((s) => s.id === sedeId);

  const cargarSedes = useCallback(() => get('/sedes').then(setSedes), []);
  const cargarHabs = useCallback(() => (sedeId ? get(`/sedes/${sedeId}/habitaciones`).then(setHabs) : setHabs([])), [sedeId]);
  useEffect(() => { cargarSedes(); }, [cargarSedes]);
  useEffect(() => { cargarHabs(); }, [cargarHabs]);
  const recargar = () => { setModal(null); cargarSedes(); cargarHabs(); };

  const eliminarHab = async (h) => {
    if (!confirm(`¿Eliminar la habitación ${h.codigo}?`)) return;
    try { await del(`/habitaciones/${h.id}`); toast('Habitación eliminada'); recargar(); } catch (e) { toast(e.message, 'error'); }
  };
  const eliminarSede = async () => {
    if (!confirm(`¿Eliminar la sede "${sede.nombre}" y todas sus habitaciones?`)) return;
    try { await del(`/sedes/${sede.id}`); toast('Sede eliminada'); setQ({}); recargar(); } catch (e) { toast(e.message, 'error'); }
  };

  if (!sedes) return <Cargando />;
  return (
    <>
      <div className="encabezado-pagina">
        <div><h1>Sedes y habitaciones</h1><p className="suave" style={{ margin: 0 }}>Casas de convivencia y su inventario de camas</p></div>
        <button type="button" className="btn btn-primario" onClick={() => setModal({ t: 'sede' })}>+ Nueva sede</button>
      </div>
      {!sedes.length ? (
        <div className="tarjeta centro pila"><p>Registre la primera casa de convivencias para empezar a cargar sus habitaciones.</p></div>
      ) : (
        <>
          <div className="pestanas">
            {sedes.map((s) => <button key={s.id} type="button" className={s.id === sedeId ? 'activo' : ''} onClick={() => setQ({ sede: s.id })}>{s.nombre} <span className="insignia" style={{ marginLeft: '.3rem' }}>{s.camas} camas</span></button>)}
          </div>
          {sede && (
            <>
              <div className="fila" style={{ marginBottom: '1rem' }}>
                <div className="suave">{sede.direccion}</div>
                <span className="espacio" />
                <button type="button" className="btn" onClick={() => setModal({ t: 'hab' })}>+ Habitación</button>
                <button type="button" className="btn" onClick={() => setModal({ t: 'lote' })}>+ Varias habitaciones</button>
                <button type="button" className="btn" onClick={() => setModal({ t: 'importar' })}>⬆ Importar Excel</button>
                <button type="button" className="btn" onClick={() => setModal({ t: 'sede', sede })}>Editar sede</button>
                {usuario.rol === 'admin' && <button type="button" className="btn btn-peligro" onClick={eliminarSede}>Eliminar sede</button>}
              </div>
              {!habs ? <Cargando /> : (
                <>
                  <div className="cifras" style={{ marginBottom: '1rem' }}>
                    {Object.entries(TIPO_HAB).map(([k, v]) => {
                      const hs = habs.filter((h) => h.tipo === k && h.activa);
                      return hs.length ? <div key={k} className="cifra"><div className="valor">{hs.reduce((s, h) => s + h.capacidad, 0)}</div><div className="rotulo">camas · {v} ({hs.length} hab.)</div></div> : null;
                    })}
                  </div>
                  <div className="tabla-envoltura">
                    <table>
                      <thead><tr><th>Habitación</th><th>Bloque</th><th>Piso</th><th>Camas</th><th>Tipo</th><th>Características</th><th>Estado</th><th /></tr></thead>
                      <tbody>
                        {habs.map((h) => (
                          <tr key={h.id}>
                            <td><strong>{h.codigo}</strong>{h.notas && <div className="pequeno suave">{h.notas}</div>}</td>
                            <td>{h.bloque}</td><td>{h.piso}</td><td>{h.capacidad}</td><td>{TIPO_HAB[h.tipo]}</td>
                            <td>{h.accesible && '♿ Accesible '}{h.bano_privado && '🚿 Baño privado'}</td>
                            <td>{h.activa ? <span className="insignia ok">En servicio</span> : <span className="insignia">Fuera de servicio</span>}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <button type="button" className="btn btn-chico" onClick={() => setModal({ t: 'hab', hab: h })}>Editar</button>{' '}
                              <button type="button" className="btn btn-chico btn-peligro" onClick={() => eliminarHab(h)}>Eliminar</button>
                            </td>
                          </tr>
                        ))}
                        {!habs.length && <tr><td colSpan={8} className="centro suave">Sin habitaciones. Use “+ Varias habitaciones” o “Importar Excel”.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      {modal?.t === 'sede' && <FormSede sede={modal.sede} onCerrar={() => setModal(null)} onGuardado={(s) => { recargar(); setQ({ sede: s.id }); }} />}
      {modal?.t === 'hab' && <FormHabitacion sedeId={sedeId} hab={modal.hab} onCerrar={() => setModal(null)} onGuardado={recargar} />}
      {modal?.t === 'lote' && <FormLote sedeId={sedeId} onCerrar={() => setModal(null)} onGuardado={recargar} />}
      {modal?.t === 'importar' && <Importar sedeId={sedeId} onCerrar={() => setModal(null)} onGuardado={recargar} />}
    </>
  );
}
